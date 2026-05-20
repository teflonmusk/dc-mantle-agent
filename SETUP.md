# DC.news Mantle — Setup Walkthrough

This is the operator (you) action list. Most steps are 1-5 minutes each.

## Order of operations

1. Mantle wallet (5 min)
2. Fund the wallet (5 min)
3. Gemini API key (3 min)
4. MongoDB Atlas free cluster (5 min, optional for Day 1)
5. Mantlescan API key for verification (2 min)
6. Local toolchain check (1 min)
7. First compile + deploy to Sepolia (auto, I drive)

---

## 1. Mantle wallet

You need an **EVM wallet** (same format as Ethereum). Recommended path:

- Install MetaMask (or Frame, Rabby, Rainbow — any EVM wallet)
- Create a **fresh account** named "DC Mantle Hackathon" — DON'T use your main wallet for hackathon ops
- Add Mantle networks:
  - **Mantle Sepolia** — Chain ID `5003`, RPC `https://rpc.sepolia.mantle.xyz`, Symbol `MNT`, Explorer `https://sepolia.mantlescan.xyz`
  - **Mantle Mainnet** — Chain ID `5000`, RPC `https://rpc.mantle.xyz`, Symbol `MNT`, Explorer `https://explorer.mantle.xyz`
- Export the **private key** for this account (Settings → Security → Show Private Key)
- Paste it into `.env` as `MANTLE_PRIVATE_KEY` (with `0x` prefix)

**Security:** this key only protects ~$50 of hackathon-ops MNT. Don't reuse it elsewhere. Rotate after submission.

## 2. Fund the wallet

**Testnet (Day 1-2 dev):**
- Free faucet: https://faucet.sepolia.mantle.xyz/ — paste your address, get test MNT instantly.

**Mainnet (Day 2-3 final deploy + 20-Project Deployment Award):**
- Buy $20-50 of MNT (Bybit, Binance, MEXC). Send to your hackathon wallet.
- That covers contract deploy + verify + initial txs with cushion.

## 3. Gemini API key

- Open https://aistudio.google.com/apikey
- Sign in with any Google account
- "Create API key" → pick a project (or create new)
- Copy → paste into `.env` as `GEMINI_API_KEY`
- Default model is `gemini-2.5-pro` (set in `.env`). Upgrade to `gemini-3-pro` when GA.

**Budget:** ~$5-20 across 3 days for development + ~50 demo grading calls.

## 4. MongoDB Atlas (optional Day 1, required Day 2)

- https://www.mongodb.com/atlas/database → "Try Free"
- Create a free M0 cluster (no card required)
- Database Access → create a user with Atlas password
- Network Access → "Allow access from anywhere" (`0.0.0.0/0`) for hackathon
- Connect → "Drivers" → copy the connection string
- Paste into `.env` as `MONGO_URI` (replace `<password>`)

We use this for signal-corpus storage + dedup. Day 1 can run without it; Day 2+ needs it for the polish demo.

## 5. Mantlescan API key

- https://mantlescan.xyz/myapikey
- Sign up (free) → create API key
- Paste into `.env` as `MANTLE_SCAN_API_KEY`

Required for contract verification on Day 2.

## 6. Local toolchain

You already have:
- ✅ Node 25+
- ✅ Python 3.9+
- ✅ gh CLI authenticated

I'll install project-local deps automatically:
```bash
cd /tmp/dc-mantle-agent/scripts && npm install
cd /tmp/dc-mantle-agent/agent && pip install -r requirements.txt
```

## 7. Ready signal

Once `.env` is filled in, tell me:
> **".env is set, fund landed"**

and I'll:
- Compile contracts
- Deploy to Sepolia
- Run the agent
- Submit a test signal end-to-end
- Verify on Mantlescan
- Then move to mainnet deploy on Day 2

---

## What I'll need YOU for during the 3 days

| When | What | Time |
|---|---|---|
| Now | Steps 1-5 above | ~20 min |
| Day 1 end | Confirm Sepolia deploy + test signal looks right | 5 min |
| Day 2 | Approve mainnet deploy (real MNT spend ~$5-10) | 1 min |
| Day 3 | **Record 2-min demo video** (I'll write the script) | 30-60 min |
| Day 3 | Hit submit on DoraHacks submission form | 5 min |

Total ~1.5-2 hours of your time across 3 days. I do everything else.
