# Bridge Builder standalone qualification status

**Current snapshot:** 2026-09-19

**Candidate status:** `candidate-not-approved`

**Current candidate:** `0.1.0-qualification.9` — published to private R2 and hosted for qualification only

**Candidate source commit:** `a260b0e642ae40be296b0505964f314f9f164f9e` (GAME-297 visual polish, direct placement/failure feedback, and the release PNG content-type fix)

**CI evidence:** [Bridge Builder CI run 35485760229](https://github.com/setnessconsulting/game-bridge-builder/actions/runs/35485760229) passed both `verify` and `real-phaser-render` for the source branch head; the immutable candidate payload is pinned to the source commit above.

**Owner decisions:** O-1 through O-8 were approved as policy decisions on 2026-09-17. The `GAME-294` renderer-contract and `GAME-295` curriculum-supply implementations are present on the Wave 2 branch and pass their automated checks; Jira review/closeout is still open. Their proposed thresholds remain proposed, not ratified. O-7 executors and dates remain open.

This record distinguishes engineering checks from hosted, owner, and human-gated release evidence. It does not promote the games-site catalog and does not authorize LevelBest integration.

## Current candidate checks — candidate `.9`

- Candidate `.9` incorporates GAME-297's visual polish pass plus the follow-up player feedback: a procedural bridge environment with a larger water span, wood-style planks, high-resolution car artwork, explicit target-span feedback, Phaser/DOM visual parity, responsive layout, player-facing copy cleanup, click-to-place input with drag fallback, success crossing/audio cues, failure feedback for underfill/overfill, honest pause messaging, and reduced-motion handling. Gameplay math, intent authority, and the independent `/?game132=1` route remain unchanged.
- The candidate workflow and local verification passed typecheck, lint, 182 unit tests across 18 files, full local E2E (19 passed, 1 hosted-only skip), release build, release-manifest check, and the real Phaser/SwiftShader render lane (2 passed) before publishing. The immutable R2 upload completed under `bridge-builder/0.1.0-qualification.9/`; the manifest records source commit `a260b0e642ae40be296b0505964f314f9f164f9e` and remains `candidate-not-approved`.
- The hosted Chromium journey passed (**1 passed**) against the live preview. It loaded the pinned `.9` iframe, reached `Canvas ready`, completed an exact-fit click placement, and verified the manifest plus every listed asset's status, content type, immutable cache header, byte count, and SHA-256.
- The games-site preview branch `codex/bridge-builder-preview-qualification-5` pinned `.9` in commit `26d8868`; the active preview is [Bridge Builder play route](https://d5623e4f.games-site-7pn.pages.dev/bridge-builder/play/). Production readback remains unchanged: both Bridge Builder routes return `200` with the coming-soon/not-playable state and no iframe.

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

- Historical `.4` hosted preview: [Bridge Builder play route](https://83cdd01b.games-site-7pn.pages.dev/bridge-builder/play/) from branch `codex/bridge-builder-wave2-preview`, source `be4078a`. The current `.9` preview is recorded above; the prior `.3` preview remains at [its versioned route](https://b2de4a6f.games-site-7pn.pages.dev/bridge-builder/play/).
- The hosted Chromium journey passes against the actual `.9` iframe: the frame pins the exact version, creates a real Phaser canvas after Start, shows the DOM mirror, completes an exact-fit click placement, reads the candidate manifest, and verifies every listed object’s response, content type, immutable cache header, byte count, and hash. The entry and assets return `200` with immutable cache metadata. The separate GitHub SwiftShader lane verifies actual Phaser WebGL rendering and its negative control.
- The manifest's hosted-preview field was pending when the immutable artifact was created; the dated post-upload hosted test result is recorded here, not written back into the versioned manifest.
- Production [Bridge Builder page](https://games.setnessconsulting.com/bridge-builder/) remains `Coming soon`; a read-only check of both production routes found no iframe and no `.9` pointer. LevelBest has not been changed.
- A preview `playable` pointer is only for qualification and does not constitute approval. The release manifest remains `candidate-not-approved`.

## Still required before promotion

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
