# Technical Design — Bridge Builder (LevelBest), Final-State Next-Gen Renderer (v2)

**Run:** `bridge-builder-final-state-20260910` · **Role:** Architect (Synthesizer, v2) · **Epic:** `GAME-105` (canonical survivor)
**Scope:** validate and improve the already-frozen architecture; define the production end state. **No game implementation.**
**Baseline evidence:** `GAME-129/130/131` Done; Phaser `4.2.1` pinned; production `/games` still renders through React DOM; `GAME-166` (Review) documents the real-render test limitation and is **reopened by this revision** (§10.4).
**Instruction set:** `v2/DECISIONS.md` (§1–§8, O-1…O-8). Where a critique implied changing a frozen contract, the resolution here is to record the gap and route it to a bounded issue — never to rewrite the contract in this spec.
**Precedence:** `BRIEF.md` §2 locked constraints **override any critique item** and any recommendation in this document.
**Provenance note:** every performance number, benchmark result, child observation or device measurement below is either a **target requiring measurement** (marked *provisional — verify in `GAME-135`/`GAME-172`, with a named `Ratifier` in §9.1) or an already-merged fact named with its source. Nothing authored-but-unexecuted is described as passing. An `[existing]` tag without a citation is treated as `[required work]`.
**Self-contained:** this is the complete v2 design, not a diff against v1. It keeps the v1 top-level section structure (§1–§14 + coverage check) and marks changed sections `[UPDATED]`.

---

## 0. Revision note (v1 → v2)

Load-bearing changes, each with its finding IDs. Unmarked sections are unchanged from v1 in substance.

| # | Change | v2 section(s) | Finding IDs |
|---|---|---|---|
| 1 | **Session deadline has one authority.** The engine owns a **monotonic** round deadline and expiry (injected clock; `performance.now()`-based in production, fake clock in test). The host "owns the clock" formulation is **deleted**; the host supplies `visibilitychange` and route lifecycle as engine **inputs on a separate channel** (not a new player intent; the closed union is untouched) and performs the **save-at-expiry handshake**. Wall-clock vs monotonic semantics, the hidden-tab boundary rule, device-sleep treatment, and the enforcement test (fake-clock + visibility-change e2e + tamper) are defined once. | §1.1, §4, §5.3, §6, §10.3, §11.1 | **CRIT-6**, MIN-2, W-2 |
| 2 | **The earned break is wall-clock and non-extendable.** Blur does not stop the break deadline and the pause copy discloses it; the free site alone gets a bounded cumulative pause budget (60 s). The **3 s auto-return is non-cancellable and non-deferrable**; the visible return button returns **early only**. No copy, control, parameter or reload may restore a window. | §1.1, §5.4, §6, §10.3, §11.1, §13 | **CRIT-7**, MAJ-21, MIN-5, MIN-2 |
| 3 | **`submit` resolved: it is first-class, not deprecated.** `incorrectSubmit` stays a frozen state name; it is reached by a non-exact `submit` from a visible **Check it** control. §1.1, §4 (view-model states + intent union), §5 (interfaces), §6 (algorithms) and telemetry are aligned. | §1.1, §3.1, §3.2, §4, §5.1, §6, §11.1 | **CRIT-10**, MAJ-19, MIN-15 |
| 4 | **Enforcement made concrete.** §10 gains the **import-boundary test** and it is referenced in **GAME-135's AC**; the **real-render lane** (Playwright chromium `--use-gl=swiftshader`) is **GAME-166's reopened scope**; the vitest canvas-mock variant is **explicitly non-evidence**; the CI dependency (**CONSULTING-305**, extended to next-gen suites) is stated in **GAME-135's DoD**. | §10.4, §10.9, §10.10, coverage | **CRIT-9**, MAJ-10, MIN-11 |
| 5 | **Benchmark gate referenced as the canonical `Q-01…Q-23` dimension list** (owned by `GAME-172`), never as "23-dimension"; comparator references are made consistent with the v2 PRD's **comparator registry table** (Railway Hero scored; Poly Bridge 3 scored with scope limits; World of Goo 2 registry-only pending O-1). | §13 R-6, §12, coverage | **CRIT-5**, **CRIT-11**, O-1 |
| 6 | **Authority-boundary hardening stated explicitly:** (a) the renderer's placement preview is **unit-based** and consumes engine data (no renderer-computed lengths); (b) decorative post-verdict physics is **seeded from engine output** and its state is **not part of the authoritative view-model**; (c) snapping/magnet tolerance is **presentation-only** and must be proven not to influence the verdict (invariance test: verdict identical across `unitPx ∈ {12,24,48}` and arbitrary `snapTolerancePx`). | §1.1, §3.8, §4, §6, §10.1 | **MAJ-7**, **MAJ-8**, MIN-10, REVIEW §6 |
| 7 | **The host-shell surface gets a real interface** — `GameHostProps`/`GameHostEvents`, the earned-break/return contract and the session lifecycle — replacing v1's single sentence; version-skew/fail-closed rule included; DOM-fallback scope stated precisely. | §5.2, §5.3, §5.4, §5.5, §3.7, §7 | **MAJ-20**, **MAJ-17**, **MAJ-16**, W-13, W-14 |
| 8 | **Ownership map recorded** (CRIT-8): `GAME-171` sole owner of production design incl. host-shell surfaces; `GAME-133` presentation runtime; `GAME-134` accessibility; `GAME-135` performance/parity/rollout; `GAME-166` real-render lane; `GAME-172` benchmark/child/device; `GAME-143` closeout; `GAME-39` current-generation only. NG-09b withdrawn. | Coverage check | **CRIT-8**, CRIT-3, MIN-18 |
| 9 | **Budgets:** the per-device-class table is retained and each row is identified as a **target with a `Status` and a named `Ratifier`** — `GAME-135` for technical rows, `GAME-172` for experiential rows — consistent with the v2 PRD; DOM-first/React-path rows and the long-task budget are added. | §9.1 | MAJ-2, MAJ-14, MIN-3, MIN-4 |
| 10 | **Data model extended** with an ordered, unit-based placement representation (`slots`, `openSlots`, `fillOrder`), `renderSeed`, the session-deadline block, per-intent required fields, and the canonical verdict-mapping table. Frozen-contract additions are routed to **BB-CONTRACT-1** (additive v1.1.0). | §4 | MAJ-15, MAJ-8, CRIT-6, MIN-9, MIN-15, O-8 |
| 11 | **Telemetry:** one canonical event table referenced (not restated) with sink, retention, access, alert thresholds/owners and the P0–P3 defect taxonomy; `submit_result`, `invalid_intent_rejected`, `renderer_version_skew`, `break_flow.pausedMs` added. | §7, §11.1 | MAJ-19, MIN-7, MIN-12 |
| 12 | **Risk table** re-rated (`R-9` MINOR → MAJOR) and extended (`R-11` bounded-session breach, `R-12` retained-DOM divergence), with an owner column. | §13 | MIN-20, MAJ-13 |
| 13 | **Security posture** adds CSP, `frame-ancestors`, SRI/hash and no-third-party-script rules. | §8 | MIN-14 |
| 14 | **1:1 Figma mapping** restated as a `GAME-171` acceptance criterion `[required work]`, not an established fact. | §3.1 | MIN-13 |
| 15 | **Blender determination kept** (optional-with-conditions; architecture verdict unchanged) with a single decision owner (O-5) recorded and the flip evidence/ADR pointers named. | §2.7 | O-5, MIN-18 |
| 16 | **Host-shell design owner** is `GAME-171` by extended AC; `GAME-135` owns the runtime contract/enforcement; `GAME-133` is explicitly not a shell-surface owner. | §5.2, coverage | CRIT-8, MAJ-20 |

**Preserved in force (unchanged):** the exact-math authority rule **verbatim** (§1.1); the frozen-contract prohibitions (§1.1, §4); combine/split and physics-as-authority remain out of contract (§1.1, §12); the Blender architecture verdict (§2.7); and the performance, testing, security and rollback sections (§8–§11).

---

## 1. Architecture Overview `[UPDATED]`

Bridge Builder is a **single-authority, two-runtime web application**. One deterministic TypeScript core decides all mathematics **and owns the session deadline**; one Phaser scene presents that state; one React/Next.js shell owns the route, the semantic mirror, telemetry and rollout. The architecture is a strict one-way authority pipeline with a narrow, bounded reverse channel.

```
                 ┌────────────────────────────────────────────────────┐
                 │  React/Next.js host shell (DOM, route, a11y)        │
                 │  route + session lifecycle · setup/summary/pause    │
                 │  semantic controls · telemetry adapter · flag       │
                 │  earned-break host: save-at-expiry + S4 return      │
                 └──────────┬───────────────────────────▲────────────┘
   authoritative view-model │                           │ bounded intents
   (BridgeViewModel v1.1.0) ▼                           │ (closed union, 8)
                 ┌───────────────────────────┐   ┌───────┴───────────────┐
                 │  TypeScript ENGINE        │◄──│  applyBridgeIntent    │
                 │  units · verdicts ·       │   │  (exact engine action)│
                 │  scoring · hints ·        │   └───────▲───────────────┘
                 │  adaptivity · gen ·       │           │ normalizeInput
                 │  telemetry meaning ·      │   ┌───────┴───────────────┐
                 │  MONOTONIC DEADLINE       │   │  Phaser 4 scene       │
                 │  + expiry (clock owner)   │   │  sprites · tweens ·   │
                 └───────▲───────────┬───────┘   │  VFX · crossing       │
                         │           │ view-model│  unit-based preview   │
     host signals        │           └──────────►└───────────────────────┘
     (visibility, route, │                                  ▲
      save-ack) — NOT    │            Figma production design authority (GAME-171)
      player intents ────┘
```

Two reverse channels exist and they are **different channels**:
1. **Player intents** — the frozen, closed 8-member union from the Phaser/renderer layer only (§1.1).
2. **Host signals** — `visibility`, route lifecycle (`enter`/`exit`) and the `save-ack` of the save-at-expiry handshake, delivered by the React host to the engine as **inputs**, never as player intents (CRIT-6). Host signals cannot place pieces, change composition or alter a verdict.

### 1.1 Authority boundary — restated precisely (non-negotiable)

**The exact-math authority rule, in force verbatim (BRIEF §2.1):**

> A deterministic TypeScript engine is the sole authority for piece lengths, composition/equivalence, legal pieces, exact fit, challenge correctness, scoring, progression and curriculum behavior. Physics, collision, pixel overlap, snapping distance, animation and the renderer **must never** determine whether a bridge is mathematically correct. The renderer presents authoritative state and emits bounded player intents only. `docs/games/bridge-builder/RENDERER_BOUNDARY.md` and `PHASER_RENDERER_CONTRACT.md` are frozen contracts.

**The TypeScript engine owns, exclusively and deterministically:**

- piece lengths (`units`, scaled integers) and the puzzle `denominator`;
- composition and equivalence;
- the legal-move set (which tray piece may be placed/removed/reset);
- exact-fit verdicts — a bridge fits **iff** `compositionUnits === gapUnits` (integer equality, no epsilon);
- statuses `fit | partial | overhang | overshoot`;
- scoring, stars, hints and the hint ladder;
- adaptivity/progression inputs and session band locking;
- problem generation and the solvability invariant;
- **the session deadline and expiry**: `ROUND_CAP_SECONDS = 90`, `ROUND_CAP_BRIDGES = 6` (whichever first) and the earned-break window, on a **monotonic** clock source (CRIT-6, O-3);
- the meaning of every telemetry event.

**The renderer (Phaser) presents authoritative view-models and emits a bounded intent union** — the frozen eight members: `selectPiece`, `placePiece`, `removePiece`, `reset`, `submit`, `requestHint`, `continue`, `presentationComplete`. `submit` is a **first-class** member (CRIT-10): a non-exact submit produces the `incorrectSubmit` presentation state and never reads as a verdict on the child; an exact composition auto-verdicts on placement and needs no submit. Pointer coordinates may decide only *which* intent and *which* `pieceId`; they may never carry or alter a length.

**Presentation-only, never authoritative:** pixel position, collision, physics, snapping/magnet tolerance, tween/animation timing, DPR/scaling, particles, camera motion.

**Three authority-boundary hardening rules (normative, CRIT-9/MAJ-7/MAJ-8):**

- **(a) Unit-based placement preview.** The renderer's placement preview, ghosted slot and projected remaining span are computed from **engine-supplied unit data** (`slots`, `offsetUnits`, `remainingUnits`) projected into pixels for display. The renderer computes **no lengths** and derives no span from sprite widths; `widthPx = units × unitPx` is the only pixel derivation and it is one-directional.
- **(b) Seeded, non-authoritative decorative physics.** Decorative post-verdict physics (marker-load sag, landing response — **no character**, MAJ-24) is triggered only after the engine has already returned a verdict, is deterministic for the puzzle-derived `renderSeed` from the view-model, cannot emit intents, and is removable (collapsed to the final resting frame) under reduced motion. **Its animation state is not part of the authoritative view-model** and is never read back by the engine.
- **(c) Snapping/magnet tolerance is presentation-only.** The magnet provides a purely **visual** offset (≤12 px) that never changes the target slot. The target slot is the **nearest engine-derived slot centre** (deterministic tie-break by lower `slotIndex`); tolerance is constrained below half the minimum slot pixel pitch. It must be **proven** not to influence the verdict — see the invariance test (identical intent sequences under varying `snapTolerancePx`, `unitPx` and DPR yield identical placements and identical legal-action sets; verdict identical across `unitPx ∈ {12,24,48}` and arbitrary `snapTolerancePx`) in §10.1 and §10.9.

**Hard prohibitions** (from `RENDERER_BOUNDARY.md`, unchanged): no collision/physics/snap tolerance in the fit decision; no recomputing remaining span from sprite widths; no mutating session composition from tween callbacks after remount; **no importing Phaser into engine/session/exactness modules**; no renderer-derived geometry in the verdict or legality path. Any change to placement equality, generator solvability, scoring or legal actions requires a **separate approved GAME issue** — Phaser adoption alone may not alter these contracts. Combine, split, decompose and any other new verb are **out of contract** (`CRIT-2`; v1 non-goal).

**Verdict on the existing architecture:** *validated with two operational refinements.* The frozen contracts already separate exact units from pixels and already bound the intent union; no architectural BLOCKER exists. The refinements are the enforcement mechanism — an **CI import-boundary assertion** (§10.9) and the **real-render lane** (§10.4) — plus the single-clock authority repair (§5.3). Enforcement is owned by `GAME-135`; the real-render lane by `GAME-166`; the session-deadline contract field by **BB-CONTRACT-1** (O-8).

---

## 2. Technology Stack (responsibility per technology)

The proposed stack is **accepted as-is for Phaser 4, React/Next.js, TypeScript and Figma**; audio and tooling are retained with tightened ownership rules; Blender is resolved in §2.7.

### 2.1 Phaser 4 (`4.2.1` pinned) — presentation/runtime
- **Owns:** canyon/construction scene; bridge span and anchors; plank/piece display objects; selection, drag and placement-preview visuals; snap/tween presentation; underfill/overhang/exact visualization; assembly animation; crossing/success sequence; particles and bounded environmental VFX; audio *timing*; lightweight camera emphasis; performant 2D on supported browsers.
- **Must NOT own:** correctness, verdicts, remaining span, legal moves, scoring, hints, adaptivity, generation, session limits or the session deadline, telemetry meaning, accessibility semantics, or storage.
- **Why Phaser, not Unity (GAME-102) or PixiJS (GAME-104):** Bridge Builder is a 2D exact-composition game; Phaser gives web-first 2D drag/snap/tween/particle control with no second runtime, no WebGL build-size/startup tax and no C# math duplicate. Unity is the *Math Escape* path and would re-introduce a build pipeline for zero educational gain. PixiJS is the *Shape Studio* path and would forfeit Phaser's scene/input/tween conveniences for no benefit here.

### 2.2 React + Next.js — LevelBest/product and semantic shell
- **Owns:** route and session lifecycle; setup/summary/pause/settings; the semantic accessibility surface and DOM mirror; keyboard/tap-tap interaction alternatives; textual problem/feedback where DOM semantics are preferable; mute/reduced-motion controls; loading/fallback/error states; telemetry adapters; the **earned-break host** (save-at-expiry persistence, S4 return, `break_flow`); feature-flagged rollout and rollback.
- **Must NOT own:** the fit verdict, remaining-span arithmetic, scoring, any re-derivation of composition, or the session deadline. The DOM mirror *renders* engine output; it does not compute it. The host relays visibility/route signals and performs the save handshake; it does not own the clock (CRIT-6).

### 2.3 TypeScript — sole mathematical/game authority
- **Owns:** exact piece lengths; rational/decimal/signed arithmetic; current composition; ordered slot occupancy and fill order; legal moves; required span; exact/under/over verdicts; multiple-valid-solution semantics; generation; scoring; hints; adaptivity/progression; telemetry meaning; **the monotonic session deadline, pause-budget accounting and expiry**. Consumed by both runtimes.
- **Must NOT own:** pixels, layout, animation state, or DOM. Pure, JSON-safe, no DOM/storage/network (the `GAME-129` preservation fixtures enforce this). The clock is **injected** (a `Clock` port), so production uses `performance.now()` and tests use a fake clock without the engine importing any environment.

### 2.4 Figma — production design authority
- **Owns:** canyon/construction world art direction; bridge/span composition; piece families and labels; selection/focus/drag/preview states; underfill/overhang/exact states; remaining-span feedback; crossing sequence and motion intent; HUD/round progress; phone/tablet/desktop layouts; keyboard/touch/focus states; reduced-motion, mute and non-color variants; loading/error/fallback presentation; **and, as the sole owner of the host-shell surfaces (CRIT-8), the `/games` hub card, S0 setup, S3 summary, S5 pause/settings, S4 earned-break countdown + saved state + return, and S6 recovery/fallback.**
- **Must NOT own:** mathematical correctness. `GAME-171`'s AC is explicit — *no Figma artifact encodes correctness independently of the TypeScript core*. The existing `GAME-130` file (`fileKey nW0aDRqh6GNTj9ObJsKpYr`) is a state shell; production art direction and the host surfaces are `GAME-171` and are **required work, not done** (`[required work]`).

### 2.5 Audio — browser/Phaser-compatible cue set with mute parity
- **Owns (cue inventory, frozen):** pickup/select; placement confirmation; under/over feedback; exact-fit confirmation; assembly/crossing; completion; break-return prompt. Plus the **mix ceiling and mute variants** (`GAME-171`) and the mute toggle's parity with the visual channel.
- **Baseline, final-state:** original **synthesized WebAudio** is the final-state baseline; **no bespoke or licensed music** is commissioned in v1 (MAJ-12, DQ-6 closed). Any licensed or bespoke cue would require a per-cue provenance record (source, licence, no comparator reuse) and owner sign-off; comparator audio reuse is forbidden.
- **Must NOT own required meaning:** every cue has visual/text AND screen-reader parity (`GAME-134`); mute must not remove any required result information; no alarm or ticking transient may be used as pressure (Q-20).
- **Ownership:** runtime cues = `GAME-133`; mix ceiling + mute variants = `GAME-171`; audio-described parity = `GAME-134`.

### 2.6 Testing, observability and analytics tooling
- **Owns:** Vitest (unit/property/golden), Playwright (journeys, a11y, device/responsive, **real-render swiftshader lane**), axe (automation), node-canvas (secondary real-render lane), bundle-size and frame-timing budgets, the **import-boundary assertion**, telemetry schema/PII guards.
- **Must NOT own:** product logic, or be allowed to become a *substitute* for human gates (`GAME-39`/`GAME-172`). Tooling proves engineering facts; it does not self-certify benchmark or child evidence. The vitest **alias-level canvas mock is non-evidence** and may never be cited in a gate packet (MIN-11).

### 2.7 Blender — explicit determination: **optional-with-conditions; not required**

**Determination (architecture verdict unchanged in v2): Blender is *not justified as a required tool* for Bridge Builder v1. It is permitted only as optional source-art tooling under explicit conditions, and the default position is that a polished web-first 2D vector/raster pipeline will meet the bar.**

**Owner decision recorded (O-5, recommendation (a) — not a blocker for the epic rewrite):** the **product owner** owns this determination; evidence for any flip is supplied by **GAME-172** (a material `Below` on world/bridge visual cohesion); the durable **ADR is recorded by `GAME-143`**. No other artefact owns the decision (MIN-18).

Reasoning:
- Bridge Builder needs **web-first 2D assets**: proportional plank geometry, HUD, canyon backdrop, environment props. There is **no runtime 3D requirement**, and the frozen architecture forbids a 3D runtime.
- Blender tooling (`API-10`) is **Done**, and the sibling *Math Escape* next-gen track (`GAME-102`/`GAME-110`) uses a **Blender→GLB** pipeline — but that pipeline exists to feed **Unity** (`API-23`, GLB consume). Bridge Builder has no GLB consumer; importing that pipeline would add a build step, a source/export artifact class and provenance overhead for assets that must ultimately be flattened 2D.
- Blender only earns its place if `GAME-171`/`GAME-172` demonstrate that flat 2D authoring cannot reach the comparator bar for **world cohesion** (consistent rendered lighting/material families across many props).

**Conditions if it is used:** output must be flattened/optimized to web-appropriate 2D assets (sprite atlas, budgeted weight); **no runtime 3D and no GLB at runtime**; deterministic export with a source→artifact hash; traceable provenance (`.blend` source + manifest); and no child PII in filenames/metadata.

**Flip conditions:** → **required** only if `GAME-172` records a material `Below` on bridge/world visual cohesion (a scored `Q-01…Q-23` row) that 2D authoring cannot close, **and** the owner accepts the flip in writing; → **not justified (final)** if the 2D route meets the bar, which is the expected outcome. `GAME-133` already makes Blender-derived assets *optional and traceable*.

---

## 3. Component / Module Design `[UPDATED]`

### 3.1 Scene / view-model contract
A Versioned view-model `BridgeViewModel` is the **only** channel from engine to Phaser (`BRIDGE_VIEW_MODEL_VERSION`, now **`1.1.0`** per BB-CONTRACT-1; see §4). It carries the 20 stable presentation state names (`span`, `pieces`, `pieceTray`, `selected`, `focused`, `dragging`, `placementPreview`, `placed`, `removable`, `remainingSpan`, `underfill`, `overfill`, `exact`, `incorrectSubmit`, `success`, `crossing`, `environment`, `hints`, `reducedMotion`, `responsive`), each mapping 1:1 to a named Figma frame. The scene is a **projection**: it reads the view-model and renders; it never holds the source of truth. Both runtimes consume the *same* view-model so the DOM mirror and the canvas cannot drift.

**`incorrectSubmit` (CRIT-10).** This frozen state name is **reachable and live**: it is produced whenever a child activates `submit` on a composition that is not exact. It restates the signed difference as lengths (no X, no buzzer, 0 penalties); it is not a verdict on the child. It maps 1:1 to its `GAME-130`/`GAME-171` frame.

**Provenance (MIN-13).** The 1:1 mapping of the 20 state names to **named production frames** is a **`GAME-171` acceptance criterion `[required work]`**, verified against the Figma file — it is **not** an established fact. Only `GAME-130`'s state shell exists today.

### 3.2 Intent normalization
`normalizeInput` is the **single producer** of intents and collapses four physical input paths onto the identical bounded intent union: (1) drag/drop → drop on gap → `placePiece`; (2) tap-select then tap-gap → `placePiece`; (3) keyboard → arrows select, Enter places, focused remove/reset → same intents; (4) **`submit` / Check it** — a focusable control activated by Enter/Space (Esc still pauses), pointer/tap/keyboard, producing `submit` on any composition. Convergence is a tested invariant, not a convention. The renderer emits *only* these intents; presentation modules may not emit intents (§3.8).

### 3.3 Lifecycle / teardown
React owns the Phaser lifecycle (established by `GAME-131`): deterministic scene creation, resource disposal, and clean remount. Teardown must dispose textures/audio/tweens and cancel in-flight animation; a remount must not inherit stale observers. **The host signals route exit to the engine on the host-signal channel** so the session lifecycle (below) closes deterministically; teardown never mutates composition.

### 3.4 Stale-input protection and intent validation
Intents carry `sessionId`/`generation` (or an equivalent monotonic `seq`). Intents from a stale session/generation are **dropped, not applied**; a single-flight guard prevents rapid double-commit (`E-05`); tween-completion callbacks are ignored after remount. Dropped and duplicate intents are counted as non-PII telemetry (§11.1).

**Required fields per intent (MIN-9; frozen-contract gap → BB-CONTRACT-1).**

| Intent | Required | Optional |
|---|---|---|
| `selectPiece`, `placePiece`, `removePiece` | `pieceId`, `seq`, `sessionId`, `generation` | — |
| `reset`, `submit`, `continue`, `presentationComplete` | `seq`, `sessionId`, `generation` | — |
| `requestHint` | `seq`, `sessionId`, `generation` | `level` |

Until BB-CONTRACT-1 lands, the engine must treat a **missing required field as an unknown intent (fail closed)** and emit `invalid_intent_rejected` (§11.1).

**Dropped input is not silent (MAJ-17).** A dropped/ignored intent produces a non-blocking retry affordance after 500 ms ("Tap again") and `stale_intent_dropped` telemetry, so a live user never confuses a version skew with a broken game.

### 3.5 Asset pipeline
2D sprite atlases + vector/raster HUD, deterministic build, hashed artifacts, recorded provenance. No runtime GLB. Weight budget enforced in CI (§9). Any Blender-derived source follows §2.7 and `GAME-133`'s provenance AC.

### 3.6 Responsive scaling, DPR and hit areas `[UPDATED]`
- Breakpoints: phone `≤640`, tablet `641–1024`, desktop `≥1025` (matches the Figma `responsive` frame and Math Escape precedent).
- **Proportionality invariant + legibility floor (MAJ-18 / v1 row 9).** `widthPx = units × unitPx` exactly (≤1 px rounding error); one-unit g12 plank is **≥24 px and ≤48 px** on the smallest supported viewport; `unitPx` is derived from the viewport and applied in `withResize` on **layout only**; session state is unchanged by any resize. When the composed span exceeds the viewport width the bridge **pans as a unit and never scales below the floor**; the same pan-as-a-unit rule applies at 200 % zoom (only the bridge pans).
- **DPR policy (single, reconciled).** Device DPR **≤3 is supported**; the internal **render scale is capped at 2** to bound fill cost; visual parity is asserted at DPR 1/2/3. A DPR change re-lays out, never re-derives `units`.
- **Hit areas (MAJ-18).** Touch targets `≥48px` while visual plank width may remain true-to-length at `24px/unit`; hit-area expansion is capped at **≤±12 px beyond the visual bounds**, with a **nearest-centre priority rule** and deterministic tie-break by lower `slotIndex`; ≥8 px visual spacing between adjacent planks. The interactive hit area is decoupled from the visual geometry (the `BB-V2` lesson: a one-unit plank keeps a 48 px hit area without falsifying proportional length).
- Orientation change reflows without page reload; no horizontal overflow.

### 3.7 The DOM accessibility mirror — precise degraded-mode scope `[UPDATED]`

Stable `piece.id` values connect DOM semantic controls to Phaser sprites and hit targets. The DOM mirror exposes the named mirror facts **F1–F7** outside the canvas, with `aria-live` announcements (MAJ-5, MAJ-25):
- **F1** available pieces (label + units + denominator) · **F2** selected piece · **F3** exact current composition · **F4** required span · **F5** remaining/over amount (signed) · **F6** verdict · **F7** **remaining time + pause state**.
- Announcement cadence: polite at 60 s / 30 s / 10 s remaining and on pause/resume; the numeric value is always present in mirror text; **assertive is reserved for the break-return prompt**. Keyboard operation is complete (including `submit`/Check it, slot focus rendering the ghost preview and projected remaining span per MIN-16); reduced-motion and mute preserve all required information; color is never the sole carrier of state. Assertions are driven **from the DOM mirror, never from the canvas**, and `0 serious/critical axe` covers **DOM surfaces only**.

**What the DOM fallback CAN run (locked capability, MAJ-16):** a **complete round** — problem presentation, all four input paths, placement/removal/reset, `submit`/Check it, verdict feedback with the signed difference, round end/summary, and the earned-break return — keyboard-first and screen-reader-operable. On failover: **detection latency ≤1 s**, an in-place fallback panel, **one** announcement on entry, focus restoration to the mirror heading, then to the last focused control id if it still exists, otherwise the first tray control; **the round continues, it does not restart**. `renderer_init_failure` is emitted; the flag may be pinned to `dom`.

**What the DOM fallback CANNOT claim (precise, so the a11y mandate is not blurred):** it is **not evidence** for canvas/Phaser rendering, motion/game-feel, or experiential dimensions that require the canvas (`Q-06`, `Q-10`); it does not satisfy the **real-render lane** (§10.4) or visual-cohesion evidence; axe on it is not canvas evidence. It is a **production renderer during the dual-renderer period** (MAJ-14) with its own budget rows (§9.1) and its own a11y/exactness suite (§10.6) — not merely a fallback.

### 3.8 Authority-boundary hardening (normative) `[UPDATED]`
1. **Unit-based preview.** The placement preview, ghost slot and projected remaining span are drawn from engine unit data (`slots`, `offsetUnits`, `remainingUnits`); the renderer computes no lengths (§1.1(a)).
2. **Decorative layer cannot emit intents; it is seeded from engine output.** `normalizeInput` is the *only* producer of intents. The decorative/post-verdict layer (marker-load sag, landing response) reads `renderSeed` and `pieces − par` from the view-model, writes pixels only, is deterministic at a fixed seed across frame rates, DPR 1/2/3 and reduced motion (`sag = 0` under reduced motion), and its state is **not part of the authoritative view-model** (§1.1(b); MAJ-8).
3. **Snapping/magnet is presentation-only.** Visual offset ≤12 px, target slot = nearest engine-derived slot centre, deterministic tie-break; the invariance test (§10.1/§10.9) proves the verdict and legal-action set are unchanged under arbitrary `snapTolerancePx`, `unitPx` and DPR (§1.1(c); MAJ-7).

---

## 4. Data Model / Schema `[UPDATED]`

All lengths are **scaled integers**. `widthPx`/`offsetPx` are derived at the render boundary and **never** appear as input to the engine.

**`BridgeViewModel` (v1.1.0 — additive; authority semantics unchanged, BB-CONTRACT-1 / O-8):**
- `span{gapUnits, denominator, label}`
- **ordered, unit-based placement (MAJ-15):** `slots[{slotIndex, offsetUnits, pieceId?}]`, `openSlots[]`, `fillOrder[]` — never pixels; `placedComposition{units, label}` retained as the aggregate
- `pieces[]`, `pieceTray[]`, `selectedPieceId`, `focusedId`
- `remainingUnits`, `overUnits`, `verdict: fit | partial | overhang | overshoot`
- **`renderSeed`** (puzzle-derived, deterministic; MAJ-8)
- **session-deadline block (CRIT-6):** `session{mode: 'free' | 'break', capSeconds, capBridges, remainingMs (monotonic-derived), pauseBudgetRemainingMs, expired}` — additive field only
- `hints{level}`, `flags{reducedMotion, responsive, mute}`, `capabilities{canPlace, canRemove, canReset, canSubmit}`

**Intent union (closed, 8 members):** `selectPiece, placePiece, removePiece, reset, submit, requestHint, continue, presentationComplete`, each `{type, pieceId?, level?, seq, sessionId, generation}` with the required fields of §3.4. `submit` is first-class.

**Canonical verdict vocabulary (MIN-15, one table; all documents reference it, none restates enums):**

| Engine verdict | Presentation state name | Telemetry `result` value |
|---|---|---|
| `fit` | `exact` | `fit` |
| `partial` | `underfill` / `remainingSpan` | `partial` |
| `overhang` | `overfill` | `overhang` |
| `overshoot` | `overfill` (signed excess shown) | `overshoot` |
| `invalidSubmit` | `incorrectSubmit` | `invalid_submit` |

**Frozen-contract gap record (BB-CONTRACT-1, additive renderer contract v1.1.0 — O-8).** The following are additive field/validation additions with **no authority change**: the session-deadline block, `renderSeed`, ordered unit-based `slots`/`openSlots`/`fillOrder`, and per-intent required-field declarations with an unknown→fail-closed downgrade path. `GAME-135`'s AC carries the gap record plus the pre-revision behaviour for each. Creating this issue is **not** licence to change authority semantics: combine/split and physics-as-authority remain out of contract.

**Telemetry events** (§11.1; canonical table owned by the `GAME-105` epic text). **Storage:** session-scoped only (`sessionStorage` "beat your best", guarded, graceful no-op when blocked). **No accounts for kids; no child PII; free site persists nothing.** Rationale: the free-site posture (`N-5`) forbids persistence; the earned-break host supplies the bounded window; cross-visit records wait for family accounts (`G-07`).

No database is introduced. A game with single-player, session-scoped state on a static/edge Next.js deployment does not need one, and adding one would create a PII surface the product explicitly forbids.

---

## 5. API / Interface Design `[UPDATED]`

### 5.1 Renderer port (host ↔ Phaser)
```ts
interface BridgeRendererPort {
  mount(container: HTMLElement, initial: BridgeViewModel, opts: RendererOptions): void;
  applyViewModel(next: BridgeViewModel): void;          // authoritative state in (idempotent; renderer diffs)
  onIntent(cb: (i: BridgeIntent) => void): Unsubscribe;  // bounded intent out — the ONLY intent source
  setReducedMotion(on: boolean): void;
  setMuted(on: boolean): void;
  dispose(): void;                                       // teardown
}
```
`applyViewModel` is idempotent and safe to call on every engine tick. `RendererOptions` includes `dprCap`, breakpoint profile, quality tier and `snapTolerancePx` (**presentation-only**, §1.1(c)). The renderer performs **no** length arithmetic and emits **only** the eight frozen intents.

### 5.2 Host shell surface — published interface (MAJ-20, CRIT-8, MAJ-14)

The host-shell surface is now a **real interface**, not a sentence. **Ownership:** production *design* of every host surface = **`GAME-171`** (sole owner, extended AC; NG-09b withdrawn); the *runtime* contract, parity, containment and fault tests = **`GAME-135`**; **`GAME-133` is explicitly not an owner of shell surfaces.**

```ts
type GameMode = 'free' | 'break';

interface GameHostProps {
  mode: GameMode;                 // 'free' = /games timed round (Relaxed toggle available);
                                  // 'break' = earned break (fixed wall-clock window; Relaxed hidden)
  band?: Band;                    // supplied by teacher/parent-launched entry; else auto-band
  timeLimitMs: number;            // free: derived from ROUND_CAP_SECONDS / ROUND_CAP_BRIDGES; break: the fixed window
  pauseBudgetMs: number;          // free: 60_000 cumulative; break: 0 (wall-clock)
  seatContext?: SeatContext;      // lesson/seat context for parent-brief attribution; no child PII
  onExpire: (saveId: string) => Promise<void>;   // host persists the session-scoped save (break), or shows summary (free)
  onReturn: () => void;                          // host performs the return-to-practice transition
}

interface GameHostEvents {
  onSessionStart(info: { mode: GameMode; band: Band; source: 'hub' | 'lesson' | 'teacher' }): void;
  onRoundEnd(summary: RoundSummary): void;       // free site only; break has no summary
  onBreakExpired(payload: { saveId: string }): void;      // engine froze composition; host saved
  onReturnedToPractice(): void;                  // → break_flow{returnedToPractice:true}
  onExit(reason: 'route' | 'flag' | 'user'): void;
}
```

**Expiry handshake (CRIT-6, MAJ-20):** on deadline/expiry the **engine** freezes the composition and emits expiry → the **host** persists the session-scoped save (`onExpire(saveId)`) → the host shows **S4** (countdown + saved state + return) → the non-cancellable 3 s auto-return (or an early return tap) → `onReturnedToPractice` → `break_flow{returnedToPractice:true, endedReason, pausedMs}`.

**Failure behaviour:** if the break host is unavailable or the handshake fails, the game **fails closed to practice — never to free play**. **Teacher/parent-launched entry:** the unlock card is skipped, the band is supplied, the same window applies. The contract is **additive to `GAME-131`'s host adapter** and must remain compatible with the current-generation `GAME-36` contracts (§5.6).

### 5.3 Session lifecycle & one clock authority (CRIT-6) `[NEW]`

**Clock ownership: the engine.** The engine owns the round deadline and expiry on a **monotonic** source (an injected `Clock`; `performance.now()`-based in production, fake clock in test). The v1 formulation "the host owns the clock" is **removed**. The host supplies only:
- **visibility signals:** `visibilitychange` → `{hidden | visible}` (device sleep is treated as `hidden`);
- **route lifecycle:** `enter`/`exit`;
- **save-acknowledgement** for the save-at-expiry handshake.

These arrive on the **host-signal channel**, which is **not** the player-intent channel; the frozen 8-member intent union is unchanged.

```ts
interface EngineClockInput {
  type: 'visibility' | 'route' | 'save-ack';
  state?: 'hidden' | 'visible';
  at?: 'enter' | 'exit';
  saveId?: string;
}
interface Clock { nowMono(): number; }   // injected; performance.now() in prod, fake in test
```

**Wall-clock vs monotonic semantics (written once):**
- **Monotonic** = the injected monotonic source. It never jumps backwards on a system-clock change and is the basis for all deadline arithmetic.
- **Wall-clock** = elapsed real time with **no pause credit**. It is what the earned-break window is measured in; the implementation derives it from the same monotonic source **without applying pause credit**.
- **Free-site round:** deadline = `min(ROUND_CAP_SECONDS, ROUND_CAP_BRIDGES)`; `visibilitychange → hidden` **pauses** the round clock against a **cumulative pause budget of 60 s per round**. Once the budget is exhausted the round **ends at the next resume** and the summary is shown honestly.
- **Earned break:** the window is **wall-clock** — blur does **not** stop it, the pause budget is **0**, and the pause copy discloses this ("Paused — the break clock keeps running").

**Behaviour when a backgrounded tab crosses the boundary:**
- *Free site:* the round clock is paused while hidden, so the boundary is not crossed by hiding alone; on resume the engine compares monotonic elapsed (excluding credited pause, capped by the budget) against the remaining budget and, if the budget is exhausted, **expires deterministically** and shows the summary.
- *Earned break:* the deadline keeps running while hidden; on resume the engine compares monotonic elapsed (no pause credit) against the window and, if the deadline passed while hidden, **expires deterministically** — save-at-expiry → S4 → 3 s non-cancellable return. This is also the device-sleep path.

**Enforcement test (owned by `GAME-135`, §10.3):** fake-clock + visibility-change e2e + tamper case. A DOM string scan can prove nothing about a monotonic deadline (MIN-2); the DOM scan is retained only as a **secondary smoke check**.

### 5.4 Earned-break / return contract — wall-clock, non-extendable (CRIT-7) `[NEW]`

- **The break window is wall-clock and non-extendable.** No pause path extends it. `pauseBudgetMs = 0` in `break` mode.
- **The 3 s auto-return is non-cancellable and non-deferrable.** The visible "Back to practice" button returns **early** only; it cannot cancel, postpone or extend the return.
- **No extension affordance exists anywhere** in any surface or state: no control, copy, DOM mutation, query parameter or reload may restore a window.
- **Free-site return path:** free site → summary (Play again / Change level / All games); **earned break → S4 return only** (no summary, no Play again, no setup/Relaxed/free-build surface reachable). `Change level` returns to S0 preserving nothing and is **unavailable in the break** (W-11).
- **Countdown state sequence (MAJ-21, non-colour carriers):** ring visible from second 1, steady warm amber, never pulsing/flashing/ticking with sound; at **≤10 s** the state changes through non-colour carriers — the ring becomes **segmented** (one segment drops per second), the numeric remaining time becomes **visible text**, and copy switches to "Back to practice soon"; colour stays steady amber.
- `break_flow{unlocked, started, endedReason, pausedMs, returnedToPractice}` is the event proving the contract (§11.1).

### 5.5 Versioning, compatibility and fail-closed `[UPDATED]`

- `BRIDGE_VIEW_MODEL_VERSION` (now `1.1.0`) and the intent union are versioned. Unknown/malformed view-models or intents **fail closed** (ignored, not guessed), mirroring the Math Escape bridge discipline.
- **Compatibility policy (MAJ-17):** the host **pins the renderer bundle per session**; the renderer **refuses to mount** on a version mismatch and the host pins **`dom`** for that session. **Supported compatibility is same-version or same-major +1 additive**; a **major mismatch fails closed to `dom`**.
- **Version skew is observable:** `renderer_version_skew` is emitted; a dropped intent is not silent — the input is ignored and a non-blocking retry affordance appears after 500 ms ("Tap again") with `stale_intent_dropped` (§3.4). A fault test asserts the skew path (§10.8).

### 5.6 Compatibility with current-generation contracts
`GAME-135` requires telemetry/session/earned-break contracts to remain **compatible with the current-generation `GAME-36` contracts** — so the interfaces above are **additive, not a replacement**, and `GAME-135` carries a telemetry/privacy parity test against `GAME-36`.

---

## 6. Key Algorithms / Logic `[UPDATED]`

**Placement/verdict (authoritative, engine-side, unchanged):**
```
placePiece(pieceId):
  if not legalMove(pieceId) return unchanged
  composition += piece.units                       # integer
  remaining   = gapUnits - composition
  verdict     = composition == gapUnits ? fit
              : composition  < gapUnits ? partial
              : overhang                        # signed excess = -remaining; overshoot when excess > largest plank
  if verdict == fit: emit success; enable post-verdict crossing
```
The renderer only ever *displays* `remaining`, `overUnits` and `verdict` from the view-model. `fillOrder` and slot occupancy are **engine outputs**; the renderer may not invent them.

**Submit / Check it (first-class intent, CRIT-10):**
```
submit():
  if verdict == fit:      no-op            # an exact composition already auto-verdicts on placement
  else:
    emit submit_result{result:'invalid_submit', diff: composition - gapUnits}
    state = incorrectSubmit                # restates the signed difference as lengths
                                           # no X, no buzzer, 0 penalties, no judgement
```
`submit` changes **no** legality, scoring or composition; it only surfaces the already-computed difference. `incorrectSubmit` is therefore reachable on demand and is a first-class presentation state, not a deprecated one.

**Pointer → intent resolution (MAJ-7; presentation-only snapping):**
```
onPointerDrop(px):
  slotPx  = projectToPx(slots[].offsetUnits, unitPx)     # engine-derived slot geometry, in units → px
  target  = nearestSlotCentre(slotPx, px)                # deterministic; tie-break by lower slotIndex
  emit placePiece{ pieceId: selected, /* no length carried */ }
  # the visual magnet offset (<=12px) NEVER changes `target`; snapTolerancePx is presentation-only
```
This is a pure function of the layout, never of the verdict. Tested by the invariance test under varying `snapTolerancePx`, `unitPx` and DPR (§10.1, §10.9).

**Decorative post-verdict marker-load sag (presentation-only, seeded, removable — MAJ-8, MAJ-24):**
```
onCrossingStart(renderSeed, pieces, par):        # all inputs from the view-model
  eff = pieces - par
  sagY[plankIndex] = f(plankIndex, renderSeed) * clamp(eff, 0, k)   # pure, seeded, framerate-independent
  if reducedMotion: sagY = 0; skip tween; show final frame
```
It reads engine output and writes pixels only; it may **not** emit an intent, and its animation state is **not** in the authoritative view-model.

**Session deadline (engine-owned, CRIT-6):**
```
onClockTick(clock):
  if mode == 'free':
     if visible: elapsedActive += clock.delta
     else:       credited = min(clock.delta, pauseBudgetRemainingMs); elapsedActive += credited
                 pauseBudgetRemainingMs -= credited
     if elapsedActive >= timeLimitMs or bridgesBuilt >= capBridges: expire()
  else:  # break, wall-clock, no pause credit
     elapsedWall += clock.delta                          # continues while hidden
     if elapsedWall >= windowMs: freezeComposition(); expire()
```

**DPR/resize (unchanged):**
```
onResize(viewport, dpr):
  unitPx = computeUnitPx(viewport, band)            # clamped to the legibility floor (24..48 px/unit for g12 one-unit)
  renderScale = min(dpr, DPR_CAP)                   # DPR_CAP = 2
  layout.withResize(unitPx, renderScale)            # layout only; bridge pans as a unit if it exceeds the viewport
  # engine state untouched
```

---

## 7. Error Handling Strategy `[UPDATED]`

Each failure carries a severity per the canonical **P0–P3 taxonomy** (MIN-7, MAJ-19): **P0** authority leak, privacy/PII leak, or shipped incorrect-fit verdict; **P1** dropped input / unrecoverable round / broken return contract; **P2** copy, non-colour or state-contract violation; **P3** visual polish.

| Failure | Behaviour | Severity |
|---|---|---|
| Renderer init failure / scene crash | The React DOM mirror is the graceful-degradation path — the round remains playable keyboard/DOM-first (§3.7); `renderer_init_failure` is emitted (non-PII); the flag may be pinned to `dom`. | P1 |
| **Mid-round renderer failure** (crash, WebGL context loss, dynamic-chunk failure, asset 404) | In-place fallback panel; **the round continues, it does not restart**; detection ≤1 s; one announcement; focus restored (mirror heading → last focused id → first tray control). | P1 |
| Stale/duplicate input | Dropped by generation/seq guard; never applied; counted; non-blocking "Tap again" retry after 500 ms. | P1 |
| **Version skew** (renderer/host mismatch) | Renderer refuses to mount; host pins `dom`; `renderer_version_skew` emitted. | P1 |
| **Invalid intent** (missing required field / unknown type) | Fail closed; `invalid_intent_rejected` emitted. | P2 |
| **Hidden-tab boundary crossing** | Free site: bounded pause (60 s); budget exhausted → expire at resume with an honest summary. Break: wall-clock expiry → save-at-expiry → non-cancellable return. | P1 |
| Interrupted crossing animation / route exit | Crossing is post-verdict and non-authoritative, so interruption cannot corrupt state; route exit signalled to the engine on the host-signal channel; scene disposes deterministically. | P3 |
| Generator invariant violation (should never fire) | Fallback "New planks" refill + `invariant_violation` telemetry, **alerting-worthy** (>0/24 h → P0 owner alert, §11.1). | P0 |
| Storage blocked | Guarded read/write degrades to a no-op; "beat your best" silently disappears; no error shown to a child. | P3 |
| Audio unavailable/blocked | Visual parity carries all meaning; mute/unmute is idempotent. | P3 |
| Unknown view-model/intent version | Fail closed. | P1 |

User-facing errors stay child-safe and non-shaming; the structure explains failure (overhang + signed diff), never a red X or buzzer.

---

## 8. Security Considerations `[UPDATED]`

- **Never store or transmit:** child names, any account identifier on the free site, precise location, device fingerprints, or free-text that could carry PII. `validateEvent` PII guard is preserved on every event.
- **Storage:** session-scoped only, guarded, cleared on tab close; no cross-visit child persistence until family accounts ship (`G-07`).
- **Network:** no silent network I/O from the renderer; telemetry goes only through the host adapter.
- **Content-security posture (MIN-14, new):** CSP `script-src 'self'` (no third-party scripts, no inline `eval`), `frame-ancestors` restricted, **SRI/hash verification** for every CDN-delivered asset, **asset integrity hashes recorded in the build manifest**, and **no third-party analytics on the play surface**.
- **No ads, loot boxes, FOMO/loss framing, playtime leaderboards or child-vs-child competition** — these are hard-blocked product constraints (`GAME-105` out-of-scope), and the DOM/canvas must contain no copy that implies them. No countdown may present the timed surface as pressure (steady amber, no tick, no alarm).
- **Least privilege:** the renderer has no authority to mutate math; the DOM mirror has no authority to compute it; the host has no authority over the clock. This keeps a renderer compromise from producing false correctness.
- **No credentials in artifacts:** `GAME-143` requires Figma file identity recorded **without embedding access credentials or private tokens**; the per-asset provenance manifest is reviewed at Gate G.

---

## 9. Performance & Scaling `[UPDATED]`

**Load:** single learner, one active scene, session-scoped. **No horizontal scaling is needed** — this is a static/edge-served Next.js page with a client-side canvas; the honest scaling answer is "one user, no scaling problem." The real constraint is **mobile-Safari tab pressure and first-interaction time on a mid phone**, not server load.

### 9.1 Numeric budgets per supported device class (targets)

Device classes: **A — desktop** (mid-range laptop, Chrome/Edge/Safari); **B — tablet** (iPad-class Safari); **C — phone** (mid Android Chrome / iPhone Safari).
**Every value below is a target, not a measured fact.** `Status` is either a cited existing value or **`Ⓟ` proposed requiring ratification**; `Ratifier` names the single owner class — `GAME-135` for technical rows, `GAME-172` for experiential rows. Frame cost is expressed as an **interval percentile with a stated sample basis** (MIN-3), never a bare "fps" figure. This table is the **single canonical budget set**; the PRD and `Q-11`/`Q-14` reference it and do not restate values.

| Budget | A desktop | B tablet | C phone | Measurement | Status | Ratifier |
|---|---|---|---|---|---|---|
| First interactive (production build, warm CDN) | ≤ 2.0 s | ≤ 3.0 s | ≤ 3.5 s (good 4G) | Lighthouse/PerformanceObserver TTI on prod build | Ⓟ | GAME-135 |
| Frame time p95 (steady state) | ≤ 16.7 ms (60 fps) | ≤ 16.7 ms (60 fps) | ≤ 22 ms (≥45 fps floor, ≥30 fps absolute under rising FX) | frame-timing instrumentation (p95 over a ≥30 s steady-state sample) + Playwright trace | Ⓟ | GAME-135 |
| Long task | 0 tasks > 150 ms | 0 tasks > 150 ms | 0 tasks > 150 ms | Long Tasks API on the play route | Ⓟ | GAME-135 |
| Input→feedback latency | ≤ 50 ms | ≤ 80 ms | ≤ 100 ms | Playwright trace: pointer/key → next presented frame | Ⓟ | GAME-135 |
| Verdict feedback (place → visible result) | ≤ 150 ms | ≤ 150 ms | ≤ 200 ms | e2e trace on exact/over/under paths | Ⓟ | GAME-135 |
| Memory at interactive | ≤ 96 MB | ≤ 128 MB | ≤ 128 MB | CDP `Performance.getMetrics` / memory snapshot | Ⓟ | GAME-135 |
| Heap leak (2 consecutive rounds) | ≤ 15 % heap growth; 0 leaked listeners/timers after teardown | same | same | CDP snapshot before round 1 vs after round 2 with forced GC; lifecycle test | Ⓟ | GAME-135 |
| Game-route JS bundle (gzip delta) | ≤ 300 KB | ≤ 300 KB | ≤ 300 KB | CI bundle-size budget (build output) | Ⓟ | GAME-135 |
| Asset weight (first load) | ≤ 5 MB total; scene atlas ≤ 3 MB | same | same | build artifact hash + size check | Ⓟ | GAME-135 |
| Resize/orientation reflow | ≤ 16 ms, no reload | ≤ 16 ms | ≤ 24 ms | Playwright resize assertions | Ⓟ | GAME-135 |
| Scene remount / teardown | ≤ 250 ms, zero leak | ≤ 250 ms | ≤ 300 ms | lifecycle test + memory delta | Ⓟ | GAME-135 |
| **DOM-first / React path** (production renderer during the dual-renderer period) | first interactive ≤ 2.0 s; input→feedback ≤ 100 ms; memory ≤ 96 MB | ≤ 3.0 s; ≤ 100 ms; ≤ 128 MB | ≤ 3.5 s; ≤ 120 ms; ≤ 128 MB | Lighthouse + Playwright trace + CDP memory on the DOM-first lane | Ⓟ | GAME-135 |
| DOM-first bundle delta | ≤ 60 KB gzip | ≤ 60 KB | ≤ 60 KB | CI bundle-size budget | Ⓟ | GAME-135 |
| Hit-area / legibility floor (g12 one-unit plank) | 24–48 px | 24–48 px | 24–48 px | Playwright geometry assertion at the smallest supported viewport | Ⓟ | GAME-135 |
| Next-puzzle interactable (pacing) | ≤ 1.5 s on 100 % of transitions | same | same | Playwright transition trace | Ⓟ | GAME-172 (Q-10, experiential) |
| Crossing duration | ≤ 700 ms | ≤ 700 ms | ≤ 700 ms | Playwright trace | Ⓟ | GAME-172 (Q-10, experiential) |

### 9.2 Bottlenecks and mitigation
The two real risks are (a) **sprite/texture weight on first load** — mitigated by atlasing and the weight budget, and (b) **post-verdict VFX on low-end phones** — mitigated by a quality tier, effect caps, pausing rendering when the tab is hidden, and reduced-motion collapse. GPU fill cost at high DPR is bounded by the DPR cap (device DPR ≤3 supported, render scale capped at 2; §3.6). Passing repository TypeScript tests proves none of this; device-class qualification is `GAME-135` work.

---

## 10. Testing Strategy `[UPDATED]`

1. **Unit / property / golden exactness suites** — `GAME-129` fixtures are the backbone: exact/over/under, multiple valid solutions, representative curriculum families, scoring/hints/adaptivity. They must stay green under every input path and viewport (a hard AC of `GAME-134`/`GAME-135`). **Property test (real path, reworded per MIN-10):** identical intent sequences under varying `snapTolerancePx`, `unitPx ∈ {12,24,48}`, DPR and hit-layer geometry yield **identical placements and identical legal-action sets**; the verdict is invariant across `unitPx ∈ {12,24,48}` and arbitrary `snapTolerancePx`. The pure-function assertion is kept only as a cheap extra.
2. **View-model / renderer sync tests** — assert the scene consumes `BridgeViewModel` and emits only the closed intent union; assert all four input paths converge on identical intents/results; assert `submit`→`incorrectSubmit` reachability and that `submit` changes no composition.
3. **Session-deadline + return-contract enforcement (CRIT-6/CRIT-7, owned by `GAME-135`)** —
   - **fake-clock** unit/integration: injected `Clock`; assert expiry at exactly `min(ROUND_CAP_SECONDS, ROUND_CAP_BRIDGES)`; assert the free-site 60 s pause budget accounting; assert the break window has zero pause credit.
   - **visibility-change e2e:** CDP-driven page-hide (`Page.setWebLifecycleState` / visibility emulation) → advance the fake clock **past the boundary while hidden** → resume → assert (break) save-at-expiry + S4 + non-cancellable return and (free) expiry-at-next-resume with an honest summary; device sleep treated as hidden.
   - **tamper case:** no control, DOM mutation, query parameter or reload restores a window; 0 extension affordances. The DOM string scan is retained **only** as a secondary smoke check.
   - **containment:** from the break entry, no route/control/flag/parameter reaches setup, summary, "Play again"/"Change level", Relaxed or any free-build surface.
4. **Real Phaser render lane (`GAME-166`, reopened scope — not a new story)** — `GAME-166` documents the limitation honestly: **Phaser 4 performs WebGL/Canvas feature detection at module-evaluation time**, before test code or polyfills run; jsdom does not implement `HTMLCanvasElement.getContext`, so the import throws. This is a fundamental jsdom limitation, not a fixable mock gap. **The deliverable is not complete with the limitation documented.** The required lane: **(a) Playwright chromium with `--use-gl=swiftshader`** (software WebGL) driving the real scene, asserting a rendered frame and **failing when rendering breaks**; **(b)** node-canvas (native cairo/pango — complex on Windows) as a secondary lane. **Path (c) — the vitest alias-level canvas mock with a real Phaser import — is explicitly NON-EVIDENCE and must not be cited in any gate packet** (MIN-11). The lane runs in CI via CONSULTING-305 (§10.10) or under a dated owner waiver (O-4) (CRIT-9).
5. **Playwright journeys** — deterministic e2e covering representative g12/g34/g56/g78 problems, exact/over/under results, the `submit`/Check-it path, and at least one multiple-valid-solution case (`GAME-135` AC).
6. **Accessibility automation + manual** — axe automated scans *plus* manual keyboard and assistive-technology spot checks, **driven from the DOM mirror, never the canvas**; assertions cover F1–F7 incl. remaining time, the announcement cadence (60/30/10 s + pause/resume), reduced-motion, grayscale and 200 %-zoom. Automation does not substitute for the manual screen-reader pass (`GAME-39`'s T11 lesson); the manual VoiceOver/NVDA record carries a **named executor and date** or Gate D is recorded as blocked (O-7). A DOM-first a11y/exactness suite exercises the degraded mode.
7. **Device / responsive qualification** — phone/tablet/desktop perf, resize, background/resume, resource disposal, scene remount and DPR 1/2/3 parity against §9.1 budgets (`GAME-135`); physical phone/desktop interaction evidence (`GAME-172`).
8. **Fault tests** — stale/duplicate input, scene recreation, renderer-init failure, **mid-round failover (crash, WebGL context loss, dynamic-chunk failure, asset 404) with focus restoration and the announced fallback**, **version skew** with the `dom` pin and the "Tap again" retry affordance, route exit, interrupted crossing (`GAME-135` AC).
9. **Import-boundary test (enforcement for §1.1; `GAME-135` AC) `[UPDATED]`** — assert **no engine/session/exactness module imports Phaser, layout or `unitPx`**, and assert the **decorative/presentation layer cannot emit intents** (the intent channel has exactly one producer, `normalizeInput`). This is the enforcement mechanism for §1's refinement, not prose. **Referenced in GAME-135's AC** (CRIT-9).
10. **CI enforcement — a genuine cross-project gap.** The game e2e/a11y suites are **not in CI today**; tracked as **`CONSULTING-305`** (status Ready). **`CONSULTING-305` is extended to the next-generation suites**, with the explicit suite list: next-gen Playwright journeys; axe over the DOM mirror; the real-render swiftshader lane; bundle-size and frame-timing budgets; and the import-boundary test. **Do not create a second GAME story for CI** (locked: no duplicate ownership). **`GAME-135`'s DoD carries this extension** — either the suites enforce in CI or a **dated owner waiver (O-4)** is recorded; the recommendation is that exactness/a11y/import-boundary enforce before Gate F and the real-render lane may land after Gate F under the waiver.
11. **Authored-vs-executed provenance discipline** — every claim is labelled *authored* or *executed*, with the command/PR/CI run and the environment. No authored-but-unexecuted check is described as passing. Human gates (`GAME-39`, `GAME-172`) are never self-certified by automation.

---

## 11. Deployment / Operations (observability, rollout, rollback) `[UPDATED]`

### 11.1 Observability / telemetry contract
**One canonical event table is owned by the `GAME-105` epic text**; PRD and TECH reference it and do not restate it (MAJ-19). The current-generation schema is **retained**; the additive/lifecycle events are the renderer/host-rendered set:

- retained: `session_start{mode,band,source}`, `puzzle_start{skillId,puzzleId,gapValue,trayHash}`, `place_attempt{result: fit|partial|overhang|overshoot, diff, pieceValue, msSincePuzzleStart}`, `hint_shown{level,puzzleId}`, `puzzle_solved{piecesUsed,par,solveMs,hintLevelMax,constructionVector}`, `second_build{offered,accepted,solved}`, `streak_update{current,best}`, `session_end{bridgesBuilt,score,bestStreak,avgHints,coachingId,durationMs,summaryReached}`, `break_flow{unlocked,started,endedReason,pausedMs,returnedToPractice}`, `invariant_violation{where}`;
- added: **`submit_result{result: 'invalid_submit', diff}`** (CRIT-10), **`invalid_intent_rejected{reason}`** (MIN-9), `renderer_init`, `renderer_init_failure`, `renderer_remount`, `stale_intent_dropped`, **`renderer_version_skew`** (MAJ-17).

**Sink / retention / access:** the existing LevelBest telemetry sink used by current-generation work; client-side session scope; server-side **aggregates only, 30-day raw retention** `Ⓟ`; access = owner + engineering, no third parties.

**Alerts (MAJ-19, MIN-12):** `invariant_violation` **> 0 in any 24 h → owner alert (P0)**; `renderer_init_failure` **> 2 % of sessions in 1 h → alert + automatic pin to `dom`**. Thresholds, owner and escalation are recorded in the epic text. **Defect taxonomy (MIN-7):** P0 authority or privacy leak; P1 dropped input / broken round; P2 copy or state violation; P3 polish.

**Parent-brief semantics** — game minutes appear **inside** total time but itemized per game ("Bridge Builder — 4 min"), never merged into learning time; the learning-share metric must stay `≥80%` and the brief renders the split even if the gate fails (honesty over marketing). One curriculum line per session.

**Privacy/storage guards** — `validateEvent` PII guard on every event; session-scoped storage only; no accounts for kids; no silent network.

**Verification approach** — unit tests for schema and the PII guard; the parent-brief itemization test proving game minutes are excluded from learning share (`D-09`, already covered by the current-generation `GAME-48` tests); a `GAME-135` telemetry/privacy **parity** test against the `GAME-36` contracts; and runtime alerting on `invariant_violation`. Telemetry *meaning* is authored in TypeScript only — the renderer never invents events.

### 11.2 Release / cutover and rollback
- **Feature flag** with at least `dom | phaser` values (and a `phaser` percentage for staged rollout). Rollout is staged: internal → a small cohort → full, with DOM retained throughout.
- **Parity gate before retirement (MAJ-14):** the React DOM renderer **must not be retired** until **exactness, accessibility, telemetry/privacy, lifecycle and performance** parity are recorded (owned by `GAME-135`, evidenced by the parity suite) **and** `GAME-172`'s benchmark has no unresolved material `Below` on a `Q-01…Q-23` row. Passing automated correctness/performance tests is *not sufficient* while `GAME-172` remains unresolved.
- **DOM retention rule (O-6):** the React renderer is retained until `GAME-143` records the rollback point **and** one release cycle passes with no `renderer_init_failure` alert. Promotion to production is an explicit **owner release action tracked as a dependency** (outside `GAME-105`).
- **Tested rollback point:** the flag flip back to `dom`, exercised (not merely documented) — `GAME-135` requires the rollback procedure to be run, and `GAME-143` records the cutover commit/version and the rollback point.
- **Failure handling:** renderer-init failure or crash falls back to the DOM mirror automatically (or via the flag pin), with `renderer_init_failure` emitted; a child never loses the round **because** the mid-round failover fault test (§10.8) proves it.

### 11.3 Environment / operations
Static/edge Next.js deployment (Vercel); no server-side game logic; no database; assets content-hashed and cached; CSP/SRI per §8. Monitoring is the telemetry sink plus alerting on `invariant_violation` and `renderer_init_failure` rates with the thresholds above.

### 11.4 Operations scope note
A full SLO / error-budget programme and a crash-reporting owner are **out of this scope** (a static/edge page with session-scoped state has no service SLO surface); the operational controls that matter (invariant and renderer-init alerting) are in scope here. Revisit if play state ever renders server-side.

---

## 12. Trade-offs & Alternatives Considered `[UPDATED]`

- **Unity (`GAME-102`) — rejected** for Bridge Builder: adds a second runtime and WebGL build weight/startup for a 2D exact-composition game with no runtime-3D need; also risks the exact-math contract drifting into a second language. (Appropriate for Math Escape, which needs 3D.)
- **PixiJS (`GAME-104`) — rejected** here: viable but forfeits Phaser's scene/input/tween pipeline for no gain.
- **Keep React DOM only — rejected as the end state, retained as the parity baseline and fallback.** DOM/CSS cannot deliver the tactile construction feel the epic targets, but it is the safe rollback and the accessibility-adjacent mirror. The branch that would have **demoted** it to presentation-only is **rejected**: the locked accessibility requirement makes the non-canvas path mandatory (MAJ-16).
- **Physics-based correctness (Poly Bridge model) — rejected outright:** violates the educational authority rule. Physics is *presentation-only, post-verdict, deterministic, seeded, removable* (§1.1(b)).
- **Renderer-side snapping that selects a slot — rejected:** snapping/magnet distance is a locked forbidden correctness input; the assist is **visual-only** with a nearest-engine-slot-centre rule and an invariance test (MAJ-7).
- **Blender→GLB runtime pipeline — rejected:** no GLB consumer; would add build/provenance overhead for assets that must be flattened 2D (§2.7).
- **Canvas-only rendering — rejected:** would make Phaser the only way to understand the game, violating the accessibility mandate.
- **Float tolerance in placement — rejected:** the engine is scaled-integer with zero epsilon; float equality would create guessability exploits (`F-04`).
- **Deprecating `submit`/`incorrectSubmit` — rejected:** the union is frozen at eight members and `incorrectSubmit` is one of the 20 frozen state names mapped 1:1 to a Figma frame; deprecating it would change the frozen contract. `submit` is made first-class instead (CRIT-10).
- **Combine / split verbs — rejected (out of contract):** would change the legal-move set and re-version a frozen contract; a separate approved GAME issue would be required (`CRIT-2`; v1 non-goal).
- **Persisting progress server-side now — deferred:** blocked by the no-accounts-for-kids privacy posture (`G-07`); revisit only when family accounts ship.

---

## 13. Feasibility Risks (severity-tagged) `[UPDATED]`

Every row carries an **owner** (MIN-20).

| # | Risk | Severity | Owner | Why | Mitigation |
|---|---|---|---|---|---|
| R-1 | Engine/correctness drifts into Phaser over time | **BLOCKER if it occurs** | GAME-135 | The highest-severity failure mode; a "small" pixel-derived remaining-span computation silently breaks the educational contract | Import-boundary CI test (§10.9); unit-based preview rule (§1.1(a)); keep `GAME-129` fixtures green under all input paths; any math change requires a separate approved issue |
| R-2 | Real-render testing stays weak (jsdom cannot run Phaser) | **MAJOR** | GAME-166 | `GAME-166` documents the limitation; visual regressions remain undetectable without a real-render lane | Reopen `GAME-166`: Playwright chromium `--use-gl=swiftshader` lane that fails when rendering breaks; canvas-mock path marked non-evidence |
| R-3 | Game e2e/a11y suites are **not in CI** | **MAJOR** | GAME-135 (DoD) / CONSULTING-305 | Evidence is manual/local today, so parity and a11y regressions can merge unseen | `CONSULTING-305` extended to next-gen suites; the extension (or a dated waiver O-4) is a **`GAME-135` DoD** condition |
| R-4 | Accessibility parity regresses during migration | **MAJOR** | GAME-134 | Canvas migration can quietly break keyboard/SR/reduced-motion completeness | `GAME-134` qualification gate; mirror facts F1–F7 asserted from the DOM mirror; DOM mirror stays a full-capability production renderer |
| R-5 | Performance budgets unproven on low-end phones | **MAJOR** | GAME-135 | §9.1 numbers are targets; VFX/DPI can tank mobile frames | Quality tier, DPR cap (≤3 supported, render scale ≤2), effect caps, background render pause; device qualification; DOM fallback |
| R-6 | Experiential bar not reached (feel/framing) | **MAJOR** | GAME-172 | The competitive gap analysis identifies feel/framing as where Bridge Builder trails | `GAME-171` production art/motion; `GAME-172` scores the **canonical `Q-01…Q-23` dimension list** with bounded remediation; no cutover while a material `Below` is open |
| R-7 | Shared integration work becomes a hidden blocker | **MINOR** | GAME-147 | `GAME-147` (shared integration map, Backlog) could be mistaken for a hard gate | `GAME-147` explicitly allows bounded local/manual seams with a documented replacement boundary; do not duplicate tooling in `GAME` |
| R-8 | Blender scope creep | **MINOR** | Owner (O-5) / GAME-143 ADR | Optional source-art tooling could be inflated into a pipeline | §2.7 conditions; no runtime 3D/GLB; flip only on a recorded `Below` in world cohesion (evidence = GAME-172) |
| R-9 | History/claims drift (authored passed off as executed) | **MAJOR** (re-rated from MINOR; MIN-20) | GAME-143 (reconcile) / GAME-39, GAME-172 (human gates) | Benchmark/child evidence is human-gated and easy to overstate — in a run whose central rule is that fabrication is forbidden | Provenance discipline (§10.11); every `[existing]` cited or treated as `[required work]`; `GAME-143` reconciles; no authored-but-unexecuted check described as passing |
| R-10 | Cutover without a reversible path | **MINOR** | GAME-135 | Retiring DOM prematurely strands users if a fault appears | Feature flag, exercised rollback, DOM retained until parity + `GAME-172` clear and one clean cycle (O-6) |
| **R-11** | **Bounded-session breach** (blur/pause/extension path extends or avoids the locked window) | **MAJOR** | GAME-135 | The locked engagement constraint is the product's core policy and the v1 text had two leaking mechanisms | One monotonic authority (CRIT-6); wall-clock, non-extendable, non-cancellable return (CRIT-7); the session-deadline + tamper test (§10.3); containment test |
| **R-12** | **Retained-DOM divergence** (the production React renderer drifts from the Phaser path during the dual-renderer period) | **MAJOR** | GAME-135 | The dual-renderer period *is* the release plan; only one renderer having a quality bar makes "parity" unassertable at Gate F | DOM-first budget rows (§9.1), DOM-first a11y/exactness suite (§10.6), the parity criteria list (§11.2), lifecycle/fault tests |

### 13.1 Dependency context
- **`GAME-147`** (shared reusable game-integration dependency map, Backlog): governs the relationship to API/AIPORT work; reusable integration is a hard blocker only where implementation truly cannot proceed. Bounded local seams are acceptable with a documented replacement boundary.
- **`CONSULTING-305`** (add game + a11y e2e specs to CI, **Ready**, **extended to the next-generation suites**): the enforcement gap behind R-3. Cross-project dependency, not a `GAME` story; the extension is a `GAME-135` DoD condition.
- **Done, available:** `API-37` (Figma), `API-10` (Blender), `API-23` (Unity). **In Progress:** `AIPORT-193` (project-game-maker).
- **Consumers of this design:** `GAME-129/130/131` (Done, referenced), `GAME-132/133/134/135/143/171/172` (Backlog), `GAME-166` (Review — **reopened**, AC extended).

---

## 14. Implementation Sequence (dependency-ordered) `[UPDATED]`

```
GAME-171 (production Figma incl. host surfaces) ─┐  parallel
BB-CONTRACT-1 (renderer contract v1.1.0, additive) ─┤  parallel (O-8)
GAME-132 (vertical slice, Gate C) ──────┐          │
                                        ▼          │
        GAME-133 (full presentation migration)      │
                                        ▼
        GAME-134 (a11y / responsive / exactness, Gate D)
                                        ▼
        GAME-172 (benchmark Q-01…Q-23 + child/device, Gate E)
                                        ▼
        GAME-166 (real-render swiftshader lane, reopened)
                                        ▼
        GAME-135 (performance / parity / e2e / session+return enforcement /
                  import-boundary / rollout+rollback, Gate F)
                                        ▼
        GAME-143 (evidence, architecture docs, history reconciliation, Gate G)
                                        ▼
        controlled retirement of the React DOM renderer (one clean cycle, O-6)
```
Rationale: the vertical slice (`GAME-132`) must close critical architecture/a11y findings before scale-out; full migration (`GAME-133`) precedes a11y qualification (`GAME-134`); the experiential gate (`GAME-172`) must clear before the technical cutover gate (`GAME-135`), which itself gates documentation closeout (`GAME-143`). The **host-surface design deadline** ("before `GAME-133` closes") is recorded as a `GAME-171`/`GAME-133` sequencing condition in `GAME-105`'s text. `BB-CONTRACT-1` (additive v1.1.0) and `BB-CONTENT-1` (curriculum catalogue + supply floor) are sanctioned under O-8 and are prerequisites for the determinism/geometry ACs; declining `BB-CONTRACT-1` downgrades the CRIT-6/MAJ-8/MAJ-15/MIN-9 resolutions to recorded gaps. Deferrable to v2: any geometry/perimeter extension, cross-visit persistence, community/UGC, licensed/bespoke audio, and Blender-derived assets (all non-goals or conditions, none blocking).

---

## Coverage check vs existing Jira children `[UPDATED]`

**Ownership map (CRIT-8, CRIT-3).** The v1 verdict "no genuine GAME story gaps" is **replaced** with the honest map below.

| Area | Sole owner |
|---|---|
| Production design, **incl. host-shell surfaces** (`/games` hub card, S0 setup, S3 summary, S5 pause/settings, S4 earned-break countdown + saved state + return, S6 recovery/fallback) | **GAME-171** (extended AC; NG-09b withdrawn) |
| Presentation runtime (scene, feedback, crossing, environment, audio cues) | **GAME-133** |
| Accessibility / responsive touch / exactness qualification | **GAME-134** |
| Performance, exact parity, e2e, session+return enforcement, import-boundary, rollout + rollback | **GAME-135** |
| Real-render lane (Playwright chromium `--use-gl=swiftshader`) | **GAME-166** (reopened) |
| Benchmark (`Q-01…Q-23`) / child / device quality gate | **GAME-172** |
| Evidence, architecture docs, history reconciliation, Blender ADR, provenance manifest, rollback point | **GAME-143** |
| Current-generation benchmark record (kept distinct, never cited as Phaser evidence) | **GAME-39** |
| Renderer contract v1.1.0 additive revision (sanction O-8) | **BB-CONTRACT-1** |
| Curriculum catalogue of record + content-volume supply floor | **BB-CONTENT-1** |
| CI enforcement of the game e2e/a11y/next-gen suites | **CONSULTING-305** (cross-project; extended) |
| Shared integration dependency map | **GAME-147** (dependency only) |
| Educational goals, curriculum authority, personas, technology review, Blender determination, sequence | **epic text** on `GAME-105` |

**AC-edit list (the actions this design depends on):** `GAME-171` (host-surface clause + 1:1 frame mapping + countdown non-colour sequence + marker IP provenance + named design-QA owner); `GAME-133` (ordered unit-based slots, decorative-layer no-intent + `renderSeed` determinism, no host surfaces, no free-build states); `GAME-134` (per-SC WCAG 2.2 AA table, F1–F7 + cadence, DOM-mirror-driven assertions, keyboard `submit`, 48 px/nearest-centre, named AT executor); `GAME-135` (import-boundary test, placement invariance, session-deadline + tamper + containment, host-shell contract, failure/version-skew tests, DOM-first budget + suite, parity criteria, canonical telemetry, **CONSULTING-305 extension in DoD**); `GAME-166` (real-render lane, canvas-mock non-evidence); `GAME-172` (score exactly `Q-01…Q-23`, comparator registry table with access/licence check, sample minimums); `GAME-39` (current-generation-only label, reparent, named human gates).

| Requirement area | Covered by |
|---|---|
| Engine authority / exact-math preservation, verdicts, composition, equivalence, **session deadline + expiry** | **GAME-129** (Done); rule restated verbatim §1.1; deadline owned by **BB-CONTRACT-1** |
| Renderer/view-model + bounded intent contract (**`submit` first-class**) | **GAME-130** (Done); restated §1.1, §4 |
| Host adapter, input normalization, lifecycle, stale/duplicate protection, teardown | **GAME-131** (Done); host-signal channel added §5.3 |
| One-bridge vertical slice end-to-end | **GAME-132** |
| Full presentation migration, decorative layer rules, audio cues + provenance | **GAME-133** |
| Accessibility, semantic mirror **F1–F7**, touch/responsive, reduced-motion/mute/non-color, exactness under all input paths | **GAME-134** |
| Performance budgets, exact parity, e2e, fault tests, telemetry/privacy parity, **session/return enforcement**, **import-boundary**, **rollout + tested rollback**, DOM-retirement gate | **GAME-135** |
| Real Phaser render lane (**reopened**), documented jsdom limitation, non-evidence mock | **GAME-166** (Review → reopened) |
| Production Figma art direction, game-feel, responsive visual system, **host-shell surfaces** | **GAME-171** |
| Benchmark scored against the **comparator registry table** on the canonical **`Q-01…Q-23`** dimensions, child/device evidence, remediation | **GAME-172** |
| Durable architecture/evidence/history reconciliation, Blender ADR, provenance manifest, Figma identity without credentials | **GAME-143** |
| Current-generation benchmark record (kept distinct) | **GAME-39** (reparent to `GAME-105`) |
| Shared integration dependency map | **GAME-147** (dependency) |
| CI enforcement of game e2e/a11y/next-gen suites | **CONSULTING-305** (extended; cross-project dependency) |
| Rendering-contract additive revision v1.1.0 (deadline, `renderSeed`, ordered slots, required fields) | **BB-CONTRACT-1** (sanction O-8) |
| Curriculum catalogue of record + content-volume supply floor + `decoyHonesty` | **BB-CONTENT-1** (sanction O-8) |
| Educational goals / curriculum authority / target users / privacy-safety statement / technology review / Blender determination / sequence / coverage map | **epic text** on `GAME-105` — the jira-admin rewrite, not a story |

**Candidate areas tested and rejected as new stories (with reasoning):**
1. **Audio production as its own bounded story — rejected.** `GAME-133` owns audio inside presentation migration; audio-described parity belongs to `GAME-134`; mix ceiling/mute variants to `GAME-171`. A separate story would duplicate `GAME-133` coverage.
2. **A new CI story — rejected.** It is a real gap but already tracked cross-project as **`CONSULTING-305`** (now extended to next-gen suites); a `GAME` story would fork ownership of shared CI tooling.
3. **A new real-render story — rejected.** The lane is an **extended AC on the reopened `GAME-166`**; a new story would duplicate real-render infrastructure.
4. **Telemetry/privacy verification as its own story — rejected.** `GAME-135` carries telemetry/privacy parity as an AC; parent-brief itemization is already proven in current-generation work (`GAME-48`, `D-09`).
5. **Educational goals/curriculum statement as a story — rejected.** It is epic text, not implementable work. Content-volume sufficiency and `decoyHonesty` are carried by **BB-CONTENT-1**.

**Changes applied that are not new stories:** the **import-boundary test** (§10.9) is added to `GAME-135`'s fault/parity ACs; the **real-render lane** is added to the reopened `GAME-166`; the **host-surface clause** is added to `GAME-171`'s AC; the **`CONSULTING-305` extension** is added to `GAME-135`'s DoD. None adds net scope — each attaches already-recommended work to the child that owns the surrounding responsibility.
