# Final-run runbook (17:00 → 18:00)

Roles: the agent (Claude) does the commits and the run; YOU do every upload —
the rules forbid programmatic submission (RULES.md:55).

## ~16:55 — freeze
1. Stop editing everything. `git status` clean; push.
2. Architecture HTML final read-through (it locks at 17:15; small fixes
   allowed after, but the page must match the system).
3. Confirm `.env` present locally (only needed if we run --live extraction;
   the default `npm run forecast` is offline).

## 17:00 — declare the version
4. `git log -1` → copy the hash into `entry.json` → `submission.finalCommit`.
5. `npm run check:entry` → must PASS.
6. Commit any entry-adjacent doc tweaks; push. This is the declared commit —
   later code changes need a new commit + entry.json update (SUBMISSION.md:40).

## 17:15 — the clear run (window open)
7. From the repo root, one command:
   `npm run forecast`
   Expected: engine → validate → write → check, ending "RUN CLEAR", log at
   `logs/run-<ts>.log`. If it crashes: fix, new commit, update finalCommit,
   rerun — retries are allowed until 18:00 (RULES.md:38).
8. Sanity-eyeball `submission/*.xlsx` (Summary C7:C9 filled, values match the
   final board): HD 47613 / 4.68 / 1.0 · ADI 3960 / 3.39 / 73.3 ·
   HAS 903.5 / 1.12 / 46.0 · DE 12543 / 4.84 / 556.
9. Commit the run log + push (provenance).

## 17:30 — uploads (YOU, manually)
10. openstocks.com → each company's Forecast Model → upload the matching file:
    - HD-FY2026Q2.xlsx → Home Depot
    - ADI-FY2026Q3.xlsx → Analog Devices
    - HAS-FY2026.xlsx → Hays plc
    - DE-FY2026Q3.xlsx → Deere & Company
    Last valid upload before 18:00 counts; re-upload replaces (RULES.md:56).
11. openstocks.com/hackathon private form (no login): agent name "The Truth",
    primary contact Devansh Karia + email, repo URL
    https://github.com/devanshkaria88/agents-vs-wall-street — these four must
    match entry.json — attach entry.json AND architecture/index.html.
12. Target: all four uploads + form done by 17:50. Buffer is sacred.

## If everything is on fire (any time after 17:15)
The committed workbooks in `submission/` are ALWAYS valid (validated numbers,
never blank). Skip the rerun and upload them as-is. A submitted par beats a
perfect crash.
