# Bridge Builder standalone qualification status

**Current snapshot:** 2026-09-17

**Candidate status:** `candidate-not-approved`

**Current candidate:** `0.1.0-qualification.2` — published to private R2 and hosted for qualification only

**Candidate source commit:** `e5c4f358c22224a312db2d63b4452cb096412531`

**CI evidence:** [GitHub Actions run 35291848423](https://github.com/setnessconsulting/game-bridge-builder/actions/runs/35291848423)

**Owner decisions:** O-1 through O-8 were approved as policy decisions on 2026-09-17. `GAME-294` / `GAME-295` now track the sanctioned follow-ups in Backlog; neither is completed. O-7 executors and dates remain open.

This record distinguishes engineering checks from hosted, owner, and human-gated release evidence. It does not promote the games-site catalog and does not authorize LevelBest integration.

## Current Wave 1 checks

- TypeScript typecheck passes.
- 123 Vitest tests pass across 14 files.
- Production Vite build and `release:check` pass for `0.1.0-qualification.2`; the Phaser bundle is approximately 1.38 MB, so performance-budget ratification and real-device measurements remain open.
- Ten local Playwright tests pass in Chromium with `--use-gl=swiftshader`, including a real Phaser canvas plus DOM mirror, exact/underfill/overfill journeys, retry/undo, timer tamper checks, keyboard, drag, reduced motion, mute, touch sizing, and automated accessibility checks.
- The CI-backed release manifest records all four checks as executed before manifest creation and remains `candidate-not-approved`; named human approvals remain pending.

## Hosting and promotion boundary

- Hosted preview: [Bridge Builder play route](https://d9839350.games-site-7pn.pages.dev/bridge-builder/play/) from branch `codex/bridge-builder-wave1-preview`, source `56b5d28`.
- The hosted Chromium/SwiftShader journey passes against the actual `.2` iframe: the frame pins the exact version, creates a real Phaser canvas after Start, shows the DOM mirror, completes an exact-fit round, and reads the candidate manifest. The entry returns `200` with immutable cache metadata.
- The manifest's hosted-preview field was pending when the immutable artifact was created; the post-upload hosted test result is recorded here, not written back into the versioned manifest.
- Production [Bridge Builder page](https://games.setnessconsulting.com/bridge-builder/) still returns `Coming soon` with no `.2` pointer. The clean preview branch is separate from the preserved, dirty games-site checkout; production `main` and LevelBest have not been changed.
- A preview `playable` pointer is only for qualification and does not constitute approval. The release manifest remains `candidate-not-approved`.

## Still required before promotion

- Full fake-clock hidden-tab/pause-budget, expiry/tamper, stale-input, version-skew, failover, session-containment, and teardown qualification across the final contract; the current slice does not close those full evidence gates.
- Full curriculum catalogue and supply-floor qualification owned by `GAME-295`; additive renderer-contract acceptance owned by `GAME-294`.
- Real-device, phone/tablet/desktop/DPR/200%-zoom, touch-target, and child/device results.
- Named and dated manual accessibility review for each applicable WCAG 2.2 AA success criterion; no blanket accessibility claim. The Relaxed path remains an untimed candidate until alternate-version checks are recorded.
- Comparator records, IP/provenance manifest, exercised rollback, Q-01 through Q-23 scoring with no unresolved material `Below` (or an explicit owner-approved deferral), and named human approvals.
- A separate approved LevelBest promotion after all of the above. LevelBest remains unchanged in this qualification wave.

## Historical candidate `.1` snapshot

The previous record for `0.1.0-qualification.1` (source commit `c6c27ac`) documented 115 unit tests, six local SwiftShader journeys, and a hosted same-origin frame test. That evidence applies only to candidate `.1`; it does not qualify `.2`.

At that snapshot, O-8 had sanctioned the two follow-ups but they had not yet been created. They are now tracked as `GAME-294` / `GAME-295`, and implementation/acceptance remain open.
