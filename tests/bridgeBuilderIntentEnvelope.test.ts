import { describe, expect, it } from "vitest";
import {
  BRIDGE_INTENT_TYPES,
  createBridgeIntent,
  validateBridgeIntent,
} from "@/lib/bridgeBuilder/intents";
import { isBridgeViewModelCompatible } from "@/lib/bridgeBuilder/rendererPort";
import { createSessionSink, validateEvent } from "@/lib/bridgeBuilder/telemetry";

const context = { sessionId: "session-a", generation: 3 };

describe("Bridge Builder v1.1 renderer intent envelope", () => {
  it("requires metadata for every member of the frozen eight-intent union", () => {
    const actions = [
      { type: "selectPiece", pieceId: "p1" },
      { type: "placePiece", pieceId: "p1" },
      { type: "removePiece", pieceId: "p1" },
      { type: "reset" },
      { type: "submit" },
      { type: "requestHint" },
      { type: "continue" },
      { type: "presentationComplete" },
    ] as const;
    expect(actions.map((action) => action.type).sort()).toEqual([...BRIDGE_INTENT_TYPES].sort());

    const accepted = actions.map((action, index) => {
      const intent = createBridgeIntent(action, context, index + 1);
      return validateBridgeIntent(intent, { ...context, lastSeq: index });
    });
    expect(accepted.every((result) => result.ok)).toBe(true);
  });

  it("fails closed on invalid shape, unknown intent, bad piece id, and missing metadata", () => {
    const expected = { ...context, lastSeq: 0 };
    expect(validateBridgeIntent(null, expected)).toEqual({ ok: false, reason: "invalid-shape" });
    expect(validateBridgeIntent({ type: "launchRocket", seq: 1, ...context }, expected)).toEqual({
      ok: false,
      reason: "unknown-intent",
    });
    expect(validateBridgeIntent({ type: "placePiece", pieceId: " ", seq: 1, ...context }, expected)).toEqual({
      ok: false,
      reason: "invalid-piece-id",
    });
    expect(validateBridgeIntent({ type: "submit", ...context }, expected)).toEqual({
      ok: false,
      reason: "invalid-sequence",
    });
  });

  it("rejects stale sessions, stale generations, duplicate, and old sequences", () => {
    const expected = { ...context, lastSeq: 4 };
    expect(validateBridgeIntent({ type: "submit", seq: 5, sessionId: "old", generation: 3 }, expected)).toEqual({
      ok: false,
      reason: "stale-session",
    });
    expect(validateBridgeIntent({ type: "submit", seq: 5, sessionId: context.sessionId, generation: 2 }, expected)).toEqual({
      ok: false,
      reason: "stale-generation",
    });
    expect(validateBridgeIntent({ type: "submit", seq: 4, ...context }, expected)).toEqual({
      ok: false,
      reason: "duplicate-sequence",
    });
    expect(validateBridgeIntent({ type: "submit", seq: 3, ...context }, expected)).toEqual({
      ok: false,
      reason: "stale-sequence",
    });
  });

  it("accepts additive same-major renderer versions and rejects a major mismatch", () => {
    expect(isBridgeViewModelCompatible("1.1.0")).toBe(true);
    expect(isBridgeViewModelCompatible("1.7.2")).toBe(true);
    expect(isBridgeViewModelCompatible("1.0.0")).toBe(false);
    expect(isBridgeViewModelCompatible("2.0.0")).toBe(false);
    expect(isBridgeViewModelCompatible("invalid")).toBe(false);
    expect(isBridgeViewModelCompatible("1-not-semver")).toBe(false);
  });

  it("keeps rejection telemetry typed and free of learner identifiers", () => {
    const sink = createSessionSink("free", () => 123);
    sink.emit("invalid_intent_rejected", { reason: "invalid-piece-id", intentType: "placePiece" });
    sink.emit("stale_intent_dropped", { reason: "stale-generation", intentType: "submit" });
    expect(sink.events().every(validateEvent)).toBe(true);
    expect(sink.events().map((event) => event.payload)).toMatchObject([
      { reason: "invalid-piece-id", intentType: "placePiece" },
      { reason: "stale-generation", intentType: "submit" },
    ]);
    expect(JSON.stringify(sink.events())).not.toMatch(/sessionId|pieceId|learnerId/i);
  });
});
