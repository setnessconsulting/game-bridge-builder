import { describe, expect, it } from "vitest";
import {
  computeParentBrief,
  createSessionSink,
  validateEvent,
  type GameMode,
} from "@/lib/bridgeBuilder/telemetry";
import type { TelemetryEvent } from "@/lib/games/core/types";

function makeEvent(
  type: TelemetryEvent["type"],
  payload: Record<string, unknown> = {}
): TelemetryEvent {
  return { type, ts: 1000, payload };
}

describe("event validation", () => {
  it("accepts well-formed gameplay events", () => {
    expect(validateEvent(makeEvent("session_start", { band: "g12" }))).toBe(true);
    expect(validateEvent(makeEvent("puzzle_solved", { points: 12 }))).toBe(true);
    expect(validateEvent(makeEvent("break_flow", { event: "expired" }))).toBe(true);
    expect(validateEvent(makeEvent("piece_merge", { a: 2, b: 3, result: 5 }))).toBe(true);
    expect(validateEvent(makeEvent("piece_split", { fromUnits: 6, into: [3, 3] }))).toBe(true);
    expect(validateEvent(makeEvent("plank_lift", { units: 3 }))).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(validateEvent(makeEvent("not_a_real_event" as never))).toBe(false);
  });

  it("rejects PII-bearing payloads", () => {
    expect(validateEvent(makeEvent("session_start", { childId: "x" }))).toBe(false);
    expect(validateEvent(makeEvent("session_start", { email: "a@b.c" }))).toBe(false);
  });

  it("rejects malformed timestamps or payloads", () => {
    expect(
      validateEvent({ type: "session_start", ts: Number.NaN, payload: {} })
    ).toBe(false);
    expect(
      validateEvent({ type: "session_start", ts: 1, payload: null as never })
    ).toBe(false);
  });
});

describe("session sink", () => {
  it("tags every event with the game mode and stays session-scoped", () => {
    const modes: GameMode[] = ["free", "break"];
    for (const mode of modes) {
      let clock = 0;
      const sink = createSessionSink(mode, () => ++clock);
      sink.emit("session_start", { band: "g34" });
      sink.emit("place_attempt", { result: "fit" });
      expect(sink.size()).toBe(2);
      expect(sink.events().every((e) => e.payload.mode === mode)).toBe(true);
      expect(sink.events()[1]!.ts).toBe(2);
      const other = createSessionSink(mode, () => 0);
      expect(other.size()).toBe(0);
    }
  });
});

describe("parent brief itemization", () => {
  it("counts game minutes inside total only, itemized by game", () => {
    const brief = computeParentBrief({
      learningMinutes: 36,
      gameSessions: [
        { game: "Bridge Builder", minutes: 4 },
        { game: "Number Line Jumper", minutes: 5 },
      ],
    });
    expect(brief.totalMinutes).toBe(45);
    expect(brief.learningMinutes).toBe(36);
    expect(brief.gameMinutes).toBe(9);
    expect(brief.items.map((i) => i.game)).toEqual(["Bridge Builder", "Number Line Jumper"]);
    expect(brief.learningShare).toBeCloseTo(0.8, 5);
    expect(brief.meetsGate).toBe(true);
  });

  it("reports an honest failing gate instead of hiding game time", () => {
    const brief = computeParentBrief({
      learningMinutes: 10,
      gameSessions: [{ game: "Bridge Builder", minutes: 30 }],
    });
    expect(brief.learningShare).toBeCloseTo(10 / 40, 5);
    expect(brief.meetsGate).toBe(false);
    expect(brief.items[0]!.minutes).toBe(30);
  });

  it("treats a zero-minute window as fully learning", () => {
    expect(computeParentBrief({ learningMinutes: 0, gameSessions: [] }).meetsGate).toBe(true);
  });
});
