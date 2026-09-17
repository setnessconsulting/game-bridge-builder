# Bridge Builder — Competitive Gap Analysis

**Date:** 2026-08-25 · **Subject:** LevelBest Bridge Builder v1 (as shipped in `5efeb96`) vs five comparable games
**Method:** feature inventory of each comparable from primary/press sources (listed inline), then a dimension-by-dimension gap pass against our implemented behavior. Gaps are numbered (G-xx) and triaged P1/P2/P3 with a disposition (fix candidate / deliberate difference / already planned).

---

## The comparison set

| Game | Why it's comparable | Core mechanic overlap |
|---|---|---|
| **Cyberchase: Railway Hero** (PBS KIDS/WNET) | Our named quality bar | Lay track pieces to fill gaps exactly; multiple valid fills |
| **DragonBox Numbers** (Kahoot!) | Gold standard for number-bonds UX, ages 4–8 | Stack/slice/combine rod-characters ("Nooms") to build values |
| **Sushi Monster** (Scholastic) | Target-number composition with structured ladder | Feed the monster plates that sum to previewed targets |
| **Motion Math: Hungry Fish / Hungry Guppy** (i-Ready) | Tactile combine-to-target with adaptive difficulty | Drag bubbles together to compose the fish's number |
| **Bridge Constructor / Poly Bridge** | Namesake genre — sets player expectations for anything called "bridge builder" | Physics-built spans that must hold under load |

Sources: Perkins School for the Blind + WNET Education reviews (Railway Hero accessibility & structure); Kahoot!/Google Play + WeAreTeachers-style classroom reviews (DragonBox activities: Sandbox/Puzzle/Ladder/Run, Nooms 1–20); Scholastic App Store listing + Common Sense Media (Sushi Monster: 7 addition + 5 multiplication levels, 4 rounds each, 14 targets/round, targets previewed, replayable); Motion Math/i-Ready Learning Games pages (Hungry Fish/Guppy: dots→mixed→symbols ladder, adaptive up/down, combine-and-difference verbs); Poly Bridge/Bridge Constructor press (physics sag/stress, budgets, material unlocks, test-crossing payoff, sandbox).

---

## What we already beat them on (context, so the gap list stays honest)

- **Curriculum span:** CCSS-tagged grades 1–8 including equations with x, signed quantities, scale drawings, Pythagorean selection. None of the five goes beyond early-algebra territory.
- **Exactness + guaranteed solvability:** every puzzle property-tested to contain ≥1 exact solution; multi-solution supply asserted ≥45% on entry band. Sushi Monster/Motion Math validate by tolerance, not structural proof.
- **Honest reporting & hooks:** parent-brief itemization with learning-share gate; zero FOMO mechanics. None of the five exposes a learning-vs-play split to parents.
- **Accessibility floor:** keyboard-complete, ARIA-live parity, reduced-motion, relaxed/untimed mode, color-independence — matches or exceeds RH outside its audio-description track.

---

## Gap list

### vs Railway Hero

- **G-01 (P2) No audio-described / audio-first mode.** RH ships "born accessible" audio descriptions and an audio-only path for blind players. We have synthesized SFX + screen-reader announcements, but no spoken scene description and no non-visual way to *plan* a placement. → Fix candidate: narration track describing gap/pieces on demand (extends existing `R` repeat key).
- **G-02 (P1) No level map or journey structure.** RH has 15 named levels across cybersites; we rotate skills invisibly inside a 90 s round. Players can't see progress, revisit a favorite puzzle type, or feel "chapter" momentum. → Biggest emotional-experience gap across all five games. Fix candidate: lightweight chapter strip (skill-named stops) persisted per band.
- **G-03 (P3) Switch-access / external-keyboard certification.** RH was explicitly tested for motor-impaired play. Ours is keyboard-complete but uncertified. → QA item for T13 follow-up.

### vs DragonBox Numbers

- **G-04 (P1) Compose-only: no slicing/decomposing verb.** DragonBox teaches subtraction intuition by letting kids cut Nooms apart. Our pieces place whole; decomposition exists only as g78 signed shims, which behave as decoys (R-02). → Fix candidate: allow dragging a placed plank back off the bridge *through* an open slot to "snap" it into two smaller tray planks (decompose feedback), starting in g34 fraction bands.
- **G-05 (P2) No sandbox/explore mode.** Their Sandbox is where experimentation lives. Our relaxed mode removes the clock but keeps puzzle structure. → Candidate: free-build shelf (any gap, any pieces, nothing scored) reusing engine invariants.
- **G-06 (P3) Meta-reward is thin.** Their puzzles reveal hidden pictures; ours plays a crossing-dot animation. Acceptable per NLJ minimal-art precedent, but the weakest delight moment versus every comparable. → Candidate: canyon scenery that builds up per solved bridge (pure CSS, no character art).
- **G-07 (P2, partial-deliberate) No persistent profile/chapters.** Deliberate for free-site privacy posture; becomes a real gap the day family accounts ship (DragonBox retains chapter progress). Disposition: keep session-only now; design schema later.

### vs Sushi Monster

- **G-08 (P2) No round-level planning view.** Sushi previews all 14 targets so kids can plan plate order. Ours shows one gap at a time. → Candidate: "today's bridges" strip showing upcoming gap values (supports look-ahead strategy without changing generation).
- **G-09 (P2) Skill ladder invisible.** Their menu names Addition 1→7, Multiplication 1→5. Our four band cards hide the 14-skill map entirely; a kid can't choose "the x-beam ones." → Fix candidate: expand band cards into skill chips (still defaulting to rotation).
- **G-10 (P3) Equal-groups lacks visual grouping.** bb-mult-groups scores equal groups but renders identical single planks; Sushi's plates make grouping tangible. → Candidate: grouped-plank sprite variant (n×1 grid on the plank face).

### vs Motion Math Hungry Fish/Guppy

- **G-11 (P1) No pre-symbolic representation tier.** They ladder dots → mixed → symbols. Our g12 prints numerals immediately; counting ticks exist but no subitizing dot-face on planks. Directly affects persona Maya (6). → Fix candidate: dot-face toggle for g12 planks (configurable per skill policy — seam already supports it via `SkillGenPolicy`).
- **G-12 (P1) No combine-before-place verb.** Their core joy is merging two bubbles mid-air. Ours composes only in the slot row; you can't fuse 3+4 into a 7-plank then lay it. This is the biggest *verb vocabulary* gap. → Fix candidate: drop plank A onto plank B in tray → merge if both fit policy pool; pairs with G-04 decompose as the inverse move.
- **G-13 (P2, deliberate trade-off) Band locks per session.** Motion Math adapts up/down continuously; we lock band at start (red-team S-13: predictability > churn). Within-band micro-adjustment (piece pools widen/narrow after clean solves) would capture most of the benefit without band-hopping. → Candidate for T4 follow-up.
- *(Parity note)* Differences/integers: Hungry Fish includes negative bubbles; our signed-shim work is g78-only and currently inert (R-02) — same gap family as G-04.

### vs Bridge Constructor / Poly Bridge

- **G-14 (P1) The name promises physics the game doesn't attempt.** In the namesake genre the payoff moment is *watching your structure hold or fail*. Our crossing is a cosmetic dot glide; planks never sag, flex, or shed stress. Kids arriving from that genre will feel the bait-and-switch within one round. → Highest-leverage juice fix: critter-weight sag proportional to (pieces − par), edge shimmer on the last plank, slight camera dip on landing. No true physics engine required.
- **G-15 (P2) No build-quality economy.** They score budgets/materials; our scoring ignores construction elegance beyond hints. → Candidate: ★ ratings for ≤par pieces and for using a second distinct construction (already tracked — surface as stars, not just points).
- **G-16 (P3, deliberate non-goal) Sandbox creation/community sharing.** Out of scope per GAMES_PLAN non-goals (no UGC, no accounts). Revisit post-accounts.

---

## Priority matrix (gap → impact → effort → destination)

| Priority | Gaps | Theme |
|---|---|---|
| **P1 — next epic candidates** | G-02 journey map · G-04 decompose verb · G-11 dot-face tier · G-12 combine-before-place · G-14 structural juice | "Make it feel like building, and show me a journey" |
| **P2 — polish wave** | G-01 narration track · G-05 sandbox shelf · G-08 target preview strip · G-09 visible skill chips · G-13 micro-adaptivity · G-15 star economy | Depth + planning + reach |
| **P3 / gated** | G-03 switch certification · G-06 scenery meta-reward · G-07 account progress (needs accounts) · G-10 group sprites · G-16 UGC (non-goal) | Later or deliberate |

Already-planned tails that partially cover gaps: R-01/T7 (break flow), T13 (hands-on benchmark may re-prioritize this list), R-02 (shim decision feeds G-04/G-12 design).

---

## Bottom line

Our differentiators (exact-fit rigor, g1–8 span, honest reporting, accessibility floor) hold up against every comparable. Where we trail is **feel and framing**: no journey map, no manipulable verbs beyond place-and-remove, no pre-symbolic tier, and a title that invokes physics we deliberately don't simulate. All five P1 gaps are achievable with the existing engine seams (skill policies, payload flags, effect layers) and none require abandoning the no-dark-patterns or privacy posture.
