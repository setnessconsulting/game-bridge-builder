import { describe, expect, it } from "vitest";
import {
  advanceBridgeClock,
  createBridgeClock,
  expireBridgeClockAtCap,
} from "@/lib/bridgeBuilder/clock";
import { createQualificationRound } from "@/lib/bridgeBuilder/qualificationRound";
import { createBridgeSession } from "@/lib/bridgeBuilder/session";
import { compositionUnits } from "@/lib/bridgeBuilder/exactness";
import {
  auditTimeoutCopy,
  bridgesClosedLine,
  clockEndedReasonLine,
  coachingLineForTimeout,
  timedChallengeCtaLabel,
  timeoutHeadline,
  untimedRetryCtaLabel,
} from "@/lib/bridgeBuilder/timeoutCoaching";

const SHAME_PATTERNS = [/shame/i, /stupid/i, /\bdumb\b/i, /\blazy\b/i, /\bfail\w*/i, /\blose\b/i, /\bstreak\b/i];

function summaryCorpus(input: Parameters<typeof coachingLineForTimeout>[0]): string {
  return [
    timeoutHeadline(),
    bridgesClosedLine(input.bridgesSolved),
    clockEndedReasonLine(),
    coachingLineForTimeout(input),
    untimedRetryCtaLabel(),
    timedChallengeCtaLabel(),
  ].join("\n");
}

describe("GAME-304 timeout coaching + untimed retry", () => {
  it("shows bridges closed honestly for 0/1/N states", () => {
    expect(bridgesClosedLine(0)).toBe("No bridges yet — want another go?");
    expect(bridgesClosedLine(1)).toBe("You built 1 bridge.");
    expect(bridgesClosedLine(3)).toBe("You built 3 bridges.");
  });

  it("uses the honest clock-ended headline + reason, never freeze-only copy", () => {
    expect(timeoutHeadline()).toBe("Round over — here's what you built.");
    expect(clockEndedReasonLine()).toBe("The clock reached zero.");
    expect(timeoutHeadline().toLowerCase()).not.toContain("frozen");
    expect(clockEndedReasonLine().toLowerCase()).not.toContain("ran out of time");
  });

  it("coaches deterministically from round stats (near-miss / next try)", () => {
    const zeroFresh = {
      bridgesSolved: 0,
      filledUnits: 0,
      gapUnits: 10,
      denominator: 1,
      attempts: 0,
      failedPlacements: 0,
    };
    const zeroNearMiss = { ...zeroFresh, filledUnits: 7, attempts: 2, failedPlacements: 1 };
    const oneBridge = { ...zeroFresh, bridgesSolved: 1, filledUnits: 0 };
    const multiBridge = { ...zeroFresh, bridgesSolved: 4, filledUnits: 0 };

    // Deterministic: same input, same line.
    expect(coachingLineForTimeout(zeroNearMiss)).toBe(coachingLineForTimeout({ ...zeroNearMiss }));
    // Distinct states coach differently.
    expect(coachingLineForTimeout(zeroFresh)).not.toBe(coachingLineForTimeout(oneBridge));
    expect(coachingLineForTimeout(oneBridge)).not.toBe(coachingLineForTimeout(multiBridge));
    // Near-miss names the remaining span.
    expect(coachingLineForTimeout(zeroNearMiss)).toContain("3");
    expect(coachingLineForTimeout(zeroNearMiss).toLowerCase()).toContain("smaller plank");
  });

  it("never shames and never warns about streaks", () => {
    const cases = [
      { bridgesSolved: 0, filledUnits: 0, gapUnits: 10, denominator: 1, attempts: 0, failedPlacements: 0 },
      { bridgesSolved: 0, filledUnits: 6, gapUnits: 10, denominator: 1, attempts: 3, failedPlacements: 2 },
      { bridgesSolved: 1, filledUnits: 0, gapUnits: 8, denominator: 1, attempts: 4, failedPlacements: 1 },
      { bridgesSolved: 5, filledUnits: 2, gapUnits: 12, denominator: 1, attempts: 9, failedPlacements: 0 },
    ];
    for (const input of cases) {
      const text = summaryCorpus(input);
      for (const pattern of SHAME_PATTERNS) {
        expect(text).not.toMatch(pattern);
      }
    }
  });

  it("copy audit: full timeout surface carries no banned affordance", () => {
    const cases = [
      { bridgesSolved: 0, filledUnits: 0, gapUnits: 10, denominator: 1, attempts: 0, failedPlacements: 0 },
      { bridgesSolved: 0, filledUnits: 7, gapUnits: 10, denominator: 1, attempts: 2, failedPlacements: 1 },
      { bridgesSolved: 1, filledUnits: 0, gapUnits: 10, denominator: 1, attempts: 1, failedPlacements: 0 },
      { bridgesSolved: 2, filledUnits: 4, gapUnits: 10, denominator: 1, attempts: 5, failedPlacements: 2 },
    ];
    for (const input of cases) {
      expect(auditTimeoutCopy(summaryCorpus(input))).toEqual([]);
    }
  });

  it("copy audit: flags banned more-time / extension / freeze affordances", () => {
    expect(auditTimeoutCopy("Need more time? Tap here")).not.toEqual([]);
    expect(auditTimeoutCopy("Time is up. Your round is frozen.")).not.toEqual([]);
    expect(auditTimeoutCopy("You ran out of time")).not.toEqual([]);
    expect(auditTimeoutCopy("Don't lose your streak")).not.toEqual([]);
    expect(auditTimeoutCopy("Keep playing with extra seconds")).not.toEqual([]);
    expect(auditTimeoutCopy("/?roundSeconds=999&deadline=never")).not.toEqual([]);
  });

  it("timeout → coaching → untimed retry: retry is a NEW same-skill session, never an extension", () => {
    // Timed round expires on the engine deadline.
    let clock = createBridgeClock({ nowMs: 0 });
    const round = createQualificationRound(20_260_918);
    const expiredPuzzle = round[0]!;
    clock = advanceBridgeClock(clock, 90_000);
    expect(clock.expired).toBe(true);
    expect(clock.remainingMs).toBe(0);

    // Coaching derives from the frozen session at timeout.
    const timedSession = createBridgeSession(expiredPuzzle);
    const coaching = coachingLineForTimeout({
      bridgesSolved: timedSession.bridgesSolved,
      filledUnits: compositionUnits(expiredPuzzle, timedSession.placed),
      gapUnits: expiredPuzzle.gapUnits,
      denominator: expiredPuzzle.denominator,
      attempts: timedSession.attempts,
      failedPlacements: timedSession.failedPlacements,
    });
    expect(coaching.length).toBeGreaterThan(0);
    expect(auditTimeoutCopy(coaching)).toEqual([]);

    // Untimed retry: new round avoids the immediate repeat and preserves skill.
    const nextRound = createQualificationRound(999, { previousPuzzle: expiredPuzzle });
    expect(nextRound[0]!.skillId).toBe(expiredPuzzle.skillId);
    expect(nextRound[0]!.id).not.toBe(expiredPuzzle.id);

    // The new clock is fresh with no revived deadline (cap expiry never
    // rewrites the monotonic deadline either).
    const freshClock = createBridgeClock({ nowMs: 200_000 });
    expect(freshClock.expired).toBe(false);
    expect(freshClock.deadlineMs).toBe(200_000 + 90_000);
    const capped = expireBridgeClockAtCap(freshClock, freshClock.capBridges);
    expect(capped.expired).toBe(true);
    expect(capped.deadlineMs).toBe(freshClock.deadlineMs);
  });
});
