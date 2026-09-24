import { describe, expect, it } from "vitest";
import {
  SECOND_BUILD_OFFER_MODULUS,
  SECOND_BUILD_OFFER_RATE_MAX,
  SECOND_BUILD_POINTS,
  canShowSecondOffer,
  scorePuzzle,
  shouldOfferSecondBuild,
} from "@/lib/bridgeBuilder/engine";
import { CANDIDATE_PUZZLE } from "@/lib/bridgeBuilder/candidatePuzzle";
import {
  applyBridgeIntent,
  beginSecondBuild,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

function multiPuzzle(): BridgePuzzle {
  return {
    id: "second-build#multi",
    skillId: "bb-compose-10",
    band: "g12",
    denominator: 1,
    gapUnits: 10,
    gapLabel: "10",
    ticksVisible: true,
    tray: [
      { id: "a", units: 4, label: "4", kind: "plank" },
      { id: "b", units: 6, label: "6", kind: "plank" },
      { id: "c", units: 3, label: "3", kind: "plank" },
      { id: "d", units: 7, label: "7", kind: "plank" },
      { id: "e", units: 5, label: "5", kind: "plank" },
    ],
    presetPlaced: [],
    parPieces: 2,
    solutionCount: 2,
    supportsSecondConstruction: true,
    hasEquivalenceRelation: false,
  };
}

/** Solve the 10-gap with 4+6 and return the session result. */
function solveOnce(puzzle: BridgePuzzle, bridgesSolvedBefore: number, secondActive = false) {
  let state = createBridgeSession(puzzle, { bridgesSolved: bridgesSolvedBefore, secondActive });
  const first = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" });
  state = first.state;
  const second = applyBridgeIntent(state, { type: "placePiece", pieceId: "b" });
  return second;
}

describe("GAME-306 engine scoring table owns the +5 and the offer rule", () => {
  it("freezes the second-build bonus at +5 in the engine table", () => {
    expect(SECOND_BUILD_POINTS).toBe(5);
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: true })).toBe(5);
    expect(scorePuzzle({ hintLevelMax: 3, secondBuild: true })).toBe(5);
    // First-build scoring is untouched.
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: false })).toBe(12);
    expect(scorePuzzle({ hintLevelMax: 1, secondBuild: false })).toBe(10);
  });

  it("caps the offer share at <=40% (every Nth solve)", () => {
    expect(SECOND_BUILD_OFFER_RATE_MAX).toBeLessThanOrEqual(0.4);
    expect(1 / SECOND_BUILD_OFFER_MODULUS).toBeLessThanOrEqual(
      SECOND_BUILD_OFFER_RATE_MAX,
    );
  });
});

describe("GAME-306 offer eligibility (puzzle-level rule)", () => {
  const base = {
    solutionCount: 2,
    supportsSecondConstruction: true,
    secondActive: false,
  };

  it("offers on every 3rd solved bridge", () => {
    expect(shouldOfferSecondBuild({ ...base, bridgesSolved: 3 })).toBe(true);
    expect(shouldOfferSecondBuild({ ...base, bridgesSolved: 6 })).toBe(true);
  });

  it("does not offer on 1st, 2nd, 4th, or 5th solves", () => {
    for (const bridgesSolved of [1, 2, 4, 5, 7, 8]) {
      expect(shouldOfferSecondBuild({ ...base, bridgesSolved })).toBe(false);
    }
  });

  it("never offers on single-solution puzzles", () => {
    expect(
      shouldOfferSecondBuild({
        solutionCount: 1,
        supportsSecondConstruction: false,
        secondActive: false,
        bridgesSolved: 3,
      }),
    ).toBe(false);
    expect(
      shouldOfferSecondBuild({
        solutionCount: 1,
        supportsSecondConstruction: true,
        secondActive: false,
        bridgesSolved: 3,
      }),
    ).toBe(false);
  });

  it("never offers when the flag is off, during a second build, or pre-solve", () => {
    expect(shouldOfferSecondBuild({ ...base, supportsSecondConstruction: false, bridgesSolved: 3 })).toBe(
      false,
    );
    expect(shouldOfferSecondBuild({ ...base, secondActive: true, bridgesSolved: 3 })).toBe(false);
    expect(shouldOfferSecondBuild({ ...base, bridgesSolved: 0 })).toBe(false);
  });
});

describe("GAME-306 host-level suppression (never at round end / never in break)", () => {
  it("shows the card on the free site mid-round", () => {
    expect(
      canShowSecondOffer({ offered: true, expired: false, capReached: false, isBreak: false }),
    ).toBe(true);
  });

  it("suppresses at round end, on expiry, in the break, or without an offer", () => {
    expect(
      canShowSecondOffer({ offered: true, expired: false, capReached: true, isBreak: false }),
    ).toBe(false);
    expect(
      canShowSecondOffer({ offered: true, expired: true, capReached: false, isBreak: false }),
    ).toBe(false);
    expect(
      canShowSecondOffer({ offered: true, expired: false, capReached: false, isBreak: true }),
    ).toBe(false);
    expect(
      canShowSecondOffer({ offered: false, expired: false, capReached: false, isBreak: false }),
    ).toBe(false);
  });
});

describe("GAME-306 session wiring (offerSecondBuild effect)", () => {
  it("emits advanceOrFinish (no offer) on the 1st and 2nd multi-solution solves", () => {
    for (const before of [0, 1]) {
      const result = solveOnce(multiPuzzle(), before);
      expect(result.state.phase).toBe("exact");
      expect(result.effects.some((e) => e.type === "offerSecondBuild")).toBe(false);
      expect(result.effects.some((e) => e.type === "advanceOrFinish")).toBe(true);
    }
  });

  it("emits offerSecondBuild (no advance) on the 3rd multi-solution solve", () => {
    const result = solveOnce(multiPuzzle(), 2);
    expect(result.state.phase).toBe("exact");
    expect(result.state.bridgesSolved).toBe(3);
    expect(result.effects.some((e) => e.type === "offerSecondBuild")).toBe(true);
    expect(result.effects.some((e) => e.type === "advanceOrFinish")).toBe(false);
  });

  it("never offers on single-solution puzzles even on the 3rd solve", () => {
    const single: BridgePuzzle = {
      ...multiPuzzle(),
      id: "second-build#single",
      solutionCount: 1,
      supportsSecondConstruction: false,
    };
    const result = solveOnce(single, 2);
    expect(result.state.phase).toBe("exact");
    expect(result.effects.some((e) => e.type === "offerSecondBuild")).toBe(false);
  });

  it("never re-offers on the second construction itself", () => {
    const first = solveOnce(multiPuzzle(), 2);
    expect(first.effects.some((e) => e.type === "offerSecondBuild")).toBe(true);
    const retry = beginSecondBuild(first.state);
    expect(retry.secondActive).toBe(true);
    expect(retry.placed).toHaveLength(0);
    // The follow-up solve advances; it must not offer again.
    const secondSolve = (() => {
      let s = beginSecondBuild(first.state);
      s = applyBridgeIntent(s, { type: "placePiece", pieceId: "c" }).state;
      return applyBridgeIntent(s, { type: "placePiece", pieceId: "d" });
    })();
    expect(secondSolve.state.phase).toBe("exact");
    expect(secondSolve.effects.some((e) => e.type === "offerSecondBuild")).toBe(false);
    expect(secondSolve.effects.some((e) => e.type === "advanceOrFinish")).toBe(true);
  });

  it("second construction still scores the engine +5 base", () => {
    const second = solveOnce(multiPuzzle(), 2, true);
    expect(second.state.phase).toBe("exact");
    expect(second.state.score).toBe(
      scorePuzzle({ hintLevelMax: 0, secondBuild: true }),
    );
  });

  it("stays at or under a 40% offer share across a full 6-bridge round", () => {
    let offers = 0;
    for (let before = 0; before < 6; before += 1) {
      const result = solveOnce(multiPuzzle(), before);
      if (result.effects.some((e) => e.type === "offerSecondBuild")) offers += 1;
    }
    expect(offers).toBe(2); // solves 3 and 6
    expect(offers / 6).toBeLessThanOrEqual(0.4);
  });
});

describe("GAME-306 production candidate opts into the second-build path", () => {
  it("marks the qualification slice as multi-solution with support on", () => {
    expect(CANDIDATE_PUZZLE.solutionCount).toBeGreaterThanOrEqual(2);
    expect(CANDIDATE_PUZZLE.supportsSecondConstruction).toBe(true);
  });

  it("the candidate puzzle actually solves through the session path", () => {
    let state = createBridgeSession(CANDIDATE_PUZZLE, { bridgesSolved: 2 });
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-4" }).state;
    const result = applyBridgeIntent(state, { type: "placePiece", pieceId: "plank-6" });
    expect(result.state.phase).toBe("exact");
    expect(result.effects.some((e) => e.type === "offerSecondBuild")).toBe(true);
  });
});
