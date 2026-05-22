"""arXiv ingester — pulls recent cs.CR (cryptography & security) and quant-ph
papers tagged 'bitcoin' or 'lightning' or 'pqc' and files each as a signal.

Filters out preprints already filed via state file.
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware


load_dotenv()
ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / ".arxiv-state.json"

NETWORK = os.getenv("MANTLE_NETWORK", "sepolia")
RPC_URL = (
    os.getenv("MANTLE_MAINNET_RPC", "https://rpc.mantle.xyz")
    if NETWORK == "mainnet"
    else os.getenv("MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz")
)
PRIVATE_KEY = os.environ["MANTLE_PRIVATE_KEY"]

deployments = json.loads((ROOT / "deployments" / f"{NETWORK}.json").read_text())
REGISTRY_ADDR = deployments["contracts"]["SignalRegistry"]
artifact = json.loads((ROOT / "artifacts" / "SignalRegistry.json").read_text())
ABI = artifact["abi"]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
account = w3.eth.account.from_key(PRIVATE_KEY)
registry = w3.eth.contract(address=Web3.to_checksum_address(REGISTRY_ADDR), abi=ABI)

QUERIES = [
    'all:bitcoin+AND+cat:cs.CR',
    'all:lightning+network+AND+cat:cs.CR',
    'all:post-quantum+cryptography+AND+cat:quant-ph',
    'all:bitcoin+AND+cat:quant-ph',
]
ARXIV_BASE = "http://export.arxiv.org/api/query"


def fetch_query(q: str, max_results: int = 5) -> list[dict]:
    url = f"{ARXIV_BASE}?search_query={q}&sortBy=submittedDate&sortOrder=descending&max_results={max_results}"
    r = requests.get(url, timeout=20, headers={"User-Agent": "DC.news/0.1"})
    r.raise_for_status()
    # Parse the Atom XML manually — minimal needs
    text = r.text
    entries = re.findall(r"<entry>(.*?)</entry>", text, re.S)
    out = []
    for e in entries:
        idm = re.search(r"<id>(.*?)</id>", e)
        tm = re.search(r"<title>(.*?)</title>", e, re.S)
        pubm = re.search(r"<published>(.*?)</published>", e)
        if not idm or not tm:
            continue
        out.append({
            "id": idm.group(1).strip(),
            "title": re.sub(r"\s+", " ", tm.group(1)).strip(),
            "published": pubm.group(1).strip() if pubm else "",
        })
    return out


def load_state() -> dict:
    return json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {"seen_ids": []}


def save_state(state: dict):
    STATE_PATH.write_text(json.dumps(state, indent=2))


def submit_signal(headline: str, content_uri: str) -> str:
    tx = registry.functions.submitSignal(headline, content_uri).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": w3.eth.chain_id,
    })
    signed = account.sign_transaction(tx)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    rcpt = w3.eth.wait_for_transaction_receipt(h)
    return rcpt.transactionHash.hex()


def main():
    print(f"arXiv ingester → SignalRegistry @ {REGISTRY_ADDR} on {NETWORK}")
    state = load_state()
    seen = set(state["seen_ids"])
    new_filed = 0
    for q in QUERIES:
        try:
            entries = fetch_query(q)
            print(f"\n→ {q}: {len(entries)} results")
            for e in entries:
                if e["id"] in seen:
                    continue
                headline = f"arXiv: {e['title']}"[:200]
                print(f"  + {e['id'].split('/')[-1]}: {e['title'][:70]}")
                try:
                    tx = submit_signal(headline, e["id"])
                    print(f"    ✓ tx {tx}")
                    seen.add(e["id"])
                    new_filed += 1
                    time.sleep(2)
                except Exception as ex:
                    print(f"    ! submit failed: {ex}")
                    break
        except Exception as ex:
            print(f"  ! query failed: {ex}")
    state["seen_ids"] = list(seen)[-200:]  # keep last 200
    save_state(state)
    print(f"\n✓ done — {new_filed} new arXiv signals filed")


if __name__ == "__main__":
    main()
