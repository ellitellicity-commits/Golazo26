<div align="center">

# GOLAZO26

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=16&pause=2000&color=002395;FFFFFF;ED2939&center=true&vCenter=true&width=750&lines=%22Sometimes+in+the+life+I%27m+too+competitive%2C+you+know%2C+it%27s+good+to+be+competitif...%22+%E2%80%94+Kylian+Mbappe;%22Sometimes+in+the+life+I%27m+too+competitive%2C+you+know%2C+it%27s+good+to+be+competitif...%22+%E2%80%94+Kylian+Mbappe;%22Sometimes+in+the+life+I%27m+too+competitive%2C+you+know%2C+it%27s+good+to+be+competitif...%22+%E2%80%94+Kylian+Mbappe)

[![Status](https://img.shields.io/badge/STATUS-LIVE-28A745?style=flat-square)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)]()
[![Three.js](https://img.shields.io/badge/Three.js-Globe-000000?style=flat-square&logo=three.js&logoColor=white)]()
[![XGBoost](https://img.shields.io/badge/XGBoost-Predictions-FF6B00?style=flat-square)]()

**[FIRE IT UP!](https://world-cup-2026-analytics-xi.vercel.app)**

</div>

---

## What's in it

| Feature | What it does |
|---|---|
| Match Predictor | Win / draw / loss probabilities for any fixture, group stage through the final |
| Monte Carlo Simulator | Simulates the full 48-team tournament 10,000 times. Who lifts the trophy? Run it and find out |
| The Atlas | Spin an interactive 3D globe of all 48 nations, click any country and get their full story: squad, Elo, all-time record, group path. Host nations get their own animated mascots |
| Matchup Sandbox | Pick any two nations, any round, watch a pregame cutscene and get the model's call |
| Live Group Standings | Real tables rebuilt from live results with the full FIFA 2026 tiebreaker sequence applied, not an approximation |
| Knockout Bracket | Redraws in real time as results land, with the champion's path traced all the way through |
| Championship Odds | Every team's title shot updated off the latest simulation run |

## Under the hood

| | |
|---|---|
| React 19 | Vite |
| Three.js | GSAP |
| XGBoost | Monte Carlo |
| football-data.org | ESPN API |
| Natural Earth | D3 |

## Running it

```bash
cd frontend
npm install
npm run dev        # localhost:5173
```

Runs fully offline on a bundled snapshot, no keys needed. For live results:

```bash
cp .env.example .env
# drop in FOOTBALL_DATA_API_KEY, free at football-data.org
```

## The model, straight up

| Stat | Reality |
|---|---|
| Accuracy | ~46.2% on a three-class problem (win / draw / loss) |
| Weakest class | Draws, the hardest call in football |
| Train/test split | Date-based, not random. No leakage from future results |
| What it predicts | Outcomes, not scorelines. Displayed scores are always real results |
| Simulation | 10,000 Monte Carlo runs sampling from model probabilities per match |

Strong read on a football tournament. Not God.

## Data

| Source | Used for |
|---|---|
| football-data.org | Live results, match schedule, LIVE indicator |
| ESPN API | Lineups, in-game stats, current match minute |
| Natural Earth | Globe coastlines, host-country sub-maps, country outlines |
| Wikimedia Commons | Stadium photography (CC-licensed, attributed per venue) |
| FIFA rankings snapshot | Team strength baseline and tiebreaker inputs |

## Known limitations

| Limitation | Reality |
|---|---|
| Model accuracy | ~46.2% on three classes. Useful, not oracular |
| Draws | Hardest outcome in football to predict. Weakest part of the model |
| No scorelines | Predicts win / draw / loss only, not goals |
| Desktop-first | Mobile layout is not fully implemented yet |
| Player headshots | ESPN covers about 4% of 2026 squads. Falls back to initials gracefully |
| Live source coupling | Depends on football-data.org and ESPN schemas, which can change without notice |
| No persistence | Simulation results live in memory and reset between sessions |

## Deployment

Vercel. Auto-deploys on push to `main`. football-data.org key lives server-side, never touches the client bundle. Degrades gracefully to the static snapshot if no key is set.

---

*Golazo26 built live during the 2026 World Cup by [Ellison James Naz](https://github.com/ellitellicity-commits)*

