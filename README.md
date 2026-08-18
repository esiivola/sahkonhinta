# sahkonhinta — Finnish electricity price

A mobile-first static web app that answers one question at a glance:

> **What does electricity cost now, and what is the best available estimate going forward?**

It shows the current price, today's and tomorrow's averages, and one honest
step-line chart that stitches **official day-ahead prices** together with a
**short-term forecast**, marking clearly where each ends.

Live data flows through a static pipeline — the browser never talks to upstream
APIs directly:

```
APIs → fetch → normalize (→ EUR/MWh, VAT0) → merge store → resolve → static JSON → frontend
```

## Data sources

| Tier | Source | License | Notes |
| --- | --- | --- | --- |
| Official | Nord Pool / ENTSO-E day-ahead via [porssisahko.net](https://porssisahko.net/api) | ENTSO-E Transparency (attribution) | No key, native 15-minute, ~48 h ahead |
| Official (optional) | [ENTSO-E Transparency A44](https://transparency.entsoe.eu/) | ENTSO-E Transparency (attribution) | Needs `ENTSO_E_TOKEN`; authoritative |
| Forecast | [nordpool-predict-fi](https://github.com/vividfog/nordpool-predict-fi) | MIT | Hourly, ~7 days ahead |

**Deliberately omitted:**

- **Longer-term market forwards** (Euronext / Nord Pool). Their settlement prices
  cannot be freely redistributed on a public site — that needs a paid market-data
  license. The footer links out to Euronext / sähkötutka instead.
- **Forecast P10–P90 band.** The free forecast feed carries no percentiles, so no
  band is drawn (nothing is invented). The data schema keeps optional `low`/`high`
  fields, so a real band would appear automatically if a percentile source is added.

## Units & VAT

Internally everything is **EUR/MWh, VAT-excluded**. Presentation converts centrally
to **c/kWh** and applies **Finnish VAT (25.5%)** via a toggle whose state persists
across visits. See [`src/lib/units.ts`](src/lib/units.ts).

## Local development

```bash
npm install
npm run build:data   # fetch live data → public/data/*.json
npm run dev          # http://localhost:5173/sahkonhinta/
```

Other scripts:

```bash
npm run typecheck    # tsc project references, no emit
npm run build        # production build → dist/
npm run preview      # serve the production build
```

## How the pipeline works

[`scripts/build-data.ts`](scripts/build-data.ts) runs the full chain:

1. Fetch official prices (porssisahko.net, plus ENTSO-E if `ENTSO_E_TOKEN` is set).
2. Merge fresh official points into the accumulated store
   (`public/data/observations.json`), deduped and pruned to 45 days. This is how
   "yesterday/today" is retained without a historical API.
3. Fetch the forecast.
4. [`resolveTimeline`](src/lib/resolver.ts) builds the coherent curve: official
   wherever it exists, forecast only after official coverage ends. A later refresh
   automatically upgrades a period **Forecast → Official** — no frontend change.
5. Write `timeline.json`, `status.json`, `observations.json` under `public/data/`.

## Generated files

- `timeline.json` — the resolved curve the chart renders.
- `status.json` — headline figures (current price, today/tomorrow averages, boundaries).
- `observations.json` — the internal accumulated official store (merge target).

## Deployment (GitHub Pages)

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on push,
`workflow_dispatch`, and a schedule (a few times/day). Each run fetches data,
commits refreshed `public/data/*.json` back to `main` (the bot's data-only commits
are excluded from the `push` trigger, so there is no loop), builds, and deploys.

One-time setup:

1. Push this repo to GitHub (see below).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. (Optional) **Settings → Secrets and variables → Actions** → add `ENTSO_E_TOKEN`.

The site is served from a project path, so the Vite `base` is `/sahkonhinta/`
(see [`vite.config.ts`](vite.config.ts)). If the repo name differs, set
`VITE_BASE=/your-repo/` or edit the config.

No credentials are ever exposed in client JS or generated files.

## Accessibility

Targets WCAG 2.2 AA: semantic HTML, keyboard-scrubbable chart (arrow keys, with an
`aria-live` readout), visible focus, labelled controls, AA contrast, ≥44px touch
targets, and redundant encodings (official = solid line, forecast = dashed + label —
never distinguished by color alone).
