---
name: WorldCup 2026 Analytics
description: Match predictor, Monte Carlo bracket simulator, and player dashboard for the 2026 FIFA World Cup.
colors:
  studio-black: "#080c0f"
  surface-card: "#101419"
  surface-elevated: "#181e23"
  surface-overlay: "#21272d"
  border-divider: "#292e34"
  ink: "#f3f5f8"
  ink-secondary: "#a5acb2"
  ink-muted: "#8a9096"
  mexican-green: "#35c26d"
  mexican-green-deep: "#00a24f"
  canadian-red: "#ed4a49"
  canadian-red-deep: "#cc272e"
  american-blue: "#439bf7"
  american-blue-deep: "#217fd8"
  trophy-gold: "#e7bf4a"
  trophy-gold-deep: "#c7a01e"
typography:
  display:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "clamp(3.5rem, 13vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.04em"
  data:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0"
    fontFeature: "tabular-nums"
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.studio-black}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#ffffff"
    textColor: "{colors.studio-black}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
  chip-live:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.canadian-red}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  chip-group:
    backgroundColor: "{colors.mexican-green}"
    textColor: "{colors.studio-black}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
---

# Design System: WorldCup 2026 Analytics

## 1. Overview

**Creative North Star: "The 2026 Broadcast Desk"**

A deep black studio surface. Three host nation colors holding down three precise data roles — Mexican green for group-stage data, Canadian red for live indicators, American blue for predictions and probability. Trophy gold appearing exactly once per landmark moment. The interface feels like the analyst desk at ESPN or a FIFA broadcast production: high contrast, unhurried authority, every element earning its placement through function.

The system is cinematic without being theatrical. Motion serves the drama of the game — brackets animate on draw, scores count up, the champion reveal lands gold — but nothing moves for decoration, and the everyday UI loads instantly into the task. The cinematic register is reserved for the focal moments (a match score, a championship), the way a broadcast saves its full-screen graphics for the goal, not the lineup card.

This system explicitly rejects: generic SaaS dashboard chrome (sidebar navs, card grids, blue-accent BI tools); sportsbook gambling aesthetics (dark green + gold odds, transactional feel); academic Jupyter-notebook output (matplotlib charts, pandas-table density, code-visible formatting); overcrowded stats-site data dumps; neon, glow effects, or any cyberpunk RGB aesthetic; and AI-generated default palettes (teal/purple/gradient combos, tinted cream backgrounds, any combination that reads as "first training-data reflex").

**Key Characteristics:**
- 70%+ deep cool-black surface (`#080c0f`, OKLCH 15% 0.01 250) — everything else is signal
- Three host nation colors, three locked data roles, zero decorative use
- Barlow Condensed display (scores, names, headlines) + Inter body (prose, UI, data)
- All numerics in `tabular-nums` so figures never shift column width
- Motion anchored to real events; the cinematic tier is saved for focal moments
- Interactive chrome is neutral — color belongs to data, never to buttons

## 2. Colors

Four deliberate roles on a cool near-black ground. Every chromatic color encodes a specific data meaning; nothing chromatic is decorative. Contrast was verified against both the body and card surfaces — every text and data color clears WCAG AA body (≥4.5:1).

### Primary
- **Studio Black** (`#080c0f` / oklch(15% 0.01 250)): The default body surface, ≥70% of any view. Cool-tinted (hue 250), not pure black — a studio environment, not a void or a gaming rig.

### Secondary — Host Nation Roles

**The Host Nation Rule.** Three accent colors, three data roles, no exceptions. Green encodes group-stage data. Red encodes live state. Blue encodes predictions and probability. None appears outside its role. A red "save" button or a green hover state is a violation — interactive chrome is neutral (see §5).

- **Mexican Green** (`#35c26d` / oklch(72% 0.17 152); deep `#00a24f`): Group data — standings tables, group-phase records, team groupings. Contrast on black: 8.5:1.
- **Canadian Red** (`#ed4a49` / oklch(64% 0.20 25); deep `#cc272e`): Live state — active-match indicators, real-time score changes, the "LIVE" chip, current-round markers. Contrast on black: 5.3:1.
- **American Blue** (`#439bf7` / oklch(68% 0.16 252); deep `#217fd8`): Predictions and probability — the win/draw/win probability bar is its primary home. **Concentrate it:** secondary probability figures (e.g. championship odds in a card footer) use neutral ink, so blue stays the one prediction signal per card rather than coating every number. Contrast on black: 6.8:1.

### Tertiary
- **Trophy Gold** (`#e7bf4a` / oklch(82% 0.14 90); deep `#c7a01e`): Championship moments only — the final winner reveal, the champion card, the masthead **favourite** odds (the predictor's single "who wins it" statement). **One deliberate use per full-screen view, maximum.** Contrast on black: 11.2:1.

### Neutral
- **Ink** (`#f3f5f8` / oklch(97% 0.005 250)): Headlines, team names, scores. 18.0:1.
- **Ink Secondary** (`#a5acb2` / oklch(74% 0.012 250)): Supporting data, captions, secondary labels. 8.5:1.
- **Ink Muted** (`#8a9096` / oklch(65% 0.012 250)): The quietest legible text — table meta, timestamps. 6.1:1. Do not go lower; this is the muted floor that still clears AA.
- **Surfaces** (`#101419` card · `#181e23` elevated · `#21272d` overlay): Tonal layering steps above Studio Black (see §4).
- **Border / Divider** (`#292e34` / oklch(30% 0.012 250)): Structural lines only. 1.4:1 — intentionally below text contrast; a divider is not text.

### Named Rules

**The 70% Rule.** Studio Black covers ≥70% of any view. If a new surface element slips the ratio, it belongs *on* the black ground, not beside a new competing surface.

**The Color-Blind Contract.** No data channel uses color as its only differentiator. Green/red/blue each pair with shape, label, position, or pattern. The three host colors are also separated in lightness (L 0.72 / 0.64 / 0.68) and hue to aid deuteranopia/protanopia, but separation is never relied on alone. Test every data visualization in CVD simulation before shipping.

**The Rarity Gradient.** Trophy gold > host accents > neutral text. The more chromatic a color, the rarer its use. Any accent crossing ~20% of a screen is no longer an accent — it's noise.

## 3. Typography

**Display Font:** Barlow Condensed (with `'Arial Narrow', sans-serif` fallback)
**Body / UI Font:** Inter (with `system-ui, sans-serif` fallback)

**Character:** Barlow Condensed is a broadcast-grade condensed grotesque — tall, tight, built for score cards, team names, and matchup headlines. Inter is a humanist UI sans with first-class tabular figures for everything the user reads or scans: analysis prose, labels, and every number. The pairing sits on a real contrast axis (condensed display vs. humanist UI); the two voices never blur.

### Hierarchy
- **Display** (Barlow Condensed 800, lh 0.9, ls −0.02em): The cinematic focal tier, and the only fluid one. Two scales: **scoreboard** for match scores — `clamp(3.5rem, 13vw, 5.5rem)`, sized to dwarf everything else on the card like a stadium board — and the **page hero** ("Match Predictor" masthead) at `clamp(3.25rem, 10vw, 5.75rem)`. Ceiling 5.75rem; never past 6rem.
- **Headline** (Barlow Condensed 700, `1.75rem`, lh 1.05): Section titles, tournament round labels, feature-card player names. Fixed size.
- **Title** (Inter 600, `1.125rem`, lh 1.3): Card headers, panel section labels, stat-group headings.
- **Body** (Inter 400, `1rem`, lh 1.6, max 70ch): Analysis text, model explanations, match notes. Never condensed.
- **Label** (Inter 500, `0.8125rem`, ls 0.04em): Chip text, status markers, data-table column headers. Uppercase permitted **only** for true data-column headers and status chips — never as a decorative section eyebrow.
- **Data** (Inter 600, `tabular-nums`): Every numeric — scores, probabilities, ELO, percentages.

### Named Rules

**The Broadcast Weight Rule.** Barlow Condensed is reserved for scores, team names, and match-scale headlines. It never appears in body prose, UI labels, buttons, or captions. If a text element is read rather than scanned, it's Inter.

**The Tabular Precision Rule.** All numeric output uses `font-variant-numeric: tabular-nums`. A number that changes column width as it updates is a data-credibility failure.

**The Fixed-Scale Rule.** Only the Display tier scales (`clamp`). Headline through Label are fixed rem — product UI viewed at consistent DPI should not have headings that shrink inside a panel. The cinematic exception earns its fluidity; the working UI does not.

## 4. Elevation

The system is dark and layered. Depth comes from lightness delta between tonal surfaces, not from shadow blur at rest. Studio Black → card → elevated → overlay is four tonal steps (`#080c0f` → `#101419` → `#181e23` → `#21272d`), same hue (250), rising lightness. Shadows appear only as state feedback (hover, focus), never as ambient decoration.

### Shadow Vocabulary
- **Hover Lift** (`box-shadow: 0 4px 16px rgba(0,0,0,0.45)`, paired with `transform: translateY(-2px)`): Interactive cards and bracket nodes on hover. The only resting-state shadow is none.
- **Focus Ring** (`box-shadow: 0 0 0 2px #080c0f, 0 0 0 4px #f3f5f8`): Keyboard focus — a 2px ink ring on a 2px black offset, maximally visible on the dark surface. **Neutral, not red:** a red ring on every focusable element would erode the red = live rule, so focus uses ink. (This refines the earlier seed, which proposed red.)

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest; depth is tonal. A shadow visible without interaction is decorative — remove it. Test: if it looks like a 2014 Material card, the resting shadow is the problem.

## 5. Components

Built in `frontend/src/components/` (`MatchCard`, `ProbabilityBar`, `FixturesRail`). The specs below are normative; the code follows them.

### Buttons
- **Shape:** Slightly squared (4px radius, `{rounded.md}`). Broadcast-sharp, not pill-soft.
- **Primary:** Neutral, high-contrast — `#f3f5f8` fill, `#080c0f` text, 10px 20px padding, Label type. Host colors are never used for buttons.
- **Secondary / Ghost:** Transparent fill, `#f3f5f8` text, 1px `#292e34` border.
- **Hover:** Primary → `#ffffff`; Secondary → `#181e23` fill. Both 150 ms; cards/nodes add the Hover Lift. **Focus:** the neutral Focus Ring.

### Chips (status / category)
- **Group:** bold, the boldest the green gets. The group letter (A–L) is a **filled green badge** — `#35c26d` fill, `#080c0f` text, 22px, weight 800 — with "GROUP" in green Label beside it. This is green's primary on-screen presence; every card carries it. The letter itself is the per-group differentiator (CVD-safe); groups are *not* hue-coded individually.
- **Today / Live:** `#ed4a49` text on a 12% red tint, with a leading **pulsing red dot** (the non-color signal). Marks matches kicking off today — red's role-locked live/now use. Uppercase Label.
- **Shape:** 2px radius (`{rounded.sm}`). Each chip carries a non-color signal (badge letter, pulsing dot) so it survives CVD.

### Match Card (scoreboard layout)
- **Corner:** 8px (`{rounded.lg}`). **Background:** `#101419` on the `#080c0f` body. **Border:** 1px `#292e34`. **Shadow:** none at rest; Hover Lift only if interactive. **Padding:** generous — `clamp(24px, 4vw, 36px)` — the data breathes like a broadcast graphic, never a data table. Never nest a card in a card.
- **Team row:** FIFA code (small, muted label) stacked above the full team **name** (Display, wraps — never truncates, so "Bosnia and Herzegovina" shows whole), with the big number right-aligned. **Score** in scoreboard Display (`clamp(3.5rem, 13vw, 5.5rem)`); for scheduled fixtures the **win %** takes that slot (slightly smaller, Inter tabular). The winner's score is `#f3f5f8`, the loser's `#8a9096` + row dimmed.
- **Footer:** venue, and each team's championship odds in **neutral ink** (not blue — blue stays in the probability bar).

### Probability Bar (signature component)
A horizontal three-segment bar for Home / Draw / Away (or projected outcomes). Home = American Blue, Draw = Ink Muted, Away = Ink Secondary — **blue marks the model's prediction channel**, neutrals carry the rest. Each segment is labeled with its tabular-nums percentage *inside or above the segment*, so the bar is never color-only. Segments animate width on mount (count-up), respecting reduced motion.

### Navigation
- Top bar on Studio Black, 1px bottom divider (`#292e34`). Inter Label type. Default `#a5acb2`, hover/active `#f3f5f8` with a 2px American-blue underline on the active route only (active = a prediction-surface wayfinding cue, used sparingly). No sidebar nav.

## 6. Do's and Don'ts

### Do:
- **Do** keep Studio Black (`#080c0f`) at ≥70% of any view.
- **Do** use Barlow Condensed only for scores, team names, and match headlines; Inter for everything read or scanned.
- **Do** keep the host colors role-locked: green = group data, red = live, blue = prediction. Neutral chrome for buttons and nav.
- **Do** reserve trophy gold for one genuine championship moment per view.
- **Do** pair every color-encoded datum with a non-color signal (dot, label, letter, position).
- **Do** set `font-variant-numeric: tabular-nums` on all numerics.
- **Do** keep motion anchored to events: bracket draws, score count-ups, the champion reveal. 150–250 ms on working-UI transitions; choreography only for focal moments.
- **Do** test every data visualization in deuteranopia/protanopia simulation.

### Don't:
- **Don't** use the host accent colors decoratively. Green-on-hover or a red CTA because "it looks good" is a violation.
- **Don't** use teal, purple, or gradient combinations — the 2026 AI-default palette (the Vite template's `#aa3bff` purple is exactly what this system rejects).
- **Don't** add glow, neon, or cyberpunk RGB. Dark must read as broadcast studio, not gaming rig.
- **Don't** build generic SaaS chrome: sidebar navs, icon-heading-text card grids, blue-accent BI layouts.
- **Don't** use the sportsbook aesthetic — no dark-green-and-gold odds bars, no betting-slip chips.
- **Don't** let visualizations look like Jupyter output — no raw matplotlib frames, no academic histogram defaults.
- **Don't** dump dense tables as the first answer. Lead with the narrative, offer the table as drill-down.
- **Don't** ship resting-state shadows, `border-left` stripe accents, or gradient text (`background-clip: text`).
- **Don't** rely on color alone. If a chart breaks when desaturated, it fails the Color-Blind Contract.
