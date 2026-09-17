# Bridge Builder — UX Design Specification

**Companion to:** [`REQUIREMENTS.md`](REQUIREMENTS.md) · **Comparison bar:** Cyberchase: Railway Hero (mechanics-level only)
**Review contract:** evidence-backed findings model consistent with project-ux practice — every finding has ID, severity, evidence, and disposition; blockers must reach zero before epic assembly.
**Status:** Locked 2026-08-25. UX review pass U-01…U-12 completed; all blocker/major findings folded back into this spec and `REQUIREMENTS.md` (see §9).

---

## 1. Entry & discovery

**Hub card** (`/games`, same grid as shipped games):

> **Bridge Builder** — Drag planks into the gap so the bridge fits exactly. Build it your way.
> Tag: `Building · Grades 1–8` — icon: two cliffs with a plank (CSS-drawn, no asset dependency)

Discovery rules (child-first):
1. Card blurb is readable by a 6-year-old: one action verb ("drag"), one goal ("fits exactly"), one agency statement ("your way").
2. "Play now" is the primary button; no modal interstitials, no age gate, no signup wall (free site saves nothing).
3. First screen inside the game shows the *puzzle*, not instructions (see onboarding test below).

**In-app earned-break entry:** after a lesson block, a single unlock card appears in the break slot: "Break time! Bridge Builder — 90 seconds." One tap starts; countdown ring visible from the first second of play (calm, never flashing).

## 2. Onboarding-without-adult-coaching test

Design rule: **no text tutorial exists.** The first puzzle teaches everything by being nearly impossible to fail:

| Step | What the child sees | What teaches it |
|---|---|---|
| Puzzle 1 (g12) or band-appropriate opener | Gap labeled **5**, tray holds exactly [2] [3] plus one oversized decoy [8] | Only sensible act is placing pieces; any order solves it |
| Oversized decoy tried | Plank pokes past the far cliff, wobbles once, label "3 too long", returns | Cause → effect: too-long doesn't fit, and by how much |
| Exact fit | Cliffs connect, crossing animation, "+10" floats up | The win state is the structure closing, not a score popup |

Pass criteria for the coaching test (validated in prototype, see PROTOTYPE_NOTES §3): an adult must not speak during the first two puzzles; if any child tester asks "what do I do?" before puzzle 2 completes, onboarding fails and returns to design.

Microcopy budget: ≤ 8 words visible at once on the play screen. All persistent UI text also announced via ARIA (§7).

## 3. Screen-by-screen flows

### S0 Setup
- Band picker cards (same `subject-card` pattern as NLJ setup): four bands, each with plain-language detail ("Fill gaps up to 20", "Fraction and decimal planks", "Algebra beams").
- Auto-band chip when arriving from assessment/lessons later: "Your level: Grades 3–4 ✓" (still overridable).
- Session shape stated honestly: "90 seconds or 6 bridges — whichever comes first."
- Controls: Start (primary) · All games (link) · Sound on/off toggle · Reduced-pressure mode toggle (§8).

### S1 Playing
Layout (mobile portrait primary, desktop identical structure):

```
┌───────────────────────────────────────────┐
│ Bridge Builder · Score 30   ⏱ 64s   Exit │  ← status bar (demo-status)
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░                        │  ← progress bar
│                                           │
│   Gap needs 12                            │  ← ≤8-word instruction zone
│                                           │
│  ▛▀▀▀▜            ┌────┬────┬────┐  ▛▀▀▀▜ │
│  ▌CLIFF▐  ════════│ 4  │ 6  │ ?? │═══════▐ │  ← gap w/ placed pieces + open slot
│                   └────┴────┴────┘        │
│                                           │
│  TRAY  [3] [2] [5] [8] [1]                │  ← true-to-length pieces
│                                           │
│  [ Undo ]                    (hint ✨?)   │  ← controls row
└───────────────────────────────────────────┘
```

Interaction states (complete matrix):

| State | Visual | Audio | Motion |
|---|---|---|---|
| Tray piece idle | Value label, proportional length, soft shadow | — | — |
| Piece picked up | Scale 1.05, shadow grows | soft pick-up tick (optional) | follows pointer/finger 1:1 |
| Hover valid slot | Slot outline solidifies | — | — |
| Placed fit | Snaps flush, 80 ms settle | low wooden "thock" | none beyond snap |
| Partial fill | Fills left→right; remaining gap stays visibly open | same thock, shorter | — |
| Overhang | Piece extends past far cliff exactly its excess, wobble ×1, diff chip "2 too long" | muted double-knock (never alarm) | wobble then return |
| Exact fit | Gap closes; cliffs connect; crossing critter dot traverses | rising 3-note chime | 700 ms traverse; reduced-motion: instant swap |
| Streak ≥3 | Small flame badge near score | none | gentle pulse ×1 |
| Hint available | Sparkle icon appears (no nagging) | none | — |

### S2 Reveal / between puzzles
No separate screen for correct solves — the structure itself is the feedback; next puzzle slides in after 900–1500 ms (scaled to allow reading the diff chip when relevant). After ~40% of solvable puzzles: inline offer card "Build it another way? +5" with [Sure!] [Keep building]. Decline copy is neutral; card auto-dismisses in 5 s without penalty framing.

### S3 End-of-session summary
Same skeleton as NLJ summary (`brief-grid` cards + coaching line):

- Headline: "You built 5 bridges!"
- Brief boxes: Bridges built · Points · Best streak · Hints used
- Coaching line (deterministic, teaching never shaming), e.g. "You found different ways to make 12 — that's real number flexibility."
- Buttons: Play again · Change level · All games
- Free-site honesty footer: "Nothing is saved — that's okay."

### S4 Earned-break countdown & return
Countdown ring wraps the timer; final 10 s ring turns steady (not pulsing red). At 0 s: current construction auto-completes as "saved" with neutral copy "Saved! Back to practice." → one-tap return button + auto-return after 3 s. **No extension control exists anywhere in the DOM.**

### S5 Paused (tab-blur)
Full overlay: "Paused — take your time." Resume button. Timer frozen. No penalty, no lost-progress copy.

## 4. Immediate cause-and-effect feedback model

Every input produces a visible structural consequence within 100 ms:
- Placement attempts mutate the structure (fill / overhang render), never just a message.
- Numeric truth always accompanies spatial truth: piece values are printed on pieces; the gap total is printed on the gap; the diff chip prints exact excess.
- Errors are rendered as *information about lengths*, not judgment: no X icons, no buzzers, no red flashes. Overhang uses the same wood tones + motion language as success.
- Audio duplicates visual semantics at lower fidelity (§7) so neither channel is required alone.

This is the Railway-Hero benchmark behavior ("feedback directly from the structure") made explicit as an acceptance bar.

## 5. Hint ladder (UX presentation)

| Level | Presentation | Copy example |
|---|---|---|
| L1 | Text chip under gap | "Your planks make 9. The gap needs 12." |
| L2 | One tray piece gets sparkle outline | (no text needed) |
| L3 | Ghost plank appears in one valid slot, dashed outline | "Try here." |

Rules: hints appear only via the sparkle affordance (tap to accept) or automatically at the stuck threshold (25 s no progress / 3 failed placements); max L3; using hints never reduces points except forfeiting the +2 zero-hint bonus; streaks unaffected (per REQUIREMENTS S-02).

## 6. Keyboard, touch, targets

- Touch targets ≥ 48×48 px; tray pieces ≥ 56 px tall; spacing ≥ 8 px.
- Drag with 12 px magnet assist to slots; **two-step tap-select mode fully equivalent** (default for keyboard users; toggleable).
- Keyboard map: Tab cycle (tray → slots → Undo → Exit), Enter/Space place, Arrows move selection, U undo, R repeat-last-announcement, Esc pause overlay.
- Focus: visible 3 px focus ring on all interactives; focus managed to heading on phase change (NLJ precedent); roving tabindex within tray/slots; no traps (F-09 resolved).
- 200% browser zoom / OS magnification: layout reflows single-column; nothing requires horizontal scroll except the bridge itself, which scrolls as a unit (E-07).

## 7. Captions & audio cues

All audio optional and quiet by default OFF on free site? — No: **default ON at low volume**, master toggle in setup + persistent mute icon in status bar (Railway Hero parity). Independent levels deferred (N-7 scope).

| Cue | Sound | Caption/text equivalent |
|---|---|---|
| Pick up | short tick (300 Hz, 60 ms) | (visual: pickup scale) |
| Place fit | wooden thock | (visual: snap) |
| Overhang | double knock, low | Diff chip "2 too long" IS the caption |
| Solve | rising 3-note chime (C-E-G) | "+10" float + bridge closes |
| Streak | none | flame badge |
| Countdown last 10 s | none | ring state only (no ticking — anti-FOMO) |

SFX synthesis direction (GamineAI SFX-generator style brief): cartoon-modern, wood/marimba timbres, all < −18 LUFS relative to silence floor, no sudden transients > 6 dB above ambient. Captions policy: every sound with gameplay meaning has a simultaneous visual/text equivalent; no speech in v1 (no voiceover dependency).

ARIA live regions: polite announce for placement results, hint text, phase changes; assertive reserved for break-return prompt.

## 8. Untimed / reduced-pressure mode

Setup toggle "Relaxed build": removes session clock entirely; progress bar shows bridges-built instead of time; earned-break context hides the toggle (window is fixed by policy) but grants generous per-puzzle pacing (stuck threshold doubled). Color-independence, captions, and keyboard support apply identically in both modes. This exceeds the reference's untimed option by pairing it with the reduced stuck-threshold.

## 9. Evidence-backed UX review pass (findings register)

Method: spec walkthrough against project-ux-style finding model using three evidence sources — (a) heuristic audit of this spec's screens/states, (b) hands-on prototype iteration notes (PROTOTYPE_NOTES §3–4), (c) reference comparison vs Railway Hero documented behaviors (Perkins/WNET reviews: born-accessible features, auto-pause, repeat-audio key, untimed mode, multiple-solution prompts).

| ID | Severity | Finding (evidence) | Disposition |
|---|---|---|---|
| U-01 | Blocker → resolved | Original S1 draft had score popup center-screen stealing attention from structure (heuristic: feedback should come from structure, §4) | Moved score to floating chip near bridge; headline remains structure closure |
| U-02 | Blocker → resolved | Band picker used grade numbers only ("Grades 5–6") — meaningless to kids (coaching-test reasoning) | Detail lines describe concrete content ("Decimal planks"); grade kept as secondary microcopy for parents |
| U-03 | Major → resolved | Overhang diff chip had no position cue — kids couldn't tell *which* side overflowed | Chip anchors to the overhanging end of the piece; arrow glyph points along excess direction |
| U-04 | Major → resolved | Second-construction card risked feeling mandatory (F-01 echo in UI form) | 5 s auto-dismiss, decline copy neutral, never re-offered on same puzzle |
| U-05 | Major → resolved | Reference has R = repeat-audio key; our audio is optional so R was unspecified | R repeats last ARIA announcement incl. gap value + remaining (§6) — adopted |
| U-06 | Major → resolved | Tab-blur pause missing from v1 draft though reference ships off-task auto-pause (WNET review evidence) | S5 added; QA D-item added to EPIC story T6 |
| U-07 | Minor → resolved | Flame badge could read as fire/danger | Renamed visual to stacked-stones badge (construction metaphor); streak concept unchanged |
| U-08 | Minor → resolved | Setup screen showed both clock cap and bridge cap causing parent confusion | Single sentence format locked: "90 seconds or 6 bridges — whichever comes first." |
| U-09 | Minor → resolved | Tray order random each puzzle hurt keyboard predictability | Tray sorted ascending for focus order while preserving shuffled visual layout seed |
| U-10 | Minor → resolved | Ghost hint (L3) could be mistaken for a placed piece by low-vision users | Dashed outline + 50% opacity + "ghost" ARIA wording; never participates in hit-testing |
| U-11 | Major → resolved | No explicit reduced-pressure path for anxiety-prone kids despite accessibility criterion #7 | §8 Relaxed-build mode added; toggle lives in S0 |
| U-12 | Blocker → resolved | Countdown ring initially pulsed red in final 10 s (loss-aversion aesthetic, violates banned-pattern policy) | Steady ring, warm amber→neutral; no pulse, no red (S-06) |

Open blockers remaining: **zero.** Findings U-01…U-12 are reflected in §1–§8 above and in `REQUIREMENTS.md` Part C/D cross-references (S-01/S-02/S-06, QA additions).

## 10. Theme & art direction (feeds GamineAI Builder work)

- Palette: canyon slate `#3E4A5B`, sand `#E8D5A8`, plank cedar `#B5713F`, accent moss `#5C8A4E`, sky wash `#DCEBF5`; success states reuse moss, overhang reuses cedar (no semantic red anywhere).
- Typography: system stack, numerals oversized on pieces (≥ 24 px mobile).
- Pieces carry **value + length proportion + subtle grain pattern** — three redundant channels; color is never load-bearing (color-independence rule).
- No characters required for v1; the "crossing critter" is a 12 px glowing dot with trail (motion, not art).
