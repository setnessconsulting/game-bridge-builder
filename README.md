# Bridge Builder

Bridge Builder is a standalone game repository. It contains the qualification candidate, its
authoritative TypeScript game logic, the React/DOM semantic mirror, the real Phaser presentation
surface, focused tests, release tooling, and the supporting requirements documentation.

This repository was extracted from LevelBest at commit `c074c995a85420f3263b36443f8c9f3c04d18bf3` on the `codex/levelbest-wave11-final-freeze` branch. The source LevelBest checkout was not modified by the extraction.

## Run locally

```text
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal. The candidate is served from this standalone
repository while it is qualified; `games-site` hosts the approved versioned build later.

### Game Platform SDK dependency

`npm install` fetches `@setnessconsulting/game-platform-sdk` from a private GitHub repository over
SSH. A contributor machine therefore needs an SSH key for `github.com` that can read
`setnessconsulting/project-game-platform-sdk` — a personal key with read access, or the
repository's read-only deploy key. CI installs through the `GAME_PLATFORM_SDK_DEPLOY_KEY` secret
instead; never commit a key.

## Validate

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run release:build
npm run release:check
```

The GAME-132 Phaser qualification slice is available at `/?game132=1`. Add
`&reduced=1` to exercise the reduced-motion completion path. The default root
shows the final-contract candidate; neither path changes LevelBest.

## Repository boundaries

- `src/lib/bridgeBuilder/` is the game engine, generation, hints, telemetry, session, and renderer-boundary code.
- `src/components/BridgeBuilderCandidate.tsx` is the final-contract vertical-slice candidate used by the default app.
- `src/components/BridgeCanvas.tsx` mounts the real Phaser presentation; the DOM mirror remains the accessible fallback and semantic source.
- `src/components/BridgeBuilder.tsx` and `src/components/BridgeBuilderPhaserHost.tsx` are retained as isolated historical/reference surfaces and are not reachable from the candidate app.
- `src/lib/games/core/` contains the small shared type and deterministic-RNG foundation required by the game.
- `docs/games/bridge-builder/` contains the requirements, final-state, renderer, UX, and decision records.
- `tests/` contains the focused Bridge Builder unit, clock, contract, and Playwright browser tests.

The TypeScript engine remains the sole gameplay authority. Renderers present state and emit intents; physics and gameplay math stay outside the renderer authority boundary.

## Release context

`npm run release:build` creates the immutable static payload and `release-manifest.json` under
`dist/`. The release manifest records the commit, version, entry file, payload hashes/sizes/content
types, and validation-evidence references; it marks a local build as `candidate-not-approved`.

`games-site` owns the catalog, launcher, same-origin route, and approved R2 version pointer.
Bridge Builder is promoted: `games-site` production selects `0.1.0-qualification.13` (source commit
`3f33896399e7c555bb80b71cde454cf8bb51b612`, SDK `sdk-v0.1.1` at
`8933746ebefe128a23b08f3fc9fd6796f4d906bd`), which carries the Game Platform SDK guest transport and
completes the host handshake at `/bridge-builder/play/`. The previous known-good pointer,
`0.1.0-qualification.12`, remains published for rollback. LevelBest is unchanged and is a separate
promotion that consumes the exact pinned artifact without copying game source. The remaining
implementation and human-evidence gates are tracked in
[GAME-105](https://setnessconsulting.atlassian.net/browse/GAME-105).
