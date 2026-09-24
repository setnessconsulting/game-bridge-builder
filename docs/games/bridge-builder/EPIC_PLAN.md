# EPIC PLAN — Bridge Builder (LevelBest composition & equivalence game)

**Epic summary:** Ship Bridge Builder — a grades 1–8 construction game where kids compose labeled pieces to fill a structural gap exactly — as a free-site game and the first earned-break break-game, on a shared engine architecture that separates skill definition, problem generation, AI-tutor hints, and the learner model.

**Curriculum coverage statement:** The current 14-skill, grades 1–8 catalogue is maintained in [`final-state/CURRICULUM_CATALOGUE.md`](final-state/CURRICULUM_CATALOGUE.md) and parity-tested against `src/lib/bridgeBuilder/skills.ts`. The broader standards roll-up in this original planning draft is superseded and is not a current source of truth. Every band's puzzles require that band's target reasoning; difficulty scales off the placement-assessment level signal, never manual pickers alone.

**Phase artifacts:**
- Requirements + red-team synthesis: [`REQUIREMENTS.md`](REQUIREMENTS.md)
- UX spec + evidence-backed review register: [`UX_DESIGN.md`](UX_DESIGN.md)
- Prototype + validation notes: [`PROTOTYPE_NOTES.md`](PROTOTYPE_NOTES.md) (playable: [`prototype/index.html`](prototype/index.html))
- Sprint readiness verdict: [`SPRINT_READINESS.md`](SPRINT_READINESS.md)

**Prototyping learnings folded in:** second-construction requires full plank re-delivery (tray-restore semantics); whole-band generator must bias multi-solution rate ≥45%; g56+ rounds use 5 bridges; drag parity via two-step select is an explicit T6 AC.

**Estimates:** story points. **Total: 35 pts across 13 stories** (each ≤ 5 pts = sprint-sized).

---

## Stories

### T1 — Engine core: types, rational arithmetic, state machine, scoring (3 pts)
Pure TypeScript under `src/lib/games/core/` (shared primitives) + `src/lib/bridgeBuilder/{types,engine}.ts`. No UI.
- **Given** a seeded rng and band, **when** `generatePuzzle` runs, **then** output matches `Puzzle` payload with exact-rational gap/tray and deterministic sequence.
- **Given** any placement evaluation, **when** totals are computed, **then** equality uses integer-scaled rationals only (no float compare anywhere).
- **Given** attempts/hints for a solved puzzle, **when** scored, **then** base 10 (+2 zero-hint) and second-build +5 per REQUIREMENTS A.7.
- **Depends on:** nothing. **DoD:** unit tests cover determinism (parity with NLJ test style), edge suite D-07, scoring table; typecheck/lint green.

### T2 — Problem generation, bands g12+g34 (compose/make-ten/factors/fraction equivalence) (3 pts)
`src/lib/bridgeBuilder/generate.ts` + skill pack data for `bb-compose-10…bb-fraction-equiv`.
- **Given** band g12 or g34 and any seed, **when** 500 puzzles generate, **then** 100% have ≥1 exact solution and tray ≥ gap (property test).
- **Given** the whole-band generator bias task from prototyping, **when** gaps ≤12 generate, **then** ≥45% of puzzles have ≥2 distinct solutions.
- **Given** a fraction-equivalence puzzle, **when** two ¼ planks span the same run as one ½ plank, **then** the payload marks the equivalence relation for UI highlight.
- **Depends on:** T1. **DoD:** property tests + CCSS tags asserted present on every emitted puzzle.

### T3 — Problem generation, bands g56+g78 (decimals, unlike denominators, ratio scale, linear equations, signed shims, Pythagorean span) (3 pts)
Skill packs `bb-decimals-tenths…bb-pythagorean-span`; variable-beam (`x`) consistency within a session; overflow clamp E-03.
- **Given** a `bb-linear-eq` session, **when** x-beams appear across puzzles, **then** one hidden x stays consistent until solved, and strut values make x discoverable.
- **Given** scaled-internally decimal puzzles, **when** rendered, **then** labels trim trailing zeros and improper fractions display mixed (formatter tests).
- **Given** any g78 signed-shim puzzle, **when** overshoot occurs, **then** the negative shim restores exactness (integration test).
- **Depends on:** T1. **DoD:** property tests per band; E-03 guard test.

### T4 — Adaptive difficulty wiring to placement/mastery signal (2 pts)
Consume `PlacementResult.band.{grade,third}` → band + within-band sub-difficulty; misconception biasing per REQUIREMENTS A.11; free-site fallback = manual picker only.
- **Given** a placement result grade 5 mid-third with fractions growth-area, **when** a session starts, **then** band g56 loads and the first two puzzles isolate fraction relationships.
- **Given** no placement data (free site), **when** setup renders, **then** manual band cards show and nothing errors.
- **Given** three consecutive stuck puzzles, **when** the round ends, **then** the easier-band suggestion chip appears (never auto-switches).
- **Depends on:** T2, T3. **DoD:** mapping table unit-tested against assessment types; no mid-session band changes possible (test).

### T5 — Tutor seam + deterministic hint ladder v1 (3 pts)
`TutorAdapter` interface + rule-based implementation (L1 restate → L2 highlight member piece → L3 ghost outline); misconception hooks for future AI tutor; R-key repeat announcement.
- **Given** 25 s without progress or 3 failed placements, **when** the threshold fires, **then** L1 hint text appears matching the "never reveals answer" contract.
- **Given** L2 triggered, **when** shown, **then** the highlighted piece belongs to at least one valid solution subset (property-tested).
- **Given** the AI tutor later implements `TutorAdapter`, **when** swapped in, **then** the engine compiles unchanged (interface-only dependency).
- **Depends on:** T1. **DoD:** ladder-level unit tests; interface exported from core types.

### T6 — React shell & screens: setup/play/reveal/summary/pause flows (5 pts)
`src/app/games/BridgeBuilder.tsx` using demo-panel shell patterns; full interaction-state matrix from UX_DESIGN §3; overhang render + diff chip; solve animation with reduced-motion path; two-step tap-select fully equivalent to drag.
- **Given** a child who never drags, **when** they complete a round using tap-select only, **then** every affordance is reachable and equivalent (AC mirrors F-09).
- **Given** tab hidden mid-round, **when** the user returns, **then** the pause overlay shows and elapsed timer did not advance.
- **Given** prefers-reduced-motion, **when** a bridge solves, **then** animations collapse to instant state swap.
- **Depends on:** T1, T5 (T2 for content). **DoD:** keyboard-only round completion verified; ARIA announcements mirror every state change; 200% zoom reflow check.

### T7 — Earned-break unlock, 90 s window, countdown return (in-app Tier 1) (3 pts)
Lesson-block completion → unlock card → play context with countdown ring → auto-save current construction at expiry → forced gentle return. No extension control exists in DOM.
- **Given** a completed lesson block, **when** the break slot renders, **then** exactly one unlock card appears with the 90 s promise stated.
- **Given** 90 s elapse mid-construction, **when** the window closes, **then** the current bridge resolves as "Saved!" and return-to-practice screen appears with 3 s auto-return.
- **Given** banned-pattern review, **when** the DOM is inspected, **then** no extend/add-time affordance exists and final-10 s styling is steady (U-12).
- **Depends on:** T6. **DoD:** QA checklist D-06 scripted check; parent-brief event stream distinguishes mode=break.

### T8 — Free-site `/games` hub integration (1 pt)
Hub card (title/blurb/tag/icon per UX §1) + lazy mount in GamesHub switch; static-route build.
- **Given** the games hub, **when** rendered, **then** the Bridge Builder card shows with tag "Building · Grades 1–8" and Play now works.
- **Given** production build, **when** `/games` compiles, **then** route remains static and bundle impact ≤ agreed budget (note in PR).
- **Depends on:** T6. **DoD:** build gate green; card blurb passes 6-year-old readability spot check.

### T9 — Score records ("beat your best") + session summary polish (2 pts)
Session-only personal record on free site (healthy hook per GAMES_PLAN), surfaced in summary; coaching line rules from NLJ voice.
- **Given** a prior session this browser visit, **when** a new round ends with more points, **then** "New personal best!" displays once, neutrally.
- **Given** storage APIs blocked/private mode, **when** records attempted, **then** game plays identically without persistence (graceful no-op).
- **Depends on:** T6. **DoD:** storage-guard test extended (no localStorage writes outside allowed key pattern).

### T10 — Telemetry events + parent-brief itemization (3 pts)
Event schema from REQUIREMENTS A.13 behind a session sink (free site persists nothing); parent-brief aggregation contract with learning-share computation excluding game minutes.
- **Given** a full round, **when** events replay, **then** the schema validates (zod/type guard) and contains zero PII fields.
- **Given** mixed learn+play minutes, **when** the brief computes shares, **then** game minutes count inside total only and the ≥80% gate reports honestly even when failing (D-09 test).
- **Depends on:** T6. **DoD:** schema tests + itemization unit test; `invariant_violation` alert path stubbed.

### T11 — Accessibility controls package (3 pts)
Sound toggle (default low), relaxed-build toggle, captions-equivalent policy audit, color-independence sweep, focus management pass, touch target audit.
- **Given** sound off and captions rule, **when** any meaningful cue fires, **then** its visual/text equivalent exists (walked cue table UX §7).
- **Given** grayscale rendering, **when** fit/overhang/solve states display, **then** each is distinguishable without hue (pattern+motion+text channels).
- **Given** VoiceOver/NVDA smoke, **when** a round is played, **then** announcements match the visual feedback log.
- **Depends on:** T6. **DoD:** axe scan clean of criticals; manual keyboard/SR notes appended to story.

### T12 — Test & quality-gate completion (2 pts)
Full Vitest coverage per QA checklist D-01…D-09; repo gate `typecheck && lint && test && build` green.
- **Given** CI, **when** the gate runs, **then** all four commands pass with new suites included.
- **Given** the banned-pattern sweep, **when** all user-facing strings are reviewed, **then** zero ads/FOMO/loss-aversion/leaderboard mechanics or copy exist (checklist recorded in PR).
- **Depends on:** T1–T11. **DoD:** gate green at merged HEAD; coverage notes in STATUS update.

### T13 — Benchmark comparison polish pass vs Railway Hero (2 pts)
Hands-on side-by-side against the reference on all 9 GAMES_PLAN criteria; remediate anything below reference; IP-separation sign-off; record verdicts in SPRINT_READINESS.md addendum.
- **Given** both games played same-day by the reviewer, **when** scored on the 9 criteria, **then** Bridge Builder ≥ reference on each, with remediation loops executed for any miss before Done.
- **Given** the IP checklist, **when** assets/names/audio/story are reviewed, **then** zero protected-element reuse is found (F-08 closure).
- **Depends on:** T8, T11, T12. **DoD:** verdict table committed; conditional perimeter-fence extension dropped if it would exceed 1 pt.

---

## Dependency graph

```
T1 ─▶ T2 ─▶ T4 ┐
T1 ─▶ T3 ──────┤
T1 ─▶ T5 ─▶ T6 ─▶ T7
              T6 ─▶ T8 ─┐
              T6 ─▶ T9  │
              T6 ─▶ T10 ├─▶ T13
              T6 ─▶ T11 ┘
T1..T11 ─▶ T12 ─▶ T13
```

## Definition of Done (epic-level)

All stories Done; repo quality gate green; QA checklist D-01…D-10 evidenced; hands-on benchmark table complete with no criterion below the Railway Hero reference; banned-patterns sweep recorded; docs reconciled (GAMES_PLAN.md shipped-table row, STATUS.md surface state); prototype folder retained as design evidence.
