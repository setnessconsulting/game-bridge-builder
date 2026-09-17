# Bridge Builder — First Full UI Test Pass (findings ledger)

**Date:** 2026-08-25 · **Method:** Playwright end-to-end journeys driven as a user (tap-select, keyboard-only, overhang probes, second-way offers, relaxed mode, fraction band, break-mode deep link, storage audit, mobile viewport), executed against a **production build** (`playwright.prod.config.ts`, port 3200).
**Result:** `tests/e2e/bridgeBuilder.spec.ts` — **9 journeys, all green** after fixes (1 skips outside mobile project).

## Bugs found & FIXED same-day

| ID | Severity | Bug (user-visible symptom) | Fix |
|---|---|---|---|
| B-01 | Critical | Placed planks **stayed in the tray**, so the same plank could be placed twice and corrupt the total (double-fill). | Tray is now derived from `originalTray` minus placed ids — single source of truth; undo / second-build / fresh-delivery all consistent. |
| B-02 | High | Missing-addend puzzles showed gap "45" but the visible opening only matched the remainder — the **pre-built section was invisible**, making the numbers feel wrong. | Pre-built planks render as distinct gray planks inside the span. |
| B-03 | Medium | The wobbly **overhang plank intercepted taps/clicks on the open slot**, blocking the exact retry moment it exists to teach. | Transient layers (overhang, critter dot, diff chip, float, preset) are `pointer-events: none`. |
| B-04 | Low | L3 ghost hint always anchored at the cliff edge instead of the next open position. | Anchors at the current fill offset. |
| B-05 | Low | Keyboard: Enter did nothing until a piece was *selected* first — Tab-to-piece then Enter looked broken. | Focused tray piece acts as implicit target; Enter places it. |
| B-06 | Low | "Try one level easier" chip could never appear (`stuckRun` was never incremented) and it printed an internal id (`g34`). | Increments after hard solves (≥4 attempts or ≥L2 hints); chip shows the friendly band name. |
| B-07 | Low | Second-construction offer never timed out (UX spec U-04 promised auto-dismiss). | 6 s timeout declines and advances; accepting clears the timer. |
| B-08 | Info | `/favicon.ico` 404 on **every page** of the site (console error on each load). | Added original `src/app/icon.svg`. |
| B-09 | Test-infra | Dev-server HMR made browser runs nondeterministic. | New `playwright.prod.config.ts` builds and serves a production bundle on its own port. |

## Recorded, not fixed (tracked tails)

| ID | Finding | Where it lands |
|---|---|---|
| R-01 | Break mode isn't reachable from normal hub play until lessons emit block-completion events. **Mitigation shipped:** deep-link `/games?game=bridge&bbMode=break` renders the full break flow (unlock banner → countdown ring → saved-at-expiry return), and the DOM contains no time-extension control. | T7 remaining scope |
| R-02 | g78 signed-shim puzzles currently auto-return any overshoot, so the intended "overshoot then −shim restores fit" strategy can't be exercised; shims behave as decoys. Exact-fit correctness is unaffected (positive-only solutions guaranteed). Needs a small design decision (allow negative placement into an open slot?) before T13. | Design decision → T13 gate |
| R-03 | Free-session 90 s expiry path isn't e2e-covered (waiting out the clock is impractical); it shares the tick/expiry code with break mode, which is partially asserted (ring + no-extension audit). | Coverage gap note on T12/T11 |
| R-04 | g34's first puzzle may be an integer-skill puzzle even though the band card mentions fractions — rotation makes content vary per round. Cosmetic copy consideration only. | Polish backlog |

## Verification state at closeout

- E2E: 9/9 journeys green on production build (desktop project; mobile assertions skip elsewhere).
- Unit: 74/74 Bridge Builder Vitest cases green; repo-wide suite 386+ green (pre-existing sibling suites).
- Typecheck/eslint clean on all files this task touched.

## 2026-08-26 implementation closeout addendum

The four tracked tails are now exercised by the shipped app and targeted tests:

| ID | Current result | Evidence |
|---|---|---|
| R-01 | **Fixed** | `/lessons` now owns the lesson-block completion seam and unlocks exactly one break card. The games route cannot unlock break mode by query string alone. |
| R-02 | **Fixed** | Rational-equation rounds include an intentional overshoot witness and a negative shim. The overshoot exposes a labelled adjustment target; the shim repairs the construction and is covered by desktop/mobile browser tests. |
| R-03 | **Fixed** | Playwright fake-clock coverage now verifies free-session expiry and the lesson-earned break expiry, including the saved construction and forced return. |
| R-04 | **Fixed** | The Grade 3–4 band card now describes its mixed skill rotation rather than promising fractions on every first puzzle; the fraction journey still verifies fractional content appears. |

Current targeted evidence: Bridge Builder browser journeys and accessibility states pass on desktop and mobile; the accessibility suite also covers serious/critical axe findings, keyboard focus return, reduced motion, and 200% zoom reflow. The earlier 2026-08-25 counts above are historical and are superseded by the 2026-08-26 closeout ledger in `SPRINT_READINESS.md`.

## 2026-08-27 review follow-up

A fresh production-build journey reproduced a reliability gap in the fraction path: `buildRound` independently reshuffled skills for each puzzle, so a Grade 3–4 skill could be starved despite the mixed-skill contract. `buildRound` now creates one biased-first skill order per round and cycles through it before repeating. Regression coverage asserts complete skill rotation for every band and preserves focused-skill priority.

Current verification: 405/405 repository Vitest tests, typecheck, lint, and production build pass; the targeted production-build Bridge Builder/lesson/accessibility suite passes 23 tests with 1 intentional desktop-only skip; the corresponding mobile suite passes 23 tests with 1 intentional desktop-only skip. Manual VoiceOver/NVDA, child playtest, final benchmark/IP signoff, and Vercel source/promotion remain owner-controlled gates.
