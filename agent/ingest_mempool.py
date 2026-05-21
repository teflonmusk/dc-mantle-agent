"""mempool.space ingester — polls live Bitcoin mempool state and files
fee/congestion signals to SignalRegistry when state shifts meaningfully.

Filters: only files when fee or backlog changes >25% vs last filed snapshot.
Prevents spam during steady-state.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware


load_dotenv()
ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / ".mempool-state.json"

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

CHANGE_THRESHOLD = 0.25  # only file when state shifts >25%


def get_mempool_snapshot() -> dict:
    base = "https://mempool.space/api"
    mp = requests.get(f"{base}/mempool", timeout=10).json()
    fees = requests.get(f"{base}/v1/fees/recommended", timeout=10).json()
    diff = requests.get(f"{base}/v1/difficulty-adjustment", timeout=10).json()
    return {
        "tx_count": mp["count"],
        "vsize_mvb": round(mp["vsize"] / 1_000_000, 2),
        "pending_sats": mp["total_fee"],
        "fast_fee": fees["fastestFee"],
        "hour_fee": fees["hourFee"],
        "epoch_pct": round(diff["progressPercent"], 1),
        "next_retarget_pct": round(diff["difficultyChange"], 2),
        "block_height": diff["estimatedRetargetDate"] // 1000,
    }


def is_significant_change(old: dict, new: dict) -> bool:
    if not old:
        return True
    for key in ("fast_fee", "vsize_mvb", "tx_count"):
        ov, nv = old.get(key, 0), new[key]
        if ov == 0:
            return True
        if abs(nv - ov) / max(ov, 1) > CHANGE_THRESHOLD:
            return True
    return False


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
    print(f"mempool ingester → SignalRegistry @ {REGISTRY_ADDR} on {NETWORK}")
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}
    snap = get_mempool_snapshot()
    print(f"  current: fast={snap['fast_fee']}sat/vB, {snap['vsize_mvb']}MvB, {snap['tx_count']} txs")

    if not is_significant_change(state, snap):
        print("  → no significant change, skip")
        return

    headline = (
        f"BTC mempool: {snap['tx_count']:,} txs @ {snap['vsize_mvb']}MvB · "
        f"fast {snap['fast_fee']} sat/vB · retarget {snap['next_retarget_pct']:+.2f}% "
        f"({snap['epoch_pct']}% epoch)"
    )[:200]
    content_uri = "https://mempool.space/api/mempool"
    print(f"  + filing: {headline}")
    try:
        tx = submit_signal(headline, content_uri)
        print(f"    ✓ tx {tx}")
        STATE_PATH.write_text(json.dumps(snap, indent=2))
    except Exception as e:
        print(f"    ! submit failed: {e}")


if __name__ == "__main__":
    main()
