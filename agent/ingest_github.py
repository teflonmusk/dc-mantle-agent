"""GitHub PR ingester — polls Bitcoin/Lightning/Stacks repos for recently
merged PRs and submits each as a signal to SignalRegistry on Mantle.

Runs one cycle per invocation. Suitable for cron / loop / GH Action.
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
STATE_PATH = ROOT / ".ingester-state.json"

NETWORK = os.getenv("MANTLE_NETWORK", "sepolia")
RPC_URL = (
    os.getenv("MANTLE_MAINNET_RPC", "https://rpc.mantle.xyz")
    if NETWORK == "mainnet"
    else os.getenv("MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz")
)
PRIVATE_KEY = os.environ["MANTLE_PRIVATE_KEY"]
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

deployments = json.loads((ROOT / "deployments" / f"{NETWORK}.json").read_text())
REGISTRY_ADDR = deployments["contracts"]["SignalRegistry"]
artifact = json.loads((ROOT / "artifacts" / "SignalRegistry.json").read_text())
ABI = artifact["abi"]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
account = w3.eth.account.from_key(PRIVATE_KEY)
registry = w3.eth.contract(address=Web3.to_checksum_address(REGISTRY_ADDR), abi=ABI)

REPOS = [
    "bitcoin/bitcoin",
    "lightningnetwork/lnd",
    "ElementsProject/lightning",
    "BTCPayServer/btcpayserver",
    "stacks-network/stacks-core",
    "hirosystems/stacks-blockchain-api",
]

# Labels / title keywords that signal a meaningful merge worth filing
INTERESTING_KEYWORDS = (
    "consensus", "mempool", "policy", "wallet", "p2p", "psbt", "taproot",
    "rbf", "channel", "htlc", "bolt", "onion", "watchtower", "lsp",
    "pox", "clarity", "sbtc", "burnchain", "stackerdb",
    "security", "vuln", "fix:", "feat:", "fee", "fee rate",
)


def is_interesting(pr: dict) -> bool:
    title = (pr.get("title") or "").lower()
    return any(kw in title for kw in INTERESTING_KEYWORDS)


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"last_pr": {}}


def save_state(state: dict):
    STATE_PATH.write_text(json.dumps(state, indent=2))


def gh_get(url: str):
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


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


def ingest_repo(repo: str, state: dict) -> int:
    print(f"\n→ {repo}")
    url = f"https://api.github.com/repos/{repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10"
    prs = gh_get(url)
    last_seen = state["last_pr"].get(repo, 0)
    new_filed = 0
    # Process oldest-first so chain order matches PR order
    for pr in reversed(prs):
        pr_num = pr.get("number")
        if not pr.get("merged_at") or pr_num <= last_seen:
            continue
        if not is_interesting(pr):
            print(f"  skip #{pr_num} (not interesting): {pr['title'][:60]}")
            state["last_pr"][repo] = max(last_seen, pr_num)
            last_seen = state["last_pr"][repo]
            continue
        headline = f"{repo.split('/')[-1]} PR #{pr_num} — {pr['title']}"[:200]
        content_uri = pr["html_url"]
        print(f"  + #{pr_num}: {headline[:80]}")
        try:
            txhash = submit_signal(headline, content_uri)
            print(f"    ✓ tx {txhash}")
            state["last_pr"][repo] = pr_num
            last_seen = pr_num
            new_filed += 1
            time.sleep(2)  # small gap between txs
        except Exception as e:
            print(f"    ! submit failed: {e}")
            break  # don't burn through more txs on failure
    return new_filed


def main():
    print(f"GitHub PR ingester → SignalRegistry @ {REGISTRY_ADDR} on {NETWORK}")
    print(f"Submitter: {account.address}")
    state = load_state()
    total_filed = 0
    for repo in REPOS:
        try:
            total_filed += ingest_repo(repo, state)
        except Exception as e:
            print(f"  ! {repo} failed: {e}")
    save_state(state)
    print(f"\n✓ done — {total_filed} new signals filed")


if __name__ == "__main__":
    main()
