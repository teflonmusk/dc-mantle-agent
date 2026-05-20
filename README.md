# DC.news on Mantle

Autonomous Bitcoin-native editorial agent for the [Mantle Turing Test Hackathon 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail).

DC (**Dual Cougar**) is an AI agent that ingests Bitcoin/Lightning/Stacks ecosystem activity, grades it against a published editorial rubric, and publishes only signals that pass its own quality gate. Every submit → grade → publish cycle is recorded on Mantle, creating a verifiable on-chain editorial record.

## Hackathon track

**AI Alpha & Data Track** (Mirana Ventures sponsored)
- Smart money tracking + on-chain anomaly detection
- Sub-path: **Data & Analytics** (AI-powered on-chain analysis)

Also targeting:
- **20 Project Deployment Award** — FCFS, first 20 projects to hit deployment milestones
- **Best UI/UX Award** — clean editorial-grade frontend

## Architecture

```
┌──────────────────┐        ┌────────────────────┐         ┌──────────────────┐
│ Signal Sources   │        │ DC Agent (Python)  │         │ Mantle Network   │
│  - GitHub PRs    │  poll  │  - dedup (MongoDB) │  call   │  SignalRegistry  │
│  - mempool.space │ ─────► │  - grade (Gemini)  │ ──────► │  - submitSignal  │
│  - arXiv RSS     │        │  - publish         │         │  - gradeSignal   │
│  - SEC EDGAR     │        │                    │         │  AgentIdentity   │
└──────────────────┘        └────────────────────┘         │  - mint ERC-8004 │
                                       ▲                   └──────────────────┘
                                       │                            │
                                       │ event listener             │ frontend reads
                                       └────────────────────────────┴────────► Next.js
```

## Stack

| Layer | Tool |
|---|---|
| Smart contracts | Solidity 0.8.20+ |
| Contract deploy | viem + Node (no foundry dep) |
| Agent core | Python 3.9+ |
| LLM | Google Gemini 3 (hackathon-spec) |
| Storage | MongoDB Atlas |
| Frontend | Next.js + wagmi + viem |
| Network | Mantle Sepolia → Mantle Mainnet |

## Contracts

- `SignalRegistry.sol` — submit + grade lifecycle, on-chain editorial record
- `AgentIdentity.sol` — ERC-8004 compliant agent identity NFT

## 3-Day Build Timeline

| Day | Deliverable |
|---|---|
| **Day 1** (May 21) | Contracts written + deployed to Mantle Sepolia; agent core scaffolded; first end-to-end submit→grade→read cycle works |
| **Day 2** (May 22) | Frontend live at public URL; ERC-8004 mint flow; deploy + verify on Mantle Mainnet |
| **Day 3** (May 23) | 2-min demo video; DoraHacks submission; README polish; submission cushion |

## Setup

See [`docs/setup.md`](./docs/setup.md) for full local dev instructions.

Quick start:
```bash
cp .env.example .env
# fill in: MANTLE_PRIVATE_KEY, GEMINI_API_KEY, MONGO_URI
cd agent && pip install -r requirements.txt
cd ../frontend && npm install
```

## License

MIT
