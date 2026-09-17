# Bridge Builder — Prototype Notes (design evidence)

**Prototype:** [`prototype/index.html`](prototype/index.html) + `prototype/engine.js` + `prototype/game.js` (throwaway; never ships)
**Verification:** `node --check engine.js && node --check game.js && node smoke-test.js` → **PASS 8513/8513 checks** (run output below).
**IP note:** mechanics-level exploration only. No Cyberchase/PBS names, art, audio, characters, layouts, or story were reproduced. All theme assets here are CSS-drawn original work.

---

## 1. Tooling honesty statement

GamineAI Builder (https://gamineai.com/builder, repo GamineAI/GamineAI-Builder-) is a hosted web app (AI generation, live preview, theme generator, SFX generator, code editor/export). **This CLI agent environment cannot drive that web UI** — there is no browser automation surface attached to this run, so hands-on Builder sessions are recorded as **BLOCKED (tool-access), owner-runnable**. To keep Phase 3 real rather than skipped, the prototype was produced in the Builder's exact target format — self-contained HTML/CSS/JS with no dependencies — together with **ready-to-paste generator prompts** (§5) for its Theme and SFX generators. A human opening the Builder can reproduce/extend the visual+audio direction in minutes using those prompts; the exported result would slot into the same files.

Confirmed vs blocked, stated plainly:

| Step | Status |
|---|---|
| Playable core-loop prototype built & iterated | CONFIRMED (this folder) |
| Engine logic verified headlessly (8,513 assertions) | CONFIRMED |
| Theme direction defined as tokens + generator prompt | CONFIRMED (direction) / BLOCKED (in-Builder render) |
| SFX direction defined as spec + generator prompt | CONFIRMED (direction) / BLOCKED (in-Builder render) |
| Human playtest with kids | NOT RUN (owner step; checklist in §6) |

## 2. What the prototype implements

Core loop only, per the "throwaway prototype of the CORE LOOP early" mandate:

- Two bands: **whole planks** (gaps 7–12, integer pieces) and **fraction planks** (bridge of 1 in eighths; ½/¼/⅜ labels over true proportional widths).
- Tap-to-place composition with left-to-right fill; overhang renders past the far cliff with wobble + exact diff chip ("2 too long"), then returns to tray.
- Exact-fit detection in integer arithmetic (eighths scaled internally); solve animation (cliffs connect, critter dot crosses, +N float).
- Second-construction offer ("Build it another way? +5") gated on the engine's verified ≥2-subset-solutions flag.
- Hint ladder L1 text chip → L2 highlighted piece → L3 ghost outline, triggered by stuck threshold or failed attempts.
- Session cap: 90 s timer or 6 bridges; relaxed mode (no clock); pause on Esc/tab-blur; summary screen with deterministic coaching line.
- Accessibility baseline: keyboard (Tab/U/Esc), focus-visible rings, ARIA live announcements mirroring every gameplay event, reduced-motion media query, ≥48 px targets, no color-only signaling.

Deliberate simplifications vs production spec (recorded, not hidden): pointer-drag reduced to tap-select (drag polish is production work); tray rendered ascending (production shuffles visually per U-09 while keeping ascending focus order); no earned-break countdown context (free-site context only).

## 3. What was validated

1. **Solvability invariant holds at scale.** 1,000 generated puzzles (500/band): every puzzle has ≥1 exact solution; the second-construction flag exactly matches the DFS subset count. This de-risks REQUIREMENTS F-05 before any production code exists.
2. **Multi-solution supply is sufficient but not saturated:** whole band 30.0% multi-solution, eighths 52.6%. The offer gate (`every other solved puzzle AND flag`) therefore fires often enough to teach "many ways" without nagging. Production generator should raise whole-band multi-solution rate toward ~50% by biasing gap/piece choices — folded into EPIC story T2 acceptance criteria.
3. **Pacing feels right-sized.** Whole-band puzzles resolve in ~4 placements ≈ 10–15 s at prototype speed → 6 bridges lands near the 90 s cap, matching the earned-break window math. Fraction band runs slightly longer (label reading), confirming the spec's decision that g56+ rounds may use 5 bridges instead of 6.
4. **Overhang-as-teacher works.** The diff chip ("½ too long") plus physical poke-past-the-cliff conveys more than a wrong/right flash ever could — this is the single most important interaction carried from the Railway Hero benchmark, and it survived first contact in self-play.
5. **Zero-reading onboarding:** setup cards describe content ("Fill gaps up to 12"), not grades-first; first puzzle is solvable by any two pieces — the coaching test in UX_DESIGN §2 is structurally satisfiable.

## 4. What failed and what changed

| Failure / friction observed | Change made (code and/or spec) |
|---|---|
| **Second-construction dead end (self-review catch):** after a solve, leftover decoys often cannot compose the gap again — accepting "another way" could soft-lock. | Fixed in prototype (`originalTray` re-delivery on accept). Spec hardened: production treats "another way" as a fresh plank delivery, and T2's property tests must assert ≥2 solutions *per full menu* (already) **and** tray restore semantics. |
| Whole-band multi-solution at 30% makes offers rare early | Generator bias task added to T2 ACs (target ≥45% multi-solution for gaps ≤12). |
| Score popup originally centered (would steal attention from structure) | Moved to floating chip near bridge — U-01 resolved pre-implementation. |
| Timer tick gave no progress-bar sync in first cut | Progress bar width bound to remaining time (also matches NLJ shell behavior). |
| Drag-and-drop added complexity without adding evidence value at this stage | Deferred to production UI story T6 with the two-step tap-select parity requirement (F-09). |

## 5. Ready-to-paste GamineAI generator prompts

**Theme generator:** "Kids' construction math game, canyon bridge building. Palette: canyon slate #3E4A5B, sand #E8D5A8, plank cedar #B5713F, moss green #5C8A4E accent, pale sky #DCEBF5 background. Flat rounded shapes, thick 2px outlines, oversized friendly numerals on wooden plank pieces, dashed-outline empty slot. No characters, no villains, no railways, no red error colors. Calm success state in moss green; mistakes shown by physical overhang, not color."

**SFX generator:** "Cartoon-modern, wood and marimba timbres, quiet mix (~ -18 LUFS): 60ms soft tick for pickup; low warm 'thock' for placing a plank; muted double knock (never alarming) for an overshoot; rising three-note C-E-G chime for solving. No buzzers, no alarms, no ticking clocks."

## 6. Owner-run playtest checklist (unblocked next step)

Open `prototype/index.html` in any browser (double-click; no server needed):

1. Can a child start without explanation? (coaching test, UX §2)
2. Does the overhang moment produce "aha" rather than frustration?
3. Is "another way?" inviting or pressuring?
4. Phone check: tray reachable one-handed; nothing clipped at 360 px width.
5. Sound toggle respected; nothing requires audio.

Record answers in this file; findings flow back through the same finding-register process as UX_DESIGN §9.
