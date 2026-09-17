# Bridge Builder — Requirements (PRD + Architecture + Red-Team Synthesis)

**Game:** Bridge Builder (LevelBest Tier 2 idea #2, GAMES_PLAN.md §"Bridge Builder — composition and equivalence engine")
**Comparison quality bar:** Cyberchase: Railway Hero (PBS KIDS / WNET) — mechanics-level inspiration ONLY; all names, art, audio, writing, layouts, and identity are independently created.
**Status:** Draft locked 2026-08-25 via project-software-development-team multi-role pipeline (PM → architecture → adversarial/red-team → synthesis → QA).
**Source of truth chain:** [`../../GAMES_PLAN.md`](../../GAMES_PLAN.md) → this file → `UX_DESIGN.md` → `EPIC_PLAN.md` → Jira epic CONSULTING (see `SPRINT_READINESS.md`).
**Pipeline evidence:** role outputs are embedded in Part A (PM), Part B (architecture), Part C (adversarial findings F-01…F-14 with synthesis resolutions S-01…S-14), Part D (QA gate). No phase was skipped.

---

## Part A — Product Requirements (PM role)

### A.1 Product goal

Give grades 1–8 kids a single, polished construction game where **making numbers physically fit is the whole game**: combine labeled pieces so a structure's missing span is filled *exactly*. Success requires the target math (composition, equivalence, equations); multiple valid solutions are always possible; feedback comes from the structure itself, not from text grading.

It serves both product jobs in GAMES_PLAN:

1. **Free-site magnet** — a build-and-fit puzzle that feels different from the seven shipped games: tactile, structural, "I made it fit."
2. **In-app earned break** — bounded ~90 s construction window that unlocks after a lesson block and returns the child to practice by visible countdown.

Success in one sentence: *a Grade-1 child and a Grade-8 child both hit flow within 10 seconds of pressing Play, without an adult explaining anything.*

### A.2 Player personas by grade band

| Persona | Band | What they bring | What Bridge Builder must do for them |
|---|---|---|---|
| **Maya, 6** (Grade 1) | g12 | Counts on fingers; reads few words; strong tap instincts | Pieces show **both numeral and proportional length**; counting units is a valid strategy; zero reading burden; big touch targets |
| **Dev, 8** (Grade 3) | g34 | Knows ×tables partially; likes speed | Multiplication as equal groups ("4 planks of 6"); factor-pair discovery; missing-value puzzles (`45 − 27 = ?` emerges physically) |
| **Lena, 11** (Grade 5–6) | g56 | Fractions shaky, decimals newer | Fraction/decimal planks with dual labels (½ ↔ 0.5); equivalence becomes visible when two ¼ planks span the same distance as one ½ plank |
| **Omar, 13** (Grade 7–8) | g78 | Ready for algebra but bored by worksheets | Variable-length beams (`x`, `2x`, struts of constant length); solving `2x + 3 = 15` happens because the bridge demands it; scale-drawing puzzles |

All four share: mobile-first (parent's phone/tablet), no adult coaching available mid-play, sessions must end cleanly.

### A.3 Curriculum skill map — Common Core-aligned grade 1–8 progression

The skill map is data (`SkillDefinition[]`), not code branches. One engine, many skill packs.

| Skill ID | Band | Grades | CCSS codes | Puzzle form | Example |
|---|---|---|---|---|---|
| `bb-compose-10` | g12 | 1 | 1.OA.C.6, 1.OA.D.8 | Gap ≤ 10, unit-countable planks 1–5 | Gap 7 ← 3+4 or 2+2+3 |
| `bb-compose-20` | g12 | 1–2 | 1.OA.D.8, 2.OA.B.2 | Gap ≤ 20 incl. make-ten emphasis | Gap 14 with a fixed plank 10 placed → find 4 |
| `bb-missing-addend` | g12 | 2 | 2.NBT.B.5 | One pre-placed plank, gap labeled | Pre-placed 27, gap total 45 → need 18 |
| `bb-factor-pairs` | g34 | 3 | 3.OA.C.7, 3.OA.A.4 | Gap = product; bonus star for k equal pieces | Gap 24 ← 6+6+6+6 (star) or 10+10+4 |
| `bb-mult-groups` | g34 | 3–4 | 3.OA.A.1/4, 4.OA.A.4 | Equal-group constraint puzzles | Cross 35 using exactly 5 equal planks → each 7 |
| `bb-fraction-equiv` | g34 | 3–4 | 3.NF.A.3, 4.NF.A.1 | Unit-fraction planks; equivalence highlight | Gap 1 ← ½+¼+¼ ; two ⅛ = one ¼ (visual snap-equal) |
| `bb-decimals-tenths` | g34→g56 | 4 | 4.NF.C.5/6 | Tenths planks, decimal labels | Gap 1.0 ← 0.3+0.3+0.4 |
| `bb-unlike-denom` | g56 | 5 | 5.NF.A.1 | Mixed denominator planks | Gap 1½ ← ¾+¾ |
| `bb-decimal-ops` | g56 | 5 | 5.NBT.B.7 | Decimal gaps to 10.0 | Gap 4.7 ← 2.5+1.2+1.0 |
| `bb-ratio-scale` | g56 | 6 | 6.RP.A.3 | Blueprint scale: 1 grid square = n m | Blueprint gap 4 squares, scale 3 m → 12 m of plank |
| `bb-linear-eq` | g56→g78 | 6 | 6.EE.B.5/6 | x-beams (uniform hidden-but-consistent length) + strut planks | Fit 15 with x+x+x+strut(−3 rule) → x=6 discovered |
| `bb-rational-eq` | g78 | 7 | 7.EE.B.4, 7.NS.A.1d | Negative/signed shims (overlap spacers) | Overshoot 2 then −2 shim fits exactly |
| `bb-pythagorean-span` | g78 | 8 | 8.G.B.7 | Diagonal brace selection for right-triangle gap | Legs 6 & 8 → brace beam 10 |

Geometry extensions (perimeter fences, area decks) reuse the same engine with a `surface` constraint kind — **explicitly out of scope v1** (non-goal N-4); perimeter fence closure ships only if it costs < 1 story point inside the benchmark-polish pass (QA may drop it without re-opening scope).

**Progression guarantee:** every band's generator emits puzzles whose *only* efficient strategy is that band's target reasoning (counting stops working past g34 because piece values exceed visual unit counts; guessing is impossible because exact fit is required).

### A.4 Core loop

```
setup (band pick / auto-from-placement)
   └─▶ PUZZLE: gap shown on structure (value labeled, unit ticks per band policy)
        tray of 5–7 pieces (values labeled, drawn true-to-length)
        ▶ drag/tap/keyboard-place a piece into next open slot
             ├─ fits within remaining space → snaps in, remaining space visibly shrinks
             ├─ overshoots → piece overhangs far edge, wobbles once,
             │    numeric diff shown ("2 too long"), piece returns to tray
             └─ undersize → fills part of gap; player continues composing
        ▶ exact fit → bridge completes: crossing animation + score + (sometimes)
             "Build it another way!" prompt (second-construction check)
   └─▶ next puzzle … until session cap (time or bridges)
   └─▶ SUMMARY: score, best streak, coaching line, Play again / Change level / All games
```

One mechanic only: compose pieces to an exact total. No physics sandbox, no inventory meta-game, no secondary modes. (Matches NLJ discipline §3.)

### A.5 Mechanics detail

- **Gap:** horizontal span between two anchor cliffs. Value label always visible (numeral). Unit ticks shown only in g12/g34 (counting-viable bands). g56+ hide ticks; proportional rendering remains.
- **Pieces:** 5–7 in tray; 1–2 decoy values guaranteed non-solvable-only-in-combination-with-all-others (generator guarantees ≥ 1 exact solution exists and ≥ 2 distinct solutions for "another way" prompts at par difficulty).
- **Placement model:** left-to-right slot fill (like Railway Hero's track laying). Placed pieces remain draggable back out or tappable to return. Undo button resets current construction.
- **Overshoot handling (the pedagogy core):** an oversized piece visually overhangs the cliff edge by exactly its excess length, wobbles once, shows the signed diff, and returns. The *structure itself* explains why it fails. Never a red X / buzzer.
- **Exactness:** equality checked in exact integer arithmetic (all lengths stored as integers scaled by the puzzle's common denominator — e.g., eighths internally, displayed as fractions/decimals). Zero float-tolerance exploits.
- **Second construction:** after a solve, ~40% of puzzles offer "another way?" (+bonus). Accepting swaps the goal to "different pieces, same gap." Declining is always fine and never framed as loss.

### A.6 Controls

| Input | Action |
|---|---|
| Touch drag / mouse drag | Move piece from tray to slot; release to place |
| Tap piece → tap slot | Two-step alternative (motor-accessibility) |
| Tab / Shift+Tab | Cycle tray pieces ↔ slots ↔ controls |
| Enter/Space | Place selected piece into selected slot |
| Arrow keys | Change selected piece/slot; Left returns piece |
| U | Undo last placement · R repeat last instruction (audio) |

Touch targets ≥ 48 px; drag has 8 px magnet assist; two-step mode fully equivalent (no drag required ever).

### A.7 Scoring (honest)

| Event | Points |
|---|---|
| Exact fit | 10 (always full points — any valid solution is a win) |
| Solved with zero hints this puzzle | +2 |
| Second different construction accepted | +5 |
| Exact-fit streak ≥ 3 | streak flame badge, +1/puzzle while alive |

No penalties exist. Overshoots cost nothing except clock. End screen shows: bridges built, average hints used, best streak, one plain-English coaching line (deterministic from stats, teaching never shaming — same voice rules as NLJ §5). Session-only storage on free site; "beat your best" personal record allowed (healthy hook) and surfaced in parent brief later.

### A.8 Session shape & earned-break integration

- **Free site:** setup screen (manual band pick, mirroring NLJ) → round capped at **90 seconds or 6 bridges**, whichever first → summary → clean exit. Hard stop; no continuation offers beyond standard "Play again".
- **In-app earned break (Tier 1):** lesson block complete → unlock card "Break time: 90 seconds of Bridge Builder" → countdown ring always visible during play → at 0 s the current puzzle resolves instantly as "saved" (never "lost") → gentle auto-return screen → practice resumes. Break window is not extendible; skipping practice to keep playing is structurally impossible. This implements GAMES_PLAN design principle 2 exactly (~90 s window).
- Timer pauses on tab-blur (auto-pause, Railway-Hero-style off-task pause, implemented honestly: paused state screen, resume button).

### A.9 Streak / bonus behavior

Streaks reward *accuracy* (exact fits), never playtime. Streak breaks on a hint-used solve? **No** — hint solves keep the streak (hints are learning). Streak resets only on session end. Weekly-challenge-card integration deferred (GAMES_PLAN Tier 2 backlog item, non-goal here).

### A.10 Failure & error-recovery flows

| Flow | Behavior |
|---|---|
| Overshoot attempt | Overhang render + diff number + piece returns; unlimited retries; no sound alarm |
| Stuck (>25 s no progress or 3 consecutive failed placements) | Hint ladder L1 → L2 → L3 (see A.11) |
| Wrong-band frustration signal (3 stuck puzzles in a row) | End-of-round suggestion chip: "Try one level easier?" — suggestion only, auto-switching never forced |
| Tray exhausted without solution | Impossible by generator contract (tested invariant); if a bug ever produces it, "New planks" refill appears and telemetry logs `invariant_violation` |
| Mid-session exit | Summary skipped, nothing saved, clean hub return (free site saves nothing by design) |

### A.11 AI-tutor intervention seam

Hint ladder (v1 deterministic; same interface the LevelBest AI tutor will implement later):

| Level | Trigger | Content |
|---|---|---|
| L1 | stuck threshold | Restate relationship, no answer: "Your planks make 9. The gap needs 12." |
| L2 | L1 ignored / another fail | Highlight one tray piece that belongs in a valid solution (not necessarily the next placement) |
| L3 | repeated fail | Ghost-outline one valid placement in the gap |

Misconception-targeted generation (AI opportunity in GAMES_PLAN): when the learner-model adapter reports weakness (e.g., unlike denominators), the generator biases the next 1–2 puzzles to isolate exactly that relationship, and asks the second-construction question more often (checking transfer, not memorization).

### A.12 Edge cases (must be handled + tested)

E-01 gap value 0 or negative → generator forbids (invariant test).
E-02 fractional display: improper fractions shown mixed (7/4 → 1¾); decimals trimmed trailing zeros (NLJ precedent).
E-03 common-denominator scaling overflow: max scaled integer ≤ 2³¹ (guard + clamp band ranges).
E-04 duplicate piece values in tray → allowed, dedup only in keyboard roving focus order.
E-05 rapid double-placement race → single-flight guard on commit.
E-06 tab hidden mid-animation → timer paused, animations collapse to final state (reduced-motion path shares logic).
E-07 viewport resize/magnification 200% → layout reflows, nothing clipped (UX §6).
E-08 seed determinism: identical seed + band ⇒ identical puzzle sequence (Vitest parity with NLJ tests).
E-09 second-construction with insufficient unique alternatives → generator marks puzzle non-regenerable and skips prompt (tested).
E-10 locale decimal separator — v1 en-US only, documented non-goal.

### A.13 Analytics / telemetry

Event schema (session-scoped; free site persists nothing):

```
session_start {mode: free|break, band, source}
puzzle_start  {skillId, puzzleId, gapValue, trayHash}
place_attempt {pieceValue, result: fit|overhang|partial, diff, msSincePuzzleStart}
hint_shown    {level, puzzleId}
puzzle_solved {piecesUsed, par, solveMs, hintLevelMax, constructionVector}
second_build  {accepted, solved}
streak_update {current, best}
session_end   {bridgesBuilt, score, bestStreak, avgHints, coachingId, durationMs}
break_flow    {unlocked, started, endedReason: timer|done|exit, returnedToPractice}
invariant_violation {where}   // should never fire; alerting-worthy
```

Privacy contract: no PII, no child identifiers on free site; in-app events attach to account only after family accounts ship; parent brief consumes aggregates only.

### A.14 Parent-brief itemization

- Game minutes appear **inside** total time, itemized per game name ("Bridge Builder — 4 min"), never merged into learning time.
- Learning-share metric stays ≥ 80% gate (learning minutes ÷ total minutes); the parent brief renders the split even if the gate fails (honesty over marketing).
- Brief adds one curriculum line per session: skills practiced (e.g., "composed numbers to 20; tried equivalent fractions").

### A.15 Non-goals

N-1 Multiplayer/class duels, leaderboards between children (banned).
N-2 Cosmetic economy, loot boxes, paid game content (banned).
N-3 FOMO timers, loss-aversion mechanics, infinite-play loops (banned).
N-4 Area-deck geometry puzzles, weekly challenge card, character art/mascot (future).
N-5 Accounts/storage on free site (nothing saved, ever).
N-6 Native app packaging; offline PWA.
N-7 Locale/i18n beyond en-US.

### A.16 Success signals (per GAMES_PLAN)

Free site: `/games` engagement depth on the new card (start→summary completion rate ≥ 60%), returning visitors, waitlist conversions attributed to games.
In-app: session completion holds/rises with breaks enabled; learning-share stays ≥ 80%; day-2 voluntary return.
Quality: hands-on comparison vs Railway Hero scores ≥ reference on all 9 criteria (Part D gate).

---

## Part B — Architecture (architect role)

### B.1 Seam separation (GAMES_PLAN mandate)

Four seams, one shell. The game engine knows nothing about curriculum, generation strategy, tutoring policy, or learner history — it consumes payloads.

```
┌─────────────┐   Puzzle payload    ┌──────────────┐
│ ProblemGen  │ ───────────────────▶│              │
│ (per skill) │                     │  Engine core │──── UI shell (React)
└─────▲───────┘                     │ (state mach.)│
      │ SkillDefinition             └──┬────────▲──┘
      │                                │events  │HintRequest[]
┌─────┴────────┐   LearnerSignal    ┌───▼────────┴──┐
│ SkillMap     │◀───────────────────│ LearnerModel  │
│ (CCSS data)  │                    │ adapter       │──▶ assessment/* level signal
└──────────────┘                    └───▲───────────┘
                                        │observe(events)
                                    ┌───┴───────────┐
                                    │ TutorAdapter  │ (v1 rule-based hints;
                                    │               │  AI tutor later, same iface)
                                    └───────────────┘
```

### B.2 Interfaces / data payloads (TypeScript, mirrors NLJ style)

Location plan (production, post-epic): `src/lib/games/core/types.ts` (shared primitives), `src/lib/bridgeBuilder/{types,skills,generate,engine,hints}.ts`. This run touches **no production source** (artifact contract).

```ts
// ---- shared primitives (src/lib/games/core/types.ts) ----------------------
export type Band = "g12" | "g34" | "g56" | "g78";

export interface SkillDefinition {
  id: string;                 // "bb-compose-10"
  band: Band;
  grades: [number, number];
  ccss: string[];             // ["1.OA.D.8"]
  /** Generation policy consumed by ProblemGenerator */
  genPolicy: {
    gapRange: RangeSpec;      // min/max incl. denominators for rational bands
    pieceMenu: PieceSpec[];
    parPieces: [number, number];   // expected solution-size window
    ticksVisible: boolean;
    minDistinctSolutions: 1 | 2;
    decoys: number;
  };
  scoringWeights?: Partial<ScoringWeights>;
}

export interface Puzzle {
  id: string;
  skillId: string;
  /** Exact arithmetic: value = numerator / denominator */
  gap: Rational;
  placed: PlacedPiece[];      // pre-placed for missing-value forms
  tray: Piece[];
  ticksVisible: boolean;
  parPieces: number;
  supportsSecondConstruction: boolean;
}

export interface Piece { id: string; value: Rational; label: string; }
export interface PlacedPiece extends Piece { origin: "preset" | "player"; }

/** Outcome of one placement evaluation — pure, no UI */
export interface PlacementResult {
  status: "fit" | "partial" | "overhang";
  /** Signed excess in gap units; 0 when fit/partial */
  overhangBy: Rational;
  remaining: Rational;        // remaining gap after placement
}

export interface HintRequest { level: 1 | 2 | 3; puzzleId: string; }

export interface TelemetryEvent { type: EventType; ts: number; payload: Record<string, unknown>; }

// ---- TutorAdapter seam -----------------------------------------------------
export interface TutorAdapter {
  /** Called after every engine event; returns next hint or null. Pure v1 impl. */
  nextHint(state: Readonly<PuzzleState>, history: readonly AttemptRecord[]): HintRequest | null;
}

// ---- LearnerModel seam -----------------------------------------------------
export interface LearnerSignal {
  band: Band;                       // from assessment PlacementResult.band
  domainStrength: Partial<Record<"number-operations"|"fractions-ratios"|"geometry-measurement"|"algebraic-thinking", "strength"|"developing"|"growth-area">>;
  recentMasteryDelta?: number;      // −1…1
}
export interface LearnerModelAdapter {
  currentSignal(): LearnerSignal;                 // free-site v1: manual band + neutral domains
  record(events: readonly TelemetryEvent[]): void; // session-sink on free site
}
```

Engine state machine: `setup → playing → (overhang|partial)* → solved → [second-build?] → next | summary`. Deterministic given `(seed, band)`; `mulberry32` PRNG reused from NLJ/assessment convention. Scoring module pure: `scorePuzzle(puzzle, attempts, hintLevelMax, secondBuild?) → PuzzleScore`; `summarizeSession(records) → RoundSummary` (coaching line deterministic from stats — NLJ pattern).

Rational arithmetic: `{n: number, d: number}` normalized positive `d`, gcd-reduced; all comparisons/placements in rationals; UI renders via formatter per band. Overflow guard E-03 enforced in generator.

### B.3 Reuse of existing primitives

- PRNG: `mulberry32` (identical algorithm already duplicated in `assessment/rng.ts` and NLJ `engine.ts`) — promote to shared `src/lib/games/core/rng.ts` during implementation; NLJ migration optional, out of scope.
- Band metadata & labels: follow `BAND_META`/`ALL_BANDS` shape for consistency.
- UI shell: `demo-panel` / status bar / progress bar / summary cards / `Play again · Change level · All games` control set (NLJ §6) — same classes, new interaction area.
- Assessment signal: consume `PlacementResult.band.{grade,third}` → band mapping table (grade ≤2→g12, 3–4→g34, 5–6→g56, 7–8→g78; third shifts within-band sub-difficulty).
- Quality gate: `npm run typecheck && npm run lint && npm run test && npm run build`.

---

## Part C — Adversarial / red-team pass (isolated reviewer) + synthesis

Reviewer stance: attack against banned-patterns policy, cheating/degenerate strategies, child-safety, and spec gaps. Every finding below received a synthesis ruling; none were dropped silently. Status legend: RESOLVED (folded into spec), DEFERRED-BY-DESIGN (recorded non-goal).

| # | Finding (red team) | Severity | Synthesis resolution |
|---|---|---|---|
| F-01 | "Another way!" bonus could pressure kids into extra work (hidden FOMO analog) | Med | S-01: Prompt shown ≤40% of solvable puzzles; declining copy is neutral ("Nice — keep building"); no cumulative penalty; bonus is additive only. Folded into A.5/A.7. |
| F-02 | Streak flame could induce loss aversion when near breaking | Med | S-02: Streak can only reset at session end; hints never break it (A.9); flame badge is informational, no "don't lose it!" copy. Banned-pattern scan clean. |
| F-03 | Trial-and-error degenerate strategy: spam pieces until one fits | High | S-03: Exact fit required; overspill returns piece with informative diff (learning, not punishment); g56+ tick removal makes blind trial slow; scoring +2 for zero-hint solves rewards deliberate composition without punishing retries. Accepted residual: g12 counting-by-trial IS the intended curriculum (1:1 correspondence). Documented in A.3/A.7. |
| F-04 | Float tolerance exploit: place 0.49999… for 0.5 | Med | S-04: Rational integer arithmetic everywhere (B.2); equality is exact. Test added to QA checklist (D-07). |
| F-05 | Generator could emit unsolvable trays → dead-end rage | High | S-05: Generator contract guarantees ≥minDistinctSolutions solutions; invariant tested per generated puzzle in Vitest (property test); runtime fallback "New planks" + `invariant_violation` telemetry (A.10, A.13). |
| F-06 | Earned-break countdown could feel like loss-aversion timer | High (policy) | S-06: Countdown is a *return* promise, not a threat: ring is calm, copy says "Back to practice in 45 s", current bridge is auto-saved at 0 s, no extension offer ever. Policy review in UX pass confirmed compliant. |
| F-07 | Parent-brief leakage: game time counted as learning | High (trust) | S-07: Itemization contract A.14 hard-required; telemetry separates `mode: free|break` and learning-share computation excludes game minutes by definition. Story-level AC added (EPIC story T9). |
| F-08 | IP contamination risk: villain-steals-track framing mimics Cyberchase plot; "Hero"/railway theming echo | High (legal) | S-08: Theme locked to original canyon-crossing construction site, no villain narrative, no railway/train assets, no PBS characters/names/audio; comparison used only for pacing/clarity benchmarks. IP checklist added to benchmark-pass story DoD. |
| F-09 | Keyboard trap in drag-first design | Med | S-09: Full keyboard path specified (A.6); two-step tap-select is default-equivalent; QA D-05 covers keyboard-only completion of a full round. |
| F-10 | Color-only signaling of fit/overhang states | Med (a11y) | S-10: States carry icon + motion + numeric diff; color is redundant channel only. UX spec §7 mandates color-independence audit. |
| F-11 | Session-cap ambiguity: does leaving early lose progress? | Low | S-11: Free site persists nothing by design; microcopy states "Nothing is saved — that's okay" on exit. Copy added to UX §5. |
| F-12 | Decoy pieces could make parity-impossible sets look solvable, training wrong intuition | Low | S-12: Generator property: every decoy combination either still solvable or obviously-over by > largest piece (structural honesty); property-tested. |
| F-13 | Adaptive wiring to placement might overwhelm struggling kids with harder bands mid-round | Med | S-13: Difficulty locks at session start (band fixed per round); misconception-biasing (A.11) adjusts *content*, never band mid-session. |
| F-14 | Scope creep: geometry extensions inflate v1 | Med | S-14: N-4 non-goal declared; perimeter only as conditional polish (<1 pt) droppable without reopening scope. |

Red-team verdict entering synthesis: **3 high-severity findings (F-03, F-06, F-07, F-08)** — all resolved as above; zero unresolved blockers.

---

## Part D — QA gate (review role)

Verification checklist binding on implementation stories:

- D-01 Determinism: same seed ⇒ same puzzle sequence (all bands).
- D-02 Generator solvability invariant: every emitted puzzle has ≥ required distinct solutions (property test, 500 iterations/band).
- D-03 Exact-arithmetic: no binary-float paths in placement/scoring (code review + targeted tests).
- D-04 Banned-pattern sweep: no ads/loot/FOMO/loss-aversion/playtime-leaderboard mechanics or copy (checklist walk of every string).
- D-05 Accessibility: keyboard-only full round; screen-reader announce parity; reduced-motion path; 200% zoom reflow; color-independence spot audit.
- D-06 Earned-break: 90 s window honored; auto-save at expiry; forced return; no extension affordance exists.
- D-07 Rational edge suite: halves/thirds/eighths/tenths/hundredths; mixed-number display; overflow clamp E-03.
- D-08 Quality gate green: `typecheck && lint && test && build`.
- D-09 Parent-brief itemization unit test: game minutes excluded from learning share.
- D-10 Hands-on benchmark vs Railway Hero recorded in SPRINT_READINESS.md with per-criterion verdicts.

**QA sign-off condition:** Parts A–C consistent, all findings dispositioned, checklist mapped onto story acceptance criteria (EPIC_PLAN.md). Gate passed for sprint-readiness review; D-items execute during implementation.
