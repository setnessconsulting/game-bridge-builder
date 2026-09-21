import { describe, expect, it } from "vitest";
import { CANDIDATE_PUZZLE, TEACHING_PUZZLE } from "@/lib/bridgeBuilder/candidatePuzzle";
import { createQualificationRound } from "@/lib/bridgeBuilder/qualificationRound";
import {
  RELAXED_PREF_KEY,
  VISITED_KEY,
  auditRetiredModeCopy,
  firstSessionLeadCopy,
  firstSessionTimedCopy,
  isRelaxedAvailableForSurface,
  persistRelaxedChoice,
  resolveRelaxedOnboarding,
  type StorageLike,
} from "@/lib/bridgeBuilder/relaxedOnboarding";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("GAME-305 first-session untimed-first onboarding", () => {
  it("treats an empty device as a first session with no remembered choice", () => {
    expect(resolveRelaxedOnboarding(memoryStorage())).toEqual({
      firstSession: true,
      rememberedRelaxed: null,
    });
  });

  it("honours a remembered Relaxed choice on later visits", () => {
    const relaxed = memoryStorage({ [VISITED_KEY]: "1", [RELAXED_PREF_KEY]: "true" });
    expect(resolveRelaxedOnboarding(relaxed)).toEqual({
      firstSession: false,
      rememberedRelaxed: true,
    });

    const timed = memoryStorage({ [VISITED_KEY]: "1", [RELAXED_PREF_KEY]: "false" });
    expect(resolveRelaxedOnboarding(timed)).toEqual({
      firstSession: false,
      rememberedRelaxed: false,
    });
  });

  it("persists an explicit choice and marks the device visited", () => {
    const storage = memoryStorage();
    persistRelaxedChoice(storage, true);
    expect(storage.getItem(RELAXED_PREF_KEY)).toBe("true");
    expect(storage.getItem(VISITED_KEY)).toBe("1");
    expect(resolveRelaxedOnboarding(storage)).toEqual({
      firstSession: false,
      rememberedRelaxed: true,
    });

    persistRelaxedChoice(storage, false);
    expect(resolveRelaxedOnboarding(storage).rememberedRelaxed).toBe(false);
  });

  it("never throws without storage (private mode / SSR)", () => {
    expect(resolveRelaxedOnboarding(null)).toEqual({ firstSession: true, rememberedRelaxed: null });
    expect(() => persistRelaxedChoice(null, true)).not.toThrow();
  });

  it("keeps the timed challenge available on the first session", () => {
    // Untimed-first lead + an explicit, guilt-free timed line.
    expect(firstSessionLeadCopy().toLowerCase()).toContain("no timer");
    expect(firstSessionTimedCopy().toLowerCase()).toContain("timed challenge");
    expect(firstSessionTimedCopy()).toContain("90 seconds");
  });

  it("confines Relaxed build to the free site (earned-break containment)", () => {
    expect(isRelaxedAvailableForSurface("free")).toBe(true);
    expect(isRelaxedAvailableForSurface("break")).toBe(false);
  });

  it("never markets the retired Workshop / Sandbox / free-build names", () => {
    const corpus = [firstSessionLeadCopy(), firstSessionTimedCopy()].join("\n");
    expect(auditRetiredModeCopy(corpus)).toEqual([]);
    expect(auditRetiredModeCopy("Try Workshop mode")).not.toEqual([]);
    expect(auditRetiredModeCopy("Open the Sandbox")).not.toEqual([]);
    expect(auditRetiredModeCopy("Endless free-build shelf")).not.toEqual([]);
  });
});

describe("GAME-305 S1 teaching round", () => {
  it("is a nearly unfailable 5-unit gap with 2 + 3 and an oversized decoy", () => {
    expect(TEACHING_PUZZLE.gapUnits).toBe(5);
    const units = TEACHING_PUZZLE.tray.map((piece) => piece.units);
    expect(units).toEqual([2, 3, 8]);
    expect(2 + 3).toBe(TEACHING_PUZZLE.gapUnits);
    // The decoy cannot fit, so every legal move is progress.
    expect(Math.max(...units)).toBeGreaterThan(TEACHING_PUZZLE.gapUnits);
  });

  it("leads the first-session untimed round without changing the timed slice", () => {
    const round = createQualificationRound(777, { firstPuzzle: TEACHING_PUZZLE });
    expect(round[0]!.id).toBe(TEACHING_PUZZLE.id);
    expect(round[0]!.gapUnits).toBe(5);
    // Round still fills to the six-construction cap with a different next gap.
    expect(round).toHaveLength(6);
    expect(round[1]!.gapUnits).not.toBe(5);

    // The timed qualification slice keeps its deterministic 10-unit first load.
    expect(CANDIDATE_PUZZLE.gapUnits).toBe(10);
  });
});
