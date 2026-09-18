import { describe, expect, it } from "vitest";
import { CANDIDATE_PUZZLE } from "@/lib/bridgeBuilder/candidatePuzzle";
import { BRIDGE_MAX_BRIDGES } from "@/lib/bridgeBuilder/exactness";
import {
  createQualificationRound,
  qualificationQuestionKey,
} from "@/lib/bridgeBuilder/qualificationRound";

describe("qualification question rotation", () => {
  it("keeps the fixed first slice and never repeats the target or math question back-to-back", () => {
    const round = createQualificationRound(20_260_918, {
      firstPuzzle: CANDIDATE_PUZZLE,
    });

    expect(round).toHaveLength(BRIDGE_MAX_BRIDGES);
    expect(round[0]).toBe(CANDIDATE_PUZZLE);
    for (let index = 1; index < round.length; index += 1) {
      const previous = round[index - 1]!;
      const current = round[index]!;
      expect(current.gapUnits).not.toBe(previous.gapUnits);
      expect(qualificationQuestionKey(current)).not.toBe(qualificationQuestionKey(previous));
    }
    expect(new Set(round.map(qualificationQuestionKey)).size).toBe(round.length);
  });

  it("avoids carrying the last question of a round into the next round", () => {
    const currentRound = createQualificationRound(20_260_918, {
      firstPuzzle: CANDIDATE_PUZZLE,
    });
    const lastPuzzle = currentRound[currentRound.length - 1]!;
    const nextRound = createQualificationRound(20_260_919, {
      previousPuzzle: lastPuzzle,
    });

    expect(nextRound).toHaveLength(BRIDGE_MAX_BRIDGES);
    expect(nextRound[0]!.gapUnits).not.toBe(lastPuzzle.gapUnits);
    expect(qualificationQuestionKey(nextRound[0]!)).not.toBe(
      qualificationQuestionKey(lastPuzzle),
    );
  });

  it("is reproducible from its round seed", () => {
    const first = createQualificationRound(1234, { firstPuzzle: CANDIDATE_PUZZLE });
    const second = createQualificationRound(1234, { firstPuzzle: CANDIDATE_PUZZLE });

    expect(second.map(qualificationQuestionKey)).toEqual(first.map(qualificationQuestionKey));
    expect(second.map((puzzle) => puzzle.id)).toEqual(first.map((puzzle) => puzzle.id));
  });
});
