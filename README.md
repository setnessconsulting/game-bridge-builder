# Bridge Builder

Bridge Builder is a standalone LevelBest game repository. It contains the existing Bridge Builder game experience, its authoritative TypeScript game logic, the React play surface, the Phaser renderer harness, focused tests, and the supporting requirements documentation.

This repository was extracted from LevelBest at commit `c074c995a85420f3263b36443f8c9f3c04d18bf3` on the `codex/levelbest-wave11-final-freeze` branch. The source LevelBest checkout was not modified by the extraction.

## Run locally

```text
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal. The game is served from the standalone repository rather than from the shared arcade shell.

## Validate

```text
npm run typecheck
npm test
npm run build
```

## Repository boundaries

- `src/lib/bridgeBuilder/` is the game engine, generation, hints, telemetry, session, and renderer-boundary code.
- `src/components/BridgeBuilder.tsx` is the primary React game surface.
- `src/components/BridgeBuilderPhaserHost.tsx` preserves the Phaser presentation harness for renderer validation.
- `src/lib/games/core/` contains the small shared type and deterministic-RNG foundation required by the game.
- `docs/games/bridge-builder/` contains the requirements, final-state, renderer, UX, and decision records.
- `tests/` contains the focused Bridge Builder unit and contract tests.

The TypeScript engine remains the sole gameplay authority. Renderers present state and emit intents; physics and gameplay math stay outside the renderer authority boundary.

## Release context

This repository is a saved, runnable source snapshot. It does not claim production deployment or release readiness. The remaining implementation and human-evidence gates are tracked in [GAME-105](https://setnessconsulting.atlassian.net/browse/GAME-105).
