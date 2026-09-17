import { describe, expect, it } from "vitest";
import {
  evaluatePlacement,
  scorePuzzle,
  summarizeRound,
  coachingFor,
} from "@/lib/bridgeBuilder/engine";
import { formatScaled } from "@/lib/bridgeBuilder/format";

describe("evaluatePlacement", () => {
  const puzzle = { gapUnits: 12 };

  it("returns fit exactly at the gap", () => {
    expect(evaluatePlacement(puzzle, 0, 12)).toEqual({
      status: "fit",
      diff: 0,
      filledAfter: 12,
    });
    expect(evaluatePlacement(puzzle, 5, 7)).toEqual({
      status: "fit",
      diff: 0,
      filledAfter: 12,
    });
  });

  it("reports remaining on partial fills", () => {
    expect(evaluatePlacement(puzzle, 0, 5)).toEqual({
      status: "partial",
      diff: 7,
      filledAfter: 5,
    });
  });

  it("reports exact overhang excess", () => {
    expect(evaluatePlacement(puzzle, 0, 14)).toEqual({
      status: "overhang",
      diff: 2,
      filledAfter: 14,
    });
    expect(evaluatePlacement(puzzle, 11, 2)).toEqual({
      status: "overhang",
      diff: 1,
      filledAfter: 13,
    });
  });

  it("stays exact for negative shims restoring an overshoot", () => {
    expect(evaluatePlacement(puzzle, 13, -1)).toEqual({
      status: "fit",
      diff: 0,
      filledAfter: 12,
    });
  });
});

describe("scorePuzzle", () => {
  it("awards base 10 plus zero-hint bonus", () => {
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: false })).toBe(12);
    expect(scorePuzzle({ hintLevelMax: 1, secondBuild: false })).toBe(10);
    expect(scorePuzzle({ hintLevelMax: 3, secondBuild: false })).toBe(10);
  });

  it("awards flat 5 for second constructions", () => {
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: true })).toBe(5);
    expect(scorePuzzle({ hintLevelMax: 3, secondBuild: true })).toBe(5);
  });

  it("adds the live streak bonus without making hints a penalty", () => {
    expect(scorePuzzle({ hintLevelMax: 1, secondBuild: false, streakBefore: 3 })).toBe(11);
    expect(scorePuzzle({ hintLevelMax: 0, secondBuild: false, streakBefore: 3 })).toBe(13);
    expect(scorePuzzle({ hintLevelMax: 3, secondBuild: true, streakBefore: 3 })).toBe(6);
  });
});

describe("summarizeRound", () => {
  it("is deterministic and keeps an exact-fit streak through hints", () => {
    const records = [
      { attempts: 1, hintLevelMax: 0 as const, secondBuild: false, points: 12 },
      { attempts: 1, hintLevelMax: 0 as const, secondBuild: false, points: 12 },
      { attempts: 4, hintLevelMax: 2 as const, secondBuild: false, points: 10 },
      { attempts: 1, hintLevelMax: 0 as const, secondBuild: false, points: 12 },
      { attempts: 1, hintLevelMax: 0 as const, secondBuild: true, points: 5 },
      { attempts: 1, hintLevelMax: 0 as const, secondBuild: false, points: 12 },
    ];
    const a = summarizeRound(records);
    const b = summarizeRound(records);
    expect(a).toEqual(b);
    expect(a.bridges).toBe(6);
    expect(a.points).toBe(63);
    expect(a.bestStreak).toBe(6);
    expect(a.hintsUsed).toBe(1);
  });

  it("handles the empty round", () => {
    const summary = summarizeRound([]);
    expect(summary.bridges).toBe(0);
    expect(summary.coaching).toContain("Every try");
  });

  it("never shames in coaching language", () => {
    for (const coaching of [
      coachingFor(1, 5, 0, 3, 6),
      coachingFor(2, 20, 0, 0, 1),
      coachingFor(4, 44, 4, 0, 1),
      coachingFor(3, 30, 0, 2, 2),
    ]) {
      expect(coaching.toLowerCase()).not.toMatch(/fail|bad|wrong|shame|loser/);
    }
  });
});

describe("formatScaled", () => {
  it("formats whole units plainly", () => {
    expect(formatScaled(12, 1)).toBe("12");
  });

  it("renders eighths with vulgar fractions and mixed numbers", () => {
    expect(formatScaled(4, 8)).toBe("\u00BD");
    expect(formatScaled(2, 8)).toBe("\u00BC");
    expect(formatScaled(12, 8)).toBe("1 \u00BD");
    expect(formatScaled(8, 8)).toBe("1");
  });

  it("reduces non-vulgar fractions", () => {
    expect(formatScaled(6, 24)).toBe("\u00BC");
    expect(formatScaled(16, 24)).toBe("\u2154");
    expect(formatScaled(9, 24)).toBe("\u215C");
  });

  it("trims decimal denominators to clean labels", () => {
    expect(formatScaled(250, 100)).toBe("2 \u00BD");
    expect(formatScaled(300, 100)).toBe("3");
    expect(formatScaled(75, 100)).toBe("\u00BE");
  });

  it("marks negative shims with a minus sign", () => {
    expect(formatScaled(-2, 1)).toBe("\u22122");
  });
});
