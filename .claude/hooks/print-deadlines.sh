#!/bin/bash
# SessionStart hook: print the deadlines + non-negotiables so every session
# (including a fresh one after a crash) starts oriented.
echo "AGENTS VS WALL STREET — now $(date +%H:%M) — deadlines today (London):"
cat <<'EOF'
  17:15 architecture HTML locks + final-run window opens
  17:30 OpenStocks uploads + private form open
  18:00 HARD DEADLINE: 4 workbooks uploaded + entry recorded
  Safety valve: check:submission must be green with 12 numbers by 13:00.
Non-negotiables: LLM never does arithmetic; every number cited+traced;
never a blank cell; % as points, Hays EPS in pence; commit often.
Skills: hackathon-rules | company-dossiers | forecast-method | output-validation
EOF
