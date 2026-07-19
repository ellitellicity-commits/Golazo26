<div align="center">

# GOLAZO26 (World Cup 2026 Analytics Ecosystem)

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=14&pause=2000&color=002395&center=true&vCenter=true&multiline=true&height=60&width=750&lines=%22Sometimes+in+the+life+I%27m+too+competitive%2C+you+know%2C;it%27s+good+to+be+competitif...%22+-+Kylian+Mbappe)

[![Status](https://img.shields.io/badge/STATUS-LIVE-28A745?style=flat-square)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)]()
[![Three.js](https://img.shields.io/badge/Three.js-Globe-000000?style=flat-square&logo=three.js&logoColor=white)]()
[![XGBoost](https://img.shields.io/badge/XGBoost-Predictions-FF6B00?style=flat-square)]()
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)]()

**[FIRE IT UP →](https://world-cup-2026-analytics-xi.vercel.app)**

</div>

---

## Overview (What This Is)

Golazo26 is a broadcast-grade analytics ecosystem for the 2026 FIFA World Cup, built and deployed live during the actual tournament. It combines a machine-learning match predictor, a Monte Carlo tournament simulator, an interactive 3D globe encyclopedia, and real-time bracket/standings tracking into one cohesive, broadcast-desk-styled experience: not just a stats dashboard, a full companion for following the tournament.

| | |
|---|---|
| **Built during** | The live 2026 FIFA World Cup (USA · Canada · Mexico) |
| **Scope** | 48 nations, group stage through the Final |
| **Core disciplines** | Frontend engineering, 3D/WebGL, ML prediction, live data integration |
| **Author** | [Ellison N.](https://github.com/ellitellicity-commits) |

---

## Demo (See It In Action)

**Matchup Sandbox: Pregame Cutscene**
Pick any two nations, any round. Watch the VS card, plane flight, stadium flyover, and referee whistle play out before the model delivers its call.

<video src="https://raw.githubusercontent.com/ellitellicity-commits/Golazo26/main/assets/matchup-sandbox-demo.mp4" controls width="600"></video>


**Live During the Real Tournament**
The Predictor tab tracking the actual Third Place match, France vs England, with live ESPN-sourced stats and match events while the game was in progress.

<div align="center">
  <img src="./assets/predictor-live-bronze-final.png" alt="Live match predictor: France vs England Bronze Final" width="400">
</div>

---

## Features (What It Does)

| Feature | What it does |
|---|---|
| **Match Predictor** | Win / draw / loss probabilities for any fixture, group stage through the final |
| **Monte Carlo Simulator** | Simulates the full 48-team tournament 10,000 times. Who lifts the trophy? Run it and find out |
| **The Atlas** | Spin an interactive 3D globe of all 48 nations. Click any country for its full story: squad, Elo, all-time record, group path. Host nations get bespoke animated mascots |
| **Matchup Sandbox** | Pick any two nations, any round. Watch a cinematic pregame cutscene, then get the model's call |
| **Live Group Standings** | Real tables rebuilt from live results with the full FIFA 2026 tiebreaker sequence applied, not an approximation |
| **Knockout Bracket** | Redraws in real time as results land, with the champion's path traced all the way through |
| **Championship Odds** | Every team's title shot, updated off the latest simulation run |

---

## Tech Stack (Under the Hood)

| Layer | Technology |
|---|---|
| Frontend framework | React 19, Vite |
| 3D / animation | Three.js, React Three Fiber, GSAP |
| Prediction model | XGBoost (gradient-boosted trees) |
| Simulation engine | Monte Carlo, 10,000 runs per bracket |
| Live match data | football-data.org (server-side key injection) |
| Stats & lineups | ESPN API (keyless, CORS-open) |
| Geography | Natural Earth, D3 |
| Deployment | Vercel (frontend), GitHub |

---

## AI Model (How Predictions Are Made)

| Metric | Value |
|---|---|
| Accuracy | ~46.2% on a three-class problem (win / draw / loss) |
| Weakest class | Draws, the hardest outcome to call in football |
| Train/test split | Date-based, not random. No leakage from future results |
| What it predicts | Outcomes only, not scorelines. Displayed scores are always real results |
| Simulation depth | 10,000 Monte Carlo runs sampling from model probabilities per match |
| Host advantage | Applied only where genuinely home (USA/Canada/Mexico), never on neutral-venue matches |

> A strong read on a football tournament. Not a crystal ball: predictions are for analysis, not wagering.

---

## Data Sources (Where the Numbers Come From)

| Source | Used for |
|---|---|
| football-data.org | Live results, match schedule, LIVE indicator |
| ESPN API | Lineups, in-game stats, current match minute |
| Natural Earth | Globe coastlines, host-country sub-maps, country outlines |
| Wikimedia Commons | Stadium photography (CC-licensed, attributed per venue) |
| Wikipedia | Country history blurbs (Atlas encyclopedia) |
| FIFA rankings snapshot | Team strength baseline and tiebreaker inputs |

---

## Getting Started (Running It Locally)

```bash
cd frontend
npm install
npm run dev        # localhost:5173
```

Runs fully offline on a bundled snapshot, no keys required. For live results:

```bash
cp .env.example .env
# drop in FOOTBALL_DATA_API_KEY, free at football-data.org
```

---

## Known Limitations (Being Upfront)

| Limitation | Reality |
|---|---|
| Model accuracy | ~46.2% on three classes. Useful, not oracular |
| Draws | Hardest outcome in football to predict, and the weakest part of the model |
| No scorelines | Predicts win / draw / loss only, not goals |
| Desktop-first | Mobile layout is not fully implemented yet |
| Player headshots | ESPN covers roughly 4% of 2026 squads. Falls back to initials gracefully |
| Live source coupling | Depends on football-data.org and ESPN schemas, which can change without notice |
| No persistence | Simulation results live in memory and reset between sessions |

---

## Deployment (How It Ships)

Vercel, auto-deploying on every push to `main`. The football-data.org key lives server-side and never touches the client bundle. The app degrades gracefully to a static snapshot if no key is set: it never breaks, it just goes quiet.

---

<div align="center">

*GOLAZO26 was built live during the 2026 World Cup by: [Ellison N.](https://github.com/ellitellicity-commits)*

</div>

