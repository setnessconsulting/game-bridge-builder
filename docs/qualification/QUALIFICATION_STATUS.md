# Bridge Builder standalone qualification status

**Current snapshot:** 2026-10-02

**Candidate status:** `promoted-to-production` (pointer merged; **Cloudflare Pages deploy pending**)

**Current candidate:** `0.1.0-qualification.15` — published immutably to private R2 and selected by the merged games-site production catalog. Built from source commit `266491f470ea0b7e607154f50a0f2294606b3d79` (game-bridge-builder PR #20).

**⚠ Promotion is committed but NOT yet live.** games-site PR #48 merged as `602c63a` with `verify` green, and the built play page pins `/game-assets/bridge-builder/0.1.0-qualification.15/index.html`. However `https://games.setnessconsulting.com/bridge-builder/play/` still serves `.14` and `.15` returns 404, verified continuously over roughly 20 minutes of polling. The production pointer therefore still selects `.14` in effect. This is a deploy-pipeline gap, not a candidate defect: games-site has no GitHub Actions deploy workflow and no repo webhook, so the Cloudflare Pages Git integration is not reporting a build for `602c63a`. Requires an owner-side Pages deploy (dashboard re-trigger or connection check). Until then the live player is `.14`, which is complete and playable.

**Rollback target:** `0.1.0-qualification.14` — still present and untouched in private R2, and **still the live production pointer** while the `.15` deploy is pending. `.13` is retained as before.

**Historical candidate `.14`** was promoted 2026-10-01 from source `9b4fdb0f0826ab893c9b70b0a50ce1b9521cdb89` for the GAME-297 reduced-motion success-payoff fix (games-site PR #43, merge `0d2d73d5`).

**SDK pin:** Game Platform SDK `sdk-v0.1.1` (`8933746ebefe128a23b08f3fc9fd6796f4d906bd`)

**Historical candidate `.10`** was the artifact promoted by [games-site PR #5](https://github.com/setnessconsulting/games-site/pull/5) (`914d5941`, Cloudflare Pages `17913bdd`) from source `c432122`. Production has since advanced past `.13`; the `.10` evidence below is retained as the record for that wave.

## Current candidate checks — candidate `.15`

- **Origin.** GAME-297/GAME-361 follow-up found during the GAME-361 setup/start discoverability validation (game-bridge-builder PRs #19 and #20, merged `d42fb31` and `266491f`).
- **What changed vs `.14`.** Presentation only:
  - The setup screen's Relaxed toggle (`setup-relaxed`) rendered at **~31px**, the bare user-agent default, because it carried no class. It now has the same **48px** min-height, border, radius, background and font weight as the sibling `.bb-face-choice button`, plus the same pressed treatment. State is still never colour alone; `aria-pressed` is unchanged.
  - The setup card tightens gap and padding under the existing `@media (max-height: 720px)` block so the added height costs no scroll. The 48px control height itself was never weakened.
- **Regression caught and fixed before promotion.** The first cut of the touch-target change pushed the start action **1px past the fold at short phone 390x700**, failing the GAME-303 single-viewport lane (`scrollY starts at 0`, received 1) on all three CI retries. This was invisible at 1280x720. Fixed by the short-viewport spacing change above; GAME-303 passes at every viewport again.
- **Release integrity.** Published immutably to private R2 under `bridge-builder/0.1.0-qualification.15/` after preflighting all 6 keys as absent, with the manifest published last. All 6 manifest-listed objects were read back from R2 and matched on **byte count and SHA-256**. The touch-target CSS was confirmed present in the published artifact.
- **Verification.** typecheck clean, lint clean, unit **241/241**, E2E **61 passed / 7 hosted-only skipped / 0 failed** (the 7 are the pre-existing hosted-only skips in the unhosted environment). CI on head `10f78f9`: `verify` and `real-phaser-render` both green; post-merge CI on `266491f` green.
- **games-site promotion.** PR #48, merge `602c63a`, `verify` green on the merge commit. Pointer-only: the committed catalog constant, the preview var, the resolved-play-source expectation, and the deployment/rollback records. No game source or immutable artifact changed in that repository. **Pages deploy pending — see the status note above.**
- **Rollback.** `.14` stays published in private R2 and remains the live pointer. As with `.13` before it, `/game-assets/...` approves only the version the deployment names, so a version that is published but not pointed at is deliberately unreachable over HTTP. A rollback is a revert of the games-site pointer commit, not a re-publish.

## GAME-361 setup/start discoverability — objective results

Validated in real Chromium against `.14` and against a production build of main, at a true 1280x720 viewport, across both setup states (first session and returning player):

- The primary start action is **fully inside the first viewport in every state** — first session's primary is "Start with no timer" (GAME-305 untimed-first), the returning player's is "Start building". Neither requires scrolling.
- No horizontal overflow at 1280x720, 1366x768, 1280x600, 820x1180 or 390x844.
- Tab order follows the visual order and reaches the primary start after the setup choices; the focused CTA paints `outline: 3px solid rgb(255,178,74)` at 3px offset, and Enter activates it.
- 0 axe violations on the setup surface in both states.

The 2026-09-22 AI playtest observation of "Start building" below a 720px fold **does not reproduce** and is not carried forward as a player-facing defect. It was a model-coordinate artifact: inside the hosted games-site iframe the usable height at a 1280x720 window is about **562px**, not 720px, so a coordinate-emitting model targeting 720px produces out-of-viewport actions by construction.

Regression coverage lives in `tests/e2e/bridgeBuilder.start-discoverability-361.spec.ts` (15 tests). GAME-303 already locked the gameplay loop to one viewport; nothing had guarded the setup screen, which is the surface GAME-361 is about. A deliberate negative control (extra setup padding) was run to confirm the new guard fails on a real fold regression before the change was reverted.

**Not claimed here:** GAME-361's acceptance criterion asks for a human first-time observation of whether the primary start action is found without guessing or coaching. That remains outstanding and belongs to GAME-172's benchmark/quality gate. Automated geometry, keyboard/focus and accessibility results are objective evidence only, not a substitute.

## Known unrelated issue

`tests/releaseManifest.test.ts` times out at its 5s default on a slow Windows host (it spawns a Node subprocess seven times). Confirmed **pre-existing on `d42fb31`** by stashing and re-running on clean main; passes in ~3.7s with a raised timeout and passes in CI. Not addressed by the `.15` promotion.

**Owner decisions:** O-1 through O-8 were approved as policy decisions on 2026-09-17. The `GAME-294` renderer-contract and `GAME-295` curriculum-supply implementations are present and pass their automated checks; Jira review/closeout is still open. Their proposed thresholds remain proposed, not ratified. O-7 executors and dates remain open.

This record distinguishes engineering checks from hosted, owner, and human-gated release evidence. LevelBest remains a separate integration.

## Historical candidate checks — candidate `.14`

- `.14` is the promoted production candidate, built from `9b4fdb0f0826ab893c9b70b0a50ce1b9521cdb89` (`game-bridge-builder` PR #18). It carries the whole GAME-297 player-ready presentation slice plus the GAME-302/303/304/305/306 follow-ups, the SDK-6/7 adoption work, and the reduced-motion success-payoff fix.
- **Release integrity.** Published immutably to private R2 under `bridge-builder/0.1.0-qualification.14/` after preflighting every key as absent, manifest published last. All 6 manifest-listed objects were read back and matched on **byte count and SHA-256**, both directly from R2 and again through production after the catalog pointer moved.
- **Promotion (owner-approved 2026-10-01).** `games-site` PR #43, merge `0d2d73d5`, `verify` and the Cloudflare Pages check green on head `b1e5417`. The change is pointer-only: the committed catalog constant, the preview variable, the resolved-play-source test expectation, and the deployment/rollback records. No game source or immutable artifact was modified. Production readback confirmed the play route pins `.14`.
- **GAME-297 hosted retest sweep (2026-10-01), re-run against promoted `.14`:** **6 passed, 0 failed**, and stable at **12 passed** with `--repeat-each=2`. `tests/e2e/bridgeBuilder.hosted-297-sweep.spec.ts` drives the real hosted iframe and covers every state family AC10 names:
  - active/underfill with the `◌` glyph, `10 open`, and exact remaining-span copy;
  - exact-fit with the `✓` glyph, celebration geometry and the `crossing` vehicle;
  - overfill with the `⚠` glyph, splash rings, `falling` vehicle and the `⚠` plank teach copy;
  - honest pause copy with no qualification wording anywhere on the hosted player surface;
  - reduced-motion and mute equivalents, including the held success payoff and the parked marker that replaces the crossing tween;
  - phone (390×844) and desktop (1280×800) readability, no horizontal overflow, and ≥44 px touch targets.
  - The pre-existing `hosted-games-site.spec.ts` journey also passes against `.14`, including the GPSDK handshake, exact-fit click placement, and full manifest plus per-asset byte/hash/immutable-cache verification.
- **Defect found and closed in this wave (AC5).** Against `.13` the sweep returned 4 passed / 2 failed: with reduced motion enabled the exact-fit celebration rendered for ~2 animation frames (~30 ms), because `presentationComplete` was dispatched in the same tick as the `exact` verdict, so `exact` was never painted. Reduced-motion players got no static success state at all. `.14` holds that state for `REDUCED_MOTION_PRESENTATION_MS = 600` (under the 1200 ms animated window, so pacing is not stretched). Measured with a `requestAnimationFrame` sampler: celebration frames 2 → 32 with motion off, 72 unchanged with motion on. `tests/e2e/bridgeBuilder.presentation-297.spec.ts` carries a regression guard.
- The production manifest remains `validationStatus: candidate-not-approved` with all four build checks `not-asserted` and `hosted-games-site-preview` / `named-human-approval-gates` `pending`, by design. Production approval is represented by the reviewed games-site catalog merge, not by the manifest.
- **Rollback target: `.13`.** Still present and untouched in private R2 (re-read 2026-10-01), and the pointer that was live immediately before this promotion. `0.1.0-qualification.12` is retained the same way as the older rehearsal target. **A rollback is a revert of the games-site pointer commit, not a re-publish:** the `/game-assets/...` route approves only the version the catalog names, so `.13` currently returns 404 (verified live) and only becomes reachable again once the pointer is reverted. No R2 object is republished or overwritten in either direction.

## Historical candidate checks — candidate `.13`

- `.13` includes the GAME-297 player-ready presentation slice (merged as `game-bridge-builder` PR #5), the GAME-302/303/304/305/306 follow-ups (PRs #12–#17), and the SDK-6/7 adoption work. Its source tree contains `tests/bridgeBuilderGame297.test.ts` and `tests/e2e/bridgeBuilder.presentation-297.spec.ts`; those commits were squash-merged, so the original branch SHAs are not ancestors of `3f33896`. That is why an ancestry check appears to show the 297 slice missing when it is present.
- **GAME-297 hosted retest sweep against `.13` (2026-10-01): 4 passed, 2 failed.** Passing: active/underfill, exact-fit + celebration + crossing, overfill warning/splash/teach copy, honest pause copy, player-surface copy, and phone/desktop readability inside the hosted iframe. Failing: the reduced-motion success payoff, per the defect fixed in `.14` above.

## Historical candidate checks — candidate `.10`

- Candidate `.10` incorporates GAME-297's visual polish pass plus the follow-up player feedback: a procedural bridge environment with a larger water span, wood-style planks, high-resolution car artwork, explicit target-span feedback, Phaser/DOM visual parity, responsive layout, player-facing copy cleanup, click-to-place input with drag fallback, success crossing/audio cues, failure feedback for underfill/overfill, honest pause messaging, and reduced-motion handling. Gameplay math, intent authority, and the independent `/?game132=1` route remain unchanged.
- The candidate workflow and local verification passed typecheck, lint, 182 unit tests across 18 files, release build, release-manifest check, and the real Phaser/SwiftShader render lane (2 passed) before publishing. The local E2E suite recorded 16 passed and 1 hosted-only skip; three suite-load timeouts each passed when rerun in isolation. The immutable R2 upload completed under `bridge-builder/0.1.0-qualification.10/`; the manifest records source commit `c432122cc2c2b04021a21a5961ddee37284d5667` and remains `candidate-not-approved`.
- The hosted Chromium journey passed (**1 passed**) against both the production preview and the custom domain. It loaded the pinned `.10` iframe, reached `Canvas ready`, reported `Phaser rendering surface ready.`, completed an exact-fit click placement, found no duplicate `stage` runtime error, and verified the manifest plus every listed asset's status, content type, immutable cache header, byte count, and SHA-256.
- The games-site promotion branch pinned `.10` in commit `565fc18283a91fa8e2ac16a99c0e687265b9d502`; the preview passed its site checks and hosted journey before [PR #5](https://github.com/setnessconsulting/games-site/pull/5) merged. The hosted production route now serves the immutable `.10` candidate through the production catalog.

## Historical Wave 1 checks — candidate `.2`

- TypeScript typecheck passes.
- 123 Vitest tests pass across 14 files.
- Production Vite build and `release:check` pass for `0.1.0-qualification.2`; the Phaser bundle is approximately 1.38 MB, so performance-budget ratification and real-device measurements remain open.
- Ten local Playwright tests pass in Chromium with `--use-gl=swiftshader`, including a real Phaser canvas plus DOM mirror, exact/underfill/overfill journeys, retry/undo, timer tamper checks, keyboard, drag, reduced motion, mute, touch sizing, and automated accessibility checks.
- The CI-backed release manifest records all four checks as executed before manifest creation and remains `candidate-not-approved`; named human approvals remain pending.

## Historical Wave 2 candidate checks — candidate `.3`

- `GAME-294`: additive BridgeViewModel v1.1.0 fields, sequenced/session-bound intents, fail-closed validation, renderer lifecycle, version-skew behavior, and retry telemetry are implemented with unit coverage. The frozen eight-intent union and TypeScript gameplay authority are unchanged.
- `GAME-295`: the catalogue parity test covers all 14 skills and four bands; the seeded supply suite checks 12 distinct solvable puzzles per skill and generator tier (baseline/easier/harder), plus exact decompositions and decoy honesty. The 12-puzzle floor and related score thresholds remain proposed pending owner ratification.
- CI typecheck, unit tests (**171 tests across 16 files**), Chromium/SwiftShader journeys (**10 passed; the hosted test is skipped in the unhosted CI environment**), release build, and release-manifest check passed in both linked GitHub Actions runs.
- The candidate artifact was downloaded from the passing release workflow, its five payload files were checked against the manifest hashes and byte counts, and those exact files plus the manifest were uploaded to private R2 under `bridge-builder/0.1.0-qualification.3/`. GitHub Actions R2 publishing remains unconfigured; this candidate upload used the existing authenticated Wrangler session and did not add secrets to GitHub.
- The deployed hosted test passed on 2026-09-18 (**1 passed**) against the actual preview route. It exercised the Phaser canvas and DOM mirror, completed an exact-fit journey, and checked every manifest-listed object’s status, content type, immutable cache header, byte count, and SHA-256.
- The Phaser bundle is approximately 1.38 MB. This is a measurement, not an accepted performance budget; proposed budgets and real-device measurements remain open.

## Historical Wave 2 candidate checks — candidate `.4`

- Candidate `.4` incorporates the merged GAME-132 Phaser qualification slice. Its resize loop fix derives a 16:9 canvas from width and skips no-op observer updates; the independent `/?game132=1` route remains available, while the final-contract Wave 2 candidate remains the default. The frozen eight-intent union and TypeScript gameplay authority remain unchanged.
- Local verification passed: typecheck, lint, **177 unit tests across 17 files**, real Phaser rendering (**2 passed** under Chromium/SwiftShader, including the pixel oracle and deliberate-omission negative control), and browser journeys (**15 passed; the hosted-only test was skipped in the unhosted run**). The production bundle remains approximately 1.38 MB and still needs an owner-ratified budget and real-device measurement.
- GitHub verification passed for the exact source commit: `verify` and `real-phaser-render` in [run 35380735369](https://github.com/setnessconsulting/game-bridge-builder/actions/runs/35380735369), plus typecheck, unit/E2E tests, release build, and manifest check in [candidate run 35380735391](https://github.com/setnessconsulting/game-bridge-builder/actions/runs/35380735391). The manifest identifies `536b62e6b39b521fb8b367055b3e5716af634173` and remains `candidate-not-approved`.
- The exact five manifest-listed payload files were uploaded to private R2 under `bridge-builder/0.1.0-qualification.4/`, then read back and matched against manifest byte counts and SHA-256 values. The immutable `release-manifest.json` was published last. All six objects use the versioned candidate path; no source or credentials were copied into games-site.
- The hosted Playwright journey passed (**1 passed**) on 2026-09-18 against the active games-site preview. It loaded the pinned `.4` iframe, started the game, reached the Phaser-ready state, exercised the DOM mirror through an exact-fit journey, and verified the manifest and each asset's response, content type, immutable cache header, byte count, and hash. A visible in-app-browser check also reached `Canvas ready` with the semantic DOM controls present.
- The games-site local Astro check/build, functions check, lint, and 11 catalog/asset tests passed. The full-repository Prettier check still reports 29 files; the Bridge Builder-touched files pass a focused formatting check, and unrelated shared-site formatting debt was left untouched.

## Hosting and promotion boundary

- Historical `.4` hosted preview: [Bridge Builder play route](https://83cdd01b.games-site-7pn.pages.dev/bridge-builder/play/) from branch `codex/bridge-builder-wave2-preview`, source `be4078a`. The current `.10` preview and production evidence are recorded above; the prior `.3` preview remains at [its versioned route](https://b2de4a6f.games-site-7pn.pages.dev/bridge-builder/play/).
- The hosted Chromium journey passes against the actual `.10` iframe: the frame pins the exact version, creates a real Phaser canvas after Start, shows the DOM mirror, completes an exact-fit click placement, reads the candidate manifest, and verifies every listed object’s response, content type, immutable cache header, byte count, and hash. The entry and assets return `200` with immutable cache metadata. The separate GitHub SwiftShader lane verifies actual Phaser WebGL rendering and its negative control.
- The manifest's hosted-preview field was pending when the immutable artifact was created; the dated post-upload hosted test result is recorded here, not written back into the versioned manifest.
- Production [Bridge Builder page](https://games.setnessconsulting.com/bridge-builder/) is live at [the launcher](https://games.setnessconsulting.com/bridge-builder/) and [the play route](https://games.setnessconsulting.com/bridge-builder/play/). As of 2026-10-02 the live play route still resolves the `.14` catalog pointer because the `.15` Pages deploy has not run; see the status note at the top of this record. LevelBest has not been changed.
- The immutable release manifest remains `candidate-not-approved` by design; production approval is represented by the reviewed games-site catalog merge above. The final hosted production journey passed (**1 passed**) against the custom domain, including exact-fit click placement, renderer readiness, duplicate-script regression coverage, and manifest asset/hash verification.

## Post-promotion follow-up

The owner-approved GAME-297 promotions are complete: `.10` for the presentation slice, `.14` for the reduced-motion payoff fix after the hosted sweep found the defect, and `.15` for the setup touch-target follow-up (merged, Pages deploy pending). The following broader qualification items remain follow-up hardening work and do not change the current Bridge Builder production pointer:

- Broader cross-surface lifecycle qualification for hidden-tab/pause-budget boundaries, failover, session containment, and teardown. Current tests cover the recorded candidate journeys and contract cases but do not close every Gate C/D lifecycle scenario.
- Production design authority and handoff for GAME-171, including reviewed Figma states; an implementation candidate is not a substitute for approved art direction.
- Owner ratification and measurement for the proposed curriculum supply floor and performance/score thresholds; passing tests do not ratify proposed values.
- Real-device, phone/tablet/desktop/DPR/200%-zoom, touch-target, and child/device results.
- Named and dated manual accessibility review for each applicable WCAG 2.2 AA success criterion; no blanket accessibility claim. The Relaxed path remains an untimed candidate until alternate-version checks are recorded.
- Comparator records, IP/provenance manifest, exercised rollback, Q-01 through Q-23 scoring with no unresolved material `Below` (or an explicit owner-approved deferral), and named human approvals.
- A separate approved LevelBest promotion after all of the above. LevelBest remains unchanged in this qualification wave.

## Historical candidate `.1` snapshot

The previous record for `0.1.0-qualification.1` (source commit `c6c27ac`) documented 115 unit tests, six local SwiftShader journeys, and a hosted same-origin frame test. That evidence applies only to candidate `.1`; it does not qualify later candidate artifacts.

At that snapshot, O-8 had sanctioned the two follow-ups but they had not yet been created. They are now tracked as `GAME-294` / `GAME-295`; candidate `.4` includes their implementation and automated evidence, while Jira review/closeout and all separate human/owner gates remain open.
