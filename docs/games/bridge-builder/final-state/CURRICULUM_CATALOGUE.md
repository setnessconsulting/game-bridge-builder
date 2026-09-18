# Bridge Builder curriculum catalogue

**Owner:** GAME-295 / BB-CONTENT-1

**Status:** implementation catalogue; parity is checked against `src/lib/bridgeBuilder/skills.ts`

**Qualification note:** the proposed supply floor of 12 distinct puzzles per skill × band × generator tier is still pending owner ratification.

This is the current 14-skill catalogue of record. The tier matrix used by the generator property suite is `baseline` (no difficulty override), `easier`, and `harder`; it exercises code paths and does not ratify user-facing thresholds.

| Skill ID | Band | Grades | CCSS standards |
|---|---|---:|---|
| `bb-compose-10` | `g12` | 1-1 | 1.OA.C.6, 1.OA.D.8 |
| `bb-compose-20` | `g12` | 1-2 | 1.OA.D.8, 2.OA.B.2 |
| `bb-missing-addend` | `g12` | 2-2 | 2.NBT.B.5 |
| `bb-factor-pairs` | `g34` | 3-3 | 3.OA.C.7, 3.OA.A.4, 4.OA.A.4 |
| `bb-mult-groups` | `g34` | 3-4 | 3.OA.A.1, 3.OA.A.4, 3.OA.C.7 |
| `bb-fraction-equiv` | `g34` | 3-4 | 3.NF.A.3, 4.NF.A.1 |
| `bb-decimals-tenths` | `g34` | 4-4 | 4.NF.C.5, 4.NF.C.6 |
| `bb-unlike-denom` | `g56` | 5-5 | 5.NF.A.1 |
| `bb-decimal-ops` | `g56` | 5-5 | 5.NBT.B.7 |
| `bb-ratio-scale` | `g56` | 6-6 | 6.RP.A.3 |
| `bb-linear-eq` | `g56` | 6-6 | 6.EE.B.5, 6.EE.B.6 |
| `bb-rational-eq` | `g78` | 7-7 | 7.EE.B.4, 7.NS.A.1d |
| `bb-scale-drawing` | `g78` | 7-8 | 7.G.A.1 |
| `bb-pythagorean-span` | `g78` | 8-8 | 8.G.B.7 |

The legacy conditional `3.MD.D.8`, future `6.G.A.1`, and inherited `8.EE.C.7` are not current catalogue entries. The previous planning-draft list is non-authoritative; runtime and this table must stay in exact parity.
