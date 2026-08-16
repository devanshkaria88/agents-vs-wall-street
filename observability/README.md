# Observability UI

A Next.js dashboard for inspecting agent traces, extraction outputs, and forecast results during a run.

## Start the dev server

From the **repo root**:

```bash
npm run observe
```

Or directly from this directory:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page hot-reloads as you edit files under `observability/`.

## What it shows

- Per-company agent traces and extraction logs
- Forecast values and evidence citations for each of the 12 metrics
- Validation status (blank-cell warnings, unit checks)

## Structure

```text
observability/
├── app/           Next.js App Router pages and layouts
├── components/    Shared UI components
├── lib/           Data-loading utilities (reads from forecasts/ and logs/)
└── public/        Static assets
```

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS

## Notes

- This UI is read-only — it does not trigger or modify forecasts.
- Log files are read from `../logs/` and forecast JSON from `../forecasts/`.
- For the forecasting agent itself, see the repo-root `README.md`.
