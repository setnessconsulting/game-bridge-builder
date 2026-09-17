# Bridge Builder standalone qualification status

**Snapshot:** 2026-09-17  
**Candidate status:** not approved for production  
**Candidate artifact:** `bridge-builder/0.1.0-qualification.1/`  
**Artifact source commit:** `c6c27ac`
**Owner decision record:** O-1 through O-8 approved as policy decisions on 2026-09-17. This resolves governance choices; implementation, human evidence, conformance sign-off, rollback, and release promotion remain open. O-7 executor names/dates and O-8 follow-up work are still required.

This record separates executed engineering checks from owner- and human-gated release evidence. It
does not promote the games-site catalog and does not authorize LevelBest integration.

## Executed in the standalone repository

- TypeScript typecheck passes.
- 115 Vitest tests pass, including exactness, renderer synchronization, clock, import-boundary, and
  placement-invariance coverage.
- Production Vite build passes with relative asset URLs.
- Six local Playwright journeys pass in Chromium with `--use-gl=swiftshader`: real Phaser canvas and
  DOM mirror, underfill/submit/retry/undo, overfill, keyboard, drag, reduced motion, mute, touch
  sizing, and exact success summary.
- The release manifest records the entry file, payload hashes, byte sizes, content types, commit, and
  `candidate-not-approved` status.

## Executed in the games-site preview

- Preview URL: `https://codex-bridge-builder-qualifi.games-site-7pn.pages.dev/bridge-builder/play/`
- The same-origin iframe loads the pinned static entry from private R2.
- The entry returns `200` with `immutable` cache metadata.
- The manifest returns `200` and remains `candidate-not-approved`.
- A hosted-frame Playwright journey exercises the actual exact-fit path and summary.
- Preview-only catalog state is enabled by `BRIDGE_BUILDER_PREVIEW_VERSION`; production `main` remains
  `coming-soon`.

## Still required before promotion

- O-8 is approved on 2026-09-17: `BB-CONTRACT-1` and `BB-CONTENT-1` are sanctioned bounded follow-ups,
  but they are not yet Jira issues or completed work.
- Full content catalogue and 14-skill supply-floor qualification beyond the one-bridge slice.
- Ordered v1.1 view-model fields, required intent metadata, version-skew handling, retry telemetry,
  renderer-port lifecycle, and the complete break/return integration.
- O-7 policy is approved, but named human executors and dates are still required for manual accessibility,
  child/device, comparator, IP/provenance, WCAG sign-off, and rollback evidence.
- O-2 requires criterion-level WCAG 2.2 AA assessment with no blanket conformance claim; the Relaxed build
  remains an untimed accessibility path pending alternate-version verification.
- O-4 requires the real Phaser Chromium SwiftShader lane to be green in CI before Gate F; a waiver may
  continue engineering but cannot close Gate F or authorize promotion.
- Full fake-clock hidden-tab, tamper, expiry, pause-budget, failover, teardown, and session-containment
  evidence across the final contract.
- Real-device, phone/tablet/desktop/DPR/200%-zoom, child/device, comparator, IP/provenance, rollback,
  and criterion-level accessibility records with named executors and dates.
- Q-01 through Q-23 scoring with no unresolved material `Below`, or an explicit owner-approved
  deferral with rationale.
- A separate approved LevelBest promotion after all of the above; LevelBest is unchanged in this
  qualification wave.
