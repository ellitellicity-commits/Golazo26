<div align="center">

# World Cup 2026 Predictor & Dashboard

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Globe-000000?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-Predictions-FF6B00?style=flat-square&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io)
[![Status](https://img.shields.io/badge/Status-Live-28A745?style=flat-square)](https://world-cup-2026-analytics-xi.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license--questions)

**A match predictor, Monte Carlo bracket simulator, and player dashboard for the 2026 FIFA World Cup, built and deployed live during the real tournament.**

[Open the live app](https://world-cup-2026-analytics-xi.vercel.app)

</div>

## Built live during the 2026 World Cup

This is not a retrospective study written after the fact. It was built and shipped while the 2026 FIFA World Cup was actually being played across the United States, Canada, and Mexico, and it updates as the tournament unfolds. Played matches show real results pulled from live sources; upcoming matches show the model's probabilities; the bracket and championship odds re-derive as results land. The goal is a broadcast-desk tournament companion that a fan and a data-curious analyst can both read: fans get the headline call, analysts can drill into the probabilities and the Monte Carlo paths behind it.

Honest framing: this is a portfolio project. The model is useful, not oracular (see [Model Transparency](#model-transparency)), and the interface is desktop-first.

## Key Features

| Feature | Description |
|---|---|
| Match predictor | XGBoost classifier estimates win, draw, and loss probabilities for any fixture, shown match by match. |
| Monte Carlo bracket simulator | Plays the full 48-team tournament 10,000 times to produce advancement and title odds. |
| The Atlas (3D globe) | An interactive Three.js globe of all 48 qualified nations. Spin it, hover a country to fill its real landmass with its flag, or open a nation's profile (rank, Elo, group, squad, all-time record). |
| Matchup Sandbox | Pit any two nations at any round and watch the model call the tie, opening with a vintage paper-map flight animation to the host venue. |
| Knockout bracket view | An interactive R32-to-final bracket that redraws as results and simulations change, with the champion's path traced through. |
| Live group standings | Real group tables rebuilt from results, with the full FIFA 2026 tiebreaker sequence applied. |
| Live match data | Real results, lineups, in-game stats, and current minute from football-data.org and ESPN, polled during live matches. |
| Championship odds board | Per-team title probability, updated from the latest simulation run. |
| Static-first fallback | Runs fully on a bundled data snapshot with no keys or backend required. |

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| UI framework | React 19 | Function components and hooks throughout. |
| Build tool | Vite 8 | Dev server, HMR, production bundling, and the live-data proxy. |
| 3D | Three.js (used directly, no React Three Fiber) | The Atlas globe, host emblems, and the home hero shapes. Lazy-loaded so it never weighs down first paint. |
| Animation | GSAP | Bracket draws, the paper-map flight, number count-ups, and cutscene choreography. |
| Routing | react-router-dom v7 | Client-side routing across the pages. |
| Model | XGBoost | Outcome classifier trained on historical and WC2026 data (Python side of the repo). |
| Simulation | Monte Carlo engine (`simulation.js`) | 10,000-run tournament simulation in the browser. |
| Live data | football-data.org API, ESPN API | Results via a server-side proxy; lineups and stats fetched directly (keyless, CORS-open). |
| Flags | flag-icons | Country flags for teams and host nations. |

## Model Transparency

Being honest about what the model can and cannot do is part of the point.

- **Accuracy.** The XGBoost classifier predicts three classes (win, draw, loss) at roughly **46.2%** accuracy on held-out data. That is solid for a football-outcome model on a three-class problem, and it is far from certain. Treat every probability as a probability.
- **Draws are the weak class.** Draws are the hardest outcome to predict, and draw recall is the weakest part of the model. Fixtures the model reads as tight are exactly where it is least confident.
- **No leakage.** Training and evaluation use **date-based train/test splits** (train on earlier matches, test on later ones) rather than random shuffling, so the model is never scored on information from its own future.
- **Outcome-only, not goals-based.** The model predicts the result (win, draw, loss), not a scoreline. Displayed scores for finished matches are real results, not model output.
- **10,000 Monte Carlo simulations.** Title and advancement odds come from simulating the whole tournament 10,000 times, sampling each remaining match from the model's probabilities, not from a closed-form formula.

## Data Sources

Everything is real and honestly attributed. Nothing is fabricated.

| Dataset | Source | Purpose |
|---|---|---|
| Live results | football-data.org (server-side proxy) | Live and recent match results, and the LIVE indicator. |
| Live match detail | ESPN (direct client fetch, keyless and CORS-open) | Lineups, in-game stats, and current match minute. |
| Stadium photos | Wikimedia Commons (CC-licensed, attributed in-app) | Real venue photography in the stadium panels. |
| Map and boundary data | Natural Earth | The Atlas globe coastlines, host province/state sub-maps, and the paper-map country outlines. |
| Team rankings | FIFA official rankings snapshot | Strength baseline and tiebreaker inputs. |
| Title odds | Model output (`odds.json`) | Championship odds display. |
| Bundled snapshot | Static JSON under `frontend/src/data/` | Powers the whole app offline with no keys. |

## Installation & Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or newer |
| npm | 9 or newer |
| Python (model and data pipeline, optional) | 3.10 or newer |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

### Model and data pipeline (optional)

The prediction model and data pipeline live in the Python side of the repository (see `requirements.txt`, `notebooks/`, `scripts/`, and `models/`). The frontend does not need them to run, since it ships with a static data snapshot. To work on the model, from the repository root:

```bash
pip install -r requirements.txt
```

### Environment variables

Live results from football-data.org are optional. Without a key, the app runs entirely on the bundled snapshot.

```bash
cd frontend
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `FOOTBALL_DATA_API_KEY` | Free key from football-data.org. Read only by `vite.config.js` and injected server-side by the proxy, so it never reaches the browser bundle. |
| `GOOGLE_CUSTOM_SEARCH_KEY` | Optional. Free Google Custom Search API key for player headshots. Injected server-side by the `/photo-api` proxy, never in the bundle. |
| `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` | Optional. The Custom Search Engine ID (`cx`) paired with the key above. |

The keys are deliberately not `VITE_`-prefixed, because `VITE_`-prefixed variables get inlined into the client bundle, which would leak the key to anyone viewing source. Requests go through a same-origin `/football-api/*` proxy that adds the auth header on the server. When no key is set, the proxy is disabled and the compiled `__HAS_LIVE_DATA__` flag tells the client to skip the live fetch.

## How It Works

### Prediction model

An XGBoost classifier predicts match outcomes from a small set of engineered features rather than raw form alone:

| Feature | What it captures |
|---|---|
| Elo difference | Relative strength of the two teams. |
| Rolling form | Recent results weighted toward the latest matches. |
| Venue host advantage | A boost for a host nation playing at home. |
| Tournament stage | Group versus knockout context. |

The output feeds both the on-screen predictor and the per-match probabilities the simulator samples from.

### Simulation engine

`simulation.js` runs a Monte Carlo simulation of the full tournament. Each run plays every remaining match by sampling from the model's probabilities, resolves the 12 groups into a knockout bracket via `bracket.js`, and plays through to a champion. Aggregating 10,000 runs gives advancement and title odds. A full pass completes in about 13 seconds thanks to prediction caching, so repeated matchups are not recomputed.

Two modes control how the tournament is treated:

| Mode | Behavior |
|---|---|
| Respect Reality | Keeps matches that have already been played and randomizes only the future. |
| Reimagine | Re-rolls the entire tournament from the group stage as if nothing had been decided. |

`standings.js` reconstructs group tables and applies the FIFA 2026 tiebreaker sequence (points, then head-to-head, goal difference, goals scored, and the remaining criteria) so group winners and runners-up resolve the way the real tournament would.

### Live data pipeline

Live data comes from two independent sources, each chosen for what it does well:

| Source | Access | Provides |
|---|---|---|
| football-data.org | Server-side proxy in `vite.config.js` (Vercel function in production) | Live and recent match results, LIVE indicator. |
| ESPN | Direct client fetch in `espn.js` | Lineups, in-game stats, and current match minute. |

`live.js` runs the polling loop that refreshes state during matches. `teams.js` reconciles team names across the model data, the two live sources, and the flag icons, since each source spells and abbreviates nations differently.

## Known Limitations

| Limitation | Detail |
|---|---|
| Model accuracy | Around 46.2% on a three-class problem. Good for a football-outcome model, not a crystal ball. |
| Draw modeling | Draws are the hardest class to predict and remain the weakest part of the model. |
| Outcome-only | The model predicts win, draw, or loss, not a scoreline, so it does not project goals. |
| Desktop-first | The interface is built for desktop. A dedicated mobile layout is not implemented yet. |
| Player headshots | ESPN ships headshots for only about 4% of 2026 squads. A Google Custom Search proxy fills the rest when configured; the API is currently blocked without those keys, and the app degrades gracefully to ESPN photos and then neutral initials. |
| Live source coupling | Live features depend on two third-party sources whose schemas can change without notice. |
| No persistence | Simulation results live in memory for the session and are not saved between visits. |
| Snapshot freshness | Without a live key, results reflect the bundled snapshot rather than the current standings. |

## Roadmap

Planned for after the tournament ends on 19 July. These are documented here as the project's next chapter; they are not built yet.

| Feature | Idea |
|---|---|
| Replay Mode | Once the tournament is complete, lock the app to the finished tournament data so users can browse the full bracket and explore what happened, start to finish. |
| Post-Tournament Retrospective | A dedicated tab comparing the model's calls against reality: accuracy versus outcome, the biggest upsets, and championship odds versus actuals. |

Earlier ideas still on the list: player-availability and injury signals for the model, probability calibration, persisted and shareable simulation runs, websocket push instead of polling, and automated snapshot refresh so the offline experience stays current.

## Deployment

**Live:** https://world-cup-2026-analytics-xi.vercel.app

- **Frontend:** React 19 and Vite, built to static assets and served by Vercel.
- **Live data:** football-data.org through a Vercel serverless proxy (`api/index.js`) that injects the API token server-side, plus ESPN fetched directly from the browser. In local dev and preview the same `/football-api` path is proxied by Vite (`vite.config.js`).
- **Fallback:** with no `FOOTBALL_DATA_API_KEY` configured, the app runs entirely on the bundled JSON snapshot (no keys or backend required).
- **Polling:** live results and status refresh roughly every 60s; an open live match panel refreshes every 30s. Polling pauses while the tab is hidden.

### Deploy your own

1. Fork the repo and create a Vercel project pointing at your fork.
2. Set `FOOTBALL_DATA_API_KEY` (free key from football-data.org) in the Vercel project's environment variables. Optionally add `GOOGLE_CUSTOM_SEARCH_KEY` and `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` for player headshots.
3. Vercel builds with `cd frontend && npm install && npm run build` (see `vercel.json`) and auto-deploys on push to `main`.

### Deployment config, three things that must not regress

The repo root is the Vercel **Root Directory**; the root `vercel.json`, root `api/`, and root `.vercelignore` are authoritative. Three earlier failure modes are each fixed at the source, so do not undo them:

1. **Python misdetection.** `scripts/generate_fixtures.py` plus `requirements.txt` at the repo root made Vercel's zero-config detection read the project as Python and skip the Vite build. Fixed by (a) `"framework": "vite"` explicit in `vercel.json`, and (b) `.vercelignore` excluding every Python and ML artifact from the upload (`/scripts/`, `/requirements.txt`, `/*.ipynb`, `/models/`, plus an unanchored `*.py` and manifest catch-all for any future stray file). Keeping the `.py` files in the repo is fine; keeping them out of the upload is the fix.
2. **The proxy must exist in production.** The football-data.org token cannot reach the browser and the API sends no CORS headers, so the request is proxied server-side. In dev that is the Vite proxy (`frontend/vite.config.js`); in production it is the serverless function `api/index.js`, reached via the `vercel.json` rewrite `/football-api/:path* -> /api?path=:path*`. `frontend/src/lib/data.js` calls the same `/football-api/*` path in both.
3. **The API key env var.** `FOOTBALL_DATA_API_KEY` (unprefixed, since a `VITE_` var would inline into the client bundle) is set in the Vercel project, Production scope. `api/index.js` 500s without it, and the build-time `__HAS_LIVE_DATA__` flag reads it too, so it must be present at both build and runtime.

The live proxy is verifiable without the Vercel CLI:

```bash
curl -s https://world-cup-2026-analytics-xi.vercel.app/football-api/v4/competitions/WC/matches | head -c 200
# a matches array means the proxy and env var are working; an error or HTML means one of the three above regressed
```

## Development Workflow

| Command | Action |
|---|---|
| `npm run dev` | Start the dev server at `http://localhost:5173`. |
| `npm run build` | Produce a production build in `dist/`. |
| `npm run preview` | Serve the production build at `http://localhost:4173`. |
| `npm run lint` | Run oxlint across the source. |

Standards: function components with hooks, one component and stylesheet pair per UI unit, and core logic isolated in `frontend/src/lib/` so views stay thin. Numeric output uses tabular figures for stable alignment. The production build is verified with `npm run build` before commits that touch the app.

## Credits & Attribution

| Area | Credit |
|---|---|
| Match results and schedule | football-data.org |
| Live lineups and match stats | ESPN |
| Stadium photography | Wikimedia Commons (CC-licensed, attributed per venue in-app) |
| Map and boundary data | Natural Earth |
| Team rankings | FIFA rankings snapshot |
| World Cup 26 logo animation | [Happy Monster on IconScout](https://iconscout.com/contributors/happy-monster/lottie-animations) |
| Design, model, and concept | Ellison James Naz |

## License & Questions

Released under the MIT License. See the [`LICENSE`](./LICENSE) file at the repository root.

Questions, ideas, and issues are welcome. This is a live portfolio project: honest about its limits, and built to grow toward a genuinely useful tournament companion.
