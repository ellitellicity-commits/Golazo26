# ⚽ World Cup 2026 Predictor & Dashboard

<p align="center">
  <img src="./frontend/assets/hero-banner.svg" alt="World Cup 2026" width="100%">
</p>

## Overview

A match predictor, Monte Carlo bracket simulator, and live player dashboard for the 2026 FIFA World Cup. It pairs an XGBoost outcome model with a simulation engine that plays out the full 48-team tournament thousands of times, then presents the results through a broadcast-style interface fed by live match data.

## Key Features

| Feature | Description |
|---|---|
| Match predictor | XGBoost classifier estimates win, draw, and loss probabilities for any fixture. |
| Bracket simulator | Monte Carlo engine runs the tournament 10,000 times to produce advancement and title odds. |
| Live group standings | Real group tables rebuilt from results, with full FIFA 2026 tiebreaker rules applied. |
| Knockout bracket view | Interactive R32-to-final bracket that redraws as results and simulations change. |
| Live match panel | Lineups, in-game stats, and current minute pulled from live sources during matches. |
| Two simulation modes | Respect Reality keeps real results and randomizes the future; Reimagine re-rolls the whole tournament. |
| Championship odds | Per-team title probability, updated from the latest simulation run. |
| Static-first fallback | Runs fully on a bundled data snapshot with no keys or backend required. |

<p align="center">
  <img src="./frontend/assets/shields-banner.svg" alt="Host nations: United States, Canada, Mexico" width="100%">
</p>

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| UI framework | React 19 | Function components and hooks throughout. |
| Build tool | Vite 8 | Dev server, HMR, production bundling, and the live-data proxy. |
| Routing | react-router-dom v7 | Client-side routing across the five main pages. |
| Linting | oxlint | Fast Rust-based linter (`npm run lint`). |
| Flags and icons | flag-icons | Country flags for teams and host nations. |
| Model | XGBoost | Outcome classifier trained on historical and WC2026 data (in the Python side of the repo). |
| Data format | Static JSON | Bundled snapshot under `src/data/` powers the app offline. |

## Installation & Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or newer |
| npm | 9 or newer |
| Python (backend / model, optional) | 3.10 or newer |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

### Backend and model (optional)

The prediction model and data pipeline live in the Python side of the repository (see `requirements.txt`, `notebooks/`, `scripts/`, and `models/`). The frontend does not require them to run, since it ships with a static data snapshot. To work on the model, from the repository root:

```bash
pip install -r requirements.txt
```

### Environment variables

Live results from football-data.org are optional. Without a key the app runs entirely on the bundled snapshot.

```bash
cd frontend
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `FOOTBALL_DATA_API_KEY` | Free key from football-data.org. Read only by `vite.config.js` and injected server-side by the proxy, so it never reaches the browser bundle. |

The key is deliberately not `VITE_`-prefixed. `VITE_`-prefixed variables are inlined into the client bundle, which would leak the key to anyone viewing source. Requests go through a same-origin `/football-api/*` proxy that adds the auth header on the server. When no key is set, the proxy is disabled and the compiled `__HAS_LIVE_DATA__` flag tells the client to skip the live fetch.

## Data Sources

| Dataset | Source | Coverage | Purpose |
|---|---|---|---|
| `bracket.json` | Static snapshot | Knockout structure, R32 to final | Seeds the bracket view and simulator. |
| `fixtures.json` | Static snapshot / football-data.org | 104 group and knockout matches | Schedule and results feed. |
| `matches.json` | Static snapshot | Played and scheduled matches | Standings reconstruction and predictions. |
| `fifa_rankings.json` | Static snapshot | 48 qualified teams | Strength baseline and tiebreaker inputs. |
| `odds.json` | Model output | Per-team title odds | Championship odds display. |
| Live results | football-data.org (server-side proxy) | Live and recent World Cup results | Refreshes fixtures and the LIVE indicator. |
| Live match detail | ESPN (direct client fetch) | Lineups, in-game stats, current minute | Powers the live match panel. |

## Project Structure

```
frontend/
├── assets/                 # README banners (this document)
├── public/                 # Static files served as-is
├── src/
│   ├── assets/             # In-app images (hero, logos)
│   ├── components/         # UI building blocks
│   │   ├── AppNav.jsx          # Top navigation / masthead
│   │   ├── Bracket.jsx         # Full knockout bracket layout
│   │   ├── KnockoutCard.jsx    # Single knockout tie
│   │   ├── MatchCard.jsx       # Single fixture card
│   │   ├── LiveStatsPanel.jsx  # Expandable live match stats
│   │   ├── ProbabilityBar.jsx  # Win/draw/loss probability bar
│   │   ├── ChampionshipOdds.jsx# Title odds board
│   │   ├── FixturesRail.jsx    # Scrollable fixtures rail
│   │   ├── BrandMarks.jsx      # Host-nation and brand marks
│   │   ├── LoadingScreen.jsx   # Entry loading state
│   │   └── Confetti.jsx        # Championship moment effect
│   ├── pages/              # Routed views
│   │   ├── Home.jsx            # Landing / overview
│   │   ├── Predictor.jsx       # Match predictor
│   │   ├── Groups.jsx          # Group standings
│   │   ├── BracketView.jsx     # Knockout bracket
│   │   └── Odds.jsx            # Championship odds
│   ├── lib/                # Core logic (see How It Works)
│   │   ├── simulation.js       # Monte Carlo engine
│   │   ├── bracket.js          # Group and bracket reconstruction
│   │   ├── standings.js        # Tiebreaker logic
│   │   ├── espn.js             # Live lineups and stats
│   │   ├── live.js             # Live polling loop
│   │   ├── teams.js            # Team name reconciliation
│   │   ├── data.js             # Data loading and fallback
│   │   └── tournamentData.jsx  # Tournament data assembly
│   ├── data/               # Bundled JSON snapshot
│   ├── styles/             # tokens.css and shared styles
│   ├── App.jsx             # App shell and routes
│   └── main.jsx            # Entry point
├── vite.config.js          # Build config + live-data proxy
├── .env.example            # Environment variable template
└── package.json
```

## How It Works

### Prediction Model

An XGBoost classifier predicts match outcomes (win, draw, loss) at roughly 46.2% accuracy on held-out data. Rather than raw form alone, it learns from a small set of engineered features:

| Feature | What it captures |
|---|---|
| Elo difference | Relative strength of the two teams. |
| Rolling form | Recent results weighted toward the latest matches. |
| Venue host advantage | Venue-specific boost for the host nations. |
| Tournament stage | Group versus knockout context. |

The model output feeds both the on-screen predictor and the per-match probabilities the simulator draws from.

### Simulation Engine

`simulation.js` runs a Monte Carlo simulation of the full tournament. Each run plays every remaining match by sampling from the model's probabilities, resolves the 12 groups into a knockout bracket via `bracket.js`, and plays through to a champion. Aggregating 10,000 runs gives advancement and title odds. A full 10,000-run pass completes in about 13 seconds thanks to prediction caching, so repeated matchups are not recomputed.

Two modes control how the tournament is treated:

| Mode | Behavior |
|---|---|
| Respect Reality | Keeps matches that have already been played and randomizes only the future. |
| Reimagine | Re-rolls the entire tournament from the group stage as if nothing had been decided. |

`standings.js` reconstructs group tables and applies the FIFA 2026 tiebreaker sequence (points, then head-to-head, goal difference, goals scored, and the remaining criteria) so that group winners and runners-up match how the real tournament would resolve.

### Live Data Pipeline

Live data comes from two independent sources, chosen for what each does well:

| Source | Access | Provides |
|---|---|---|
| football-data.org | Server-side proxy in `vite.config.js` | Live and recent match results, LIVE indicator. |
| ESPN | Direct client fetch in `espn.js` | Lineups, in-game stats, and current match minute. |

`live.js` runs the polling loop that refreshes state during matches. `teams.js` reconciles team names across the model data, the two live sources, and the flag icons, since each source spells and abbreviates nations differently.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Static snapshot as the default data source | The app must load and demo instantly with no keys, no backend, and no network. Live data is an enhancement layer, not a dependency. |
| Server-side proxy for football-data.org | The API needs an auth token and sends no CORS headers, so the browser cannot call it directly. The proxy also keeps the key out of the client bundle. |
| Direct client fetch for ESPN | ESPN's endpoints are CORS-open and keyless, so lineups and live stats can be fetched from the browser without a proxy. |
| XGBoost over a deep model | The dataset is small and mostly tabular. Gradient-boosted trees give strong accuracy, fast inference, and interpretable features. |
| Prediction caching in the simulator | Monte Carlo repeats the same matchups many times. Caching each matchup's probabilities is what keeps 10,000 runs near 13 seconds. |
| Two simulation modes | Respect Reality is for tracking the real tournament; Reimagine is for what-if exploration. Both share the same engine. |
| Broadcast-desk visual language | The interface is styled after a 2026 broadcast production rather than a generic dashboard, so the data reads as authoritative. |

## Known Limitations & Future Work

### Current limitations

| Limitation | Detail |
|---|---|
| Model accuracy | Around 46.2% on a three-class problem. Good for a football outcome model, but far from certain. |
| Draw modeling | Draws are the hardest class to predict and remain the weakest part of the model. |
| Live source coupling | Live features depend on two third-party sources whose schemas can change without notice. |
| No persistence | Simulation results live in memory for the session and are not saved between visits. |
| Snapshot freshness | Without a live key, results reflect the bundled snapshot rather than the current standings. |

### Future work

| Area | Idea |
|---|---|
| Model | Add player-availability and injury signals; calibrate probabilities. |
| Simulation | Persist and share simulation runs; add confidence intervals to odds. |
| Live | Push updates over websockets instead of polling. |
| UX | Head-to-head history view and a knockout path explorer for any team. |
| Data | Automated snapshot refresh so the offline experience stays current. |

## Development Workflow

| Command | Action |
|---|---|
| `npm run dev` | Start the dev server at `http://localhost:5173`. |
| `npm run build` | Produce a production build in `dist/`. |
| `npm run preview` | Serve the production build at `http://localhost:4173`. |
| `npm run lint` | Run oxlint across the source. |

Standards: function components with hooks, one component and stylesheet pair per UI unit, and core logic isolated in `src/lib/` so views stay thin. Numeric output uses tabular figures for stable alignment. The production build is verified with `npm run build` before commits that touch the app. Deployment targets any static host, since the build output in `dist/` is fully static and the live proxy runs through the same Vite server config in preview.

## Credits

| Area | Credit |
|---|---|
| Match results and schedule | football-data.org |
| Live lineups and match stats | ESPN |
| Team rankings | FIFA rankings snapshot |
| Design and concept | Ellison James Naz |
| Model and simulation | Ellison James Naz |

## License & Questions

Released under the MIT License. See the [`LICENSE`](./LICENSE) file at the repository root.

Questions, ideas, or issues are welcome. This is a beta portfolio project: honest about its limits, and built to grow toward a genuinely useful tournament companion.
