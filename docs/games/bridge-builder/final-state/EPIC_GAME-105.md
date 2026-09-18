# Bridge Builder — Final Production State (LevelBest, grades 1–8)

**Canonical epic.** Single source of truth for finishing Bridge Builder; supersedes GAME-36 (retired to Wont Do — its completed stories remain authoritative current-generation history).

**Authority split.** This epic states the binding laws, constants, IDs and gates. The **spec of record** — `docs/games/bridge-builder/final-state/` in `andrewsetness/levelbest` (v2 PRD · Technical Design · UX & User Flow · Decisions log) — holds the full detail: per-dimension thresholds, per-device-class budgets, the per-SC accessibility conformance table, complete child acceptance-criteria text and measurement protocols. Where a child AC says "per the spec of record", that document is authoritative for detail and this epic for intent and gates. Nothing here is implemented by this rewrite.

## Closure status (live Jira read-back 2026-09-17)

- **Status:** `In Progress`. The scope-lock is a requirements baseline, not implementation, conformance, or release evidence.
- **Owner decisions:** O-1 through O-8 are approved policy decisions as of 2026-09-17. This resolves governance choices but does not assert implementation, human/device evidence, WCAG sign-off, rollback, production promotion, or LevelBest readiness.
- **Remaining closure gate:** O-7 still requires named executors and dates for manual accessibility, child/device, comparator, IP/provenance, WCAG, and rollback evidence. Authored-only documents and assignments are not passed evidence.
- **Sanctioned gaps:** O-8 sanctions `BB-CONTRACT-1` and `BB-CONTENT-1`, now tracked as GAME-294 and GAME-295; neither is completed work.

## Outcome

A polished commercial-quality educational construction game where the learner composes labeled pieces so a bridge's missing span fits **exactly**, presented through a Phaser 4 scene inside the existing React/Next.js shell, with production Figma art direction, a measurable external quality bar, criterion-level WCAG 2.2 AA assessment with no blanket conformance claim, verified performance and a tested cutover/rollback path. Mathematics — not physics, pixels or animation — decides correctness, always.

## Current state (live Jira read-back 2026-09-17)

- **Current generation (GAME-36, 12 of 13 Done):** exact scaled-integer engine, g12/g34/g56/g78 generation, adaptive wiring, tutor/hint ladder, React shell, earned break, `/games` hub, score records, telemetry + parent brief, accessibility package, automated gates. Evidence: `docs/games/bridge-builder/SPRINT_READINESS.md`.
- **Next-gen foundation (GAME-129/130/131, Done):** exactness fixtures; typed renderer/view-model + bounded intent contract; Phaser host adapter with deterministic synchronization. Phaser `4.2.1` pinned; production `/games` still renders through React DOM.
- **Live children:** GAME-39 Review; GAME-129/130/131 Done; GAME-132 Ready; GAME-133/134/135/143/171/172 Backlog; GAME-166 In Progress. Open next-generation qualification, human gates, and release evidence remain open.

## Product law (hard constraints)

No ads, loot boxes, paid game content, cosmetic economy, FOMO/urgency, loss-aversion framing, playtime leaderboards, child-vs-child competition, infinite-play loops, or anything punishing a day off. Session-scoped storage only; no PII; no accounts for kids; no third-party scripts on the play surface. No comparator asset, name, character, layout, audio or writing may be reused. Nothing may present a timed surface as pressure. Cross-visit metrics are not computable under this posture and are **not claimed**.

## Educational goals

- **Authority rule (frozen).** A deterministic TypeScript engine is the **sole** authority for piece lengths, composition, legal pieces, exact fit, correctness, scoring, progression, curriculum behaviour, **session deadline and expiry**. Lengths are scaled integers (`units` + puzzle `denominator`); a bridge fits **iff** `compositionUnits === gapUnits` — no float epsilon. Renderers own pixels only (`widthPx = units * unitPx`, one-way); pointer coordinates choose *which* piece and *which* intent but never carry a length. Collision, physics, pixel overlap, snapping distance and animation are forbidden as correctness inputs; the magnet offset is visual-only and changes no target slot; decorative post-verdict physics is allowed only when deterministic, seeded, intent-silent and removable under reduced motion (`sag = 0`). Any change to equality, solvability, scoring or legal actions requires a separate approved GAME issue.
- **Curriculum — 14 CCSS-tagged skills, grades 1–8** (codes and catalogue: spec §4.2; catalogue of record is BB-CONTENT-1). g12: compose-10, compose-20, missing-addend. g34: factor-pairs, mult-groups, fraction-equiv, decimals-tenths. g56: unlike-denom, decimal-ops, ratio-scale, linear-eq. g78: rational-eq, scale-drawing, pythagorean-span. Stale inherited codes are removed.
- **Generator invariants.** ≥1 exact solution per puzzle (property-tested per skill and seed); "another way" puzzles guarantee ≥2 **geometrically distinct** solutions (differing multiset of interval decompositions, in units); `decoyHonesty` — every decoy either keeps the puzzle solvable or overshoots by more than the largest plank; ≥45 % multi-solution supply in the g12 entry band.
- **Difficulty scaling.** Grade → band (≤2 g12, 3–4 g34, 5–6 g56, 7–8 g78); the placement *third* shifts within-band sub-difficulty; domain strengths bias which skills are pulled first; the band locks for the round and only the within-band easier/harder knob moves content.
- **Measurable learning outcome (session-level, privacy-safe).** A **round** = one bounded instance (90 s / 6 bridges; Relaxed = 6 constructions); a **session** = one tab session with ≥2 rounds or ≥12 puzzles. Signals: hint-free solve rate, overhang→fit recovery rate, second-construction acceptance, skill coverage/rotation — each computed per session at the sample minimum (n ≥ 12 puzzles); below it, no trend is reported. Descriptive only; **no causal or efficacy claim**.

## Target users

Learner personas by band (grade 2 — first action obvious with almost no text; grade 5 — wants the number to mean something; grade 8 — abandons anything childish), plus the parent/teacher trust surface (per-game minutes itemized inside total time, learning share ≥80 % with game minutes excluded, one curriculum line per session) and the earned-break host context (a bounded reward after a lesson block, never a second lesson).

## Core experience (binding laws)

setup → PUZZLE (span + exact label; tray of 5–7 true-to-length planks) → pointer drag | tap-tap | keyboard → bounded intent → engine → overshoot (overhangs by exactly its excess, one wobble, signed diff chip, returns) / underfill (remaining span visibly open) / exact fit (span closes, crossing beat, stars, optional "Build it another way?") → free site: next puzzle until the cap → SUMMARY (bridges · points · best streak · hints · coaching line · lantern skyline · Play again / Change level / All games · "Nothing is saved — that's okay.") → earned break: 90 s wall-clock window → return only. Per-state wording, copy and design: spec §3, GAME-171.

- **Interaction.** Four content-first band cards with an auto-band chip from the placement signal (always overridable) and one honest sentence on session shape; sound and **Relaxed build** toggles, with Relaxed surfaced on S0 and the hub card's secondary line as the disclosed untimed accessibility path pending alternate-version verification. The first in-game screen is the puzzle, not instructions. Planks fill the open span left-to-right and stay liftable; Undo reverses the last placement and Reset clears; preset (missing-addend) planks render grey inside the span. Fill order and slot occupancy are **engine outputs** (`slots`, `openSlots[]`, `fillOrder[]`, unit-based) — the renderer never derives slot geometry from pixels. Three equivalent paths over the **closed, frozen** intent union `selectPiece | placePiece | removePiece | reset | submit | requestHint | continue | presentationComplete`: pointer drag (purely visual magnet offset ≤12 px that never changes the target slot), tap-then-tap (never drag-only), keyboard (arrows rove tray → slots → controls, Enter/Space places, `U` undo, `R` repeats the announcement, Esc pauses). Target slot = nearest engine-derived slot centre, deterministic tie-break by lower `slotIndex`. **`submit` = the visible "Check it" control**; a non-exact submit renders `incorrectSubmit`, restating the exact signed difference as lengths with no X or buzzer; an exact composition auto-verdicts on placement. **Combine/split/decompose verbs are out of contract** — v1 non-goal.
- **Understanding, recovery, payoff.** Three redundant channels per plank (value label, true proportional length honouring the ≥24 px/unit legibility floor, grain/segment pattern); dot-face toggle for pre-symbolic g12; the span prints its exact remaining value and the overhang chip its exact signed excess. Unlimited retries; every placement reversible; stuck detection surfaces the hint affordance without forcing it; three consecutive stuck puzzles raise a neutral "Try one level easier?" chip at most once per round (suggestion only, never an automatic band change). On exact fit the span closes, cliffs connect and an **abstract non-character load marker** traverses (decorative, post-verdict, non-authoritative) with load sag scaled by inefficiency (`pieces − par`) — perceived consequence without a physics authority.
- **Hints.** Ladder, never an answer key: L1 restates the relationship ("Your planks make 9. The gap needs 12."), L2 highlights one tray piece belonging to some valid solution, L3 ghosts one valid placement (dashed, 50 %, non-hit-testable); hard cap L3. **Engine constants are the single authority: 20 s with no legal progress OR 3 failed placements, whichever first; Relaxed 40 s / 6** Ⓟ — no other threshold may appear in any document. Hints cost only the +2 zero-hint bonus and never break the streak.
- **Replayability and responsiveness.** Play again; session-scoped beat-your-best (guarded `sessionStorage`, graceful no-op when blocked); a **non-blocking inline** second-construction offer on a capped share of solvable puzzles (never modal; auto-dismiss is its lifetime not a gate; never re-offered on that puzzle; never at round end or inside the break); the engine owns the bonus. Phone portrait primary with tablet/desktop reusing the identical structure at scale; single-column reflow at 200 % zoom with nothing clipped; only the bridge pans, never below the legibility floor; targets ≥48×48 px via separate hit layers with capped expansion and nearest-centre prioritisation; DPR ≤3, render scale capped at 2.

## Session model — one authority

`ROUND_CAP_SECONDS = 90`, `ROUND_CAP_BRIDGES = 6`, **whichever first**, all bands, both free-site and break surfaces. The **engine owns the deadline on a monotonic clock** (injected; `performance.now()` in production, fake-clock in test) and owns expiry. The host supplies visibility and route-lifecycle events as engine **inputs** on a separate channel — not player intents; the closed union is unchanged. Device sleep is treated as hidden. **The only unclocked mode in v1 is Relaxed build**; there is **no endless free-build shelf** (the previously proposed Workshop/Sandbox mode is an explicit non-goal; both names retired for traceability).

**Surfaces.** Free site — timed round, Relaxed available, summary reachable, nothing saved beyond session-scoped best. Earned break — fixed 90 s **wall-clock** window, Relaxed hidden, **no** setup/summary/Play again/Change level/free-build surface reachable, auto-save at expiry, non-cancellable 3 s return plus an early-only button. Lesson/teacher entry — same window, unlock card skipped.

**Pause and return law.** Tab-blur pauses the clock **on the free site only**, against a cumulative **60 s per round** budget; once exhausted the round ends at the next resume and the summary is shown honestly. Inside the earned break the window is **wall-clock** — blur does not stop the deadline (copy: "Paused — the break clock keeps running") and an expired window returns the child on resume. If the deadline passed while hidden the engine expires deterministically (break: save-at-expiry then return; free site: end the round and show the summary). **No path extends a break:** no control, DOM mutation, query parameter or reload may restore a window. The visible "Back to practice" control returns **early only**.

## Verdict vocabulary

`fit → exact → fit` · `partial → underfill/remainingSpan → partial` · `overhang → overfill → overhang` · `overshoot → overfill (signed excess shown) → overshoot` · `invalidSubmit → incorrectSubmit → invalid_submit`.

## Canonical quality scorecard — Q-01…Q-23

**Closed and binding: GAME-172 scores exactly these rows and no others**, one evidence row each marked `Below / Meets / Exceeds / Not applicable`. Definitions, thresholds, evidence sources and the Ⓟ ratification list are in spec §6. A material **Below** requires bounded remediation, retest **on the same row**, and closure before Gate E unless the owner records an explicit deferral with rationale.

Dimension names: **Q-01** math authority · **Q-02** curriculum coverage · **Q-03** solvability / multi-solution · **Q-04** first-action discoverability · **Q-05** feedback latency/clarity · **Q-06** manipulation quality · **Q-07** error recovery/undo · **Q-08** hint usefulness · **Q-09** composition/equivalence + world cohesion · **Q-10** crossing payoff + replay motivation · **Q-11** pacing/session shape + progression legibility · **Q-12** accessibility parity · **Q-13** responsive/touch · **Q-14** performance · **Q-15** privacy/safety/engagement · **Q-16** learning-signal honesty · **Q-17** originality/IP · **Q-18** observability/rollback · **Q-19** decorative determinism/removability · **Q-20** audio restraint + provenance · **Q-21** earned-break return contract · **Q-22** second-construction offer + engine-owned bonus · **Q-23** authority-boundary enforcement.

**Ratifiers.** Q-01–Q-03, Q-05–Q-09, Q-11, Q-13–Q-21, Q-23 → GAME-135. Q-04, Q-10, Q-22 → GAME-172. Q-12 → GAME-135 with the conformance signer under O-7.

## Comparators

**Scored, each mapped to scored dimensions:** *Cyberchase: Railway Hero* — primary educational/accessibility bar (Q-04, Q-05, Q-07, Q-12). *Poly Bridge 3* — tightly scoped to construction interaction only, never the correctness model, pacing or level length (Q-06, Q-10). *Kahoot! Numbers by DragonBox* — zero-text onboarding/discoverability (Q-04). *Sushi Monster (Scholastic)* — progression legibility (Q-11).

**Registry-only, not scored:** *World of Goo 2* (demoted — **O-1 approved**), *Bridge Constructor* (folded into the Poly Bridge profile), *Motion Math Hungry Fish / Guppy*. An entry mapping to no scored dimension is not scored. Access/licence checks and dated observations: spec §5. The nine-criterion Railway Hero record is **current-generation only** (GAME-39) and is never cited as next-generation evidence.

## Architecture and authority boundaries

- **TypeScript engine** — sole mathematical/game authority (above). Pure, JSON-safe, no DOM/storage/network.
- **Phaser 4** (`4.2.1` pinned) — presentation/runtime: scene, planks, selection/drag/preview visuals, snap/tween presentation, underfill/overhang/exact visualization, assembly, crossing, bounded VFX, audio timing, camera emphasis. Must not own correctness, verdicts, remaining span, legal moves, scoring, hints, adaptivity, generation, session limits, telemetry meaning, accessibility semantics or storage.
- **React/Next.js** — route and session lifecycle, setup/summary/pause/settings, the semantic accessibility mirror, keyboard/tap alternatives, mute/reduced-motion controls, loading/fallback/error states, telemetry adapters, earned-break integration, feature-flagged rollout and rollback. It renders engine output; it never computes the verdict.
- **Figma** — production design authority for world, piece families, interaction/feedback states, motion, responsive layouts, accessibility variants and the **host-shell surfaces**. No artefact may encode correctness independently of the engine.
- **Audio** — original synthesized WebAudio is the final-state baseline; **no bespoke or licensed music in v1**. Cues: pickup/select, placement confirm, under/over, exact-fit, assembly/crossing, completion, break-return prompt. A licensed/bespoke cue needs a provenance record and owner sign-off. Noise/alarm/ticking transients forbidden; mute preserves all required meaning.
- **Blender — determination (O-5): not justified as a required dependency.** Optional, provenance-tracked source art for pre-rendered 2D props only (default vector/SVG/CSS 2D; no runtime 3D, no GLB). Flip evidence = GAME-172 recording a material `Below` on Q-09; durable ADR = GAME-143.
- **Contract versioning.** Frozen `RENDERER_BOUNDARY`, `PHASER_RENDERER_CONTRACT` v1.0.0 and the eight-member intent union are unchanged. Additive needs route through **BB-CONTRACT-1 → v1.1.0, additive only, no authority change**. Compatibility: same-version or same-major +1 additive; a major mismatch fails closed to `dom` with `renderer_version_skew`. A dropped intent is not silent — ignored, with a non-blocking "Tap again" retry after 500 ms and `stale_intent_dropped`.
- **Release boundary.** The standalone candidate's source, tests, build and release manifest live in `game-bridge-builder`; `games-site` owns the catalog, launcher, route and approved versioned release pointer. Shared `games-site`, R2 delivery and arcade-shell integration remain separate release decisions, and LevelBest integration is a separately approved post-qualification promotion.

## Host-shell and return-contract ownership

Production **design** of the host surfaces (hub card, S0 setup, S3 summary, S5 pause/settings, S4 earned-break countdown + saved state + return, S6 recovery/fallback) = **GAME-171, sole owner** (NG-09b withdrawn; no frame may contain an extension, skip or "more time" affordance). Runtime **contract**, containment, fault tests and parity = **GAME-135**. GAME-133 does **not** own shell surfaces.

## Accessibility contract

**WCAG 2.2 AA is the target, assessed per success criterion** — the per-SC conformance table is the GAME-134 artefact. SC 2.2.1 and SC 2.2.2 are evaluated against their normative requirements; any exception must be substantiated with evidence and rationale, and an unmet applicable Level A/AA criterion prevents a blanket AA claim. **Relaxed build** is the disclosed untimed accessibility path pending alternate-version verification, not yet a conforming alternate version. 2.5.8 is assessed against the 48 px floor; 2.4.11, 3.2.6 and 2.4.13 each carry one evidence line. Mirror facts **F1–F7**: available pieces · selected piece · exact composition · required span · remaining/over amount (signed) · verdict · remaining time + pause state. Announcements polite at 60/30/10 s and on pause/resume; assertive only for the break-return prompt. All keyboard/SR assertions are driven from the DOM mirror, never the canvas. The conformance statement is signed by the owner-named signer (O-7).

## Telemetry, alerts and defect taxonomy

Events: `session_start{mode,band,source}` · `puzzle_start` · `place_attempt{result,diff,pieceValue,msSincePuzzleStart}` · `submit_result{result,diff}` · `hint_shown{level,puzzleId}` · `puzzle_solved{piecesUsed,par,solveMs,hintLevelMax,constructionVector}` · `second_build{offered,accepted,solved}` · `streak_update{current,best}` · `session_end{bridgesBuilt,score,bestStreak,avgHints,coachingId,durationMs,summaryReached}` · `break_flow{unlocked,started,endedReason,pausedMs,returnedToPractice}` · lifecycle `renderer_init`, `renderer_init_failure`, `renderer_remount`, `stale_intent_dropped`, `renderer_version_skew`, `invalid_intent_rejected` · `invariant_violation{where}`.

Client-side session scope; server-side **aggregates only**, 30-day raw retention Ⓟ; access = owner + engineering, no third parties. **Alerts:** `invariant_violation` >0 in any 24 h → owner alert (P0); `renderer_init_failure` >2 % of sessions in 1 h → alert and automatic pin to `dom`. **Defects:** P0 authority leak, privacy/PII leak or shipped incorrect-fit verdict; P1 dropped input, unrecoverable round or broken return contract; P2 copy, non-colour or state-contract violation; P3 visual polish. Parent brief: per-game minutes itemized inside total time, learning share with game minutes excluded, one curriculum line per session.

## Performance, testing, release

**Performance.** Baseline: iOS Safari 16+ on iPhone 11/SE3-class; Android Chrome 110+ on 4 GB mid-tier hardware; latest-2 desktop browsers; 360×640 CSS px minimum; DPR ≤3 with render scale capped at 2; 200 % zoom. **The canonical per-device-class (A/B/C) budget table in Technical Design §9.1 is the single source** (first interactive, input→visible consequence, frame-time p95 and % of frames meeting threshold, long-task budget, bundle delta, plus **DOM-first/React-path rows**). Ratification and measurement are GAME-135 work; **no next-generation figures are measured today**.

**Testing.** Exactness/property/golden fixtures (Gate A); view-model ↔ renderer synchronization tests; **import-boundary test** (no engine/session/exactness module imports Phaser, layout or `unitPx`; decorative modules cannot emit intents); **placement-invariance test**; **real Phaser render lane** (Playwright chromium `--use-gl=swiftshader` against the real scene — the canvas mock is **non-evidence**); Playwright journeys covering exact/over/under, `submit`/`incorrectSubmit`, multiple solutions, keyboard-only rounds, break flow and rollback; accessibility automation driven from the DOM mirror; device qualification `[required work]`; **CI enforcement via CONSULTING-305, whose scope is extended to the next-generation suites** (next-gen journeys, axe over the DOM mirror, the swiftshader lane, bundle-size and frame-timing budgets, the import-boundary test) — no second CI story. Provenance is an acceptance criterion: an authored-but-unexecuted check is never described as passing.

**Release and rollback.** Feature flag `dom | phaser` plus a `phaser` percentage, with cohort definition, ramp steps and exit criteria; React retained throughout the dual-renderer period as a production renderer. **Parity criteria recorded before DOM retirement: exactness, accessibility, telemetry/privacy, lifecycle, performance.** A **tested** rollback point (flag flip restores React with no state or telemetry loss). Mid-round renderer failure falls back to **DOM-first degraded mode** (semantic controls + labels + F1–F7, one entry announcement, no canvas) with detection ≤1 s and deterministic focus restoration; **the round continues, it does not restart**. Promotion is an **owner release action tracked as a dependency, outside this epic**; React is retained until GAME-143 records the rollback point **and one release cycle passes with no `renderer_init_failure` alert**.

## Dependencies

GAME-129/130/131 (Done — contracts) · GAME-166 (In Progress; reopened) · GAME-39 (Review — reparented here) · **CONSULTING-305** (scope extended — game e2e/a11y suites are not in CI today) · GAME-147 (shared integration map — dependency only) · CONSULTING-182 / CONSULTING-268 (Pilot 0 trust/launch gates) · API-37 Figma (Done) · API-10 Blender (Done, discretionary) · API-23 Unity (Done; unused by design) · AIPORT-193 project-game-maker (In Progress) · games-site production promotion (owner action; separate release pointer) · later LevelBest artifact promotion (separate approval) · **owner/reviewer availability for the four human gates (blocking condition)**.

## Scope

**In:** freeze and preserve exact contracts; typed renderer/view-model and bounded intents; production Figma art direction incl. host surfaces; one-bridge vertical slice; full presentation migration; accessibility/responsive/exactness qualification; performance/parity/e2e/rollout/rollback; benchmark and child/device gate; evidence and history closeout; controlled cutover.

**Out:** rewriting rational arithmetic, generators, scoring, hints or adaptivity; physics/collision-as-authority; Unity or any 3D runtime; Blender runtime 3D/GLB; combine/split/decompose verbs; any free-build/Workshop/Sandbox shelf; accounts or cross-visit child progress on the free site; UGC, community levels, multiplayer, class duels; playtime leaderboards or child-vs-child comparison; ads, loot boxes, paid content, FOMO/loss framing; PII collection, third-party ads or analytics on the play surface; native app packaging/offline PWA; i18n beyond en-US; efficacy/impact research claims; reuse of any comparator name, art, character, audio, writing or layout; reopening completed GAME-36 stories.

## Release gates

- **A — exactness preservation.** GAME-129 stays green; no Phaser/Figma work may alter arithmetic, correctness or multiple-solution semantics.
- **B — design and renderer architecture.** GAME-130/131 boundary; GAME-171 production visual authority incl. host surfaces.
- **C — vertical slice go/no-go.** GAME-132 proves a representative bridge end-to-end across pointer/tap/keyboard and closes critical architecture/accessibility findings before scale-out.
- **D — accessibility/responsive exactness.** GAME-134 proves input parity, semantic mirror, reduced-motion/mute/non-colour, touch and the per-SC conformance table.
- **E — experiential quality.** GAME-172 scores exactly Q-01…Q-23 against the comparator registry; technical correctness alone is insufficient.
- **F — performance/parity/rollback.** GAME-135 qualifies budgets, lifecycle/faults, exact parity, telemetry/privacy and an exercised rollback before React is retired.
- **G — durable closeout.** GAME-143 records architecture, evidence, the Blender ADR, Figma identity (no credentials), superseded-renderer rationale, rollback point and the provenance manifest — without concealing unresolved work.

## Definition of Done

A documented, typed, versioned Phaser renderer/intents boundary exists; GAME-171 provides traceable production Figma authority **including the host surfaces**; all required piece/bridge/feedback/crossing states run through Phaser; TypeScript remains the sole mathematical authority; exactness/property/golden suites are green; multiple-valid-solution behaviour is correct and visually supported; pointer/tap/keyboard converge on identical engine results; the semantic mirror is complete (F1–F7); reduced-motion/mute/non-colour parity passes; responsive and performance qualification passes; representative g12/g34/g56/g78 E2E includes exact/over/under, `submit` and multiple-solution cases; telemetry/session/privacy/earned-break contracts remain compatible with current generation; **Q-01…Q-23 has no unresolved material `Below` except an explicit owner-approved deferral with rationale**; child/device and human-gate evidence is recorded truthfully with **named owners and dates (O-7)**; originality/IP review is clean with the provenance manifest reviewed; independent review has no unresolved critical defect; GAME-36/GAME-39 history remains trustworthy; rollout/rollback evidence exists before retiring the existing renderer; GAME-143 reconciles final documentation, Jira and GitHub state.

**Conditions:** the child AC-edit list is executed (GAME-171/133/134/135/172/166/39, per the Decisions log §7.2 and the spec of record); no authored-but-unexecuted check is described as passing; a `Below` remediation is closed or explicitly deferred with rationale; **no claim of WCAG conformance beyond the recorded per-SC statement**; O-7 owners/dates are recorded — Gates D and E cannot close, and this epic cannot reach Done, without them.

## Genuine gaps — sanctioned by O-8

`BB-CONTRACT-1` and `BB-CONTENT-1` are sanctioned bounded follow-ups, now tracked as **GAME-294** and **GAME-295**; they are not completed work. `BB-CONTRACT-1` covers additive v1.1.0 session-deadline, `renderSeed`, ordered unit-based placement fields and required intent metadata, with no authority change. `BB-CONTENT-1` covers the curriculum catalogue of record, content-volume supply floor and `decoyHonesty` at scale so "14/14 reachable" is falsifiable. Combine/split and physics-as-authority remain out of contract.

Rejected as stories (no duplicate ownership): audio production (GAME-133 + GAME-171), CI enforcement (CONSULTING-305 extended), telemetry/privacy verification (GAME-135 + GAME-134), curriculum statement (epic text). NG-09b host-shell story **withdrawn**.

## Owner decisions (approved 2026-09-17)

O-1 through O-8 are approved policy decisions. They resolve governance choices but do not assert implementation, conformance, human/device evidence, rollback, production promotion, or LevelBest readiness. `Ⓟ` thresholds still require ratification and measurement; O-7 executor names/dates and O-8 follow-up implementation remain open.

- **O-1:** World of Goo 2 is registry-only and unscored; GAME-172 scores only mapped comparators; no expressive reuse.
- **O-2:** WCAG 2.2 AA is the target with per-SC evidence and no blanket claim. Exceptions must be substantiated; an unmet applicable Level A/AA criterion prevents an AA claim. Relaxed is an untimed accessibility path, not yet a conforming alternate version.
- **O-3:** One engine-owned 90 s / 6-bridge cap; the earned break is a fixed 90 s wall-clock window.
- **O-4:** Core suites and real Phaser Chromium SwiftShader must be green in CI before Gate F. A waiver is engineering-only and cannot close Gate F or authorize promotion.
- **O-5:** Blender is optional provenance-tracked source-art tooling for flattened 2D only; no runtime 3D/GLB.
- **O-6:** games-site production-pointer promotion is a separate owner release action; LevelBest promotion is separate; retain DOM/React through exercised rollback and one clean cycle.
- **O-7:** Human-gate, WCAG, and rollback owners/dates must name the candidate, environment, and durable evidence; assignment alone is not approval.
- **O-8:** Both bounded follow-ups are sanctioned; sanction is not implementation or acceptance.

## Recommended implementation sequence

`GAME-129/130/131` (Done) → **GAME-171** production Figma (incl. host surfaces) **in parallel with GAME-132** vertical slice → **GAME-133** full renderer migration → **GAME-134** accessibility/responsive/exactness → **GAME-172** benchmark + child/device gate → **GAME-135** performance/exact-parity/rollout → **GAME-143** durable closeout → controlled retirement of the React renderer. **GAME-39** (current-generation human gates) and **GAME-166** (real-render lane) run alongside; **BB-CONTRACT-1** precedes the GAME-135 tests that depend on its fields; **BB-CONTENT-1** precedes GAME-172's content-scale scoring.

## Jira hygiene (recorded, not product work)

Reparent GAME-39 and GAME-166 to GAME-105 · reopen/extend GAME-166 · return GAME-105 from Verification to In Progress while children are Backlog · retire GAME-36 to Wont Do after its open child moves, preserving its 12 Done stories as current-generation history · execute the child AC-edit list · record CONSULTING-305's extended scope.
