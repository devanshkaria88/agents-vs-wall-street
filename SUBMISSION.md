# Final run and submission

There is no automated submission API in this challenge. Your agent creates four workbooks; a team member checks them and uploads them manually to OpenStocks.

## Before 17:15

1. Run `npm run setup:entry` and complete the private `entry.json`, including every team member's name and email address. Put the primary contact first.
2. Make sure the architecture HTML explains the system you are actually using.
3. Commit the version you intend to use for the final run and add its hash to `entry.json`.
4. Confirm your final command processes all four companies and record it in `entry.json`.
5. Confirm the repository contains the system, prompts, instructions and configuration needed to understand and reproduce the work.
6. Test that the four files have the exact names shown below.
7. Make sure you can sign in to OpenStocks. The challenge Forecast Models open for uploads at 17:30.

## Required output

Your final command must create:

```text
submission/HD-FY2026Q2.xlsx
submission/ADI-FY2026Q3.xlsx
submission/HAS-FY2026.xlsx
submission/DE-FY2026Q3.xlsx
```

Each file must keep its supplied `Summary` sheet, three exact metric labels, units and fiscal-period header. Only the yellow forecast cells should be filled in.

For percentage metrics, enter percentage points: `4.5` means 4.5%, not 450% and not 0.045. For Hays EPS, enter pence: `6.2` means 6.2 pence.

## A clear run

A clear run is one execution of your final command that:

- starts from the declared final commit;
- processes all four companies;
- records a timestamped log of what the system did;
- produces all four completed workbooks; and
- matches the system described in your architecture HTML closely enough for the explanation to remain honest.

If a run crashes, you can fix it and retry during the 45-minute window. If the code changes, make a new commit and update `entry.json` so it identifies the version that produced the accepted workbooks. One clear run and all four uploads must be complete before 18:00.

## Check, then upload

Run:

```bash
npm run check:submission
```

The check confirms that the entry details and architecture HTML are complete and that all four workbooks exist, have a `Summary` sheet, contain the expected metrics and units, and have numeric forecasts. It does not score accuracy.

From 17:30, upload each workbook manually to the matching company Forecast Model on [openstocks.com](https://openstocks.com). The last valid workbook received for each company before 18:00 is your final entry.

From 17:30, use the private form on [openstocks.com/hackathon](https://openstocks.com/hackathon). Enter the agent name, primary contact name and email, and repository URL, then attach the completed `entry.json` and `architecture/index.html`. No account is needed for this form, but the four details must match `entry.json`. If you need to correct an entry, submit the complete form again before 18:00; the newest valid entry is final. Do not commit `entry.json` to a public repository. The HTML may remain in the repository, but it does not need to be hosted as a separate site.

Submitting the private team entry confirms that the team accepts the hackathon and prize rules in [RULES.md](RULES.md).

## Final checklist

- [ ] Four correctly named workbooks are in `submission/`.
- [ ] Every team member's name and email address is in `entry.json`.
- [ ] The harness, models, repository URL, final command and final commit are recorded in `entry.json`.
- [ ] `npm run check:submission` passes.
- [ ] The architecture HTML was locked at 17:15 and still matches the final system.
- [ ] `entry.json` and `architecture/index.html` are uploaded together before 18:00.
- [ ] The final commit is recorded.
- [ ] The clear-run log is saved in `logs/`.
- [ ] Each workbook is uploaded to the correct company before 18:00.
- [ ] The team has read and accepts the hackathon and prize rules.
