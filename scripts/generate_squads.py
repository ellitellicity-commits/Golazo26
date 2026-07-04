"""Generate frontend/src/data/countrySquads.json from the real WC2026 squad data.

Resolves the team_id -> country-name join that the last session flagged as the
blocker for squad data. squads_and_players.csv keys players only by an opaque
team_id (1..48); the name for each id is recovered by bridging through
match_team_stats.csv (match_id, team_id, ordered home-first) into
matches_detailed.csv (match_id -> home/away names). The mapping is validated:
every team_id must resolve to exactly one country across all its matches, or the
script fails rather than emit a bad join.

Output per country: squad size + the notable players (top by market value), each
with position, club, caps, goals, market value. All REAL — nothing invented.
Coach and tournament history have no source in the repo and are NOT emitted here;
the Atlas keeps surfacing those as "pending".

Run from anywhere:  python scripts/generate_squads.py
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SQUADS_CSV = REPO / 'data' / 'raw' / 'wc2026' / 'squads_and_players.csv'
STATS_CSV = REPO / 'data' / 'raw' / 'wc2026' / 'match_team_stats.csv'
MATCHES_CSV = REPO / 'data' / 'raw' / 'wc2026' / 'matches_detailed.csv'
OUT_JSON = REPO / 'frontend' / 'src' / 'data' / 'countrySquads.json'

# Standardize 2026 match-data names to the frontend's name set (matches the map
# used in generate_fixtures.py, so squad keys line up with fifa_rankings.json etc).
TEAM_NAME_FIX = {
    'Cabo Verde': 'Cape Verde', 'Congo DR': 'DR Congo', "Côte d'Ivoire": 'Ivory Coast',
    'IR Iran': 'Iran', 'Türkiye': 'Turkey', 'USA': 'United States',
}


def resolve_team_ids():
    """team_id -> country name, via match_team_stats (home-first) x matches_detailed."""
    md = {}
    with open(MATCHES_CSV) as f:
        for r in csv.DictReader(f):
            home = TEAM_NAME_FIX.get(r['home_team_name'], r['home_team_name'])
            away = TEAM_NAME_FIX.get(r['away_team_name'], r['away_team_name'])
            md[r['match_id']] = (home, away)

    ordered = defaultdict(list)  # match_id -> [team_id, ...] in file order (home first)
    with open(STATS_CSV) as f:
        for r in csv.DictReader(f):
            ordered[r['match_id']].append(r['team_id'])

    votes = defaultdict(lambda: defaultdict(int))  # team_id -> {name: count}
    for mid, tids in ordered.items():
        if mid not in md or len(tids) != 2:
            continue
        home, away = md[mid]
        votes[tids[0]][home] += 1
        votes[tids[1]][away] += 1

    mapping = {}
    for tid, names in votes.items():
        if len(names) != 1:
            raise SystemExit(f'AMBIGUOUS join for team_id {tid}: {dict(names)} — refusing to emit')
        mapping[tid] = next(iter(names))
    if len(mapping) != 48:
        raise SystemExit(f'expected 48 teams, resolved {len(mapping)} — refusing to emit')
    return mapping


def intval(s, default=0):
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return default


def main():
    tid_to_name = resolve_team_ids()
    by_team = defaultdict(list)
    with open(SQUADS_CSV) as f:
        for r in csv.DictReader(f):
            name = tid_to_name.get(r['team_id'])
            if not name:
                continue
            by_team[name].append({
                'name': r['player_name'],
                'position': r['position'],
                'club': r['club_team'],
                'caps': intval(r['caps']),
                'goals': intval(r['goals']),
                'value': intval(r['market_value_eur']),
            })

    NOTABLE = 5
    out = {}
    for name, players in by_team.items():
        ranked = sorted(players, key=lambda p: p['value'], reverse=True)
        out[name] = {
            'squadSize': len(players),
            'notablePlayers': [
                {k: p[k] for k in ('name', 'position', 'club', 'caps', 'goals')}
                for p in ranked[:NOTABLE]
            ],
        }

    payload = {
        'note': 'Real WC2026 squad data from data/raw/wc2026/squads_and_players.csv, '
                'joined to country names via match_team_stats + matches_detailed. '
                'notablePlayers = top 5 by market value. No coach/history source exists; '
                'those stay pending in the Atlas.',
        'teams': dict(sorted(out.items())),
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')
    total = sum(t['squadSize'] for t in out.values())
    print(f'[OK] {OUT_JSON.relative_to(REPO)}  ({len(out)} teams, {total} players)')
    print('sample:', json.dumps(out['New Zealand'], ensure_ascii=False))


if __name__ == '__main__':
    main()
