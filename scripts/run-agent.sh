#!/usr/bin/env bash
# Run all agent processes together for demo. Requires .env configured + contracts deployed.
# Press Ctrl-C to stop everything.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/agent"
source .venv/bin/activate

# Start listener in background (grades incoming signals)
python main.py &
LISTENER_PID=$!
echo "→ listener PID $LISTENER_PID"

# Source-ingesters on timers (every 5 min)
trap "kill $LISTENER_PID 2>/dev/null; exit" INT TERM EXIT

while true; do
  echo "--- $(date -u +%H:%M:%SZ) ingest cycle ---"
  python ingest_github.py || echo "(github ingest failed, continuing)"
  python ingest_mempool.py || echo "(mempool ingest failed, continuing)"
  python ingest_arxiv.py || echo "(arxiv ingest failed, continuing)"
  sleep 300
done
