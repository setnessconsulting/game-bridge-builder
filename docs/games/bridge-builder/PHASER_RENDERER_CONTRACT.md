# Bridge Builder — Phaser Renderer / Intents Contract

**Version:** `1.1.0` (`BRIDGE_VIEW_MODEL_VERSION`; additive to the v1.0.0 baseline)

**Stories:** GAME-130 (contract baseline), GAME-131 (adapter), GAME-294 / BB-CONTRACT-1 (additive revision)
**Exactness authority:** [RENDERER_BOUNDARY.md](./RENDERER_BOUNDARY.md)

## Architecture

```
React host (session / a11y / telemetry)
        │
        ▼
applyBridgeIntent  ──exact units & verdicts──►  BridgeViewModel v1.1.0
        ▲                                              │
        │ validated intent envelope                     ▼
BridgeRendererPort ◄──── Phaser scene / DOM input adapter
```

The renderer port owns mount, view-model reconciliation, intent subscription, reduced-motion/mute
state, resize, and disposal. It is presentation-only. A same-major additive view-model is accepted;
a major mismatch fails closed to the DOM mirror and emits `renderer_version_skew`.

## Presentation state names (Figma ↔ code)

These names are stable and map 1:1 to `BridgePresentationStateName`:

| State | Meaning |
| --- | --- |
| `span` | Exact gap (`gapUnits`) |
| `pieces` | All piece views |
| `pieceTray` | Available tray pieces |
| `selected` | Selected tray piece |
| `focused` | Keyboard/screen-reader focus |
| `dragging` | Pointer drag in progress |
| `placementPreview` | Ghost/preview before commit |
| `placed` | Committed bridge pieces |
| `removable` | Placed pieces that can be lifted |
| `remainingSpan` | Exact remaining units |
| `underfill` | Composition short of gap |
| `overfill` | Overhang / too long |
| `exact` | Integer equality fit |
| `incorrectSubmit` | Explicit submit while not exact |
| `success` | Exact fit achieved |
| `crossing` | **Post-verdict** FX only |
| `environment` | Band, ticks, scale note, legs |
| `hints` | Ladder level / highlight / ghost |
| `reducedMotion` | Simplified motion |
| `responsive` | phone / tablet / desktop |

## Bounded intents

The eight action names remain closed (`src/lib/bridgeBuilder/intents.ts`). Every renderer-to-host
intent is an envelope with required `seq`, `sessionId`, and `generation` fields. The host rejects
unknown actions, malformed piece identities, wrong-session/generation input, duplicate sequences,
and stale sequences before calling the reducer; rejected inputs emit `invalid_intent_rejected` or
`stale_intent_dropped` and
show a non-blocking retry affordance.

- `selectPiece` `{ pieceId }`
- `placePiece` `{ pieceId }`
- `removePiece` `{ pieceId }`
- `reset`
- `submit`
- `requestHint`
- `continue`
- `presentationComplete`

The v1.1 view model adds engine-authored unit slots (`slots`, `openSlots`, `fillOrder`), deterministic
`renderSeed`, monotonic session deadline/expiry data, renderer capabilities, and presentation flags.
Slots carry exact unit offsets and identities; renderers do not reconstruct them from pixels.

Equivalent input paths (must converge on the same intents):

1. **Drag/drop** — pointer down on tray piece → drop on gap → `placePiece`
2. **Tap-select / tap-place** — select tray piece, then tap gap → `placePiece`
3. **Keyboard** — arrows select, Enter places, focused remove/reset keys → same intents

## Exact vs pixel separation

- `BridgePieceView.units` is authoritative.
- `BridgePieceView.widthPx` is derived via `unitsToPx` and must never re-enter the engine.
- Resize / DPR changes call `withResize` on layout only; session state is unchanged.
- Decorative physics, if added later, is labeled **post-verdict / non-authoritative** and must not emit math-changing intents. Prefer none until GAME-132+.

## Accessibility bridge

Stable `piece.id` values connect:

- React/DOM semantic controls (tray, lengths, selected, composition, remaining, verdict)
- Phaser sprites / hit targets, including optional g12 dot faces

## Figma / API-37 status

| Item | Status |
| --- | --- |
| API-37 platform (`project-figma-api`) | Available as portfolio Figma integration |
| Official Figma MCP auth | Connected (seat: **View / Starter**) |
| Bridge Builder GAME-130 design file | **Created** — file key below |

**File identity**

- **fileKey:** `nW0aDRqh6GNTj9ObJsKpYr`
- **URL:** https://www.figma.com/design/nW0aDRqh6GNTj9ObJsKpYr
- **Name:** GAME-130 Bridge Builder Renderer States
- **Page:** `GAME-130 States` (`0:1`)
- **Board:** `Bridge Builder Presentation States` (`1:2`)

**Named state frames (node ids)**

| State | nodeId |
| --- | --- |
| span | `1:6` |
| pieces | `1:9` |
| pieceTray | `1:12` |
| selected | `1:15` |
| focused | `1:18` |
| dragging | `1:21` |
| placementPreview | `1:24` |
| placed | `1:27` |
| removable | `1:30` |
| remainingSpan | `1:33` |
| underfill | `1:36` |
| overfill | `1:39` |
| exact | `1:42` |
| incorrectSubmit | `1:45` |
| success | `1:48` |
| crossing | `1:51` |
| environment | `1:54` |
| hints | `1:57` |
| reducedMotion | `1:60` |
| responsive | `1:63` |

**Remaining visual polish (not blocking typed contract AC):**

1. Flesh out world layout, piece variants, crossing cinematic, and reduced-motion art beyond labeled shells.
2. Annotate drag / tap-tap / keyboard equivalence on the canvas.
3. Add phone/tablet/desktop art variants matching `responsive`.

Implementation truth for code remains this contract + `viewModel.ts` + tests.

## Files

- `src/lib/bridgeBuilder/viewModel.ts`
- `src/lib/bridgeBuilder/layout.ts`
- `src/lib/bridgeBuilder/intents.ts`
- `tests/bridgeBuilderViewModel.test.ts`
