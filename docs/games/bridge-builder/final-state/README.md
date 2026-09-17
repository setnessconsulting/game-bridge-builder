# Bridge Builder — final-state specification of record

This directory is the **specification of record** for the final production state of Bridge Builder
(LevelBest, grades 1–8). It is the detail behind the canonical Jira epic **GAME-105**
(*Bridge Builder — final production state: Phaser 4 renderer, full game quality and release*), whose
description carries the binding laws, constants, IDs and gates.

**Status:** proposal pending owner ratification of the open decisions listed in `DECISIONS.md` §6
(O-1…O-8). Requirements are adopted; the two bounded new issues (`BB-CONTRACT-1`, `BB-CONTENT-1`)
await the O-8 sanction. Nothing here is implemented game code.

## Documents

| File | What it is |
|---|---|
| [`PRD.md`](./PRD.md) | Final-state product requirements: core loop and experience, educational goals, target users, quality bar and the closed **Q-01…Q-23** scorecard, privacy/safety, accessibility, performance, observability, testing, release, scope and non-goals. |
| [`TECHNICAL_DESIGN.md`](./TECHNICAL_DESIGN.md) | Validated target architecture: authority boundaries, technology responsibilities, the explicit **Blender determination**, contracts and versioning, state/lifecycle design, security, per-device-class performance budgets, fault handling, rollout and rollback. |
| [`UX_USER_FLOW.md`](./UX_USER_FLOW.md) | Production UX specification: journeys (free site, earned break, Relaxed), all 20 presentation states, input convergence, accessibility design requirements, motion and copy rules, and the production Figma deliverable list for **GAME-171**. |
| [`DECISIONS.md`](./DECISIONS.md) | Adjudicated decisions log: every finding from the adversarial review (12 blockers, 26 major, 21 minor) resolved with rationale, the eight owner decisions, the epic-text vs child-AC split, and the scope-lock verdict. |
| [`EPIC_GAME-105.md`](./EPIC_GAME-105.md) | Capture of the canonical epic text as written to Jira (`GAME-105`), for traceability. |

## Provenance

Produced by the `project-software-development-team` pipeline (host-native execution), run
`bridge-builder-final-state-20260910`, on 2026-09-10:

1. **Pass 1 — generation:** Product Manager → PRD v1; Architect → Technical Design v1; Designer → UX & User Flow v1.
2. **Structural health check** of the three v1 artifacts.
3. **Pass 2 — isolated adversarial review** in a fresh context receiving only the brief and the v1 artifacts
   (`bridge-builder-final-state-20260910/critique/REVIEW.md` in the jira-admin workspace): 12 blockers,
   26 major, 21 minor, verdict `SHOULD_REVISIT`.
4. **Pass 3 — synthesis:** every finding adjudicated (accepted/rejected/deferred) with the accepted changes
   applied, producing the v2 documents and the decisions log; **scope lock READY**. Reviewer independence was
   `same_model` with isolated review context — recorded honestly; no model-diversity claim is made.

**Not fabricated.** The review's central finding was that draft claims overstated coverage and acceptance.
The v2 documents therefore mark every human gate (manual screen-reader pass, uncoached child playtest,
real-device interaction evidence, human IP-separation sign-off), the production Figma work, the real
Phaser render lane and all benchmark results as **required work** (`[required work]`), and the accessibility
claim is asserted per success criterion with two recorded exceptions rather than as a blanket statement.

## Relationship to the other Bridge Builder documents

- [`../REQUIREMENTS.md`](../REQUIREMENTS.md), [`../UX_DESIGN.md`](../UX_DESIGN.md), [`../EPIC_PLAN.md`](../EPIC_PLAN.md),
  [`../PROTOTYPE_NOTES.md`](../PROTOTYPE_NOTES.md), [`../UI_TEST_FINDINGS.md`](../UI_TEST_FINDINGS.md) — current-generation
  design and implementation history (GAME-36). Still valid for shipped behaviour; this set supersedes them as the
  final-state product definition.
- [`../RENDERER_BOUNDARY.md`](../RENDERER_BOUNDARY.md) and [`../PHASER_RENDERER_CONTRACT.md`](../PHASER_RENDERER_CONTRACT.md) —
  **frozen contracts**, unchanged by this set. Additive needs route through `BB-CONTRACT-1` (v1.1.0, additive only,
  no authority change).
- [`../COMPARATORS.md`](../COMPARATORS.md) and [`../SPRINT_READINESS.md`](../SPRINT_READINESS.md) — comparator registry
  and the current-generation evidence ledger, including the nine-criterion Railway Hero record (current-generation only;
  never cited as next-generation evidence).

## Owner decisions this set raises

See `DECISIONS.md` §6 and the epic description. The blocking one is **O-7**: without named owners and target dates for
the four human gates and the WCAG conformance signer, Gates D and E cannot close and GAME-105 cannot reach Done
regardless of engineering quality.
