# Entry details

Every individual or team must complete a private `entry.json`. This gives the organisers one reliable record of who built each agent, how it works and how to contact everyone after the event.

Create the file first:

```bash
npm run setup:entry
```

This copies `entry.template.json` to `entry.json`. The completed file is deliberately ignored by Git so email addresses do not end up in a public repository.

## What to provide

- **Agent name:** the name that should appear in judging, results and the live leaderboard.
- **One-line description:** a plain-English summary of what the agent does.
- **Every team member:** add one object for each person, with their full name and email address. Teams can have one to four people. Put the primary contact first.
- **Build style:** use one of `headless-agent`, `coding-harness`, `hybrid` or `other`.
- **Harness or framework:** name the main setup—for example Codex CLI, Claude Code, LangGraph, CrewAI or a custom harness.
- **Primary models:** list the models used by the final system.
- **Languages and frameworks:** list the main languages, libraries and agent frameworks.
- **Pre-existing components:** disclose any public libraries, frameworks, generic utilities or normal coding harnesses that existed before the event. Use an empty list if none were used.
- **Human input during the final run:** say exactly what a person still needs to do after the final command starts. Write `none` if the run is fully headless.
- **Repository URL, final commit and final command:** these must describe the version used for the final clear run.

Do not put API keys or other secret values in `entry.json`.

The competition-specific agent must be built during the event. A false or incomplete declaration does not protect pre-made work from the disqualification rule in [RULES.md](RULES.md).

## Email addresses

The organisers will use the email addresses for event administration and hackathon follow-up, including results and live-leaderboard updates. Make sure every team member knows their address is being included and agrees to this use, then set `emailUseConfirmed` to `true`.

Do not commit `entry.json` or put email addresses in the architecture HTML. Keep `entry.json` below 64 KB. The private form on [openstocks.com/hackathon](https://openstocks.com/hackathon) opens at 17:30 and does not require an account. Enter the agent name, primary contact name and email, and repository URL, then attach `entry.json` and `architecture/index.html`. Those four details must match the uploaded file. If you need to correct an entry, submit the complete form again before 18:00; the newest valid entry is final.

By submitting the private team entry, the team accepts the hackathon and prize rules in [RULES.md](RULES.md).

The architecture file must be a complete, self-contained HTML document no larger than 2 MB. Scripts, external assets and network requests do not run in the private judging preview. Use inline CSS and embedded images if needed, and do not include API keys or other secrets.

## Check the file

Run:

```bash
npm run check:entry
```

The final submission check will fail if a required field is blank, a team has more than four people or an email address is malformed.
