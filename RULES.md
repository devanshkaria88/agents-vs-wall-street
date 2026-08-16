# Rules

These rules are written so every team works from the same brief.

## Teams and eligibility

- You can work alone or in a team of up to four people.
- Each individual or team can enter one agent.
- You must be registered for the event and present on the day.
- The cash prize pool totals $10,000. Architecture & Design and Forecast Accuracy each pay $2,250 for first, $1,350 for second and $900 for third. The X and LinkedIn social prizes each pay $500.
- The Architecture & Design winners also receive team-level OpenAI credit prizes of $5,000, $2,500 and $1,000 respectively.
- Each team receives $50 of Codex credit for the event, kindly provided by OpenAI. This is separate from the prize credits.
- All prize claims, including cash and OpenAI credits, will be processed and settled after the event. The same entry can win both main prize tracks.
- By submitting the private team entry, the team accepts these hackathon and prize rules.

## What you can build

- You can use any language, model, library or agent framework supplied or permitted on the day.
- Your system can run the four companies sequentially or in parallel.
- A pipeline or an interactive Codex or Claude Code workflow is allowed.
- Architecture judges may favour systems that do more of the work independently and need less hands-on help, but no architecture starts with an automatic advantage. A simpler system can still win either prize if it works well.
- You can use the supplied historical Markdown corpus in `challenge/offline-data/` as well as public information you find during the event.

## It must be built during the event

- The competition entry must be built after the challenge officially starts on Sunday.
- You cannot arrive with a pre-built forecasting agent, challenge-specific code, system prompts, research, forecasts, workflows or architecture explanation.
- Off-the-shelf models, public libraries, agent frameworks, generic utilities and your normal unmodified coding harness are allowed. Declare any existing components you use in `entry.json`.
- The official document-search helper supplied in this repository is allowed. Any competition-specific retrieval, extraction, reasoning or forecasting work built on top of it must still be created during the event.
- Keep the repository history and run logs so the organisers can see when the work was created.
- If the organisers find credible evidence that the entry, or a substantial competition-specific part of it, was made before the challenge started, the entire entry is immediately disqualified from all prizes. It will not receive partial credit or remain eligible for a different prize track.
- The organisers' ruling on pre-made work is final and will be applied consistently to every team.

## The final run

- The final-run window opens at 17:15 and lasts for 45 minutes.
- Your final command must process all four companies and produce all four required `.xlsx` workbooks.
- You can retry after a crash or failed run, provided you complete one clear run and all four manual uploads before 18:00.
- Keep the final clear-run log and identify the commit used for that run.
- Do not submit forecasts made by hand outside the system you describe.

## Architecture explanation

- Submit one self-contained HTML page explaining the architecture, main choices, tests, trade-offs and known weaknesses.
- The HTML is locked at 17:15 when the final run starts.
- Small changes during the final run are allowed, but the judges will mark the entry down if the HTML no longer matches the system that produced the forecasts.
- Upload the completed HTML file with `entry.json` through the private form on openstocks.com/hackathon. You do not need to host a site.
- Keep it self-contained and no larger than 2 MB. Scripts, external assets and network requests do not run in the judging preview. Do not include secrets.

## Forecast submission

- Use the four supplied workbook templates without changing the `Summary` sheet structure.
- Upload one `.xlsx` workbook for each company through its Forecast Model on [openstocks.com](https://openstocks.com).
- OpenStocks opens for challenge uploads at 17:30.
- Uploads are manual. The agent must not submit to OpenStocks programmatically.
- If you upload more than once, the last valid workbook received before the deadline counts.
- All four successful uploads must be complete by 18:00. Late files do not count.

## Entry information

- Create and complete the private `entry.json` with the agent name, every team member's name and email address, the harness or framework, models, languages, final command, repository and final commit.
- Submit it through the no-login private form with the agent name, primary contact and repository URL matching `entry.json`.
- The technical description must match the system used for the final run.
- The organisers will use the email addresses for event administration and hackathon follow-up, including results and live-leaderboard updates.
- Confirm that every team member agrees before including their email address. Do not commit `entry.json` or publish email addresses in the architecture HTML.

## Fair play

- Keep a record of the tools, models and external data used.
- Do not use private company information or any data you are not allowed to share.
- Do not interfere with another team, the venue network, OpenStocks or the judging process.
- The repository and final commit are mandatory parts of the entry. Judges can also ask for the run log or a rerun if they need to verify the work.
- The organisers can make a ruling where these rules do not cover an edge case. The same ruling will be shared with all teams.
