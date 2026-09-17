import { describe, expect, it } from "vitest";
import {
  computeNextHint,
  createRuleTutor,
  stuckThresholdMs,
} from "@/lib/bridgeBuilder/hints";
import {
  configFromPlacement,
  easierBand,
  shouldSuggestEasier,
  signalFromPlacement,
} from "@/lib/bridgeBuilder/adaptive";
import { STUCK_MS_FREE, STUCK_MS_RELAXED } from "@/lib/bridgeBuilder/hints";

describe("hint ladder", () => {
  const base = {
    gapUnits: 12,
    filledUnits: 0,
    trayValues: [3, 4, 5, 8],
    attempts: 3,
    hintLevelShown: 0 as const,
  };

  it("L1 restates the relationship without naming pieces", () => {
    const hint = computeNextHint(base)!;
    expect(hint.level).toBe(1);
    expect(hint.message).toContain("12");
    expect(hint.highlightPieceId).toBeUndefined();
    expect(hint.ghostUnits).toBeUndefined();
  });

  it("L2 highlights a piece that belongs to a valid solution", () => {
    const pieces = new Map([
      [3, "p3"],
      [4, "p4"],
      [5, "p5"],
      [8, "p8"],
    ]);
    const hint = computeNextHint({ ...base, hintLevelShown: 1 }, { pieces })!;
    expect(hint.level).toBe(2);
    expect(hint.highlightPieceId).toBeDefined();
    const highlighted = Number(hint.highlightPieceId!.slice(1));
    expect(12 - highlighted).toBeGreaterThanOrEqual(0);
  });

  it("L3 proposes a ghost placement", () => {
    const hint = computeNextHint({ ...base, hintLevelShown: 2 })!;
    expect(hint.level).toBe(3);
    expect(hint.ghostUnits).toBeGreaterThan(0);
    expect(hint.ghostUnits!).toBeLessThanOrEqual(base.gapUnits);
  });

  it("caps at L3", () => {
    expect(computeNextHint({ ...base, hintLevelShown: 3 })).toBeNull();
  });

  it("rule tutor adapter is a pure drop-in", () => {
    const tutor = createRuleTutor();
    const hint = tutor.nextHint(base, new Map());
    expect(hint?.level).toBe(1);
  });

  it("stuck threshold doubles in relaxed mode", () => {
    expect(stuckThresholdMs(false)).toBe(STUCK_MS_FREE);
    expect(stuckThresholdMs(true)).toBe(STUCK_MS_RELAXED);
    expect(STUCK_MS_RELAXED).toBe(STUCK_MS_FREE * 2);
    expect(STUCK_MS_FREE).toBe(25000);
  });

  it("points a stuck overshoot toward a signed shim", () => {
    const outcome = computeNextHint(
      {
        gapUnits: 12,
        filledUnits: 13,
        trayValues: [-1, 4, 5],
        attempts: 3,
        hintLevelShown: 1,
      },
      { pieces: new Map([[-1, "shim"]]) }
    );
    expect(outcome).toEqual({ level: 2, highlightPieceId: "shim" });
  });
});

describe("adaptive wiring", () => {
  it("maps grades onto bands per GAMES_PLAN", () => {
    expect(signalFromPlacement({ band: { grade: 1, third: "early" } }).band).toBe("g12");
    expect(signalFromPlacement({ band: { grade: 4, third: "late" } }).band).toBe("g34");
    expect(signalFromPlacement({ band: { grade: 6, third: "mid" } }).band).toBe("g56");
    expect(signalFromPlacement({ band: { grade: 8, third: "early" } }).band).toBe("g78");
  });

  it("falls back to manual g12 with no placement data", () => {
    const signal = signalFromPlacement(null);
    expect(signal.band).toBe("g12");
    expect(signal.third).toBeNull();
    expect(Object.keys(signal.domainStrength)).toHaveLength(0);
  });

  it("biases weak domains into the round config", () => {
    const config = configFromPlacement({
      band: { grade: 5, third: "mid" },
      signals: [{ domain: "fractions-ratios", status: "growth-area" }],
    });
    expect(config.band).toBe("g56");
    expect(config.biasedSkillIds.length).toBeGreaterThan(0);
    expect(config.biasedSkillIds.some((id) => id.startsWith("bb-unlike"))).toBe(true);
  });

  it("config is stable across repeated calls for the same input (session lock)", () => {
    const pr = {
      band: { grade: 7, third: "late" as const },
      signals: [{ domain: "algebraic-thinking", status: "developing" as const }],
    };
    expect(configFromPlacement(pr)).toEqual(configFromPlacement(pr));
  });

  it("suggests easier only after three stuck puzzles and walks down bands", () => {
    expect(shouldSuggestEasier(2)).toBe(false);
    expect(shouldSuggestEasier(3)).toBe(true);
    expect(easierBand("g78")).toBe("g56");
    expect(easierBand("g34")).toBe("g12");
    expect(easierBand("g12")).toBeNull();
  });
});
