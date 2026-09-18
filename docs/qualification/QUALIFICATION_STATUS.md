# Bridge Builder standalone qualification status

**Current snapshot:** 2026-09-18

**Candidate status:** `candidate-not-approved`

**Current candidate:** `0.1.0-qualification.3` — published to private R2 and hosted for qualification only

**Candidate source commit:** `166fcfbac2da4e9b9c019e5ef84b74b098ee0363`

**CI evidence:** [qualification run 35372884865](https://github.com/setnessconsulting/game-bridge-builder/actions/runs/35372884865) and [candidate build run 35372885068](https://github.com/setnessconsulting/game-bridge-builder/actions/runs/35372885068)

**Owner decisions:** O-1 through O-8 were approved as policy decisions on 2026-09-17. The `GAME-294` renderer-contract and `GAME-295` curriculum-supply implementations are present on the Wave 2 branch and pass their automated checks; Jira review/closeout is still open. Their proposed thresholds remain proposed, not ratified. O-7 executors and dates remain open.

This record distinguishes engineering checks from hosted, owner, and human-gated release evidence. It does not promote the games-site catalog and does not authorize LevelBest integration.

## Historical Wave 1 checks — candidate `.2`

- TypeScript typecheck passes.
- 123 Vitest tests pass across 14 files.
- Production Vite build and `release:check` pass for `0.1.0-qualification.2`; the Phaser bundle is approximately 1.38 MB, so performance-budget ratification and real-device measurements remain open.
- Ten local Playwright tests pass in Chromium with `--use-gl=swiftshader`, including a real Phaser canvas plus DOM mirror, exact/underfill/overfill journeys, retry/undo, timer tamper checks, keyboard, drag, reduced motion, mute, touch sizing, and automated accessibility checks.
- The CI-backed release manifest records all four checks as executed before manifest creation and remains `candidate-not-approved`; named human approvals remain pending.

## Wave 2 candidate checks — candidate `.3`

- `GAME-294`: additive BridgeViewModel v1.1.0 fields, sequenced/session-bound intents, fail-closed validation, renderer lifecycle, version-skew behavior, and retry telemetry are implemented with unit coverage. The frozen eight-intent union and TypeScript gameplay authority are unchanged.
- `GAME-295`: the catalogue parity test covers all 14 skills and four bands; the seeded supply suite checks 12 distinct solvable puzzles per skill and generator tier (baseline/easier/harder), plus exact decompositions and decoy honesty. The 12-puzzle floor and related score thresholds remain proposed pending owner ratification.
- CI typecheck, unit tests (**171 tests across 16 files**), Chromium/SwiftShader journeys (**10 passed; the hosted test is skipped in the unhosted CI environment**), release build, and release-manifest check passed in both linked GitHub Actions runs.
- The candidate artifact was downloaded from the passing release workflow, its five payload files were checked against the manifest hashes and byte counts, and those exact files plus the manifest were uploaded to private R2 under `bridge-builder/0.1.0-qualification.3/`. GitHub Actions R2 publishing remains unconfigured; this candidate upload used the existing authenticated Wrangler session and did not add secrets to GitHub.
- The deployed hosted test passed on 2026-09-18 (**1 passed**) against the actual preview route. It exercised the Phaser canvas and DOM mirror, completed an exact-fit journey, and checked every manifest-listed object’s status, content type, immutable cache header, byte count, and SHA-256.
- The Phaser bundle is approximately 1.38 MB. This is a measurement, not an accepted performance budget; proposed budgets and real-device measurements remain open.

## Hosting and promotion boundary

- Hosted preview: [Bridge Builder play route](https://b2de4a6f.games-site-7pn.pages.dev/bridge-builder/play/) from branch `codex/bridge-builder-wave2-preview`, source `84fe037`. The previous `.2` preview remains at `https://d9839350.games-site-7pn.pages.dev/bridge-builder/play/`.
- The hosted Chromium/SwiftShader journey passes against the actual `.3` iframe: the frame pins the exact version, creates a real Phaser canvas after Start, shows the DOM mirror, completes an exact-fit round, reads the candidate manifest, and verifies every listed asset. The entry and assets return `200` with immutable cache metadata.
- The manifest's hosted-preview field was pending when the immutable artifact was created; the dated post-upload hosted test result is recorded here, not written back into the versioned manifest.
- Production [Bridge Builder page](https://games.setnessconsulting.com/bridge-builder/) remains `Coming soon` with no candidate pointer. The preview branch is separate from the preserved, dirty games-site checkout; production `main` and LevelBest have not been changed.
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

At that snapshot, O-8 had sanctioned the two follow-ups but they had not yet been created. They are now tracked as `GAME-294` / `GAME-295`; candidate `.3` contains their implementation and automated evidence, while Jira review/closeout and all separate human/owner gates remain open.
