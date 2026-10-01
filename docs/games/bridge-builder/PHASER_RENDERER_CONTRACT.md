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
state, resize, and disposal. It is presentation-only. A same-major view model at or above the
renderer’s schema minor is accepted; an older schema or major mismatch fails closed before Phaser
initialization, leaves the DOM mirror usable, and emits `renderer_version_skew`.

## v1.0.0 → v1.1.0 compatibility path

The v1.0.0 baseline carried exact unit pieces, labels, verdict/state flags, and presentation sizes,
but the view model did not carry ordered engine-authored slots, `renderSeed`, the session deadline
and expiry block, renderer capabilities/flags, or per-intent sequence/session/generation metadata.
Its renderer actions were the same eight bounded names, without the v1.1 host envelope.

The v1.1.0 producer adds those fields without changing exactness, legal actions, scoring, hints, or
generation authority. The host wraps every renderer action with `seq`, `sessionId`, and `generation`
before validation. The Phaser 1.1 renderer requires a v1.1-or-newer view-model schema in major 1;
v1.0 producers remain on the DOM path until upgraded. Missing slot or deadline fields are never
reconstructed from pixels and deadlines are never guessed. This is a fail-closed rollout path, not
a silent v1.0-to-v1.1 adapter.

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

## Presentation ownership (GAME-171 AC8)

Which surface owns each of the 20 presentation states. Every state is derived from the
same `BridgeViewModel` in both surfaces; ownership decides only *where it is rendered*.
This is an implementation-truth record, not a design claim — GAME-171 still owns the
production Figma authority and the frames themselves.

| State | Owner | Notes |
| --- | --- | --- |
| `span` | Both | Phaser draws the gap/cliffs; DOM exposes the remaining-span sentence and the open-slot button. |
| `pieces` | DOM | Tray and placed pieces are semantic controls; Phaser mirrors them as sprites. |
| `pieceTray` | DOM | Tray group and plank buttons are DOM-first for assistive tech. |
| `selected` | Both | DOM selected styling + Phaser selected plank treatment. |
| `focused` | DOM | Keyboard focus ring is DOM-owned; Phaser does not own focus. |
| `dragging` | Both | Phaser owns the drag sprite; DOM owns the HTML5-drag affordance. Decorative only. |
| `placementPreview` | Phaser | Ghost/preview rendering is scene-owned; DOM shows the overhang preview label. |
| `placed` | Both | Committed pieces render in both surfaces from `slots`. |
| `removable` | DOM | Removal affordance and its label are DOM-owned. |
| `remainingSpan` | DOM | Exact remaining units are announced; Phaser may show the numeric note. |
| `underfill` | Both | Open-remainder geometry plus the `◌` glyph. |
| `overfill` | Both | Overhang cross-hatch plus the `⚠` glyph and splash. |
| `exact` | Both | Check geometry, `✓` glyph, celebration ring. |
| `incorrectSubmit` | DOM | Signed-difference restatement is DOM-owned copy; Phaser shows the geometry. |
| `success` | Both | Celebration geometry in both; audio is DOM-owned with a mute guard. |
| `crossing` | Phaser | Post-verdict crossing FX is scene-owned and skipped under reduced motion. |
| `environment` | Phaser | Canyon/gap/supports/shadows are scene-owned. |
| `hints` | Both | Ladder level and highlight; Phaser paints the ghost. |
| `reducedMotion` | Both | Both surfaces read the same flag; static equivalents replace tweens. |
| `responsive` | DOM | Layout buckets are DOM/CSS-owned; Phaser follows the derived 16:9 surface. |

Decorative presentation must not emit gameplay intents. The eight-intent union in
`src/lib/bridgeBuilder/intents.ts` stays closed, and the Phaser port's reconcile path
emits none (covered by `tests/bridgeBuilderGame297.test.ts`).

## Figma / API-37 status

| Item | Status |
| --- | --- |
| API-37 platform (`project-figma-api`) | Available as portfolio Figma integration. Credential **not present** in this environment as of 2026-10-01 (`figma-api auth status` → `configured: false`). |
| Official Figma MCP auth | Not connected in this environment. A prior session recorded seat **View / Starter**. |
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

**GAME-171 handoff status — 2026-10-01.** The 20 state names above and their node IDs are
the GAME-130 shells. Whether each now corresponds to a *named production frame* in the
Figma file is a GAME-171 acceptance criterion and is **unverified** — it has not been
checked against the Figma file from this environment, because no Figma credential is
present (`figma-api auth status` → `configured: false`) and no Figma MCP server is
connected. Treat the mapping below as a claim awaiting verification, not as a fact:

- **Code-side, verified:** the 20 names in `viewModel.ts` are the live set produced by
  `deriveBridgeViewModel`, and the Phaser-owned / DOM-owned split is recorded above.
- **Figma-side, unverified:** that the file contains named production frames for all 20,
  plus the host-shell surfaces (S0/S3/S4/S5/S6), responsive variants, countdown
  sequence, audio ceiling and per-cue mute variants that GAME-171 AC11–AC14 require.

Implementation truth for code remains this contract + `viewModel.ts` + tests.

## Files

- `src/lib/bridgeBuilder/viewModel.ts`
- `src/lib/bridgeBuilder/layout.ts`
- `src/lib/bridgeBuilder/intents.ts`
- `tests/bridgeBuilderViewModel.test.ts`
