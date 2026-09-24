import { describe, expect, it } from "vitest";
import {
  advanceBridgeClock,
  applyBridgeHostSignal,
  createBridgeClock,
  expireBridgeClockAtCap,
  FREE_SITE_PAUSE_BUDGET_MS,
} from "@/lib/bridgeBuilder/clock";

describe("Bridge Builder engine-owned clock", () => {
  it("pauses a free-site round and consumes, but cannot exceed, the pause budget", () => {
    let clock = createBridgeClock({ nowMs: 1_000 });
    clock = applyBridgeHostSignal(clock, { type: "visibility", hidden: true, atMs: 10_000 });
    clock = applyBridgeHostSignal(clock, { type: "visibility", hidden: false, atMs: 80_000 });

    expect(clock.pauseBudgetRemainingMs).toBe(0);
    expect(clock.deadlineMs).toBe(1_000 + 90_000 + FREE_SITE_PAUSE_BUDGET_MS);
    expect(clock.expired).toBe(false);

    clock = advanceBridgeClock(clock, clock.deadlineMs);
    expect(clock.expired).toBe(true);
    expect(clock.remainingMs).toBe(0);
  });

  it("keeps the earned-break deadline on wall clock while hidden", () => {
    let clock = createBridgeClock({ mode: "break", nowMs: 0 });
    clock = applyBridgeHostSignal(clock, { type: "visibility", hidden: true, atMs: 1_000 });
    clock = advanceBridgeClock(clock, 89_999);
    expect(clock.remainingMs).toBe(1);
    expect(clock.expired).toBe(false);

    clock = applyBridgeHostSignal(clock, { type: "visibility", hidden: false, atMs: 90_000 });
    expect(clock.expired).toBe(true);
    expect(clock.pauseBudgetRemainingMs).toBe(0);
  });

  it("treats save acknowledgement as non-extending", () => {
    let clock = createBridgeClock({ mode: "break", nowMs: 0 });
    clock = advanceBridgeClock(clock, 90_000);
    const expired = applyBridgeHostSignal(clock, { type: "save-ack", atMs: 90_100 });
    expect(expired.expired).toBe(true);
    expect(expired.deadlineMs).toBe(90_000);
  });

  it("expires at the bridge-count cap without changing the monotonic deadline", () => {
    const clock = createBridgeClock({ nowMs: 500, capBridges: 2 });
    expect(expireBridgeClockAtCap(clock, 1)).toEqual(clock);
    const capped = expireBridgeClockAtCap(clock, 2);
    expect(capped.expired).toBe(true);
    expect(capped.remainingMs).toBe(0);
    expect(capped.deadlineMs).toBe(clock.deadlineMs);
  });
});
