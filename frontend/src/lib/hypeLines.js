// Procedural hype-line pool + selector for the pregame cutscene (B4, beat 4).
// Broadcast-style commentary rendered on screen (no audio) — the line varies
// with the matchup context so a host-nation opener doesn't read like a random
// group tie. Each category has a genuinely distinct pool (6 lines); the selector
// picks the most salient category, then two distinct lines from it.
//
// Tokens {home} {away} {venue} {city} are filled at render time.

const POOLS = {
  // A 2026 host is on the pitch, on home soil.
  host: [
    'The hosts take the field — and a nation rises with them.',
    'Home soil. Home crowd. {home} feel the roar of {city}.',
    'Everything they built toward. {home} walk out at {venue}.',
    'A continent is watching, but this house belongs to {home}.',
    'The tournament came home — and {home} intend to make it count.',
    '{city} is on its feet. The hosts have arrived.',
  ],
  // A classic rivalry / repeat meeting.
  rivalry: [
    'Old rivals, new stakes. {home} and {away} settle it again.',
    'History between these two — and another chapter starts now.',
    'They know each other too well. {home} versus {away}, once more.',
    'No love lost. {home} and {away} renew an old grudge.',
    'Some fixtures never lose their edge. This is one of them.',
    'The rivalry resumes at {venue} — and neither side blinks.',
  ],
  // A heavy favourite against a clear underdog.
  underdog: [
    'Everyone has {home} favoured. Nobody told {away}.',
    'On paper it is one-sided. Football is not played on paper.',
    'The underdogs have nothing to lose and a night to remember.',
    '{away} arrive as the story nobody predicted.',
    'Giant-killers are made on nights like this at {venue}.',
    'The odds say one thing. {away} came to argue.',
  ],
  // Knockout / heavyweight collision — high stakes.
  highStakes: [
    'Win or fly home. {home} and {away} leave nothing behind.',
    'One match. One winner. The margins are razor-thin.',
    'Two heavyweights, one place in the next round.',
    'This is what the tournament is built for — {home} versus {away}.',
    'No second chances now. {venue} braces for the collision.',
    'The stakes could not be higher. Kickoff at {venue}.',
  ],
  // Everything else — a straight, big-stage opener.
  neutral: [
    '{home} versus {away}. The wait is over.',
    'Under the lights at {venue}, the tie is set.',
    'Two nations, ninety minutes, one story to write.',
    'The teams are out. {city} holds its breath.',
    'Everything on the line begins with a single whistle.',
    'The stage is set at {venue}. Let it begin.',
  ],
}

// Rivalry pairs (unordered) — classic repeat meetings worth their own lines.
const RIVALRIES = [
  ['Argentina', 'Brazil'], ['Argentina', 'England'], ['Germany', 'Netherlands'],
  ['United States', 'Mexico'], ['Mexico', 'United States'], ['Spain', 'Portugal'],
  ['England', 'Germany'], ['Brazil', 'France'], ['France', 'Germany'],
  ['Uruguay', 'Argentina'], ['Japan', 'South Korea'], ['Netherlands', 'Belgium'],
]
const HOSTS = new Set(['United States', 'Canada', 'Mexico'])

function isRivalry(a, b) {
  return RIVALRIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

// Pick two distinct lines from an array (or one if the pool is tiny).
function twoOf(arr) {
  if (arr.length < 2) return arr.slice()
  const i = Math.floor(Math.random() * arr.length)
  let j = Math.floor(Math.random() * (arr.length - 1))
  if (j >= i) j++
  return [arr[i], arr[j]]
}

function fill(line, ctx) {
  return line
    .replaceAll('{home}', ctx.home)
    .replaceAll('{away}', ctx.away)
    .replaceAll('{venue}', ctx.venue)
    .replaceAll('{city}', ctx.city)
}

// Choose the most salient category for the matchup and return { category, lines }.
// Priority: rivalry → host → heavy underdog → knockout high-stakes → neutral.
export function pickHype({ home, away, venue, city, pHome, roundId }) {
  const ctx = { home, away, venue, city }
  let category = 'neutral'
  if (isRivalry(home, away)) category = 'rivalry'
  else if (HOSTS.has(home) || HOSTS.has(away)) category = 'host'
  else if (Math.abs(pHome - 0.5) >= 0.28) category = 'underdog'
  else if (roundId && roundId !== 'group') category = 'highStakes'
  return { category, lines: twoOf(POOLS[category]).map((l) => fill(l, ctx)) }
}

export { POOLS }
