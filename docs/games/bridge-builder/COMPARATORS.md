# Bridge Builder — Comparator Game Registry

**Purpose:** durable reference pack so any future designer/agent can re-run a hands-on comparison against the games that shaped Bridge Builder without re-researching them. Pair with [`COMPETITIVE_GAP_ANALYSIS.md`](COMPETITIVE_GAP_ANALYSIS.md) (16 gaps, P1–P3 triage) and the 9-criterion bar in [`../../GAMES_PLAN.md`](../../GAMES_PLAN.md).
**Registered:** 2026-08-25 · Sources accessed via live web research on this date.

---

## How to run a future comparison

1. Play each comparator **and** Bridge Builder on the same day (fresh eyes matter more than order).
2. Score all 9 GAMES_PLAN criteria 0–2 (below / meets / exceeds) with one-line evidence each.
3. Walk the per-game "benchmark checklist" below — these are the specific behaviors worth stealing or beating.
4. Re-read [`UI_TEST_FINDINGS.md`](UI_TEST_FINDINGS.md) first so already-fixed defects aren't re-reported.
5. Record verdicts in `SPRINT_READINESS.md` addendum and open remediation loops for anything scoring below the reference.
6. IP rule stays absolute: mechanics-level inspiration only — no names, art, audio, characters, levels, or story.

---

## 1. Cyberchase: Railway Hero — the named quality bar

- **Play:** https://pbskids.org/games/play/railway-hero/ (free, browser + PBS KIDS Games app)
- **Ages:** 6–8 · **Structure:** 15 levels across cybersites; must complete sequentially
- **Pedagogy:** fill stolen track gaps with piece lengths that sum exactly; multiple valid fills encouraged; addition strategies (doubling, plus-one, largest-first) are coached by grown-up prompts on PBS Parents
- **Benchmark checklist**
  - [ ] Born-accessible suite: audio descriptions, audio-only mode, captions, adjustable volumes, color/contrast/text-size controls
  - [ ] Keyboard commands incl. **R = repeat directions**; auto-pause when off-task
  - [ ] Untimed play toggle
  - [ ] Multiple-solution prompting ("two tracks plus three… or one plus four")
- **Our standing:** parity on untimed/auto-pause/repeat/multi-solution; **gap remains G-01** (spoken scene descriptions), G-02 (level map).

## 2. Kahoot! Numbers by DragonBox — number-bonds gold standard

- **Play:** iOS/Android via Kahoot!+ Family subscription (formerly standalone award-winner 2020–21)
- **Ages:** 4–8 · **Numbers 1–20**
- **Pedagogy:** Nooms are rod-characters kids **stack, slice, combine, sort, compare**; four activities — Sandbox (free explore), Puzzle (compose pieces to reveal hidden pictures), Ladder (strategic building up), Run (quick mental math down a path)
- **Benchmark checklist**
  - [ ] Zero-instruction onboarding: every mechanic taught by level design alone
  - [ ] Decompose verb (slicing) as prominent as compose
  - [ ] Hidden-picture meta-reward on puzzle completion
  - [ ] Sequenced chapters where each level presumes the last
- **Our standing:** zero-text onboarding ✅; **gaps remain G-04** (slice/decompose — partially shipped via Split), **G-05** (sandbox shipped ✅ as Workshop), G-06 (lanterns shipped, thinner than picture reveal).

## 3. Sushi Monster (Scholastic) — structured target-composition ladder

- **Play:** iOS App Store (free)
- **Ages:** 8–12 typical · **Structure:** 7 addition levels + 5 multiplication levels × 4 rounds × **14 previewed targets** per round; rounds replayable with fresh numbers
- **Pedagogy:** pick plate-numbers summing to the monster's current target; targets visible in advance so players plan multi-step orders; timed pressure optional per player
- **Benchmark checklist**
  - [ ] Round-level target preview enabling planning
  - [ ] Named difficulty ladder visible in menu (Addition 1→7…)
  - [ ] Replay-with-new-numbers freshness
  - [ ] Equal-group visuals for multiplication tiers
- **Our standing:** replay ✅, relaxed mode ✅; **gaps remain G-08** (preview strip shipped ✅), G-09 (skill chips shipped ✅), G-10 (group segments shipped ✅) — re-verify depth vs Sushi during T13.

## 4. Motion Math: Hungry Fish / Hungry Guppy (i-Ready Learning Games)

- **Play:** inside i-Ready platform (original standalone apps discontinued/folded in)
- **Ages:** Guppy 3–7, Fish 7+ · **Structure:** 15 levels; dots → mixed → numerals representation ladder
- **Pedagogy:** drag bubbles together mid-air to **combine**, then feed the fish's exact target; integer bubbles include negatives (differences); adaptive engine steps children up AND down based on performance
- **Benchmark checklist**
  - [ ] Pre-symbolic dot representations before numerals
  - [ ] Combine-two-free-pieces verb with instant tactile feedback
  - [ ] Negatives enter as natural "difference" tools
  - [ ] Continuous adaptivity both directions
- **Our standing:** dot-face tier shipped ✅ (G-11); negatives/shims still inert (R-02 → feeds G-04 family); band-lock trade-off documented (G-13 knob shipped ✅).

## 5. Bridge Constructor / Poly Bridge — the namesake genre

- **Play:** Steam/mobile/console (paid); Poly Bridge has sandbox + community levels
- **Ages:** E-for-everyone but mechanically adult · **Structure:** 30+ levels, material unlocks (wood→steel→cables→concrete), budgets, star ratings vs spend
- **Pedagogy (genre promise):** physics sag/stress/tension made visible; vehicles crossing = the test moment; failure is spectacular and informative; multiple solutions celebrated; hydraulics/sequencing add strategy layers
- **Benchmark checklist**
  - [ ] Structure visibly responds to load (sag/flex/break)
  - [ ] Test-crossing is the emotional payoff beat
  - [ ] Budget/material economy creates elegant-vs-brute-force star tension
  - [ ] Sandbox creation mode
- **Our standing:** sag-under-load + landing thud shipped ✅ (G-14 light-touch); star economy shipped ✅ (G-15); Workshop sandbox shipped ✅ (G-05/G-16 local scope); true physics simulation stays a deliberate non-goal — the gap we close is *perceived* consequence, not engineering fidelity.

---

## Cross-game dimension matrix (quick scan)

| Dimension | Railway Hero | DragonBox | Sushi Monster | Hungry Fish | BC/Poly Bridge | **Bridge Builder v1** |
|---|---|---|---|---|---|---|
| Exact-fit composition | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (+invariant-tested) |
| Multi-solution supply | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ asserted ≥45% entry band |
| Grades span | 1–3 | PK–3 | 2–6 | PK–6 | teen/adult | **1–8 CCSS-tagged** |
| Level map / journey | ✔ | ✔ | ✔ | ✖ | ✔ | ✖ → G-02 |
| Decompose/slice verb | ✖ | ✔ | ✖ | partial | n/a | partial → G-04 |
| Combine-before-place | ✖ | ✔ | ✖ | ✔ | ✖ | ✖ → G-12 |
| Dots/pre-symbolic tier | ✖ | ✔ | ✖ | ✔ | ✖ | ✔ → G-11 |
| Audio-described mode | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ → G-01 |
| Structural juice | n/a | n/a | n/a | n/a | ✔ | partial → G-14 |
| Parent learning-split | ✖ | ✖ | ✖ | ✖ | ✖ | **✔ unique** |

*(✖ in a comparator column means the feature is absent there; ✖ in ours marks an open gap item.)*

## Maintenance

Re-validate links/availability annually; if a comparator disappears from its platform (Motion Math precedent), keep the profile as historical benchmark and note successor availability. New candidates should join only if they sharpen an existing dimension or open a new one worth copying.

## 2026-08-26 same-day Railway Hero observation

The canonical [Railway Hero game page](https://pbskids.org/games/play/railway-hero/31239)
was opened in a browser on 2026-08-26. The playable canvas was reached and observed
through the settings surface, the sequential cybersite map, the first level, a gap
labelled 2, a six-piece tray, exact-fit checking, and the launch transition. The
requested root URL redirects or fails to load in this environment; the canonical
`/31239` page is the URL used for the observation.

This confirms the reference's interaction shape for the first scenario only. It does
not replace a full same-day comparator campaign, child observation, or owner IP sign-off;
the scored nine-row engineering record and those remaining gates are recorded in the
2026-08-26 addendum to `SPRINT_READINESS.md`.
