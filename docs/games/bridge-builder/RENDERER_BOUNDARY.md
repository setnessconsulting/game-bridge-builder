# Bridge Builder — Renderer Boundary

**Authority:** GAME-129 / GAME-105 Gate A  
**Baseline engine:** GAME-36 scaled-integer composition (not a floating Rational class)  
**Status:** frozen for Phaser presentation work

## Exactness contract

Bridge Builder lengths are **scaled integers**:

- Each piece carries `units: number` (integer).
- Each puzzle carries `denominator: number` (integer).
- Display labels are derived via `formatScaled(units, denominator)`.
- A bridge **fits exactly** iff `compositionUnits === gapUnits` (integer equality).
- Statuses from `evaluatePlacement`: `fit | partial | overhang | overshoot`.

There is **no** floating-point epsilon in the engine. Renderer pixels, sprite
widths, drag hit-tests, and snap animations must convert at the view boundary
only and must never feed back into verdicts.

## What the engine owns

| Concern | Owner |
| --- | --- |
| Piece exact lengths (`units`) | TypeScript engine / session reducer |
| Gap / span (`gapUnits`) | Engine |
| Tray inventory & legal place/remove/reset | `applyBridgeIntent` in `session.ts` |
| Exact / underfill / overfill / overshoot verdicts | `evaluatePlacement` + session |
| Scoring, stars, hints, adaptivity inputs | Existing `engine` / `hints` / `adaptive` |
| Telemetry event payloads (no PII) | `telemetry.ts` |
| Session deadline, expiry, 90 s / 6-bridge cap, hidden-tab pause credit | Engine-owned monotonic clock in `clock.ts`; host supplies visibility/route/save signals |

## What the renderer may own

| Concern | Owner |
| --- | --- |
| Pixel layout (`unitPx`, cliff width, DPR) | View / Phaser only |
| Drag preview position | Presentation metadata |
| Snap / tween animation | Presentation only |
| Crossing / particles / environment FX | **Post-verdict only**, non-authoritative |
| Pointer hit testing | Normalizes to bounded intents |

## Approved intents (renderer → engine)

Closed union in `src/lib/bridgeBuilder/intents.ts`:

- `selectPiece`
- `placePiece`
- `removePiece`
- `reset`
- `submit`
- `requestHint`
- `continue`
- `presentationComplete` (animation complete; no math)

Pointer coordinates may be used only to decide *which* intent and *which*
`pieceId`. They must not carry a length or alter `units`.

At the renderer/host boundary each intent also carries `seq`, `sessionId`, and
`generation`. The host validates all three and drops stale, duplicate, malformed,
or wrong-session envelopes before the reducer. The action union remains the same
eight members; metadata does not add gameplay verbs.

## Explicitly forbidden

- Using collision, physics, or snap tolerance to decide whether a bridge fits.
- Recomputing remaining span from sprite widths.
- Mutating session composition from tween completion callbacks after remount.
- Importing Phaser into engine/session/exactness modules.

## View-boundary conversion

```ts
widthPx = units * unitPx;          // display only
// NEVER: units = Math.round(widthPx / unitPx) into the engine
```

Property tests assert that `exactFitVerdict` is unchanged across
`unitPx ∈ {12, 24, 48}` and arbitrary `snapTolerancePx`.

## Intentional math changes

Any change to placement equality, generator solvability, scoring, or legal
actions requires a **separate approved GAME issue**. Phaser adoption alone must
not alter those contracts.
