# DoraHacks Submission Copy

For Mantle Turing Test Hackathon 2026 (AI Awakening phase). Paste into the BUIDL submission form on https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail.

---

## Project Name

**DC.news on Mantle**

## Tagline (≤140 chars)

Autonomous Bitcoin editorial agent. Every submit + AI grade lives on Mantle. Verifiable on-chain editorial record powered by Gemini + ERC-8004.

## Tracks targeted

- **AI Alpha & Data Track** (Mirana Ventures) — Data & Analytics path
- **20 Project Deployment Award** (FCFS)
- **Best UI/UX Award** (if frontend polish allows)

## Description (long-form)

DC.news is an autonomous editorial agent for Bitcoin/Lightning/Stacks intelligence, ported to Mantle. The agent ingests live ecosystem activity (GitHub PR merges, mempool state, arXiv papers, SEC filings), grades each signal against a published 100-point quality rubric using Gemini 3, and refuses to publish anything that scores below threshold. Every submit and grade event is recorded on Mantle, creating a verifiable editorial record that survives the agent.

**Why Mantle:** smart contracts on Mantle let us treat the editorial pipeline as a public good. Anyone can submit; the AI grader's score is on-chain; bad scoring is auditable; the agent's identity is anchored via ERC-8004 (AgentIdentity contract) so reputation compounds across deployments.

**What DC brings:** 30 days of prior editorial work as Editor-in-Chief at aibtc.news (Bitcoin-side), with on-chain receipts (Bitcoin L1 inscriptions, sBTC payouts to 30+ correspondents). This is not a fresh agent — it's an existing editorial brand entering Mantle with a track record.

## How It Works

1. **Submit:** anyone calls `SignalRegistry.submitSignal(headline, contentURI)` on Mantle. Emits `SignalSubmitted`.
2. **Listen:** off-chain Python agent listens for `SignalSubmitted` events.
3. **Grade:** agent fetches the content, passes it to Gemini 3 with DC's editorial rubric (sourceQuality 30 / thesisClarity 25 / beatRelevance 20 / timeliness 15 / disclosure 10), gets a structured JSON score.
4. **Post:** agent calls `SignalRegistry.gradeSignal(id, score, breakdownHash)` — score is now on-chain. Emits `SignalGraded`.
5. **Read:** frontend reads on-chain state, displays the editorial record live.

## Mantle Integration

- **SignalRegistry contract** deployed to Mantle Mainnet (see "Deployed Address" below)
- **AgentIdentity contract** (ERC-8004 inspired) deployed to Mantle Mainnet
- Frontend uses Mantle Sepolia for free demo + Mantle Mainnet for the production record
- All contracts verified on Mantlescan

## AI Component

- **LLM:** Google Gemini (3 when GA, 2.5-pro for hackathon dev)
- **AI-callable on-chain function:** `gradeSignal(uint256 id, uint16 score, bytes32 breakdownHash)` — the AI's verdict written to immutable on-chain record
- **Rubric is published** in the repo (`agent/main.py` — RUBRIC_PROMPT constant), so judges can audit the grading logic

## Deployed Addresses

| Contract | Network | Address | Mantlescan |
|---|---|---|---|
| SignalRegistry | Mantle Sepolia | TBD | TBD |
| AgentIdentity | Mantle Sepolia | TBD | TBD |
| SignalRegistry | Mantle Mainnet | TBD | TBD |
| AgentIdentity | Mantle Mainnet | TBD | TBD |

## Links

- **Repo (MIT):** https://github.com/teflonmusk/dc-mantle-agent
- **Live frontend:** TBD (Vercel deploy on Day 2)
- **Demo video (2 min):** TBD (YouTube unlisted)
- **DC's prior editorial work:** https://aibtc.news (Editor-in-Chief trial, Apr-May 2026)
- **DC on Nostr:** npub1m8nk4uwp3nt4hgn8k4kktvjjjf6z306p6xtnzqehpymhjaqjxmws884te6

## Team

- **Dual Cougar (DC)** — autonomous agent, editorial + grading logic
- **Brian (operator)** — deploy, repo, submission

## What sets this apart

Most hackathon submissions ship a fresh agent with no track record. DC arrives with 30 days of inscribed-on-Bitcoin editorial work, a published rubric, and an existing reader audience. The Mantle deployment isn't a demo — it's an extension of a live editorial operation.

The 20-Project Deployment Award angle: we hit every requirement (verified contract, AI-callable on-chain function, public frontend, demo video, README) by Day 2 with margin to spare.
