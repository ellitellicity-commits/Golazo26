// Per-venue encyclopedia facts + procedural 3D model specs for the 16 WC2026
// host stadiums. Keyed by the same stadium name as lib/stadiumData.js (which
// carries the geo/capacity/city fields) — this module adds the editorial blurb
// and the shape parameters that make each stadium's 3D model distinct.
//
// GROUNDING: each `blurb` is written from the venue's real record — opening
// year, tenants, and one genuine notable fact (a Super Bowl, a World Cup final,
// an architectural signature) — not templated filler. Cross-checked per venue,
// the same discipline as the country history sentences.
//
// MODEL SPECS: `plan` (bowl footprint), `tiers` (stand height), `roof` variant,
// and `tone` (neutral broadcast greys/steel/white — host colours stay role-
// locked to the globe, not the models) are combined so no two of the 16 read
// alike. Grounded loosely in each real roof/silhouette (SoFi's translucent
// canopy, Mercedes-Benz's pinwheel, Azteca's steep open bowl, BBVA's open end).
// This is the interim stylized-geometry approach (Spline has no headless export
// here) — distinct per venue, not one box reused 16 times.

export const STADIUM_INFO = {
  'MetLife Stadium': {
    opened: 2010,
    blurb: 'Home to both the Giants and the Jets and the largest stadium in the NFL by seating, MetLife hosted Super Bowl XLVIII in 2014 — the first open-air, cold-weather Super Bowl. It stages the 2026 World Cup Final.',
    plan: 'oval', tiers: 3, roof: 'ring', tone: 0xb8bcc4,
  },
  'SoFi Stadium': {
    opened: 2020,
    blurb: 'The $5bn home of the Rams and Chargers sits under a fixed, translucent ETFE canopy with open sides, the roof spanning the concourse rather than the seats. It hosted Super Bowl LVI in 2022, two years after opening.',
    plan: 'round', tiers: 2, roof: 'canopy', tone: 0xe4e7ec,
  },
  'AT&T Stadium': {
    opened: 2009,
    blurb: "The Dallas Cowboys' home is defined by its vast retractable roof and the center-hung video board that hangs over the field. Its arches carry the largest column-free interior in the world.",
    plan: 'oval', tiers: 2, roof: 'retract', tone: 0xc4c8ce,
  },
  'Arrowhead Stadium': {
    opened: 1972,
    blurb: 'One of the oldest venues on the 2026 slate and home of the Chiefs, Arrowhead holds the Guinness record for the loudest outdoor stadium — a crowd roar measured at 142.2 dB. A steep, fully open bowl.',
    plan: 'round', tiers: 3, roof: 'open', tone: 0xa8adb4,
  },
  'NRG Stadium': {
    opened: 2002,
    blurb: "Home of the Houston Texans, NRG was the NFL's first facility with a retractable roof. Its two roof panels split down the centre line to open the field to the Texas sky.",
    plan: 'rect', tiers: 2, roof: 'retract', tone: 0xcfd3d9,
  },
  'Mercedes-Benz Stadium': {
    opened: 2017,
    blurb: 'The Falcons and Atlanta United share a stadium whose signature eight-panel retractable roof opens like a camera aperture, ringed by a 360° "halo" video board. A distinctly futuristic silhouette.',
    plan: 'round', tiers: 3, roof: 'pinwheel', tone: 0x9aa0a8,
  },
  'Hard Rock Stadium': {
    opened: 1987,
    blurb: "The Dolphins' home gained a signature open canopy over the stands in a 2016 renovation, leaving the field uncovered. It also hosts the Miami Open and the F1 Miami Grand Prix.",
    plan: 'oval', tiers: 2, roof: 'canopy', tone: 0xbfc3ca,
  },
  'Lincoln Financial Field': {
    opened: 2003,
    blurb: "Home of the Eagles, 'the Linc' is a steep open bowl known for one of the most partisan atmospheres in American football. Its bowed sideline stands rise close to the touchline.",
    plan: 'oval', tiers: 3, roof: 'open', tone: 0x9ba1a9,
  },
  'Gillette Stadium': {
    opened: 2002,
    blurb: 'Home to the Patriots and the Revolution, Gillette is marked by the lighthouse and bridge at its open north end, and more recently the largest curved videoboard in a US sports venue.',
    plan: 'rect', tiers: 2, roof: 'open', tone: 0xcdd1d7,
  },
  "Levi's Stadium": {
    opened: 2014,
    blurb: "The 49ers' home is one of the greenest stadiums built — a solar-panel canopy and a living green roof — and deliberately asymmetric, with the tall main stand on one side open to the Santa Clara sky.",
    plan: 'rect', tiers: 2, roof: 'sides', tone: 0xc7cbd1, asym: true,
  },
  'Lumen Field': {
    opened: 2002,
    blurb: 'Home of the Seahawks and Sounders, Lumen roofs both sideline stands while leaving the ends open — a design that traps and reflects crowd noise, making it one of the loudest grounds in the country.',
    plan: 'oval', tiers: 2, roof: 'sides', tone: 0xaab0b8,
  },
  'Estadio Azteca': {
    opened: 1966,
    blurb: 'The spiritual home of Mexican football and the only stadium to host two World Cup finals — 1970 and 1986. A vast, steep open bowl at 2,200m altitude, it stages the 2026 opening match.',
    plan: 'round', tiers: 3, roof: 'ring', tone: 0x9a958c,
  },
  'Estadio Akron': {
    opened: 2010,
    blurb: "Guadalajara's home for Chivas, Akron is sunk into the ground and wrapped in a sloping grass-covered berm, crowned by an undulating roof designed to read like a cloud settling over the bowl.",
    plan: 'round', tiers: 1, roof: 'canopy', tone: 0xaeb4a6,
  },
  'Estadio BBVA': {
    opened: 2015,
    blurb: 'Monterrey\'s "Steel Giant" (El Gigante de Acero), home of Rayados, frames the Cerro de la Silla mountain through its deliberately open end — the peak visible from most of the seats.',
    plan: 'rect', tiers: 2, roof: 'sides', tone: 0x9297a0, openEnd: true,
  },
  'BC Place': {
    opened: 1983,
    blurb: "Vancouver's home for the Whitecaps and BC Lions traded its inflated dome for a cable-supported retractable roof in 2011 — the largest of its kind — that furls to a central ring above the pitch.",
    plan: 'round', tiers: 2, roof: 'retract', tone: 0xe0e3e8,
  },
  'BMO Field': {
    opened: 2007,
    blurb: "Canada's first soccer-specific stadium and home of Toronto FC, BMO Field is an intimate, mostly open ground with a single roofed west stand — expanded with temporary seating for the World Cup.",
    plan: 'rect', tiers: 1, roof: 'sides', tone: 0xc9cdd3, oneSide: true,
  },
}

export function getStadiumInfo(name) {
  return STADIUM_INFO[name] || null
}
