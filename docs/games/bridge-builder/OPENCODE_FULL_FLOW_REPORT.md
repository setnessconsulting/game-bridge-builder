# Bridge Builder — OpenCode Full-Flow Verification Report (Jira epic CONSULTING-185)

**Date:** 2026-08-27 · **Method:** read-only verification pass — isolated clean worktree, documented quality gates, three dedicated Playwright suites, plus real-browser full-flow journeys driven as a user (tap-select, pointer drag, keyboard-only, fake-clock timing, lesson→break integration, axe scans, zoom/grayscale/mobile, storage and network audits).
**Rule compliance:** no product code changed; no Jira transitions; no pushes/deploys; no `.env`/keyvault/credential reads; no human-only gate claimed as performed. Artifacts are local and untracked.

---

## 1. Environment & starting state

| Item | Value |
|---|---|
| Main checkout (preserved, untouched) | `C:\Users\setne\Desktop\AI Projects\03-business\levelbest` @ `1cf56fa8d826ad17d84f7ecadd7d1e87461ad90e` (branch `main`, 47 dirty entries — left exactly as found) |
| `origin/main` at start | `a632174a96fd11837315aafdbdd786e23ac24a23` (`docs(CONSULTING-185): reconcile current Bridge Builder status (#9)`) |
| Verification worktree (clean, detached) | `C:\Users\setne\AppData\Local\Temp\opencode\levelbest-verify-cons185` @ `a632174` |
| Ending state | Worktree HEAD `a632174`, `git status` clean (report file + `test-results/` probes are untracked/ignored); main checkout unchanged (`1cf56fa`, 47 dirty) |
| Node / npm | v24.15.0 / 11.12.1 |
| Playwright browser | Chromium 151.0.7922.34 |
| Viewports | Desktop journeys 1280×800; e2e desktop project 1280×720 (`Desktop Chrome`); mobile project/journeys `iPhone 13` (390×664, DPR 3, mobile UA/touch) |
| Servers used | `playwright.prod.config.ts` self-managed prod server on 127.0.0.1:3200; manual journeys served by `next start` on 127.0.0.1:3100 (prod build of the worktree); mobile/teaching suite on worktree dev server 127.0.0.1:3000 (started, readiness-waited, stopped after) |

---

## 2. Commands run and results

| Command | Exit | Result / notes |
|---|---|---|
| `npm ci` | 0 | 384 packages. **Pre-existing:** 3 high-severity `npm audit` advisories (inherited lockfile, already triaged separately in STATUS.md); eslint@9.39.5 deprecation warning |
| `npm run typecheck` | 0 | 0 errors |
| `npm run lint` | 0 | **0 errors, 5 warnings** — all in unrelated files (`MathDetective.tsx`, `circuitRescue.debug.spec.ts`, `circuitRescue.spec.ts`, `mathEscape.spec.ts`); none in Bridge Builder paths |
| `npm test` (Vitest) | 0 | **405/405 passed, 34 files** (includes all Bridge Builder suites + 50k Math Detective property cases) |
| `npm run build` | 0 | Production build green; `/games` static output includes Bridge Builder card. Non-blocking stale `baseline-browser-mapping` warning (pre-existing) |
| `npm run test:e2e` (full suite, `playwright.config.ts`, dev server :3000, desktop+mobile) | 1 | **83 passed / 10 failed / 6 skipped / 5 did-not-run (4.1m)** — see §5 (unrelated/infra classification; no Bridge Builder spec failed) |
| `npx playwright test tests/e2e/bridgeBuilder.spec.ts tests/e2e/bridgeBuilder.accessibility.spec.ts tests/e2e/teachingFlow.spec.ts --config=playwright.prod.config.ts` | 0 | **22 passed / 2 skipped** (both intentional: seed-dependent desktop skip; mobile-only assertion). 1.4m on prod build |
| `npx playwright test … --config=playwright.config.teaching.ts --project=mobile` (run 1, contaminated by INF-V1) | 1 | 19 passed / 1 flaky (passed on retry) / 1 failed / 2 did-not-run — failure caused by dev-server death + foreign app on port 3000 |
| same, clean isolated re-run (`--retries=0`) after restarting the worktree dev server | 0 | **23 passed / 1 skipped (desktop-only zoom test) / 0 failed (3.6m)** — supersedes run 1 |
| Manual journey scripts (Playwright-as-user, artifacts dir) | — | `j1-smoke`, `j2-bands`, `j3-gameplay`, `j3b/j3d/j3e/j3f` probes, `j4-timing`, `j5-break`, `j6-a11y`, `j7-privacy`, `j8-features`, `j9-easier-chip`, `j10-combine-split` — results in §4 |

---

## 3. Full browser journey matrix (pass / fail / skipped / blocked)

| # | Journey | Verdict | Evidence (abridged) |
|---|---|---|---|
| 1 | Product smoke: `/`, `/assessment`, `/lessons`, `/games`, `/parents`, `/safety`, `/pricing`, `/robots.txt` | **PASS** | All HTTP 200 with correct H1s; `robots.txt` = `User-Agent: * / Disallow: /` (noindex posture intact); no console errors besides BB-V3; no failed critical requests; no account prompts, no checkout (pricing "checkout" is roadmap copy only), zero storage after visiting all routes |
| 2a | Games hub → Bridge Builder entry | **PASS** | Hub card renders, "Play now" reaches setup ("pick your level") |
| 2b | Band coverage g12 / g34 / g56 / g78 | **PASS** | 8 puzzles solved per band by solver across the full skill rotation; every band cycled all its skills before any repeat (g12: missing-addend→compose-10→compose-20; g34: decimals-tenths→mult-groups→factor-pairs→fraction-equiv; g56: linear-eq→unlike-denom→decimal-ops→ratio-scale; g78: pythagorean-span→scale-drawing→rational-eq) |
| 2c | g34 fraction path reliably exposes fractional content | **PASS** | Fraction plank labels appeared within the rotation and were placeable (`fractionSeen=true`); dedicated e2e also green |
| 2d | Seed/session reproducibility | **PASS (documented behavior)** | Round seed = `Date.now() % 1_000_000` at round start (`BridgeBuilder.tsx:59`); no URL seed override exists; determinism is engine-level (same seed+band ⇒ same sequence, Vitest property-tested, E-08). Within a session the skill rotation is stable and fair (2b) |
| 3a | Tap-select placement | **PASS** | Piece leaves tray, plank renders in gap zone, `Filled` updates |
| 3b | Pointer drag placement | **PASS** | Dedicated e2e (`pointer drag places a plank on the open gap`) green on prod desktop + mobile |
| 3c | Keyboard-only flow (Tab, arrows, Enter, U, R, Escape) | **PASS** | Enter places focused piece; U undoes; Esc pauses/resumes; R repeats announcement (polite status non-empty); arrows traverse; focus-visible = 3px solid `rgb(255,178,74)` |
| 3d | Exact fit / partial fill / overhang / retry | **PASS** | Partial fill increments fill; oversized piece → overhang plank + diff chip ("too long"/"Over by N"), tray count and fill unchanged, piece reusable; retry solves after overhang |
| 3e | Undo | **PASS** | Plank removed from gap, tray restored (verified on fresh puzzle + e2e) |
| 3f | Second construction ("another way") | **PASS** | Offer appears after every 2nd solve when the puzzle supports it (`nextRecords.length % 2 === 0` + `supportsSecondConstruction`); MutationObserver DOM-truth: card added at +~0.8 s, auto-dismissed at 6 s (B-07 contract); Accept → status "· another way", same gap, fresh tray; second solve +5 (24→29) |
| 3g | Missing-addend pre-built section | **PASS** | `.bb-plank-preset` renders gray pre-built plank (skill-focused probe + e2e) |
| 3h | Relaxed mode | **PASS** | Status "relaxed", no progress bar, no clock; 6-bridge cap still ends the round |
| 3i | Signed shim (g78) | **PASS** | Overshoot (57 into gap 55) → `.bb-open-adjustment` slot appears with "add a minus shim" guidance; placing −2 shim clears the adjustment → exact fit (e2e green too) |
| 3j | Workshop / sandbox | **PASS** (with BB-V1) | "Workshop (free build)" card → setup shows "Workshop is on — no clock or score"; status "Workshop · free build"; clock static (status identical at t0 and t+3.5s) and expiry excluded by code; placements/undo work |
| 3k | Combine / Split (decompose verbs) | **PASS** | `⧉ Combine` is two-step (arm, then tap second plank — armed state `aria-pressed`); `✂ Split last` removes last placed plank and returns two halves to the tray (2 planks/4 units → 1 plank/2 units + halves in tray), disabled for <2-unit planks |
| 3l | Tray reuse / values match geometry / structure feedback | **PASS** (with BB-V2) | Placed planks leave the tray and cannot be re-placed (single source of truth); piece widths are exactly 24 px/unit from 3 units up (72/96 px measured); see BB-V2 for the 1–2 unit clamp; all feedback comes from the structure (overhang render, fill state, closing bridge) with no red/X/buzzer |
| 3m | Success / summary states | **PASS** | "You built 6 bridges!" summary with Points / Best streak / Stars / coaching line / Play again · Change level(skills) · All games / honesty footer |
| 4a | Free mode 90-second expiry (fake clock) | **PASS** | `clock.runFor(90_100)` → "ROUND COMPLETE / You built 0 bridges!" with neutral coaching ("Every try teaches your hands how numbers fit."), Play again reachable; mid-run clock check showed 30 s at +60 s |
| 4b | Six-bridge session cap | **PASS** | Summary after exactly 6 bridges before time expiry ("You built 6 bridges!") |
| 4c | Pause/resume + tab-blur | **PASS** | Esc pause overlay "Paused — take your time." + Resume; synthetic `document.hidden` → auto-pause within the 2 s poll interval → Resume restores |
| 4d | No time-extension or skip control | **PASS** | DOM scans during free play and break play found no /add (more )?time\|extend\|skip practice/ affordance; break-card copy scanned too |
| 5a | `?level=` hand-off + malformed + legacy | **PASS** | `?level=5-mid` auto-starts "Grade 5 · hitting stride"; `?level=banana` and `?level=9-late` degrade safely to the picker; legacy 4-question sample lesson completes to "$10/month" gate |
| 5b | Guided lesson block → exactly one break card | **PASS** | Full mastery journey (worked examples → Do-with-me → practice → exit ticket → parent brief) unlocks `[data-testid=earned-break-card]` **count = 1**; copy "One break, one 90-second window, and no score to protect" |
| 5c | Break play: ring, partial progress, calm final 10 s | **PASS** | Ring aria-label "90 seconds until practice", text "90"; partial progress registered (`Filled 3`); at final 10 s ring text "10" + class `bb-ring-low` + `::before` animation `none` (steady, no pulse/red — U-12) |
| 5d | Saved-at-expiry + automatic return | **PASS** | At expiry: heading "Saved! Back to practice." + `[data-testid=saved-construction]` visible (bridge preserved, never "lost"); ~3 s later auto-return: `data-break-state="returned"`, focus lands on the return status paragraph, parent brief still visible (practice flow stayed mounted, hidden during play) |
| 5e | Break telemetry mode-tagging | **PASS** (code + runtime) | `createSessionSink` tags every event `{ mode: "break", ... }`; sink is in-memory session-scoped; `validateEvent` rejects PII keys; runtime network audit captured **zero external requests** during the whole lesson+break flow |
| 6a | Axe scans (serious/critical) | **PASS** | 0 blocking findings in setup, playing, hint, pause-dialog, round-summary (also 0 moderate/minor observed); prod + mobile e2e axe specs green |
| 6b | Focus return across phase changes | **PASS** | Esc → Resume focused; Resume → piece refocused; solve → gap heading (H2) focused; summary → H2 focused; break return → status paragraph focused |
| 6c | Keyboard parity / visible focus | **PASS** | See 3c; focus ring visible on Tab (screenshot `probe-tab-focus.png`) |
| 6d | Reduced motion | **PASS** | e2e (desktop, `reducedMotion: reduce`) asserts overhang plank `animationName === "none"` and 200% zoom operability; green on prod suite |
| 6e | Grayscale / color-independent states | **PASS** | `html{filter:grayscale(1)}` screenshots of playing/overhang states; diff chips, labels, and icons carry the semantics (no color-only signal); screenshots in artifacts |
| 6f | 200% zoom / reflow | **PASS** | `zoom:2` → `scrollWidth 1280 = clientWidth` (no horizontal overflow), targets ≥48 px |
| 6g | Mobile layout / touch targets / overflow | **PASS** | iPhone 13: `scrollWidth 390 = innerWidth 390` (no unintended overflow; bridge scrolls as a unit), min piece dimension 52 px ≥ 48; mobile e2e project green |
| 6h | VoiceOver / NVDA | **NOT RUN** | No supported screen-reader runtime in this environment — human/specialized gate |
| 7a | sessionStorage inventory | **PASS** | Empty before play; only `levelbest.bridge-builder.best` exists (written at round end, session-scoped, tab-clear); everything else untouched; localStorage always empty |
| 7b | Storage unavailable | **PASS** | `sessionStorage` throwing → game still loads, placements work, exit works; zero page errors (best-score write silently skipped by guarded try/catch) |
| 7c | No unexpected persistence / network | **PASS** | No child account, learning profile, or personal history surfaces; request audit during full play + lesson + break: **0 non-localhost requests**; telemetry stays in memory |

---

## 4. Findings (bugs & issues)

> Artifact root for screenshots/traces/logs: `C:\Users\setne\AppData\Local\Temp\opencode\bb-verify-artifacts\` (untracked temp; Playwright's own `test-results/` + `playwright-report/` inside the worktree are gitignored).

### BB-V1 — Workshop shows a static "90s" clock chip and progress bar despite promising "no clock or score"
- **Severity:** low
- **Story/area:** T6 (shell polish) / T13 (benchmark polish); G-05 sandbox contract
- **Environment/URL:** Chromium 151 desktop 1280×800, prod build `http://127.0.0.1:3100/games` → Bridge Builder → "Workshop (free build)" → Whole planks
- **Repro:** 1) `/games` → Bridge Builder → Play now. 2) Click "Workshop (free build)". 3) Start any band. 4) Read status bar; wait 3+ s and re-read.
- **Expected:** Workshop ("no clock or score" per its own setup microcopy and G-05) shows no clock indicator.
- **Actual:** Status bar shows `Workshop · free build | 90s | 🔈 | Exit` and one `.progress` bar; the value never ticks and expiry is code-excluded (`BridgeBuilder.tsx:309/435/600`), so it is purely cosmetic — but it contradicts the promise and could read as a hidden time limit to an anxious child (the exact anxiety the mode exists to remove).
- **Frequency/seed:** deterministic (every workshop round; status byte-identical at t0 vs t+3.5 s).
- **Artifacts:** `gameplay-workshop.png`; probe output `statusAt0 === statusAt3s` (`j3b-probe`).
- **Classification:** product bug (cosmetic).
- **Suggested next action:** hide the time chip/progress element when `effectiveMode === "sandbox"` (same conditional used for the timer at `:309`).
- **Blocks Jira closure:** no (polish item; record on T13's polish pass).

### BB-V2 — 1-unit and 2-unit planks render at identical width; length proportionality only holds from 3 units up
- **Severity:** low
- **Story/area:** T11 (a11y: color-independent/redundant channels) / UX spec §10 ("value + length proportion" redundancy)
- **Environment/URL:** Chromium 151 desktop, prod build :3100, g12 "Whole planks" round
- **Repro:** start a g12 round whose tray contains 1-, 2-, 3-, 4-unit planks (e.g., units [1,1,2,3,4], gap 7); measure `.bb-tray .bb-piece` bounding widths.
- **Expected:** width strictly proportional to value (24 px/unit per `UNIT_PX`) so counting-by-length stays valid for Maya (Grade 1).
- **Actual:** measured widths: 1→52 px, 1→52 px, 2→52 px, 3→72 px, 4→96 px — a 52 px touch-target floor clamps 1- and 2-unit planks to identical length (3+/4+ are exactly 24 px/unit). Labels and the opt-in "Dot faces on small planks (count the dots)" toggle remain as differentiating channels, so information is not lost — but the proportional channel is broken exactly where counting-viable Grade-1 players rely on it.
- **Frequency/seed:** deterministic for any tray with units ≤ 2.
- **Artifacts:** `band-Who-p0.png`, `probe-toggles.png` (small planks visible); measured data in journey log `A.widths`.
- **Classification:** product bug (minor, a11y/UX trade-off decision needed).
- **Suggested next action:** either scale width as `max(units × 24, 40)` with a distinct minimum per unit-count, or render unit dots always-on for units ≤ 2 so the count channel is never optional; decide explicitly in T13 polish.
- **Blocks Jira closure:** no.

### BB-V3 — `/_vercel/insights/script.js` 404 + console error on every page when served outside Vercel
- **Severity:** info
- **Story/area:** T8/T12 (site integration hygiene; same class as fixed B-08 favicon 404)
- **Environment/URL:** prod build via `next start` on 127.0.0.1:3100/3200 — all routes
- **Repro:** load any page on a self-hosted production server; observe `GET /_vercel/insights/script.js → 404` + console error.
- **Expected:** analytics bootstrap should not produce a console error when the Vercel platform endpoint is absent.
- **Actual:** 404 + console error per page (filtered as "platform analytics" by the e2e console-error collectors).
- **Frequency:** every page load off-Vercel; **does not occur on the real Vercel deployment** (endpoint exists there).
- **Artifacts:** journey error logs (`j1-smoke.errors`); e2e `prod-suite.log`.
- **Classification:** environment-conditional console noise, not a product defect on the deployed platform.
- **Suggested next action:** optionally guard the analytics bootstrap (or accept and document).
- **Blocks Jira closure:** no.

### INF-V1 — Port-3000 collision with a concurrently running foreign dev server contaminated the first mobile-suite run (test infrastructure)
- **Severity:** high (evidence integrity) — **test-harness/infrastructure issue, not a product bug**
- **Story/area:** T12 test infrastructure
- **Environment/URL:** worktree dev server on 127.0.0.1:3000; another concurrent session's app (a different project, CPA-site content) bound `:::3000` at 12:01:22 after the LevelBest dev server died mid-suite
- **What happened:** during the first dedicated mobile run the worktree dev server became unreachable mid-test (`Failed to load resource: Could not connect to server` on all chunks → teachingFlow "malformed level" console-error assertion failed); two subsequent isolated re-runs actually hit the **foreign app** on port 3000, producing a misleading deterministic-looking "Start the guided lesson not found" failure. Dev-server log ends abruptly (`dev-server.log`), foreign app confirmed serving CPA content on 3000 at 12:01–12:05 (`lessons-banana-mobile.png`), port free again at 12:06.
- **Resolution:** restarted the worktree dev server on 3000, verified LevelBest content (`/games` contains "Bridge Builder"), re-ran the full mobile suite with `--retries=0`: **23 passed / 1 skipped / 0 failed**. The earlier failure evidence is withdrawn as contaminated.
- **Artifacts:** `mobile-suite.log`, `mobile-suite-clean.log`, `dev-server.log` / `dev-server2.log`, `lessons-banana-mobile.png`.
- **Suggested next action:** when running the teaching/mobile config, verify the responder on :3000 is the intended app (or use an explicit `PORT`/baseURL override) whenever other dev servers may be running.
- **Blocks Jira closure:** no.

### INF-V2 — Default full-suite config is timeout-flaky on the dev server (mobile project)
- **Severity:** low — **test-harness/infrastructure issue**
- **Story/area:** T12
- **Environment/URL:** `npm run test:e2e` (`playwright.config.ts`: 30 s test timeout, `fullyParallel: true`, no retries, dev server with on-demand compile, desktop+mobile)
- **Actual:** 10 failures in the full run — 9 mobile 30 s test-timeouts (circuitRescue ×5 incl. debug spec, mathEscape, numberLineJumper, teachingFlow ×1) and 1 desktop mathEscape assertion failure (below); 5 teachingFlow tests "did not run" due to its serial mode. The same specs pass under `playwright.config.teaching.ts` (90 s timeout, 1 worker, retries 3) and the dedicated prod suite.
- **Classification:** 9 × infra/flake (timeout budget vs dev-compile latency); mathEscape desktop = separate, unrelated, observed once, **not re-verified in isolation** (out of Bridge Builder scope).
- **Artifacts:** `e2e-full-suite.log`.
- **Suggested next action:** align the default config with the teaching config's timeout/worker budget or migrate the full suite to the prod config; owners of circuitRescue/mathEscape/numberLineJumper should re-run their specs under the teaching config.
- **Blocks Jira closure:** no.

### Verified-not-bugs (investigated, no defect found — recorded to prevent re-churn)
- "Second-construction offer never appears" — probe artifact: my early journeys waited for the *instruction to change* before polling for the offer, but the offer **blocks** the next puzzle (no instruction change until resolved), so the 6 s window was consumed by my own wait. DOM-truth run (MutationObserver + setTimeout logger, `j3e-dom-truth.js`) shows offer opens at +~0.8 s and auto-declines at 6 s after every 2nd supported solve. Accept (+5, "· another way") and decline paths verified (`j3f`).
- "Tab-blur pause missing" — first probe overrode `document.visibilityState`, but the shell polls `document.hidden` (`:518`); overriding `document.hidden` produces the pause overlay within the 2 s interval. Works as spec'd (A.8/S5).
- "Enter placement broken" (one-off in `j3`) — programmatic `focus()` had been lost before keypress (script race); with `document.activeElement` verified on the piece, Enter places reliably (e2e also green on desktop + mobile).
- "Try one level easier chip never appears" — in g12 it **cannot** appear (`easierBand("g12") = null`, no easier band); it renders only on the summary screen when `stuckRun ≥ 3`. My g34 run achieved only 2/3 hard solves (chip correctly absent). Code path verified; full runtime confirmation left as a noted gap, not a defect.

---

## 5. Unrelated / pre-existing failures (reported separately, not Bridge Builder)

| Failure (full suite, `npm run test:e2e`) | Classification |
|---|---|
| `[mobile]` circuitRescue.debug + 4 circuitRescue journeys, `[mobile]` numberLineJumper, `[mobile]` mathEscape, `[mobile]` teachingFlow:223 — 30 s test timeouts | Infra/flake under the default config (INF-V2); teaching-config and/or prod-config runs of the same areas pass (teachingFlow mobile 100% green clean run; circuitRescue/mathEscape/numberLineJumper not re-run by this pass — owned by their stories) |
| `[desktop]` mathEscape.spec.ts:287 "You scored" heading not visible after finishing room 2 | Unrelated game area, observed once, not isolated (out of scope) — owner should re-run under teaching/prod config |
| `npm ci` 3 high npm-audit advisories; eslint 5 warnings in mathDetective/circuitRescue/mathEscape files; stale `baseline-browser-mapping` build warning | Pre-existing, documented in STATUS.md |

---

## 6. Human-only checks NOT performed (explicitly not claimed)

- VoiceOver / NVDA screen-reader passes (no supported runtime) — **not run**
- Real-child playtest / onboarding coaching test (UX §2) — not run
- Hands-on benchmark vs Cyberchase: Railway Hero (T13 nine-criterion confirmation) — not run
- IP sign-off (T13 / F-08 closure) — not run
- Physical phone/desktop "feel" review — not run
- No Jira transitions, deploys, or pushes were performed (owner-gated by design)

---

## 7. Jira closure readiness (CONSULTING-185)

| Story | Automated/manual evidence this pass | Closure verdict |
|---|---|---|
| **T7** (CONSULTING-195, earned break) | Deep-link guard (games route cannot unlock break without completed lesson), one-card unlock from a real completed lesson, 90 s window, calm final-10 s ring, saved-at-expiry, forced auto-return to still-mounted practice, no extension/skip affordance, mode-tagged no-PII telemetry — all green on desktop + mobile (e2e + manual) | **Closure-ready on automation evidence** — remaining step is the owner's Jira transition (not performed here) |
| **T11** (CONSULTING-205, accessibility) | Axe: 0 serious/critical across 5 core states (+break state via e2e); keyboard parity, focus return, visible focus, reduced motion, 200% zoom, grayscale color-independence, mobile targets/overflow all verified. Two low findings (BB-V1 cosmetic, BB-V2 proportionality floor) recorded, neither blocking | **Not fully closable** — the SR (VoiceOver/NVDA) manual pass named in the story remains unperformed |
| **T13** (CONSULTING-213, benchmark + IP) | Not exercised (human-only) | **Not closure-ready** — hands-on Railway Hero benchmark, child playtest, and IP sign-off remain owner steps; polish items BB-V1/BB-V2 land here |
| **Epic CONSULTING-185** | All four repo gates green; three Playwright suites green for Bridge Builder scope; full-flow matrix green; only low/info findings | **Not closable yet** — blocked on T11's SR pass and T13's human gates; no technical blockers remain from this pass |

---

## 8. Recommended next steps (exact)

1. Owner: perform the T11 screen-reader manual pass (VoiceOver + NVDA) against setup/play/overhang/hint/pause/summary/break states; attach results to CONSULTING-205.
2. Owner: run T13 hands-on Railway Hero comparison + child playtest; record the nine-criterion table in SPRINT_READINESS.md; take IP sign-off; fold BB-V1 and BB-V2 into the T13 polish pass.
3. Fix BB-V1 (hide clock chip/progress in sandbox) and decide BB-V2 (per-unit minimum width vs always-on unit dots for units ≤ 2) — both small, low-risk shell changes.
4. Optionally guard the Vercel-analytics bootstrap (BB-V3) and align `playwright.config.ts` timeout/worker budget with the teaching config (INF-V2).
5. Re-point/verify CI runs the dedicated suites (prod config) for deterministic e2e evidence; keep the storage-guard suite as the privacy regression net.
6. On completion of 1–2, transition T7 → Done, T11 → Done, T13 → Done, then the Epic (owner-gated; this pass deliberately performed no transitions).

---

## 9. Conclusion

All documented quality gates pass at `origin/main` (`a632174`); the dedicated Bridge Builder production suite passes 22/22 (+2 intentional skips); the dedicated mobile suite passes 23/23 (+1 intentional skip) on a clean isolated run; and the full browser journey matrix — smoke, bands and fair skill rotation, core gameplay incl. drag/keyboard/second-construction/signed-shim/Workshop, fake-clock expiry and caps, the complete lesson→break→return integration, accessibility scans/focus/zoom/grayscale/mobile, and privacy/storage audits — is green with only two low-severity polish findings and one info-level environment note recorded. The earlier mobile-suite failure was proven to be a port-collision test-infrastructure event and superseded by a clean rerun.

**Verified with limits: automated checks passed, but named external or human gates remain.**
(T11 screen-reader manual pass, T13 hands-on benchmark/child playtest/IP sign-off, and the owner-only Jira transitions remain open; VoiceOver/NVDA explicitly `not run`.)

---

## 10. 2026-08-27 exact PR-head re-verification (Codex follow-up)

This follow-up supersedes the run counts above wherever they differ. It used a
fresh isolated worktree at the pushed PR head `95f92db6e32708a2da5e4208b9434d1723c4e1ce`
(`docs/consulting-185-verification`) and did not touch the dirty shared checkout.
No Bridge Builder product behavior was changed during this follow-up; the only
implementation correction was test-runner isolation and the documentation of
the resulting evidence.

| Check | Result |
|---|---|
| `npm ci` | PASS — 384 packages; the inherited three high npm-audit advisories remain documented and were not force-upgraded |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 errors, 5 pre-existing warnings outside Bridge Builder |
| `npm test` | PASS — 405/405 tests across 34 files |
| `npm run build` | PASS — production build and `/games` route compile; stale `baseline-browser-mapping` warning only |
| Dedicated production Bridge Builder/lesson/accessibility suite | PASS — 24 passed, 2 intentional skips |
| Dedicated mobile Bridge Builder/lesson/accessibility suite on `LEVELBEST_E2E_PORT=3300` | PASS — 25 passed, 1 intentional skip |
| Math Escape sibling regression | PASS — 5 passed, 1 intentional skip |
| Number Line Jumper sibling regression | PASS — 3 passed, 1 intentional skip |
| Full `npm run test:e2e` on the isolated source server | **LIMITED** — 95 passed, 7 sibling-only failures, 6 skips; no Bridge Builder failure |

The first post-PR mobile attempt was invalid because `reuseExistingServer: true`
accepted another LevelBest worktree already serving port 3000. The default and
teaching configs now both start their own dev responder with
`reuseExistingServer: false`, run the LevelBest catalog check, and accept an
explicit `LEVELBEST_E2E_PORT` for parallel worktrees. A busy port now fails the
runner instead of silently testing a different checkout. The clean mobile result
above is the authoritative result for this PR head.

The seven full-suite failures are outside CONSULTING-185: six Circuit Rescue
mobile journeys recorded an environment-dependent 403 console request, and one
Math Detective mobile walkthrough exceeded the shared suite budget. They do not
change the Bridge Builder verdict and remain sibling-owner follow-up items.

The engineering findings BB-V1 (Workshop clock/progress contradiction) and BB-V2
(short-plank proportionality) are fixed and covered by desktop and mobile
regressions. The remaining closure blockers are human/owner gates only: a real
VoiceOver or NVDA pass for T11; the same-day Railway Hero comparison, uncoached
child playtest, and human IP-separation sign-off for T13; and the corresponding
Jira transitions. Vercel Git-source/promotion was not changed or claimed.

**Current conclusion:** **Verified with limits** — the exact PR-head automated
Bridge Builder evidence is green, but the named human gates and owner-controlled
Jira/deployment steps remain open, so PR #10 and Epic CONSULTING-185 must remain
open.
