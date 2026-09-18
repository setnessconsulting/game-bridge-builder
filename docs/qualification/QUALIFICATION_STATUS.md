# Bridge Builder standalone qualification status

**Current snapshot:** 2026-09-17

**Candidate status:** `candidate-not-approved`

**Current candidate:** `0.1.0-qualification.2` — locally built; not yet published to R2

**Source commit:** pending Wave 1 commit

**Owner decisions:** O-1 through O-8 were approved as policy decisions on 2026-09-17. `GAME-294` / `GAME-295` now track the sanctioned follow-ups in Backlog; neither is completed. O-7 executors and dates remain open.

This record distinguishes engineering checks from hosted, owner, and human-gated release evidence. It does not promote the games-site catalog and does not authorize LevelBest integration.

## Current Wave 1 checks

- TypeScript typecheck passes.
- 123 Vitest tests pass across 14 files.
- Production Vite build and `release:check` pass for `0.1.0-qualification.2`; the Phaser bundle is approximately 1.38 MB, so performance-budget ratification and real-device measurements remain open.
- Ten local Playwright tests pass in Chromium with `--use-gl=swiftshader`, including a real Phaser canvas plus DOM mirror, exact/underfill/overfill journeys, retry/undo, timer tamper checks, keyboard, drag, reduced motion, mute, touch sizing, and automated accessibility checks. The hosted-games-site test is skipped until the `.2` candidate is deployed.
- The locally generated manifest remains `candidate-not-approved`; it does not assert CI or human approval. The candidate still needs a commit-backed release artifact and hosted verification.

## Hosting and promotion boundary

- No hosted qualification has yet been completed for candidate `.2`. The existing Cloudflare preview is from the earlier qualification branch/version and is not evidence for this candidate.
- The clean games-site preview branch pins `.2`; its change is separate from the preserved, dirty games-site checkout. Production `main` and LevelBest have not been changed by this wave.
- The production games-site catalog must remain `coming-soon` until the full approval gate passes. A preview `playable` pointer is only for qualification and does not constitute approval.

## Still required before promotion

- Commit-backed release manifest and real R2 delivery of every hashed file, followed by the hosted same-origin frame journey and immutable-cache checks.
- Green hosted CI for typecheck, unit/property/golden tests, production build, and the real Phaser Chromium SwiftShader lane.
- Full fake-clock hidden-tab, pause-budget, expiry, tamper, stale-input, version-skew, failover, session-containment, and teardown coverage across the final contract.
- Full curriculum catalogue and supply-floor qualification owned by `GAME-295`; additive renderer-contract acceptance owned by `GAME-294`.
- Real-device, phone/tablet/desktop/DPR/200%-zoom, touch-target, and child/device results.
- Named and dated manual accessibility review for each applicable WCAG 2.2 AA success criterion; no blanket accessibility claim. The Relaxed path remains an untimed candidate until alternate-version checks are recorded.
- Comparator records, IP/provenance manifest, exercised rollback, Q-01 through Q-23 scoring with no unresolved material `Below` (or an explicit owner-approved deferral), and named human approvals.
- A separate approved LevelBest promotion after all of the above. LevelBest remains unchanged in this qualification wave.

## Historical candidate `.1` snapshot

The previous record for `0.1.0-qualification.1` (source commit `c6c27ac`) documented 115 unit tests, six local SwiftShader journeys, and a hosted same-origin frame test. That evidence applies only to candidate `.1`; it does not qualify `.2`.

At that snapshot, O-8 had sanctioned the two follow-ups but they had not yet been created. They are now tracked as `GAME-294` / `GAME-295`, and implementation/acceptance remain open.
