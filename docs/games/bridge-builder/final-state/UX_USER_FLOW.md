# UX & User Flow — Bridge Builder (LevelBest, final state) — v2

**Role:** Designer (SDT pipeline, host-native) · **Run:** `bridge-builder-final-state-20260910` · **Supersedes:** `v1/UX_USER_FLOW.md`
**Builds on** locked `UX_DESIGN.md` (U-01…U-12, zero open blockers), `REQUIREMENTS.md`, and the adjudicated `v2/DECISIONS.md` (CRIT-1…12, MAJ-1…26, MIN-1…21, O-1…O-8). **Frozen authorities:** `RENDERER_BOUNDARY.md`, `PHASER_RENDERER_CONTRACT.md` v1.0.0 — the TypeScript core alone decides lengths, composition, legality, verdicts, scoring, progression, curriculum and the **session deadline**; the renderer presents view-models and emits only the closed **eight-member** intent union (`selectPiece, placePiece, removePiece, reset, submit, requestHint, continue, presentationComplete`).

**Artifact status.** Design intent/requirement text for work owned by **GAME-171** (`[required work]`). The only existing Figma artifact is GAME-130's state-contract file `nW0aDRqh6GNTj9ObJsKpYr` (20 labeled state shells, board `1:2`, polish explicitly unfinished). **No production world art, storyboards, responsive compositions, host-surface frames or child playtests exist or are claimed.** Everything below is required work. Areas that require a contract field the frozen v1.0.0 view-model does not carry (session deadline, `renderSeed`, ordered unit-based slots, per-intent required fields) are recorded as the bounded revision **BB-CONTRACT-1** under owner decision **O-8**; no authority semantics change.
**This document is not a diff.** It is the complete v2 UX spec; sections that changed from v1 are marked **[UPDATED]** and each change cites its finding ID in §0.

---

## 0. Revision note (v1 → v2) **[UPDATED]**

Authority: `v2/DECISIONS.md`. Load-bearing changes only (findings → where applied):

| # | Change | Finding IDs | Applied in |
|---|---|---|---|
| 1 | Accessibility target is **WCAG 2.2 AA**, assessed **per success criterion**; exceptions require normative evidence and an unmet applicable Level A/AA criterion prevents an AA claim; **Relaxed build** is the untimed accessibility path pending alternate-version verification; conformance statement **signed** by the owner-named signer | CRIT-4, CRIT-12, O-2, O-7 | §7, §7.1, §1, §11, §12 |
| 2 | **Return contract fixed:** the earned break is **wall-clock and non-extendable**; tab-blur does **not** create unbounded play (free site carries a **cumulative 60 s pause budget**, then the round ends honestly at resume); the **3 s auto-return is non-cancellable and non-deferrable**; "cancellable by one tap" **deleted**; no copy, control or state may offer more time | CRIT-6, CRIT-7, MIN-2, MIN-5 | §1, §2 (J2, cross-context), §3, §4, §9, §10 |
| 3 | **`submit` / `incorrectSubmit` made first-class:** a visible **Check it** control on S1, in the keyboard map and tab order, in the verdict vocabulary table, with `submit_result{result,diff}` telemetry and 0 penalties | CRIT-10, MIN-15 | §3, §4, §5, §5.4 |
| 4 | **Combine / split / decompose verbs removed** from the interaction model — they change the legal-move set and the frozen union; deferred to a **separate future approved contract revision** | CRIT-2 | §1, §5, §12 (DQ-5 closed), Coverage check |
| 5 | **One name, one availability matrix:** the only unclocked mode is **Relaxed build** (free-site only). The free-build shelf (retired names **"Workshop" / "Sandbox"**) is an **explicit non-goal**, unreachable from the earned break, with a containment **AC** (test, not a DOM scan). "Candidate" ambiguity removed | CRIT-1, MAJ-23, MIN-19 | §1, §2 (J4), §6, §12 (DQ-3 closed), Coverage check (GAP-2) |
| 6 | **GAME-171 is the sole owner** of production design, including the **host-shell surfaces** (hub card, setup, summary, pause/settings, earned-break countdown/return); **NG-09b withdrawn**; GAME-135 owns runtime contract/enforcement only; GAME-133 is **not** a shell owner | CRIT-8, GAP-1, MAJ-20 | §4, §11, §12 (DQ-1), Coverage check |
| 7 | GAP-2 (sandbox/free-build) **resolved** by the CRIT-1 decision — no open candidate remains | GAP-2 | §12, Coverage check |
| 8 | Hint thresholds are the **engine constants** (20 s no-progress **or** 3 failed placements; Relaxed 40 s / 6 Ⓟ) | MAJ-3 | §3 |
| 9 | Break countdown gains a **full non-colour state sequence** at ≤10 s (segment drop + numeric text + copy change); colour is never load-bearing | MAJ-21 | §2 (J2), §9, §11 |
| 10 | Second-construction card defined as a **non-blocking inline offer** whose 5 s is a **lifetime, not a gate**; never offered at round end or inside the break | MAJ-22 | §2 (J1.6), §9 |
| 11 | Crossing subject is an **abstract non-character load marker** (lantern cart / suspended crate) with IP provenance; "critter" removed | MAJ-24 | §2, §11 |
| 12 | Semantic mirror publishes **F1–F7** (F7 = remaining time + pause state) with a non-chatty announcement cadence | MAJ-5, MAJ-25, W-12 | §4, §7 |
| 13 | Edge-case severities map to **scorecard IDs / owning children** — they are local UX severity, not gating severity | MAJ-26 | §3 |
| 14 | **DOM-first degraded mode / mid-round failover UX** specified (budget, ≤1 s detection, focus restoration, in-place panel, round continues); dropped-intent retry affordance | MAJ-16, MAJ-17, W-1, W-2 | §3, §4, §7 |
| 15 | New summary/exit states: **0-bridge, 1-bridge, clock-ended-on-puzzle-1, no hint-free solve**; `Change level` semantics written once | W-10, W-11 | §2 (J1.7), §3, §6 |
| 16 | Keyboard/tap equivalents defined for `dragging` and `placementPreview` (no drag-only state) | MIN-16 | §5, §5.3 |
| 17 | Free-site storage posture and blocked-storage degradation stated (no UI difference implies a stated no-op) | REVIEW §6.15, MAJ-14 | §1, §3 |
| 18 | Composed-span pan/zoom rule + hit-area nearest-centre rule referenced from the UX side | MAJ-18, W-13 | §3, §4, §7 |

**Deferred / not applied in this document (with reason).** Band-specific session caps (O-3) — a lock supersession, not a UX edit; CI enforcement timing (O-4) — runtime, GAME-135 DoD; the additive contract fields this doc depends on (O-8 approved, BB-CONTRACT-1 sanctioned) — prose here, contract there; locale/number formatting (W-15) — en-US lock; licensed/bespoke audio (MAJ-12 deferred branch). Each is listed with its owner in §12.

---

## 1. Personas & contexts **[UPDATED]**

From `REQUIREMENTS.md` §A.2/§A.8; no new personas.

| Persona | Band | Goal | Frustration | Context |
|---|---|---|---|---|
| **Maya, 6** (G1) | g12 | "Make the bridge reach" | Reading; small targets | Parent's phone, portrait |
| **Dev, 8** (G3) | g34 | Beat his own score | Hidden rules | Tablet, sound on |
| **Lena, 11** (G5–6) | g56 | "Do the fraction ones" | Worksheet framing | Laptop, muted |
| **Omar, 13** (G7–8) | g78 | Progress that feels like a game | Boredom | Desktop, keyboard-first |
| **Parent/teacher** | — | "Learning or time-sink?" | Hidden minutes | Reads the brief, not the game |
| **Earned-break host** | — | Return the child on time | Overrun | In-app lesson flow |

### 1.1 One name, one availability matrix **[UPDATED]**

**Canonical names.** The only unclocked mode in v1 is **Relaxed build** — an in-session toggle (bridges-built progress, no clock, stuck threshold 40 s / 6 failed placements Ⓟ). The names **"Workshop"** and **"Sandbox"** are **retired**; they are recorded once as *"previously referred to as Workshop / Sandbox — retired names"* so historical references stay traceable (MIN-19). There is **no** endless free-build shelf in v1 (see §1.2).

| Surface | Session shape | Relaxed build | Summary | Second-construction offer | Pause behaviour | Stored state |
|---|---|---|---|---|---|---|
| **Free site** (`/games`) | Timed round: **90 s or 6 bridges, whichever first** (`ROUND_CAP_SECONDS = 90`, `ROUND_CAP_BRIDGES = 6`) | **Available** (in-session toggle on S0 and on S5 settings) | Reachable | Offered on ≤40 % of solvable puzzles | **Clock pauses** against a **cumulative 60 s budget per round**; exhausted → round ends at the next resume, summary shown honestly | **Session-scoped only.** Nothing saved across visits. Guarded `sessionStorage` for the optional beat-your-best chip; **graceful degradation when blocked** (feature simply absent, no error surface, no UI difference) |
| **Earned break** (Tier 1) | **Fixed 90 s wall-clock window** with a visible countdown back to practice | **Hidden** (window fixed by policy) | **Not reachable** | **Never offered** | **Clock does not stop.** Blur does not stop the deadline; the pause copy says so; an expired window returns the child to practice on resume | Session-scoped save-at-expiry handshake only (`onBreakExpired{saveId}`); no cross-visit progress |
| **Lesson / teacher entry** | Same fixed 90 s window; unlock card **skipped**; band supplied by the host | Hidden | Not reachable | Never offered | As earned break | As earned break |
| **Relaxed build** | Unclocked; **cap = 6 constructions**; progress shown as bridges-built; stuck threshold 40 s / 6 Ⓟ | — | Reachable (reframed to bridges/constructions) | Offered as in the timed round | No clock to pause; S5 settings only | Session-scoped only |
| **Free-build shelf** — retired "Workshop"/"Sandbox" | **Explicit non-goal.** No cap, no stored-state behaviour and no frames exist because the mode does not ship | — | — | — | — | — |

**Containment rule (locked).** *From the earned-break entry, no route, control, flag or URL parameter may reach **setup**, **summary**, **"Play again"/"Change level"**, **Relaxed build**, or any free-build surface.* **AC (GAME-135):** a **runtime containment test** — fake-clock + CDP page-hide + resume + tamper with DOM mutation, query parameters and reload — must fail if any such path exists. A visible-strings DOM scan is retained only as a secondary smoke check (CRIT-6). This is the enforcement of the availability matrix above, and it replaces the v1 assertion that the mode was merely "unowned".

### 1.2 Entry contexts **[UPDATED]**

1. **Free-site** — `/games` hub card → game route. Bounded **90 s or 6 bridges, whichever first**. Nothing saved. **Relaxed build** is surfaced on the hub card's secondary line and on S0, so the untimed accessibility path (§7.1) is discoverable without adult coaching; alternate-version conformance remains unverified.
2. **Earned-break (Tier 1)** — unlock card after a lesson block → **fixed 90 s wall-clock window with a visible countdown back to practice**. **Not extendible**; no continuation, pause-forever or "more time" affordance may exist in the DOM, in a flag or in a parameter.
3. **Relaxed** — toggle: no clock, bridges-built progress, stuck threshold 40 s / 6. **Free site only.**
4. **Free-build shelf** — **explicit non-goal**; retired names Workshop/Sandbox (§2 J4). *"An unbounded, unscored surface reachable from the earned-break host would breach the locked bounded-session constraint"* — this is why the mode is a non-goal, not a candidate (CRIT-1).

---

## 2. Core user journeys (screen/state flow) **[UPDATED]**

### J1 — Free-site happy path
1. **Hub (`/games`)** — card: "Drag planks into the gap so the bridge fits exactly. Build it your way." Tag `Building · Grades 1–8`. Primary *Play now*. Secondary line names the untimed accessibility path (§7.1), pending alternate-version verification. No interstitial, age gate or signup.
2. **S0 Setup** — four band cards with plain-language detail ("Fraction and decimal planks"), grades secondary; auto-band chip from assessment; session sentence *"90 seconds or 6 bridges — whichever comes first."* Controls: **Start** · *All games* · sound · **Relaxed build** (untimed accessibility path pending alternate-version verification).
3. **S1 Play, puzzle 1 (teaching round)** — no tutorial text; gap 5 with tray [2][3] plus oversized decoy [8] teaches by being nearly unfailable.
4. **Placement loop** — select → preview → commit → the structure visibly changes within 100 ms. Underfill leaves the gap open; overhang extends past the far cliff by exactly its excess, wobbles once, shows the diff chip, returns. Tray focus/selection renders the **same ghost preview** with the projected remaining span (MIN-16) — the preview is not a pointer-only state.
5. **Exact fit** — cliffs connect; `exact` → `success` → `crossing` (post-verdict FX only, subject = the abstract non-character **load marker**, §11); "+10" floats near the bridge, never centre-screen.
6. **Check it, any time (including a complete-looking composition)** — the child may press **Check it** (`submit`). A non-exact submit restates the difference as lengths (`incorrectSubmit`) and never reads as a verdict on the child; **0 penalties**; an exact composition **auto-verdicts on placement** and needs no submit (CRIT-10).
7. **Between puzzles (S2)** — no separate screen; the next bridge slides in after 900–1500 ms and is **immediately playable**. On ≤40 % of solvable puzzles a **non-blocking inline** *"Build it another way? +5"* card is anchored beside the HUD; the card is never modal, its **5 s auto-dismiss is its lifetime, not a gate**, the decline is as warm as the accept, and it is never re-offered on that puzzle. The `+5` and the offer rule live in the engine scoring table, not in the copy.
8. **S3 Summary** — headline, boxes (Bridges · Points · Best streak · Hints), deterministic coaching line, buttons *Play again · Change level · All games*, footer *"Nothing is saved — that's okay."* → clean exit to hub.
   - **Ended by the clock, not by leaving** — when the round ends because the cap was reached (including the pause-budget case), the headline is honest about *why*: *"Round over — here's what you built."* with a neutral reason line *"The clock kept going while you were away."* (pause-budget case only). Never "you ran out of time".
   - **0- and 1-bridge states** — *"You built 1 bridge."* / *"No bridges yet — want another go?"*; boxes render with zeros; **no shaming copy, no streak-loss warning** (W-10).
   - **No hint-free solve** — the coaching line states what to try next, deterministically from stats; it never names a deficit as a failing (W-10).

### J2 — Earned-break path **[UPDATED]**
1. Lesson block completes → **one** unlock card: *"Break time! Bridge Builder — 90 seconds."* One tap starts. (Teacher/parent-launched entry skips the card and supplies the band.)
2. Enter **S1 Play** directly (band from the learner signal; picker skipped). A **calm, steady warm-amber countdown ring** (never pulsing, never red, never ticking with sound) is visible from second one.
3. Play is as J1 except: the Relaxed toggle is **hidden** (window fixed by policy), stuck thresholds are generous, the **second-construction offer is never shown**, and the round cannot reach setup or summary.
4. **Tab-blur inside the break:** the window is **wall-clock** — blur does **not** stop the deadline. The pause overlay copy states this plainly: **"Paused — the break clock keeps running."** with the secondary line *"Back to practice at zero."* The ring keeps counting while paused. On resume, if the deadline passed while hidden, the engine **expires deterministically**: save-at-expiry → S4.
5. **Countdown state sequence (one spec, non-colour carriers)** — ring visible from second 1, steady warm amber; at **≤10 s** the state changes through **shape, text and copy**: the ring becomes **segmented** (one segment drops per second), the numeric remaining time becomes **visible text**, and the copy switches to **"Back to practice soon"**. Colour stays steady amber. No pulse, no flash, no ticking sound (MAJ-21).
6. At **0 s** the construction resolves instantly as **saved** — **"Saved! Back to practice."**, never "lost" — with a **non-cancellable, non-deferrable 3 s auto-return** and a visible **"Back to practice"** button that **only returns early**. It cannot cancel, postpone or extend. **No extension affordance exists anywhere.** Skipping practice to keep playing is structurally impossible.

### J3 — Relaxed path **[UPDATED]**
As J1 with no clock; the progress bar shows bridges-built; stuck threshold 40 s / 6 Ⓟ; summary reframed to bridges/constructions. Feedback semantics unchanged. **Free site only** — never reachable from the earned break. Round cap = **6 constructions** (`Relaxed` round definition). Storage: session-scoped, nothing saved.

### J4 — Free-build shelf (retired names "Workshop" / "Sandbox") — **explicit non-goal [UPDATED]**
**Resolved, not open.** The v1 "candidate" mode is an explicit v1 **non-goal** (see §13-equivalent statement in the epic text and the Coverage check, GAP-2). Rationale recorded once: it is owned by no child, is not evidenced as shipped anywhere in the repository ledger, and an unbounded unscored surface reachable from the earned-break host would breach the locked bounded-session constraint. **Consequences for this document:** no setup entry, no state families, no art, no summary rules and no frames for it are required or authorised; GAME-133 does not wait on it; any future reversal is a **new bounded story** with a cap and session-only storage, decided before GAME-133 closes to avoid art re-work.

### Cross-context rules **[UPDATED]**
- **Tab-blur on the free site pauses the clock** against a **cumulative pause budget of 60 s per round**; once the budget is exhausted the round ends at the next resume and the summary is shown honestly (J1.8). The pause overlay states the budget, e.g. **"Paused — the clock is waiting."** / *"Up to 60 seconds of pause."*
- **Tab-blur inside the earned break does not stop the deadline** (wall-clock); the pause overlay says so (J2.4); an expired window returns the child to practice on resume.
- **Device sleep is treated as hidden** on both surfaces, with the same per-surface rule and the same deterministic expiry comparison against the engine's monotonic deadline.
- **One clock authority:** the engine owns the round deadline on a monotonic source and owns expiry; the host supplies visibility/route lifecycle as engine *inputs* on a separate channel — not player intents, and the closed union is unchanged (CRIT-6).
- Mid-session exit on the free site skips the summary and saves nothing. Route exit or an interrupted `crossing` must never corrupt session state; the child must always see a clean, non-alarming state on return.
- **No extension affordance exists anywhere** — no control, copy, flag, parameter or reload may restore a window.

---

## 3. Edge cases, feedback & error states **[UPDATED]**

`Scorecard ID / owning child` maps each UX edge case to the scored dimension it proves (MAJ-26). The severity labels are **local UX severity**, not gating severity.

| Trigger | UX behaviour | Local severity if wrong | Scorecard ID / owning child |
|---|---|---|---|
| Overfill/overhang | Renders the exact excess; diff chip anchored **to the overhanging end** with a direction glyph ("2 too long"); piece returns; no X, buzzer or red | BLOCKER if read as judgement | `Q-05` (feedback clarity) / `Q-07` (recovery) |
| Underfill | Gap stays visibly open; remaining span stays labelled; no message needed | MAJOR | `Q-05` / `Q-09` |
| Submit while not exact (`incorrectSubmit`) | Restates the **exact signed difference** as information about lengths, never a verdict on the child; **0 penalties**; unlimited retries; no X, no buzzer | MAJOR | `Q-05` / `Q-07` |
| Stuck (**20 s with no legal progress OR 3 failed placements, whichever first**; Relaxed **40 s / 6** Ⓟ) | Hint ladder L1 (restate) → L2 (sparkle one valid piece) → L3 (dashed ghost slot); max L3; hints never cut score except the zero-hint bonus; streak unaffected | MAJOR | `Q-08` (hint ladder & thresholds) |
| 3 stuck puzzles in a row | Mid-session chip *"Try one level easier?"* — **suggestion only, at most once per round, never an automatic band change** | MINOR | `Q-08` / `Q-11` |
| Tray exhausted, no solution | Generator invariant forbids it; if it occurs, "New planks" refill + `invariant_violation` telemetry (P0 alert) | BLOCKER (no dead-ends) | `Q-03` / `Q-18` |
| Rapid double-placement | Single-flight commit; second input ignored, no flicker | MINOR | `Q-06` |
| **Tab hidden — free site** | Clock pauses on a **cumulative 60 s budget**; overlay shows the budget; exhausted → honest round end at resume; animations collapse to final state | MAJOR | `Q-11` (bounded session) / `Q-21` (return contract) |
| **Tab hidden — earned break** | **Wall-clock: the deadline keeps running**; overlay says *"Paused — the break clock keeps running."*; expired on resume → save-at-expiry → S4 | BLOCKER if the window can be extended | `Q-21` |
| **Dropped intent (version skew / malformed payload)** | Not silent: the input is ignored and a **non-blocking retry affordance appears after 500 ms** (*"Tap again"*); `stale_intent_dropped` telemetry; a major mismatch fails closed to `dom` | MAJOR | `Q-23` / GAME-135 fault tests |
| **Renderer failure mid-round** (crash, WebGL context loss, dynamic-chunk failure, asset 404) | **DOM-first degraded mode** takes over **in place**: semantic controls + labels + F1–F7, one announcement, detection ≤1 s, focus moves to the mirror heading then the last focused control id (else the first tray control). **The round continues; it does not restart.** | BLOCKER | `Q-12` / `Q-18` — GAME-135 fault test |
| 200 % zoom / large text | Single-column reflow; only the bridge scrolls/pans, **as one unit**, and **never scales below the ≥24 px legibility floor**; hit areas use the nearest-centre rule (≤±12 px expansion, tie-break by lower `slotIndex`) | BLOCKER if clipped | `Q-13` |
| Renderer init failure / no WebGL | **Fallback panel**: DOM-first presentation or honest "couldn't load — try again / All games". Never a blank canvas | BLOCKER | `Q-18` |
| Slow load | World skeleton + labelled pieces; no bare spinner, no fake progress | MAJOR | `Q-14` |
| Route exit / interrupted crossing | Deterministic recovery; no orphaned timer or half-committed composition; the engine deadline survives a route exit per the host contract | MAJOR | `Q-18` + GAME-135 fault test |
| **Session storage blocked** | No UI difference and no error surface; the beat-your-best chip is simply absent; the behaviour is a stated, tested no-op | MINOR | `Q-23` / `Q-19` |
| **0 / 1 bridge, or clock-ended on puzzle 1** | Honest, non-shaming summary states (J1.8); no zero-state that implies failure | MAJOR | `Q-05` / `Q-10` |

**Rule:** every state must be legible in a still frame — a screenshot must explain the situation without motion or audio. The still-frame check has a **named design-QA owner** as a GAME-171 acceptance criterion (W-16).

---

## 4. Screen / view inventory **[UPDATED]**

| Screen | Purpose | Key elements | Renderer | Design owner |
|---|---|---|---|---|
| **Hub card** (`/games`) | Discover | Title, blurb, tag, CSS icon, *Play now*, **secondary line naming the untimed path** | React/DOM | **GAME-171** (host-surface clause) |
| **S0 Setup** | Choose band; state session shape | 4 band cards, auto-band chip, session sentence, preview strip, Start/All games, sound + **Relaxed build** | React/DOM | **GAME-171** |
| **S1 Play** | Compose to exact fit | Status bar (score, timer/ring, Exit), progress bar, ≤8-word instruction zone, cliff-bridge span + open slot, tray, **Undo**, **Reset**, **Check it**, **hint sparkle** | Canvas + React/DOM | **GAME-171** |
| **S2 Second-construction card** | Optional transfer check | Non-blocking inline card, 2 buttons, 5 s **lifetime** | React/DOM | **GAME-171** |
| **S3 Summary** | Honest recap + next step | Headline (incl. 0/1/clock-ended states), 4 boxes, coaching line, 3 buttons, savings footer | React/DOM | **GAME-171** |
| **S4 Break countdown/return** | Return to practice | Countdown ring (segmented ≤10 s), numeric time, saved state, **"Back to practice" (early return only)**, **non-cancellable 3 s auto-return** | React/DOM | **GAME-171** |
| **S5 Paused / settings** | Recover from tab-blur; toggle sound/Relaxed | Per-surface overlay + exact copy (§10), Resume, settings toggles (Relaxed absent in break) | React/DOM | **GAME-171** |
| **S6 Recovery / fallback / DOM-first** | Never dead-end | Explanatory copy + retry/All games; **DOM-first degraded-mode panel** (semantic controls, F1–F7, one announcement, focus restoration) | React/DOM | **GAME-171** |
| **Semantic mirror** (SR-only) | Non-canvas parity | **F1** available pieces (label + units + denominator) · **F2** selected piece · **F3** exact composition · **F4** required span · **F5** remaining/over amount (signed) · **F6** verdict · **F7** remaining time + pause state — plus polite live regions | React/DOM | **GAME-171** + GAME-134 (qualification) |

**Every control is accounted for (nothing claimed but absent, nothing orphaned) — 8 frozen intents, one route each:**

| Intent | Player-facing route |
|---|---|
| `selectPiece` | Tap/click a tray piece · keyboard focus + Enter · pointer-down |
| `placePiece` | Drop on the gap · tap the gap after selecting · **Enter/Space on an empty focused slot** |
| `removePiece` | Tap a placed piece (the `removable` affordance) · **Enter/Space on a filled focused slot** · `Backspace`/`Delete` |
| `reset` | **Reset** control in S1 ("Start over"), keyboard-reachable |
| `submit` | **Check it** control in S1 — focusable, activated with Enter/Space |
| `requestHint` | Hint sparkle control |
| `continue` | The engine's advance signal: emitted by the S2 card's accept/decline, and by the **"Next bridge"** control that appears **only** when auto-advance is suppressed (reduced motion, or the clock is paused) and at the final puzzle ("See your bridges") |
| `presentationComplete` | **No player control — by design.** It is the renderer's acknowledgement that a non-blocking FX state finished; it is not a claimed control, so nothing is orphaned |

**Not in this inventory, and why.** No **combine / split / decompose** control exists — the verbs are out of contract (CRIT-2, §5.5). No **free-build shelf** screen exists — explicit non-goal (§1.2, §2 J4). No **share / waitlist** surface is designed in v1 (non-goal, MAJ-1). `Change level` is a control on S3/S0 only, never inside the break.

---

## 5. Interaction patterns — state coverage & input convergence **[UPDATED]**

### 5.1 The 20 presentation states (`BridgePresentationStateName`, stable 1:1 terms and Figma frame names)

None of the 20 is deprecated or legacy in v2. The only **retired/legacy labels** in this document are the mode names "Workshop" and "Sandbox" (§1.1), which are not presentation states.

| # | State name | Status | Reachable by | Screen |
|---|---|---|---|---|
| 1 | `span` | active | always (the missing span) | S1 |
| 2 | `pieces` | active | tray contents | S1 |
| 3 | `pieceTray` | active | always | S1 |
| 4 | `selected` | active | `selectPiece` (tap focus, keyboard focus) | S1 |
| 5 | `focused` | active | keyboard/AT focus | S1 |
| 6 | `dragging` | active — **pointer-visual shortcut only**; keyboard/tap equivalent is `placementPreview` on slot focus (MIN-16) | pointer drag | S1 |
| 7 | `placementPreview` | active — shown on **pointer hover, tap-select and keyboard slot-focus** alike | any input path | S1 |
| 8 | `placed` | active | `placePiece` | S1 |
| 9 | `removable` | active | focus/hover on a placed piece | S1 |
| 10 | `remainingSpan` | active | always while incomplete | S1 |
| 11 | `underfill` | active | verdict `partial` | S1 |
| 12 | `overfill` | active — presentation name of engine verdicts `overhang` **and** `overshoot` (= signed excess shown) | verdict `overhang`/`overshoot` | S1 |
| 13 | `exact` | active | verdict `fit` on placement | S1 |
| 14 | `incorrectSubmit` | active — **first-class and reachable** via **Check it** (`submit`) on a non-exact composition (CRIT-10) | `submit` | S1 |
| 15 | `success` | active | post-verdict | S1 |
| 16 | `crossing` | active — post-verdict FX, blocks no input | post-verdict | S1 |
| 17 | `environment` | active | always | S1 |
| 18 | `hints` | active | hint ladder L1–L3 | S1 |
| 19 | `reducedMotion` | active — variant of every animated state | OS/user preference | all |
| 20 | `responsive` | active — variant, phone/tablet/desktop | viewport | all |

**Canonical verdict vocabulary (one mapping table, referenced never restated — MIN-15):**

| Engine verdict | Presentation state | Telemetry `result` |
|---|---|---|
| `fit` | `exact` | `fit` |
| `partial` | `underfill` / `remainingSpan` | `partial` |
| `overhang` | `overfill` | `overhang` |
| `overshoot` | `overfill` (signed excess shown) | `overshoot` |
| `invalidSubmit` | `incorrectSubmit` | `invalid_submit` |

### 5.2 Piece-state visuals

| Piece state | Visual | Motion | Redundant cue |
|---|---|---|---|
| **idle** | Label (≥24 px mobile) + true proportional length + grain | — | label + length + texture |
| **hover/focus** | 3 px focus ring; slot outline solidifies | — | ring + outline |
| **selected** | Scale 1.05, raised shadow, persistent until committed | — | scale + outline + SR echo |
| **dragged** | Follows pointer 1:1; shadow grows; **purely visual magnet offset ≤12 px that never changes the target slot** (target = nearest engine-derived slot centre) | 1:1, no lag | offset |
| **preview** | Ghost at candidate slot, projected remaining span before commit — identical for pointer, tap and keyboard slot-focus | dashed, 50 % opacity | dashed = non-committed, not hit-tested |
| **placed** | Flush snap; label upright and readable | 80 ms settle | snap + thock |
| **removable** | Subtle lift affordance on placed pieces | — | affordance |
| **disabled/consumed** | Dimmed, out of tray; still enumerable in the mirror | — | opacity + strike (not colour alone) |

### 5.3 Verdict / feedback families

Distinguishable by geometry, label/pattern and motion, **never colour alone**:
- `exact` — cliffs close; the connection is the reward.
- `underfill` — open gap with the exact remaining span still visible.
- `overfill` — overhang of exactly the excess (engine verdicts *overhang*/*overshoot*) + anchored diff chip.
- `incorrectSubmit` — the same information about lengths as an overfill/underfill restatement, framed as a check, not a verdict; visually distinct from both, never an error style.
- **Multiple valid solutions** — never imply one canonical assembly: equal-value pieces share a visual family; the offer reads as optional; no frame renders a single "correct" arrangement as the target.
- **Remaining-span / difference** — a persistent, **exact number**; never a derived pixel approximation.
- **Error / recovery / hint** — L1/L2/L3 each with a distinct visual language; the ghost never hit-tests.

### 5.4 Input convergence (mandatory)

Pointer/drag, tap-tap and keyboard are three skins over **one intent set**, yielding identical engine results:
1. **Drag/drop** — pointer-down on a tray piece → drop on the gap → `placePiece`.
2. **Tap-tap** — tap to `selectPiece`, tap the gap to `placePiece`.
3. **Keyboard** — Tab/Shift+Tab cycle (**tray → slots → Undo → Reset → Check it → hints → Exit**), arrows move selection, Enter/Space place (or remove on an already-filled focused slot), `U` undo, `R` repeat last announcement, **Esc pause**. Tray focus order sorts ascending even when visual layout is shuffled (U-09). **Slot focus renders the same `placementPreview` ghost** as pointer hover, so no state is drag-only.

Any frame showing a state reachable by only one input path is incomplete. **Asserted under `Q-06`; the keyboard path must include `submit` / Check it, and the preview and remove states.**

### 5.5 Out-of-contract verbs **[UPDATED]**

**Combine, split and decompose are removed from the interaction model.** They are not polish — they change the legal-action set, require a contract re-version, engine legality/scoring changes, telemetry changes and a Figma re-scope, and PRD §4.1 requires a separate approved GAME issue for any change to legal actions. They are a **v1 non-goal**, deferred to a **separate future approved contract revision** (§12 DQ-5, closed as decided). No Figma frame, annotation or state name may show a merged plank, a split action or a "decompose" affordance.

---

## 6. Information architecture **[UPDATED]**

Session-scoped, three levels deep maximum: `/games` hub → **setup** → **play** (one puzzle at a time) → **summary** → hub. **Inside `play`**, a third level exists for **pause/settings (S5)** only.

The earned-break branch wraps its own host container around **`play` + `pause/settings` + `return`** and **cannot reach `setup`, `summary`, "Play again", "Change level", Relaxed build or any free-build surface**. It has **no** second-construction offer and **no** `Change level`.

`Change level` (S3, and S0 pre-round) **returns to S0 preserving nothing** and is **unavailable in the break**, which has no summary (W-11).

Inside `play`: **structure first** (the bridge is the primary content) → numeric truth (labels, remaining span, diff) → status (score, timer/ring, Check it) → controls. Score never occupies the centre of the visual field (U-01). Free-site storage is session-only; the parent brief consumes aggregates only. Cross-visit metrics are **not claimed** (MAJ-1).

---

## 7. Accessibility design requirements **[UPDATED]**

**Standard: WCAG 2.2 Level AA, asserted per success criterion** (not a blanket claim). The per-SC conformance table is the required artefact of **GAME-134**; the rows below are the criteria this UX specification produces evidence for. **No document may claim blanket AA.**

### 7.1 Per-success-criterion conformance statement **[UPDATED]**

| SC | Name | Status | UX-side evidence |
|---|---|---|---|
| 1.3.1 | Info and Relationships | met | DOM mirror exposes F1–F7 with real semantics driven from the mirror, never from the canvas |
| 1.4.1 | Use of Colour | met | Non-colour carriers on every state (§5.3); countdown state uses segments + numeric text + copy (§2 J2.5) |
| 1.4.3 / 1.4.11 | Contrast (Minimum) / Non-text Contrast | met | Contrast pairs recorded in Figma accessibility annotations (§11.6) |
| 2.1.1 / 2.1.2 | Keyboard / No Keyboard Trap | met | A full round is completable keyboard-only, including `submit`, remove and preview (§5.4); no traps; deterministic focus restoration |
| 2.1.4 | Character Key Shortcuts | met | Shortcuts are single-key (`U`, `R`, Esc) and remappable via AT conventions; no shortcut fires while focus is in a text field (none exists) |
| **2.2.1** | **Timing Adjustable** | **Evaluate against the normative criterion; no blanket claim** | The earned-break window and free-round cap are locked product constraints. If a WCAG exception is claimed, GAME-134 records the normative rationale and evidence; if the applicable criterion is not met, the product does not claim WCAG 2.2 AA conformance. **Relaxed build is the untimed accessibility path pending alternate-version verification** |
| **2.2.2** | **Pause, Stop, Hide** | **Evaluate against the normative criterion; no blanket claim** | The break countdown is wall-clock because it enforces the return contract; free-site blur pause is bounded at 60 s. Any exception must be substantiated in the per-SC table; if the applicable criterion is not met, the product does not claim WCAG 2.2 AA conformance. |
| 2.4.3 / 2.4.7 | Focus Order / Focus Visible | met | Order tray → slots → Undo → Reset → Check it → hints → Exit; 3 px ring; focus moves to the heading on phase change and returns to the invoking control when an overlay closes |
| 2.4.11 | Focus Not Obscured (Minimum) *(2.2)* | met | No sticky HUD element may overlap the focused control; overlays are non-modal or move focus into themselves |
| 2.4.13 | Focus Appearance *(2.2)* | met | 3 px focus ring with ≥3:1 contrast against both the ring's inner and outer surroundings |
| 2.5.8 | Target Size (Minimum) *(2.2)* | **met — exceeded** | The 48 px floor exceeds the 24 px minimum (§7 below) |
| 3.2.6 | Consistent Help *(2.2)* | met | The hint sparkle and the Exit/back control sit in the same relative position on every `play` surface (free, break, Relaxed, DOM-first) |
| 4.1.3 | Status Messages | met | `polite` live regions for placements/hints/phase changes; numeric remaining time always present in the mirror |

Rows that are **not applicable** to this surface (e.g. media alternatives, time-based media, dragging-only movements) are recorded as N/A in the GAME-134 table with the reason.

**Untimed accessibility path (named).** **Relaxed build** — the untimed mode on the free site — is disclosed for a player who cannot use a timed surface. It is surfaced on the S0 setup screen **and** in the hub card's secondary line so it is discoverable **without adult coaching**; the timed surface is not replaced by it, and it is not called a conforming alternate version until the full alternate-version requirements are independently verified.

**Signer (named vehicle).** The per-SC conformance statement is **signed by the owner-named accessibility signer** under owner decision **O-7**, and is recorded as a DoD condition in **GAME-105** and an AC artefact of **GAME-134**; under O-7(b) the epic cannot close. The **role** is fixed here (accessibility signer, accountable for the conformance table). The **individual** and the date are an owner decision and are **not invented in this document** (BRIEF §2.3). The same O-7 decision names the **manual VoiceOver/NVDA executor and date**, without which Gate D is formally recorded as blocked.

### 7.2 Design requirements **[UPDATED]**

- **Keyboard-complete:** every select, place, remove, reset, **submit (Check it)**, hint and continue works without a pointer; a full round is completable keyboard-only. The keyboard path must include `submit` (GAME-134 AC).
- **Focus order & restoration:** deterministic order (tray → slots → Undo → Reset → Check it → hints → Exit); roving tabindex within tray/slots; visible 3 px ring; focus moves to the heading on phase change and returns to the invoking control when an overlay/card closes; **no traps**. In DOM-first failover, focus moves to the mirror heading, then the last focused control id if it still exists, otherwise the first tray control.
- **Screen-reader semantics outside the canvas:** the DOM mirror exposes **F1–F7** — including **F7 (remaining time + pause state)** — with real semantics. `polite` live regions for placements/hints/phase changes; **assertive reserved for the break-return prompt only**. **Announcement cadence (non-chatty):** polite at **60 s, 30 s and 10 s remaining** and on **pause/resume**; the numeric value is always present in the mirror text. `R` repeats the last announcement (U-05).
- **Non-colour cues:** colour is never load-bearing; selected/valid/underfill/overfill/exact/`incorrectSubmit` each carry a shape, pattern, motion and/or numeric cue; the countdown's ≤10 s state change is carried by **segment drop + numeric text + copy**.
- **Reduced motion:** a `reducedMotion` variant for every animated state; crossing becomes an instant swap; wobble/particles/shake/sag collapse to one state change; **all mathematical feedback survives**; the **3 s auto-return behaves identically** (instant state change, no motion dependency).
- **Mute:** independent of reduced motion; every sound with gameplay meaning has a simultaneous visual/text equivalent. Audio mix ceiling and mute variants are GAME-171 variants.
- **Touch targets:** ≥48×48 px hit areas; tray pieces ≥56 px tall; ≥8 px spacing; hit-area expansion capped at ≤±12 px beyond the visual bounds with a **nearest-centre priority rule** (deterministic tie-break by lower `slotIndex`); no pixel-perfect dragging on phone/tablet.
- **Zoom / text scaling:** 200 % zoom and OS text scaling reflow without clipping or loss of function; **only the bridge pans, as one unit**, and it **never scales below the ≥24 px legibility floor**; a composed span narrower than the viewport never scales down to fit.
- **Pre-symbolic tier (G-11):** for g12, a dot-face plank rendering as a policy-controlled option, numerals always available as fallback. The g12 default is an open owner decision (DQ-4).
- **DOM-first degraded mode:** semantic controls + labels + F1–F7, one announcement on entry, detection latency ≤1 s, in-place panel, the round **continues** (never restarts) — MAJ-16.

---

## 8. Design principles **[UPDATED]**

1. **The structure is the feedback.** Every input produces a visible structural change within 100 ms; messages never substitute for the bridge changing.
2. **Math truth is the renderer's job to show, never to decide.** No frame, sprite or layout may encode correctness independently of the TypeScript core — including the decorative layer (crossing FX, sag) and magnet assist, both non-authoritative and visual-only.
3. **No failure framing, no pressure.** Errors are information about lengths; time is honest and bounded, never a threat.
4. **The return promise is honest.** The break window is wall-clock and ends; no control, copy or state may imply or offer more time.
5. **Three redundant channels.** Value, proportion and texture on every piece; label, geometry and motion on every state. Colour is decoration.
6. **One visual language across inputs.** Drag, tap-tap and keyboard converge on the same states and outcomes.
7. **No control claims a behaviour the contract forbids.** Every visible control maps to one of the eight frozen intents; nothing is claimed but absent, nothing is orphaned (§4).

---

## 9. Motion & feedback timing **[UPDATED]**

| Event | Duration | Constraint | Reduced-motion equivalent |
|---|---|---|---|
| Pick-up / select | ~120 ms | Non-blocking | Instant |
| Snap to slot | 80 ms | Non-blocking | Instant |
| Overhang wobble | ×1, ~200 ms | Then return; never repeats | Static overhang + chip |
| Gap close on `exact` | ≤300 ms | Reward, not a cutscene | Instant swap |
| Crossing | ~700 ms | Post-verdict FX (abstract load marker), blocks no input | Instant state change |
| Next puzzle | 900–1500 ms | Next puzzle **interactable** within the window; the diff chip must stay readable | 900 ms floor |
| **Break return** | **3 s auto-return, non-cancellable and non-deferrable** | The visible **"Back to practice"** button only returns **early**; it cannot cancel, postpone or extend | Same (instant state change) |
| Second-construction card | 5 s **lifetime**, not a gate | Non-blocking inline offer; next puzzle is playable immediately; never re-offered on that puzzle; **never shown at round end or inside the break** | Same |
| Break countdown state change | at ≤10 s | **Segments drop** one per second + **numeric text** appears + copy → *"Back to practice soon"*; colour stays steady amber; never pulses/flashes/ticks | Same (no pulsing in any variant) |
| Pause overlay (free site) | on `visibilitychange` | Clock pauses against the cumulative 60 s budget; resume restores | Same |
| Pause overlay (break) | on `visibilitychange` | **Clock does not pause**; overlay discloses it | Same |
| Dropped-intent retry affordance | appears after 500 ms | Non-blocking; does not move focus unexpectedly | Same |

**Pacing rules:** no motion may block the next placement; nothing exceeds ~1.5 s except the deliberate **non-cancellable** break return; the final 10 s of any countdown changes state through **non-colour carriers** but does **not** pulse, flash or tick with sound.

---

## 10. Copy & tone requirements **[UPDATED]**

**Exact copy required by the return contract (verbatim, non-negotiable):**

| Surface / state | Copy |
|---|---|
| Free-site pause (S5) | **"Paused — the clock is waiting."** · secondary: *"Up to 60 seconds of pause."* |
| Free-site pause budget exhausted → next resume | Round ends; summary headline **"Round over — here's what you built."** · reason line *"The clock kept going while you were away."* |
| Earned-break pause (S5) | **"Paused — the break clock keeps running."** · secondary: *"Back to practice at zero."* (the ring keeps counting) |
| Break countdown ≤10 s | **"Back to practice soon"** (with segmented ring + visible numeric time) |
| Break expiry (S4) | **"Saved! Back to practice."** (never "lost"); button **"Back to practice"** returns **early only** |
| Non-cancellable auto-return | No copy offers a way to stay; the button's accessible name is **"Back to practice"**, and no state exposes "Later", "Keep playing" or "More time" |
| S1 Check it | **"Check it"** — accessible name "Check your bridge"; non-exact result restates the signed difference as lengths, **0 penalties** |
| 0 / 1 bridge summary | **"No bridges yet — want another go?"** / **"You built 1 bridge."** |

**Rules:**
- **Child-facing:** ≤8 words visible at once on `play`; one verb, one goal, one agency statement; concrete content over grades ("Decimal planks", not "Grades 5–6").
- **No failure framing:** never X, wrong, lost, failed, or "you ran out of time". Overhang copy states the difference ("2 too long"); `incorrectSubmit` copy states lengths, never a verdict.
- **No manipulative urgency and no false promise of more time:** no countdown-as-threat, no streak-loss warnings, no "don't lose your progress", no fake scarcity, no re-engagement nags, and **no copy, button or state that implies the window can be paused, skipped or extended**. The break countdown is a *return promise* phrased as "Back to practice".
- **Neutral decline paths:** the second-construction decline is as warm as the accept.
- **Parent/trust surface:** itemised, non-marketing, honest about the split ("Bridge Builder — 4 min" *inside* total time); savings honesty on the free site. Coaching lines are deterministic from stats, teach, and never shame.
- **Banned on the break surface:** "pause", "resume", "later", "keep playing", "more time", "don't lose", "hurry" — the only time words permitted are the return promise and the honest disclosure in the S5 copy above.

---

## 11. Production Figma requirements — design intent for **GAME-171** (sole owner) **[UPDATED]**

**Required in the Figma source (refining GAME-130's file `nW0aDRqh6GNTj9ObJsKpYr`, not replacing it).** The host-surface clause is now **GAME-171's sole-owner deliverable** (CRIT-8); NG-09b is withdrawn and **no other child owns production design of these surfaces**.

1. **World / art direction** — canyon-construction theme, locked palette; **no characters** and no railway/train/villain motifs; nothing derived from comparators.
2. **Piece visual families** — plank, brace, x-beam/strut, dot-face and grouped-plank variants; each with readable length, label treatment and grain.
3. **State families** — one frame per `BridgePresentationStateName` in §5.1, named exactly (all 20), mapped 1:1 to GAME-130's names and labelled with the view-model terminology (`overfill` = the presentation name of the engine *overhang*/*overshoot* verdicts per the §5.1 mapping table). **This 1:1 mapping is a GAME-171 acceptance criterion verified against the file, not an asserted fact** (MIN-13).
4. **Host surfaces — the sole-owner clause.** Production design covers the **host surfaces as one coherent set**: `/games` hub card (incl. the secondary line naming the untimed path), **S0 setup** (band cards, auto-band chip, session sentence, preview strip, sound + Relaxed toggle), **S3 summary** (headline incl. 0/1/clock-ended states, boxes, coaching line, buttons, savings footer), **S5 pause/settings** (both pause copies per surface), **S4 earned-break countdown + saved state + return**, **S6 recovery/fallback + DOM-first panel**. **No frame may contain an extension, skip or "more time" affordance.** The countdown state sequence is specified with **non-colour carriers** (segment drop + numeric text + copy change at ≤10 s; steady warm amber; never pulsing/red/ticking). Every frame passes the still-frame legibility check with a **named design-QA owner**.
5. **Legibility states** — S1 must carry frames for **Check it** enabled/disabled/focused and its non-exact result, plus **Reset** and the **"Next bridge"** suppressed auto-advance control.
6. **Responsive compositions** — explicit phone / tablet / desktop frames, including portrait phone where the bridge is the only unit that pans (never scales below the floor).
7. **Interaction & motion storyboards** — drag, tap-tap and keyboard equivalence annotated on-canvas (including **slot-focus preview** and **filled-slot remove**); preview→commit; crossing/success; error/recovery/hint; `incorrectSubmit`.
8. **Accessibility annotations** — focus order per screen, live-region wording (F1–F7, cadence), touch-target boxes with the nearest-centre rule, contrast pairs, non-colour cue per state.
9. **Variant sets** — `reducedMotion`, mute and non-colour variants for every animated/semantic state; audio **mix ceiling and mute variants per cue** (GAME-133 implements the cue inventory).
10. **The crossing subject** — an **abstract non-character load marker** (e.g. lantern cart / suspended crate), asset listed with an **IP provenance requirement** (original asset, manifest entry, no comparator derivation).
11. **Loading / failure / fallback** — skeleton load, renderer-init failure panel, unsupported-device path, and the **DOM-first degraded panel**.
12. **Handoff map** — which states are Phaser-owned vs React/DOM-owned.

**Hard design rule:** *no Figma frame may encode mathematical correctness independently of the TypeScript core.* Lengths drawn in Figma are illustration; shipped values, verdicts, remaining span and the round deadline come from the engine and view model. Any Figma-side "correct answer" marking is documentation only and must be labelled as such.

---

## 12. Open design questions & owner decisions **[UPDATED]**

UX-authored questions are DQ-*; the spec-level owner decisions the decisions log assigns are **O-*** (owner decision, `v2/DECISIONS.md` §6). Neither list may be left with an unnamed owner.

| # | Question / decision | Owner | Recommendation / status | Severity |
|---|---|---|---|---|
| **DQ-1** | **Figma file ownership** — GAME-130's file sits under a View/Starter seat | Product owner + jira-admin (editor seat) | Assign an editor seat; record `nW0aDRqh6GNTj9ObJsKpYr` as canonical; do not fork. **Design ownership itself is resolved:** GAME-171 is the sole owner of all of it under the extended host-surface AC (CRIT-8) | Blocking for the deliverable |
| **DQ-2** | **Is Blender justified?** | **Product owner (O-5)**; flip evidence = GAME-172; ADR = GAME-143 | **Not justified** as a runtime or pipeline requirement; optional provenance-tracked source-art only, never implying runtime 3D (MIN-18 single-owner rule) | Minor |
| **DQ-3** | **Free-build / sandbox mode in scope?** (G-05, P2) | Product owner | **CLOSED as a non-goal** (CRIT-1, MAJ-23). The only unclocked mode is **Relaxed build** — free-site only, hidden in the break. Retired names: Workshop / Sandbox. GAP-2 is resolved by this decision | Closed |
| **DQ-4** | **Pre-symbolic dot-face tier** (G-11) default? | Owner-named **curriculum owner** + design, before GAME-171 piece-family sign-off | **Open.** Policy-controlled; set the g12 default with curriculum input, else `Q-13` is scored without the tier (§4 deferral) | Major for piece-family sign-off |
| **DQ-5** | **Decompose / combine verbs** (G-04, G-12) | Architect + product owner | **CLOSED as decided:** out of v1; out of contract; a separate future approved contract revision if ever added (CRIT-2). Not an open question | Closed |
| **DQ-6** | **Does audio need its own bounded story?** | Product owner | **CLOSED as decided: no.** Original synthesized WebAudio is the frozen final state; cue inventory in the epic text; runtime cues GAME-133, mix/mute GAME-171, audio-described parity GAME-134; **no residual "unless scoring is commissioned" conditional** (MAJ-12) | Closed |
| **O-2** | **Accessibility standard & exception set** | Product owner (with signer per O-7) | **Approved 2026-09-17:** target WCAG **2.2 AA** and assess per SC; substantiate exceptions; no blanket claim; **Relaxed build** is an untimed accessibility path pending alternate-version verification. **Needed before GAME-134 closes** | Blocks GAME-134 closure |
| **O-3** | **Session-cap variance** (one cap vs band-specific) | Product owner | **(a)** single engine constant 90 s / 6 bridges. **(b) would invalidate the "90 seconds or 6 bridges" copy and the break window** and requires a written lock supersession — this is why the copy may not be changed unilaterally | Blocks if (b) chosen |
| **O-4** | **CI enforcement timing vs Gate F** | Product owner + GAME-135 | **Approved 2026-09-17:** core suites and the real Phaser Chromium SwiftShader lane are green in CI before Gate F; a waiver may continue engineering but cannot close Gate F or authorize promotion. Owned by GAME-135 DoD | Blocks Gate F |
| **O-7** | **Human-gate owner/date + the accessibility signer** | Product owner | **(a)** name one accountable reviewer per gate with dates, **including the AA conformance signer and the manual VoiceOver/NVDA executor**. Under (b) Gates D/E stay blocked and GAME-105 cannot reach Done — the §7.1 signer is unnameable without it | Blocks closure |
| **O-8** | **Sanction of BB-CONTRACT-1 / BB-CONTENT-1** | Product owner | **Approved 2026-09-17:** both bounded follow-ups are sanctioned. They are not yet Jira issues or completed work; implementation and acceptance remain separate follow-up actions | No (sanction is not implementation) |

---

## Coverage check vs existing Jira children **[UPDATED]**

**Ownership of the host-shell/return-contract surface (v1 GAP-1) — resolved.** GAME-171 is the **single owner** of production design for the hub card, S0 setup, S3 summary, S5 pause/settings, S4 earned-break countdown/return and S6 recovery/fallback, by an **extended AC** (the host-surface clause in §11.4). **NG-09b is withdrawn.** GAME-135 keeps only *runtime* ownership (interface contract, parity, containment/fault tests) and owns **no design**. GAME-133 is explicitly **not** the owner of shell surfaces. (CRIT-8, MAJ-20.)

**Free-build / sandbox mode (v1 GAP-2) — resolved, not deferred.** The mode is an **explicit v1 non-goal** under the CRIT-1 decision (§1.1, §2 J4, §12 DQ-3). No child owns it and none is needed; if the owner ever reverses the non-goal it becomes a new bounded story with a cap and session-only storage. (CRIT-1, MAJ-23, MIN-19.)

**Decompose / combine verbs — out of scope by decision.** No child; deferred to a separate future approved contract revision (§5.5, §12 DQ-5). (CRIT-2.)

| Requirement area | Covered by |
|---|---|
| World art direction, theme, palette | **GAME-171** |
| Piece visual families; length/label readability | **GAME-171** + **GAME-133** |
| Piece/bridge interaction states (all 20 names) | **GAME-171** |
| Exact / underfill / overfill / `incorrectSubmit` feedback | **GAME-171** + **GAME-133** |
| Multiple-valid-solution presentation | **GAME-133** |
| Remaining-span / difference visualisation | **GAME-171** |
| Error / recovery / hint states | **GAME-171** + **GAME-133** |
| Crossing / success + motion intent (abstract load marker) | **GAME-133** + **GAME-171** |
| Canonical on-canvas journey (Gate C) | **GAME-132** then **GAME-133** |
| End-to-end screen/state flow (§2, §6) | **GAME-171** |
| **Host surfaces** — hub card, setup, summary, pause/settings, earned-break countdown/return, fallback | **GAME-171** *(sole owner; extended AC)* — design; **GAME-135** runtime contract + containment/fault tests |
| HUD, round progress, score treatment, **Check it**, Reset | **GAME-171** |
| Responsive phone/tablet/desktop compositions (pan-as-a-unit rule) | **GAME-171** + **GAME-134** |
| Keyboard / SR / non-colour / reduced-motion / mute parity (incl. submit path, preview/remove equivalents) | **GAME-134** + **GAME-171** |
| Semantic mirror F1–F7 + announcement cadence | **GAME-171** (design) + **GAME-134** (assertion) |
| Touch targets / non-precision operation / nearest-centre hit rule | **GAME-134** |
| Loading / failure / fallback / **DOM-first degraded mode** | **GAME-171** (design) + **GAME-135** (fault test) |
| Motion timing / pacing restraint | **GAME-171** |
| Return contract (wall-clock break, 60 s pause budget, non-cancellable return, containment) | **GAME-171** (frames/copy) + **GAME-135** (tests, `Q-21`) |
| Copy & tone; banned-pattern sweep; **no "more time" copy anywhere** | **GAME-171** + epic text (QA gate D-04) |
| Correctness excluded from design authority | **GAME-171** AC + **RENDERER_BOUNDARY** |
| Asset provenance / IP separation (incl. the load marker) | **GAME-171** + **GAME-172** |
| Design→shipped traceability | **GAME-135** |
| Free-build / sandbox exploration mode | **Explicit non-goal** (no child; CRIT-1) |

**Candidate areas — validated or rejected (unchanged unless noted).**

- **Audio production as its own bounded story — rejected (closed).** Runtime cues in **GAME-133**; mix ceiling + mute variants in **GAME-171**; cue inventory and per-cue provenance in the epic text; **no residual conditional** (MAJ-12, DQ-6 closed).
- **CI enforcement of the game e2e/a11y suites — already tracked, not a UX gap.** Owned cross-project by **CONSULTING-305**, **extended** to the next-gen suites; timing is O-4. The §7 assertions are GAME-134 qualification work.
- **Telemetry/privacy verification as its own story — rejected.** Privacy/parity is a **GAME-135** AC; §10 is unchanged.
- **Educational-goals/curriculum statement — epic text only** (GAME-105; content-volume supply floor and decoy honesty under BB-CONTENT-1). Not a UX child.
- **Pre-symbolic dot-face tier (G-11) — policy seam, not a story** (resolved by DQ-4).
- **Decompose/combine verbs (G-04, G-12) — out of contract** (§5.5, CRIT-2); a separate future approved contract revision if ever added.
- **Free-build shelf / sandbox (G-05) — explicit non-goal** (CRIT-1); no longer a candidate (GAP-2 resolved).

**Summary.** Final-state UX requirements are carried by **GAME-171** (sole design authority, now including the host surfaces), **GAME-133** (presentation runtime, explicitly not a shell owner) and **GAME-134** (accessibility/responsive/exactness qualification against WCAG 2.2 AA asserted per SC), with GAME-132 proving the journey first and GAME-135/GAME-143 closing runtime, cutover and traceability. **No ownership gap remains open:** v1 GAP-1 is resolved to GAME-171 by extended AC (NG-09b withdrawn); v1 GAP-2 is resolved as an explicit non-goal; combine/split is out of contract by decision.

### Not applied in this document (deferred, with owner)
| Item | Reason | Owner / vehicle |
|---|---|---|
| Band-specific session caps (e.g. g12 5 bridges / 75 s) | A written supersession of the locked 90 s / 6-bridge constraint, not a UX edit; it would also invalidate the shipped session copy | O-3 → product owner |
| CI enforcement timing for the next-gen suites | Runtime/DoD scope, not design | O-4 → GAME-135 DoD |
| Additive view-model fields the UX presents (`session deadline` block, `renderSeed`, ordered unit-based `slots`/`openSlots`/`fillOrder`, per-intent required fields) | Frozen-contract revision required; recorded as prose here, contract in sanctioned BB-CONTRACT-1 | O-8 → **BB-CONTRACT-1** |
| Locale-aware number/label formatting | Product locked to en-US; unused configuration surface today | REVIEW §4 W-15 (deferred) |
| Licensed / bespoke audio (commissioned scoring, licensed SFX, ambient bed) | Product deliberately does not make the expressiveness investment; no provenance/licensing owner exists | MAJ-12 deferred branch → GAME-172 `Below` + owner acceptance |
| Child-data review artefacts, SLO/error-budget programme | No PII/accounts/server-side child data in this build; operational controls in scope via MAJ-19 | REVIEW §4 W-6/W-7 → CONSULTING-182/268 |
