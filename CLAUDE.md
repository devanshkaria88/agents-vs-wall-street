# Cross-agent collaboration

This project is being worked on collaboratively by **Claude Code** and **Cursor**. The two agents stay in sync via `context/last_update.md`, which is updated automatically by hooks after each turn.

**Before responding, check `context/last_update.md`** — if it contains `agent: cursor`, that's a turn the other agent did. Read it and reconcile before answering. If `agent: claude`, that was your own previous turn.

Recent git history (`git log --oneline -10`) also tells you what each agent committed.
