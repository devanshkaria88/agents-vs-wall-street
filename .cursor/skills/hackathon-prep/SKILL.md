---
name: hackathon-prep
description: Structured hackathon preparation workflow for researching, ideating, and building winning projects. Use when the user mentions a specific hackathon by name, pastes a hackathon brief, asks for help preparing for a hackathon, wants to ideate within a hackathon context, asks about judging criteria, or begins any new hackathon cycle. Lead with judge and sponsor research before any ideation. Trigger even when the user doesn't explicitly ask for "hackathon prep" — any contextual signal that a hackathon event is being planned for is enough.
---

# Hackathon Preparation Skill — v2

This skill encodes what has actually worked (and what hasn't) across 11 hackathons. It is deliberately opinionated.

## The core thesis

**Hackathons are won by a sharp idea that solves a real problem for someone in the room, pitched with high energy by a builder who has slept.**

Tech is not the reason projects win. Architecture is not the reason projects win. The idea and the pitch are the reasons. Treat every other concern as downstream of those two.

---

## Hard rules (non-negotiable)

1. **Judge and sponsor research happens first.** Before any ideation, know who the judges are, what they personally care about, what the sponsor company ships, and what criteria they will score against. The idea is a function of this research — not the other way around.

2. **The idea must pass the real-problem filter.** Ask: *"Is this helping >1 million people globally in a way they'd pay for tomorrow?"* If the answer is no, discard the idea. "Good-to-have," "playing to the track," and "emotionally resonant but not needed" all fail this test.

3. **The idea must pass the sellable-tomorrow test.** Ask: *"If this were finished by Monday, could it be sold to a customer that week?"* If no — if it needs more research, more validation, more "vision" — discard it. Hackathon ideas that win are products you could put a price tag on the day after the event. Demos, prototypes, and "proofs of concept" without a clear buyer fail this test.

4. **The idea must be novel — verify with research, do not assume.** Before committing to an idea, actively check whether something exactly like it already exists. Use web search, GitHub search, Product Hunt, YC company list, and any other available means. If a near-identical product exists, the idea is dead — reposition it (different customer, different angle, different surface) or discard it. "I think it's novel" is not enough; novelty must be confirmed, not assumed. The novelty check is mandatory and happens *before* any build commitment.

5. **Target a sponsor's or judge's own pain.** The highest-leverage idea is one where a sponsor company or a specific judge genuinely has the problem and would be a customer. If you can talk to them at the event and validate the pain directly, do so.

6. **Sleep for at least 4 hours if the hackathon is 24hr or longer.** The pitch is the product. A sleep-deprived pitch loses. No-sleep builds have consistently produced lower-energy pitches and lower placements even when the tech was strong.

7. **Web demos only for short hackathons (<24hr).** Mobile demos take too long to validate and rarely ship cleanly inside the time budget. If the user argues for mobile, push back hard and require a specific reason (e.g., the sponsor's product is mobile-only).

8. **Do not default to multi-agent architectures.** Multi-agent is only correct when the problem structurally demands it (genuinely parallel work, truly independent actors, real coordination complexity). Otherwise a single agent with tool use is simpler, more reliable, and easier to pitch.

9. **Tech stack is never the differentiator.** Use proven defaults (Next.js + NestJS + PostgreSQL, Claude/Gemini APIs, shadcn/ui). Spend the time saved on the idea and the demo.

---

## Anti-patterns (kill these on sight)

**Mapping expertise onto problem.** Do not start from "what do I know how to build" and look for a hackathon-shaped hole for it. Start from the judges and sponsors.

**Pattern-finding where no pattern exists.** A recurring technical motif (two-surface demos, multi-agent, voice AI) is not a strategy. Each hackathon gets its own answer driven by its own judges and sponsors.

**Ambitious projects that don't solve a real problem.** Scope is downstream of problem. A narrow project solving a real problem beats a sprawling project solving a fake one.

**Dating apps, generic chatbots, RAG wrappers, prompt-only tools.** These do not defend against "why not an existing product" and do not survive judging at competitive events.

**Random teams assembled at the event (for 24hr+ hackathons).** Either go solo, or team up with people who have shipped with the user before, or who the user genuinely wants to ship with. Misfit teams poison pitch energy.

**Leading with the tech in the pitch.** Architecture slides lose rooms. Lead with the problem and the person who has it.

**Building it without talking to judges or sponsors at the event.** At in-person events, judges and sponsor reps are present. Ten minutes of conversation is worth hours of assumption. Use this access.

---

## The workflow

Follow these in order. Do not skip ahead.

### Phase 1 — Judge & Sponsor Research (1–2 hours, before anything else)

Find out, for each judge: their role, their company, their recent public work (blog posts, talks, LinkedIn, GitHub), what problem they spend their day on. Find out, for each sponsor: what product they ship, what their roadmap signals, what they'd pay to have built for them.

Output: a short dossier per judge and per sponsor. If the user has access to the event's Discord, participant list, or any pre-event comms, mine those too.

### Phase 2 — Judging Criteria & Track Analysis

Extract the explicit scoring rubric if published. Extract implicit criteria from judge backgrounds and sponsor priorities. Identify which tracks exist, what each rewards, and which sponsor is attached to each. Note any anti-patterns the organisers have explicitly discouraged (some hackathons ban RAG, chatbots, medical diagnostics, etc.).

Output: scoring framework showing how the project will be evaluated, plus a list of disqualifiers.

### Phase 3 — Ideation (1–2 hours max, never before Phase 1 and 2)

Think like a VC or a product person — not like an engineer. Generate ideas by asking:
- What does this specific sponsor wish existed?
- What does this specific judge complain about on their podcast / blog / LinkedIn?
- What would a customer in this room pay for?

Run each candidate through **all four filters in order**. An idea must pass all four to survive:

1. **Real-problem filter (rule 2):** Does it help >1M people in a way they'd pay for tomorrow? If no, discard.
2. **Sellable-tomorrow filter (rule 3):** If finished by Monday, could it be sold that week? If no, discard.
3. **Novelty check (rule 4):** Actively research whether something exactly like this already exists. **This is research work, not a thought experiment.** Run web searches for the product description, search GitHub and Product Hunt for similar repos/launches, check YC's company list, look for similar Twitter/X launches in the last 6 months. If a near-identical product exists, either reposition (different customer, different angle, different surface) or discard. Document what you found and how the idea differs.
4. **Sponsor/judge alignment:** Does it target at least one sponsor's or judge's own pain? Can it be demoed in under 3 minutes? Can a potential customer be found at the event and included in the pitch?

Select the surviving idea that scores highest on criteria-fit × sponsor-targeting × demoability. Never select based on "how cool is this to build."

### Phase 4 — Scoping the Demo First

Work backwards from the 2–5 minute demo. What is the moment where judges can *feel* the product work? That is the spine of the build. Everything else is either supporting that moment or cut.

Define MVP (what the demo will show) and explicit cuts (what the user will not build even if time allows). Mobile is cut by default. Auth is cut by default for hackathon demos. Polish is cut until the core loop works end to end.

### Phase 5 — Architecture & Build

Use proven defaults unless a specific reason requires deviation. Document the system briefly for AI coding agents (PRD, context, prompts, rules files as needed — see `references/documentation-suite.md` if present).

Build in this order: core demo loop first, visible differentiator second, polish last. The project must be able to demo at every commit — never be in a broken state overnight.

### Phase 6 — Pitch Preparation (reserve 45+ minutes)

Structure: problem (with the person who has it) → product (the demo moment) → why-now → why-this-team → ask. Map each feature to a specific judging criterion. Talk to judges and sponsors during the build to validate framing before the final pitch.

Rehearse out loud at least twice. Pitch energy is more predictive of outcome than build quality. If the user has not slept enough (rule 6), buy them energy (coffee, short nap, walk outside) before the pitch. Do not pitch tired.

---

## Team composition by hackathon duration

| Duration | Team mode | Rule |
|----------|-----------|------|
| ≤6 hours | Solo | Short windows reward decisive single-builder execution. |
| 6–24 hours | Solo or trusted partner | Only team with someone the user has shipped with before. |
| 24hr+ | Small trusted team (2–3) | Random assigned teams are a trap. If the event requires a team and no trusted partner is available, keep it to 2 and set explicit roles. |
| Multi-day / online | Team with accountability | Solo on long online hackathons has consistently failed due to motivation drift. |

---

## The demo is the product

The demos that have won were ones where judges *experienced* the thing working on them — a live voice conversation, a disruption injected mid-workflow, a report that surfaced a real insight. The demos that have lost were pre-recorded badly, crashed live, looked like a ChatGPT wrapper, or never happened because the team didn't make finals.

Rules for the demo:
- Working end-to-end loop over polished UI
- One "moment" where judges see something they haven't seen before
- Avoid UIs that look like a chat interface — this reads as a wrapper even when it isn't
- If a video is required, reserve at least one hour for recording and editing
- Have a screen-recorded fallback ready in case the live demo breaks

---

## Pitch principles

- Lead with the problem, not the product
- Name a specific person who has the problem — ideally someone in the room
- Map each feature directly to a judging criterion
- Close with a clear ask (customer, investor, hire, follow-up meeting)
- Energy carries more weight than content. Practice delivering at 120% of natural energy
- Do not lead with architecture, tech stack, or agent topology

---

## Sanity checks before committing to an idea

Ask these out loud before starting to build. If any answer is weak, go back to ideation.

1. Who specifically would pay for this tomorrow?
2. If this were finished by Monday, could it be sold that week?
3. Does anything *exactly* like this already exist? (Cite the searches you ran. "I don't think so" is not an answer.)
4. Which judge or sponsor's problem does this solve?
5. What is the 30-second demo moment?
6. What can I cut if I lose 4 hours to a bug?
7. What is the pitch headline in one sentence?
8. What would the winner in this room probably build? Is my idea more or less defensible than that?
9. Am I picking this because I want to build it, or because it will win?

---

## When the user brings a new hackathon

Default response pattern:
1. Ask for the event link or brief
2. Run Phase 1 research (judges, sponsors, criteria) before engaging with ideation
3. Present findings
4. Only then move to ideation

If the user tries to skip to ideation, push back and insist on Phase 1. The reason most ideas fail the real-problem filter is that they were generated without this context.