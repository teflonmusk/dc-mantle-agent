"""DC.news Mantle agent — main listener loop.

Listens for SignalSubmitted events on the SignalRegistry contract,
grades each signal with Gemini, then posts the score back via gradeSignal.
"""
from __future__ import annotations

import json
import os
import time
from hashlib import sha256
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from google import genai
from pymongo import MongoClient


load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
NETWORK = os.getenv("MANTLE_NETWORK", "sepolia")
RPC_URL = (
    os.getenv("MANTLE_MAINNET_RPC", "https://rpc.mantle.xyz")
    if NETWORK == "mainnet"
    else os.getenv("MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz")
)
PRIVATE_KEY = os.environ["MANTLE_PRIVATE_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
MONGO_URI = os.getenv("MONGO_URI")

deployments = json.loads((ROOT / "deployments" / f"{NETWORK}.json").read_text())
REGISTRY_ADDR = deployments["contracts"]["SignalRegistry"]

artifact = json.loads((ROOT / "artifacts" / "SignalRegistry.json").read_text())
ABI = artifact["abi"]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
account = w3.eth.account.from_key(PRIVATE_KEY)
registry = w3.eth.contract(address=Web3.to_checksum_address(REGISTRY_ADDR), abi=ABI)

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

mongo = MongoClient(MONGO_URI) if MONGO_URI else None
db = mongo.dc_signals if mongo else None

RUBRIC_PROMPT = """You are an editorial quality grader for DC.news — a Bitcoin/Lightning/Stacks
intelligence brief. Score the following signal 0-100 across:

- sourceQuality (0-30): primary-source links, on-chain verifiable, no AI-slop
- thesisClarity (0-25): clear CLAIM / EVIDENCE / IMPLICATION structure
- beatRelevance (0-20): fits Bitcoin/Lightning/Stacks beat tightly
- timeliness (0-15): published within 24h of trigger event
- disclosure (0-10): model + data sources cited

Return STRICT JSON: {"score": int, "breakdown": {"sourceQuality": int, "thesisClarity": int, "beatRelevance": int, "timeliness": int, "disclosure": int}, "reasoning": "1-2 sentences"}

Signal headline: {headline}
Signal content URI: {content_uri}
"""


def grade(headline: str, content_uri: str) -> tuple[int, dict, str]:
    prompt = RUBRIC_PROMPT.format(headline=headline, content_uri=content_uri)
    resp = gemini_client.models.generate_content(model=MODEL_NAME, contents=prompt)
    text = resp.text.strip()
    if text.startswith("```"):
        text = text.strip("`").split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    parsed = json.loads(text)
    breakdown_json = json.dumps(parsed["breakdown"], sort_keys=True, separators=(",", ":"))
    breakdown_hash = "0x" + sha256(breakdown_json.encode()).hexdigest()
    return int(parsed["score"]), parsed, breakdown_hash


def grade_and_post(signal_id: int, headline: str, content_uri: str):
    print(f"\n[#{signal_id}] grading: {headline[:80]}")
    score, breakdown, breakdown_hash = grade(headline, content_uri)
    print(f"  score={score}  breakdown={breakdown['breakdown']}")
    if db:
        db.gradings.insert_one(
            {"signal_id": signal_id, "headline": headline, "content_uri": content_uri,
             "score": score, "breakdown": breakdown, "breakdown_hash": breakdown_hash,
             "network": NETWORK}
        )
    tx = registry.functions.gradeSignal(signal_id, score, Web3.to_bytes(hexstr=breakdown_hash)).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": w3.eth.chain_id,
    })
    signed = account.sign_transaction(tx)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    rcpt = w3.eth.wait_for_transaction_receipt(h)
    print(f"  ✓ gradeSignal tx: {rcpt.transactionHash.hex()} (block {rcpt.blockNumber})")


def main():
    print(f"DC Mantle Agent — listening on {NETWORK}")
    print(f"  RPC:      {RPC_URL}")
    print(f"  Registry: {REGISTRY_ADDR}")
    print(f"  Grader:   {account.address}")
    print(f"  Model:    {MODEL_NAME}")
    last_block = w3.eth.block_number
    print(f"  Starting from block {last_block}\n")
    while True:
        try:
            current = w3.eth.block_number
            if current > last_block:
                events = registry.events.SignalSubmitted.get_logs(from_block=last_block + 1, to_block=current)
                for ev in events:
                    grade_and_post(
                        signal_id=ev["args"]["id"],
                        headline=ev["args"]["headline"],
                        content_uri=ev["args"]["contentURI"],
                    )
                last_block = current
            time.sleep(3)
        except KeyboardInterrupt:
            print("\nshutdown")
            break
        except Exception as e:
            print(f"  ! error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
