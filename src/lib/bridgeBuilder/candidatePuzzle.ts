import type { BridgePuzzle } from "./types";

/**
 * The first qualification slice is intentionally deterministic. It exercises
 * underfill, overfill, retry, undo, submit, and an exact two-piece solution
 * without making the candidate dependent on a random seed or a network.
 */
export const CANDIDATE_PUZZLE: BridgePuzzle = {
  id: "qualification-vertical-slice#1",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10 units",
  ticksVisible: true,
  tray: [
    { id: "plank-4", units: 4, label: "4-unit plank", kind: "plank" },
    { id: "plank-6", units: 6, label: "6-unit plank", kind: "plank" },
    { id: "plank-3", units: 3, label: "3-unit plank", kind: "plank" },
    { id: "plank-7", units: 7, label: "7-unit plank", kind: "plank" },
    { id: "plank-5", units: 5, label: "5-unit plank", kind: "plank" },
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 2,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};
