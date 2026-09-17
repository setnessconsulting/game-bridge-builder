# SPRINT READINESS — Bridge Builder

**Date:** 2026-08-25 · **Epic:** CONSULTING-185 · **Project:** Setness Consulting (CONSULTING) · **Site:** setnessconsulting.atlassian.net
**Verdict: PASS** — Jira Admin Agent audit round 2 of 2, zero blocking findings. Epic + 13 stories are sprint-ready pending the owner/user-only steps listed in §4.

---

## 1. Issue register

| Story | Key | Title | Pts | Blocked by |
|---|---|---|---|---|
| Epic | **CONSULTING-185** | [LEVELBEST] Bridge Builder composition & equivalence math game | — | — |
| T1 | CONSULTING-186 | Engine core: types, rational arithmetic, state machine, scoring | 3 | — |
| T2 | CONSULTING-187 | Problem generation g12+g34 | 3 | T1 |
| T3 | CONSULTING-188 | Problem generation g56+g78 | 3 | T1 |
| T4 | CONSULTING-189 | Adaptive difficulty wiring to placement/mastery data | 2 | T2, T3 |
| T5 | CONSULTING-191 | Tutor seam + deterministic hint ladder v1 | 3 | T1 |
| T6 | CONSULTING-193 | React shell & screens (setup/play/reveal/summary/pause) | 5 | T1, T2, T5 |
| T7 | CONSULTING-195 | Earned-break unlock, 90 s window, countdown return | 3 | T6 |
| T8 | CONSULTING-197 | Free-site /games hub integration | 1 | T6 |
| T9 | CONSULTING-200 | Score records ("beat your best") + summary polish | 2 | T6 |
| T10 | CONSULTING-202 | Telemetry events + parent-brief itemization | 3 | T6 |
| T11 | CONSULTING-205 | Accessibility controls package | 3 | T6 |
| T12 | CONSULTING-209 | Tests + lint/typecheck/build gates | 2 | T1–T11 |
| T13 | CONSULTING-213 | Benchmark polish pass vs Railway Hero + IP sign-off | 2 | T8, T11, T12 |

Total **35 pts**, every story ≤ 5 pts. All issues carry labels `levelbest`, `game-bridge-builder`; `[LEVELBEST]` bracket prefix follows portfolio convention; all stories parented to the epic; **27 Blocks links** match `EPIC_PLAN.md` exactly.

## 2. Jira Admin Agent audit record

Method: independent read-back of all 14 issues via search API, audited by a deterministic script (`expected Blocks-edge map` vs actual; per-issue field contract) implementing the jira-admin issue-quality-review checklist.

- **Round 1:** 14/14 issues found; **1 finding** — CONSULTING-197 estimate line inconsistent ("1 story point" vs uniform "story points" contract). No missing values vs unknown values ambiguity: the value existed in nonconforming form.
- **Fix:** description normalized via issue edit; verified by field-by-field read-back (description updated 2026-08-25T12:19:54Z; labels/priority/status untouched).
- **Round 2:** **PASS — zero findings.** Structural checks green: required fields, ≥3 testable G/W/T criteria per story, estimates present and matching plan totals, dependency edges exact both directions, correct project/type/parent, sprint-sized decomposition, duplicate scan clean (label-scoped JQL returns exactly the 14 intended issues; pre-creation text scan had zero prior Bridge Builder issues).
- Verdict comment recorded on CONSULTING-185 (comment id 10636), including the provenance note: issues created via MCP write surface under explicit owner task instruction (CONSULTING-98 precedent); ChangeSet/ApprovalReceipt path not driven from this session; Ready transitions and sprint assignment deliberately left owner/jira-admin-gated.

## 3. Check status ledger (confirmed / skipped / blocked)

**Confirmed this run**
- Phase artifacts written: REQUIREMENTS.md, UX_DESIGN.md, PROTOTYPE_NOTES.md, EPIC_PLAN.md, this file.
- Prototype engine verification: `node --check engine.js && node --check game.js && node smoke-test.js` → **PASS 8513/8513**; solvability invariant 100% across 1,000 generated puzzles; multi-solution rates measured (whole 30.0%, eighths 52.6%).
- Jira epic + 13 stories created, parented, labeled, prioritized; 27 dependency links applied and verified.
- Two-round independent audit completed with one real finding fixed and re-verified.
- Red-team pass executed: 14 findings (F-01…F-14), all dispositioned; UX review register 12 findings (U-01…U-12), zero open blockers; prototyping learnings folded back into specs and stories (tray-restore semantics, ≥45% multi-solution AC, 5-bridge g56+ rounds).

**Skipped (with reason)**
- Repo npm gates (`typecheck/lint/test/build`): nothing in `src/` was changed this run per the artifact contract, so there is no delta to gate; the gate run is scoped inside story T12 at implementation time.

**Blocked / user-only next steps**
- GamineAI Builder live web session (theme/SFX generator renders): no browser automation in this environment; ready-to-paste generator prompts are in PROTOTYPE_NOTES §5.
- Same-day hands-on play of Bridge Builder vs Railway Hero incl. child playtests: requires human players; enforcement gate is story T13 (checklist in PROTOTYPE_NOTES §6).
- Sprint assignment, Ready/In-Progress transitions, assignees: reserved to owner/jira-admin policy; deliberately not set.

## 4. Cross-game reference quality bar — self-review vs Cyberchase: Railway Hero

Evidence basis for this design-stage review: playable prototype mechanics verified headlessly (PROTOTYPE_NOTES §3–4), UX spec walk, and primary documentation of Railway Hero's behavior (Perkins School for the Blind accessibility review; WNET launch posts; PBS KIDS parents guidance describing gap-filling combinations, untimed play, auto-pause, repeat-audio key, multiple-solution encouragement). Honest caveat: neither game was played side-by-side in a browser during this run; per-criterion verdicts below marked **provisional** must be confirmed hands-on in T13 before Done. No criterion is currently scored below reference, so no remediation loop was triggered.

| # | Criterion | Design-stage assessment vs reference | Status |
|---|---|---|---|
| 1 | Math-game integration | Exact-fit requirement makes composition/equivalence the win condition itself; CCSS map spans g1–8 vs reference's early-addition scope; misconception-targeted generation planned | Meets/exceeds by construction — confirm in T13 |
| 2 | Child discoverability | Zero-text tutorial; first puzzle nearly unfail-able; content-first band cards; structural coaching test defined; needs real-kid validation | Provisional PASS — kid playtest pending |
| 3 | Feedback quality | Overhang renders past cliff with exact diff chip; structure closes on success; ≤100 ms consequence rule — mirrors reference's structure-first feedback | Provisional PASS — visual polish lands in T6 |
| 4 | Pacing | ~10–15 s puzzles → 90 s / 6-bridge cap ≈ reference level cadence; prototype timing supports the window math | Provisional PASS |
| 5 | Visual communication | Values printed on pieces + true proportional lengths + band-tick policy; three redundant channels | Provisional PASS — production art pending |
| 6 | Error recovery | Unlimited retries; diffs teach lengths; hint ladder never reveals answers; streaks immune to hints — designed beyond reference's retry model | Provisional PASS |
| 7 | Accessibility | Keyboard parity, two-step select, ARIA announce parity, reduced-motion, relaxed mode + doubled stuck threshold, color-independence, captions-equivalent cues; exceeds reference baseline (untimed + auto-pause + repeat key) on paper | Provisional — verify in T11/T13 |
| 8 | Adaptive potential | Placement-signal wiring + misconception biasing + swappable tutor adapter — exceeds reference's static level ladder by design | Exceeds (strongest criterion) |
| 9 | IP separation | Original canyon-construction theme; no villain-theft plot, no railway/train framing, no PBS characters/names/art/audio; benchmark used only for pacing/clarity behaviors; F-08 closure gated at T13 sign-off | PASS at design stage — sign-off in T13 |

## 5. What "Done" means for this package

All stories Done → repo four-gate green at merged HEAD → QA checklist D-01…D-10 evidenced → T13 nine-row evidence table committed as an addendum below this section → GAMES_PLAN.md shipped-table row + STATUS.md reconciled. Until then, this package is **Ready-for-sprint-planning**, not shipped.

---

## Addendum — Implementation evidence (2026-08-25, same day)

**Shipped to production source** (stories T1–T11 scope):
`src/lib/games/core/{types,rng}.ts` · `src/lib/bridgeBuilder/{types,format,math,skills,generate,engine,hints,adaptive,telemetry,sound}.ts` · `src/app/games/BridgeBuilder.tsx` · `GamesHub.tsx` card · `globals.css` bb-* section.

**Verification ledger**
| Check | Result |
|---|---|
| New Vitest suites (`tests/bridgeBuilder*.test.ts`) | **74/74 pass** |
| Solvability invariant | every emitted puzzle =1 exact solution, property-tested per skill across seeds |
| compose-10 multi-solution supply (T2 AC) | =45% of seeds offer =2 distinct builds (asserted in suite) |
| Exact arithmetic / E-03 clamp | integer-scaled units only; scaled < 2³¹ asserted |
| ESLint on all touched files | clean (0 errors, 0 warnings) |
| Full-suite run | 180 passed / 14 failed — **every failure owned by unrelated uncommitted WIP** (`circuitRescue`, `mathEscape`) |
| Repo `typecheck && build` | BLOCKED externally: 52 pre-existing TS errors in the same unrelated WIP modules |

**Story status at closeout**
Done: T1–T6, T8, T9, T10 · In Progress: T7 (lesson-block unlock integration point ready via props), T11 (axe/SR manual passes pending), T12 (repo gate blocked by foreign WIP) · Ready: T13 (hands-on benchmark + child playtest = owner step).

**T13 nine-criterion design-stage table:** see §4 above; hands-on confirmation remains the closure gate.

## 6. 2026-08-26 implementation and verification addendum

The candidate implementation is isolated on `codex/consulting-185-bridge-builder` from
`origin/main` at `2344bf5`. The lesson route now owns the completion seam: a completed
guided lesson exposes one earned-break card, starts Bridge Builder in a 90-second mode,
saves the in-progress construction at expiry, and returns to the still-mounted practice
summary. The games route does not unlock break mode by query string alone.

T7 is code-complete and covered by the desktop and mobile lesson-flow tests. The final
ten seconds use a steady amber state with no animation, and the break card exposes no
extension or skip control. T11 has automated axe, keyboard, focus-return, mobile/touch,
reduced-motion, and 200% zoom coverage. A real VoiceOver/NVDA smoke pass is still a
human-only gate and is not claimed here. T12 repository gates are green; the full
repository browser run still has unrelated sibling-game failures documented in the
closeout report. T13 remains open until the owner records the child playtest and signs
the IP-separation review.

### T13 same-day comparison evidence

On 2026-08-26, the named [Railway Hero PBS KIDS page](https://pbskids.org/games/play/railway-hero/31239)
was opened in a browser. The live canvas was observed through the settings screen,
sequential cybersite map, first level, a gap labelled 2, a six-piece tray, exact-fit
checking, and the launch transition. This is direct same-day reference evidence, not a
claim that the full reference campaign or a child playtest was completed.

| # | Criterion | Railway Hero same-day evidence | Bridge Builder evidence | Score / state |
|---|---|---|---|---|
| 1 | Math-game integration | First playable gap visibly required a piece length of 2 and an exact check before launch. | Exact scaled-integer fit is the win condition; 14 CCSS-tagged skills and generator invariants are tested. | 2 provisional |
| 2 | Child discoverability | Canvas directions identified the next gap, tray, check, and launch actions. | Content-first setup, labelled gap/tray targets, and zero-text first-round path. | 1 provisional |
| 3 | Feedback quality | Correct check produced visible filled track and launch feedback. | Overhang diff, signed-shim correction, captions, sound-off parity, and success feedback are tested. | 1 provisional |
| 4 | Pacing | Map-to-level-to-gap progression reached play quickly after the title/settings surface. | Six-bridge or 90-second rounds plus a fixed 90-second earned break are clock-tested. | 1 provisional |
| 5 | Visual communication | Track cells, piece lengths, map route, and large Play control were visible in the canvas. | Proportional bridge span, numeric labels, dots/group marks, status strip, and text diffs. | 1 provisional |
| 6 | Error recovery | Not fully exercised in the bounded reference pass. | Undo, retry, hints, overhang correction, and negative-shim repair have browser coverage. | 1 provisional |
| 7 | Accessibility | Live settings surface exposed audio, text-size, color/contrast, captions, and timed-play controls; full assistive run not completed. | Axe serious/critical scan, keyboard parity/focus return, touch layout, reduced motion, and 200% zoom pass; VoiceOver/NVDA manual smoke remains open. | 1 open |
| 8 | Adaptive potential | Observed level ladder is sequential. | Placement third and domain signals select band, skill bias, and easier/harder within-band generation. | 2 provisional |
| 9 | Originality / IP separation | PBS/Cyberchase names, art, audio, and characters were used only as the comparison reference. | Source scan found no PBS/Cyberchase/Railway Hero identifiers in the implementation; owner IP sign-off is still required. | 2 provisional |

The numeric scores are provisional engineering evidence, not the T13 Done transition:
the full same-day campaign, child observation, and human IP sign-off remain required.

### Owner-only closeout script

1. On the same day, open Railway Hero and Bridge Builder in fresh browser tabs and
   record one line of evidence for each of the nine rows above while playing at least
   the first two reference/game challenges.
2. In `/lessons`, complete one guided lesson, start the single earned Bridge Builder
   card, verify the 90-second countdown, let it expire, and record the Saved screen and
   automatic return. Confirm that no extension/skip control appears.
3. With VoiceOver or NVDA enabled, play one Bridge Builder round using only the
   keyboard and screen-reader announcements. Record the setup, selected plank, gap,
   error correction, pause/resume, summary, and earned-break return announcements.
4. Have a child play the first Bridge Builder challenge without coaching. Record only
   behavior observations (discoverability, confusion, recovery, and whether the math
   is doing the work); do not record names, accounts, or other personal data.
5. Review the nine-row table and the implementation source for IP separation, then
   add the reviewer/date/sign-off to CONSULTING-213. Transition T11/T13 and the Epic
   only after every acceptance criterion is evidenced.

## 7. 2026-08-27 engineering follow-up

The Bridge Builder engineering follow-up is merged to `main` through PR #8 at
`ef703044a2f045fef14062b619fb878637d66e93`; pull-request CI run #57 passed on the
source commit `827666950b2142c75b004c5ae5a6a513114bd026`.

Review found that `buildRound` independently reshuffled skills for every puzzle,
which could starve a Grade 3–4 skill and make the fraction journey luck-dependent.
The generator now creates one biased-first skill order per round and cycles it before
repeating. Regression coverage asserts complete rotation for every band and focused
skill priority.

Current engineering evidence: 405/405 repository Vitest tests across 34 files,
typecheck, lint, and production build pass; targeted production-build and mobile
Bridge Builder/lesson/accessibility suites each pass 23 tests with 1 intentional
desktop-only skip. The manual VoiceOver/NVDA pass, owner child playtest, final
Railway Hero benchmark/reviewer/IP sign-off, and Vercel source/promotion remain
required before the Epic can be closed.

## 8. 2026-08-27 full-flow verification pass (OpenCode)

A verification-only pass ran against `origin/main` at `a632174` in a clean isolated
worktree: no product code changed, no Jira transitions, no deploys. Full command
ledger, browser journey matrix, and findings:
[`OPENCODE_FULL_FLOW_REPORT.md`](OPENCODE_FULL_FLOW_REPORT.md).

Results: all four repository gates green (405/405 Vitest); the dedicated Bridge
Builder/teachingFlow/accessibility suites pass on the production config (22 passed,
2 intentional skips) and on a clean isolated mobile run (23 passed, 1 intentional
skip); the full browser journey matrix passed — fair skill rotation in all four
bands, second-construction offers, signed-shim repair, workshop, fake-clock
expiry/caps, the lesson→break→return integration, axe scans, zoom/grayscale/mobile
checks, and storage/network privacy audits. An earlier mobile-suite failure was a
port-3000 collision with an unrelated concurrent dev server and is superseded by the
clean re-run (test-infrastructure event, not a product defect).

Remaining items for the epic (owner/next-session queue):

| # | Item | Lands in | Type |
|---|---|---|---|
| 1 | VoiceOver/NVDA manual screen-reader pass over setup/play/overhang/hint/pause/summary/break | T11 (CONSULTING-205) | human-only |
| 2 | Hands-on Railway Hero benchmark rows, child playtest, IP sign-off | T13 (CONSULTING-213) | human-only |
| 3 | BB-V1: Workshop mode shows a static "90s" clock chip + progress bar despite its "no clock or score" promise (cosmetic; the timer is code-excluded from expiry) | T13 polish | low product finding |
| 4 | BB-V2: 1- and 2-unit planks clamp to an identical 52px width, breaking length proportionality exactly where Grade-1 counting relies on it (labels/dot faces remain) | T13 polish | low product finding |
| 5 | BB-V3 (info): `/_vercel/insights/script.js` 404 console error when served off-platform; absent on the Vercel deployment | T12, optional | hygiene |
| 6 | INF-V1/V2: verify the responder on port 3000 before teaching-config runs; align default `playwright.config.ts` timeout/worker budget; re-run unrelated sibling specs (circuitRescue/mathEscape/numberLineJumper) and investigate the mathEscape desktop "You scored" assertion under the teaching/prod config | T12 (CONSULTING-209) | test-infra |
| 7 | Transition T7 → Done, then T11/T13/Epic after items 1–2 (owner-only; none performed by the pass) | owner | Jira |

With items 1–2 evidenced and 3–4 dispositioned, the Epic has no remaining technical
blockers from this pass.

### 2026-08-27 engineering closeout pass

- **BB-V1 — fixed and verified:** Workshop/sandbox no longer renders a clock chip or progress bar. Browser regression evidence compares the Workshop status at t0 and t+3.5s, then advances beyond the normal 90-second expiry and confirms play remains active.
- **BB-V2 — fixed and verified:** short Grade-1 tray planks now preserve the bridge's 24 px/unit visual scale (1 unit = 24 px, 2 = 48 px, 3 = 72 px, 4 = 96 px) before the existing large-value cap. Browser regression evidence measures the rendered Grade-1 tray pieces.
- **T12 / INF-V1 — fixed:** both the default and teaching Playwright runners perform a pre-test identity check against `/games` and require the LevelBest catalog marker (`Bridge Builder`). The teaching runner also owns/starts the `:3000` dev responder when needed, so a responding foreign app is rejected before test execution.
- **T12 / INF-V2 — aligned:** the default runner now uses the same 90-second, single-worker sequential budget as the teaching runner. Verification was run with retries disabled for the dedicated/mobile/sibling passes so retries could not hide failures.
- **T12 Math Escape follow-up — test race fixed:** the previously observed desktop `You scored` assertion reproduced in isolation. The second-session test was still on completed Room 1 when it attempted to solve Room 2; it now waits for the automatic Room 1→Room 2 transition (`Door locked: 0 of 4`) before solving Room 2. The isolated test and sibling suites were re-run after that correction.
- Repo gates re-run after these surgical changes: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all passed in this closeout workflow.
- Dedicated Bridge Builder production desktop and mobile teaching suites passed after the changes.
- **Still human-gated / not claimed by this pass:** T11 VoiceOver/NVDA manual screen-reader validation; T13 hands-on Railway Hero comparison, child behavior-only playtest, and IP sign-off; owner transitions for T11/T13/the epic.

### 2026-08-27 exact PR-head re-verification (Codex follow-up)

The pushed closeout branch was re-run from a fresh isolated worktree at
`95f92db6e32708a2da5e4208b9434d1723c4e1ce`. Repository gates remain green:
typecheck, lint (0 errors; five pre-existing warnings), 405/405 Vitest tests,
and production build. The production Bridge Builder/lesson/accessibility suite
passed 24 tests with 2 intentional skips. The complete mobile teaching suite,
run on an isolated `LEVELBEST_E2E_PORT=3300`, passed 25 tests with 1 intentional
skip, including the Workshop and short-plank regressions.

The sibling regressions also passed in isolation: Math Escape 5/5 runnable with
one intentional skip, and Number Line Jumper 3/3 runnable with one intentional
skip. The full browser sweep on the exact source was **95 passed, 7 failed, 6
skipped**; all seven failures were sibling-only (six Circuit Rescue mobile
console-request 403s and one Math Detective mobile timeout), with no Bridge
Builder failure.

The closeout also corrected the evidence-integrity gap that allowed another
LevelBest worktree to be reused on port 3000. Both default and teaching
Playwright configs now own their responder (`reuseExistingServer: false`) and
support an explicit `LEVELBEST_E2E_PORT`; a busy port fails fast rather than
silently running a different checkout. BB-V1 and BB-V2 are fixed and verified.

The Epic remains open. T11 still needs a real VoiceOver/NVDA screen-reader pass;
T13 still needs the same-day Railway Hero comparison, uncoached child playtest,
and human IP-separation sign-off. Those gates, the Jira transitions, and the
Vercel Git-source/promotion action were not performed or claimed by this pass.

## 2026-09-04 LEVELBEST-10 independent accessibility review

The current-main review began at `f21b530` and read the binding Jira story and
parent, related Bridge Builder PRs #1, #8, #13, and #37, the current source and
styles, input handlers, tests, CI, and deployed behavior. Four narrow defects
were found and fixed in PR #53 (`a792d8e`), merged to `main` as
`f0e3748b8ac0fd2bdd4569f045a18c7271cb5921`:

1. Focus now moves to the next available tray control (or the new heading)
   when keyboard placement removes the focused tray button.
2. Delayed start/transition heading focus no longer steals focus after the user
   has interacted with a control.
3. Escape dismisses the optional second-build dialog without opening pause, and
   disconnected dialog return targets fall back to the new heading.
4. Open-gap and placed-plank controls retain their 42px visual beam geometry
   while exposing tested 48px hit layers for touch input.

| Evidence | Result |
|---|---|
| Local full CI (`scripts/ci-local.ps1 -Tier full`) | typecheck, lint, 58 files / 660 Vitest tests, and build passed |
| Bridge Builder desktop/mobile browser set | 48 passed, 4 documented skips |
| Targeted accessibility browser set | serious/critical axe scans passed; focus, reduced-motion, zoom, captions, grayscale, touch, overhang, pause, break, and summary checks passed |
| Teaching-flow + Pilot 0 qualification set | 29 passed, 3 documented skips |
| Post-merge CI / deploy | CI `33933405887` passed; Vercel deploy `33933405882` passed |
| Post-deploy live probe | desktop and iPhone-sized route HTTP 200; no console/page errors; zero default axe violations; deployed open-gap hit layer measured 48px high |

Disposition: the automated/structural package is PASS. The Jira story is not
closeable from this session because AC4 and the Definition of Done explicitly
require a real VoiceOver/NVDA keyboard-only smoke and manual notes. No
VoiceOver/NVDA runtime was used here, so that human evidence is intentionally
not claimed. Keep LEVELBEST-10 in Review and the Bridge Builder Epic in
progress until that evidence is recorded.

---

## 9. 2026-09-08 GAME-39 (T13) benchmark-polish pass — engineering evidence

Branch `codex/game-39-benchmark-polish` from `origin/main` at `2ecea09`.
No product-code changes: this pass found no criterion below its established
quality requirement, so no remediation loop was triggered. Perimeter-fence
extension is **dropped** per the <1-pt constraint (REQUIREMENTS N-4 / F-14,
EPIC_PLAN T13 DoD): no `surface`/`perimeter` implementation exists in
`src/lib/bridgeBuilder/` or `src/app/games/BridgeBuilder.tsx` (grep confirms
only the docs-level conditional), and none is added here.

Manual-benchmark limitation (honest): no same-day hands-on Railway Hero
playtest was performed in this environment and no child playtest was run, so
nothing below is a human-gate claim. The 2026-08-26 bounded same-day
observation (§6) stands as historical reference evidence only. The owner-only
closeout script (§6) remains the path to Done: same-day hands-on comparison,
uncoached child behavior notes, and human IP-separation sign-off on GAME-39.

### Nine-criterion status (implementation + automated evidence, not human gates)

| # | Criterion | Evidence notes | Status |
|---|---|---|---|
| 1 | Math-game integration | Exact scaled-integer fit is the win condition (`exactness.ts`: integer-unit equality; pixels/snap never participate). 14 CCSS-tagged skills g1–g8 (`bb-compose-10` … `bb-pythagorean-span`); solvability invariant + multi-solution supply property-tested; generator rotation cycles every band skill before repeating. Reference scope is early-addition; Bridge Builder spans g1–8 by construction. | Meets/exceeds (implementation) |
| 2 | Child discoverability | Content-first setup (`Bridge Builder · pick your level`, band cards), labelled gap/tray targets, `Gap needs X` announcements, focused-tray-piece implicit Enter placement, tap-select/tap-place, drag with open-gap drop target. Real-kid validation still requires the owner uncoached playtest. | Meets pending child playtest |
| 3 | Feedback quality | Overhang renders past the cliff with exact diff chip (`formatDiff`), signed-shim overshoot→repair flow, `solve`/`finish` synth cues with sound-off visual-caption parity, `role=status` live announcements, second-build offer with 6 s auto-dismiss. E2E asserts overhang, shim repair, captions, workshop/sandbox states. | Meets/exceeds (automated) |
| 4 | Pacing | Free 90 s / 6-bridge rounds (`BRIDGE_SESSION_SECONDS=90`, `BRIDGE_MAX_BRIDGES=6`); earned break fixed 90 s with countdown return and no extension control; relaxed/sandbox untimed; fake-clock expiry asserted for free and break modes. | Meets (automated) |
| 5 | Visual communication | True 24 px/unit proportional tray geometry (1→24 px … 4→96 px; BB-V2 regression asserts rendered widths), numeric labels, dot/group marks, band ticks, status strip, text diffs; grayscale/color-independence and 200% zoom e2e pass. | Meets (automated) |
| 6 | Error recovery | Unlimited retries, undo, split/merge combine, hint ladder that never reveals answers, `stuckRun≥3` → "try one level easier" chip with friendly band name, second-construction offer, negative-shim repair of intentional overshoot. E2E covers undo, hints, easier suggestion, second build, shim repair. | Exceeds (automated) |
| 7 | Accessibility | Axe serious/critical clean across core states; full keyboard parity with focus return (GAME-44 closeout); 48 px touch hit layers over true visual geometry; reduced-motion honored; 200% zoom reflow; relaxed mode (no clock/score, doubled stuck threshold); ARIA roles/live regions; sound-off caption parity. Manual VoiceOver/NVDA smoke remains the open human gate. | Automated PASS; manual SR open |
| 8 | Adaptive potential | Placement signal → band/third/domain-strength → biased skill ids + within-band easier/harder knob (`adaptive.ts`); per-round biased-first rotation with focused-skill priority; misconception-biasing seams; swappable tutor adapter. Reference ladder is sequential; this is structurally adaptive. | Exceeds (implementation) |
| 9 | IP separation | Implementation/design separation check (not legal advice): `rg -i` over `src/` finds zero `cyberchase|railway.?hero|pbs kids|pbskids` identifiers in Bridge Builder implementation; BB src scan for `railway|cyberchase|pbs|villain|train|track|hero` returns zero hits (only generic-English false positives elsewhere, e.g. `digit`/`delete`). Theme is original canyon-construction (gap/planks/Workshop/relaxed/break copy); audio is original synth-oscillator cues (`pickup/place/overhang/solve/finish`) + OS speech, no PBS assets; no villain-theft plot, railway/train framing, characters, names, art, layouts, or branding. Docs cite Railway Hero only as a benchmark link. **Human IP-separation sign-off on GAME-39 is still required** and is not claimed here. | Implementation check PASS; human sign-off open |

### IP-review checklist (names, story, writing, art, audio, UI/layout, mechanics, branding)

- Names: `Bridge Builder`, skill ids `bb-*`, copy (`gap`, `planks`, `Workshop`, `relaxed`, `break`) — no PBS/Cyberchase names or characters.
- Story framing: canyon-crossing construction site; no villain-steals-track narrative, no railway/train mission.
- Writing: original instructional microcopy + deterministic coaching line ("You kept adjusting until it fit exactly …"); no PBS dialogue or catchphrases.
- Art: CSS/DOM-rendered planks, cliffs, diff chips, lantern markers; no copied sprites, characters, or layouts.
- Audio: WebAudio oscillator cues + optional OS-voice lines; no sampled PBS music/SFX; master mute + per-cue visual equivalents.
- UI/layout: original setup/play/reveal/summary/pause + break-return flow; reference behaviors (repeat-direction style announcements, untimed toggle) re-implemented, not copied.
- Mechanics presentation: exact-fit composition with multiple valid builds and signed-shim correction — shared math-mechanic pattern, independently expressed.
- Branding: LevelBest hub card with Pilot 0 labeling; no PBS KIDS marks. This is an implementation/design separation check, not legal advice.

### Automated gates re-run on this branch (2026-09-08, isolated worktree)

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npm run lint` | PASS (0 errors) |
| `npm test` (full Vitest) | **920/920 across 84 files** (Bridge Builder suites: 98 core + 12 Phaser) |
| `npm run build` | PASS (static `/games` incl.) |
| Playwright `bridgeBuilder.spec.ts` (desktop, isolated port) | 18 passed, 2 intentional mobile-only skips |
| Playwright a11y + closeout + touch-target (desktop, isolated port) | 8 passed, 1 intentional mobile-only skip (axe serious/critical clean, 48 px hit layers verified) |

### Still required before GAME-39 Done (owner/reviewer, not performed here)

1. Same-day hands-on Railway Hero comparison across all nine criteria with one evidence line per row (first two reference/game challenges minimum).
2. Uncoached child behavior-only playtest notes (no names/accounts/PII).
3. Human IP-separation/originality sign-off recorded on GAME-39 (this file is implementation evidence, not the sign-off).
4. Jira transition of GAME-39 (and epic GAME-36) only through the available workflow after 1–3 are evidenced.

---

## 10. Bridge Builder consolidation and final-state specification (2026-09-10)

The Bridge Builder workstream was consolidated onto a single canonical epic and given a final-state
specification. This section is a pointer; the requirements themselves live in
[`final-state/`](./final-state/README.md).

- **Canonical epic: GAME-105** — *Bridge Builder — final production state: Phaser 4 renderer, full game
  quality and release (LevelBest grades 1–8)*. Its description now carries the binding laws, constants,
  the closed **Q-01…Q-23** scorecard IDs, the comparator registry, the accessibility contract, the
  performance/testing/release rules, the release gates A–G, the Definition of Done and the eight owner
  decisions (O-1…O-8).
- **GAME-36 retired to Won't Do** (container only). Its 12 Done stories remain authoritative
  current-generation history; the nine-criterion record in §9 above is **current-generation only** and is
  never cited as next-generation evidence.
- **GAME-39 and GAME-166 were reparented to GAME-105**; GAME-166 was reopened because its deliverable is
  now the real Phaser render lane (Playwright chromium `--use-gl=swiftshader`), not the documented jsdom
  limitation. The canvas-mock path is non-evidence.
- **Acceptance criteria were extended** on GAME-171 (host surfaces as one coherent set — sole owner of
  host-shell design), GAME-133 (unit-based placement fields; no intents from the decorative layer; no
  host-shell scope), GAME-134 (WCAG 2.2 AA asserted per success criterion with SC 2.2.1/2.2.2 recorded as
  not met under the documented exception; mirror facts F1–F7), GAME-135 (import-boundary, placement-invariance,
  session/containment/failover tests; telemetry table; P0–P3 taxonomy) and GAME-172 (score exactly Q-01…Q-23).
- **Human gates remain open and unclaimed:** the manual screen-reader pass, the uncoached child playtest,
  real-device interaction evidence and the human IP-separation sign-off. Named owners and dates are owner
  decision **O-7**; without them Gates D and E cannot close and GAME-105 cannot reach Done.
- **Provenance:** specification produced by the `project-software-development-team` pipeline
  (run `bridge-builder-final-state-20260910`): generation → structural health check → isolated adversarial
  review (12 blockers / 26 major / 21 minor) → synthesis with every finding adjudicated. Jira changes were
  applied through the governed jira-admin control plane with dry runs, hash-bound approvals and semantic
  read-back; no implementation code was changed by this consolidation.
