/**
 * Closed renderer-to-engine intent boundary.
 *
 * Reducers consume the action-only shape internally. Every intent crossing the
 * renderer/host boundary is an envelope with monotonic sequence, session, and
 * generation metadata and is validated before it reaches the reducer.
 */

export const BRIDGE_INTENT_TYPES = [
  "selectPiece",
  "placePiece",
  "removePiece",
  "reset",
  "submit",
  "requestHint",
  "continue",
  "presentationComplete",
] as const;

export type BridgeIntentType = (typeof BRIDGE_INTENT_TYPES)[number];

export type BridgeIntentAction =
  | { type: "selectPiece"; pieceId: string }
  | { type: "placePiece"; pieceId: string }
  | { type: "removePiece"; pieceId: string }
  | { type: "reset" }
  | { type: "submit" }
  | { type: "requestHint" }
  | { type: "continue" }
  | { type: "presentationComplete" };

export interface BridgeIntentMetadata {
  seq: number;
  sessionId: string;
  generation: number;
}

/** Every renderer/host-boundary intent carries this envelope. */
export type BridgeIntent = BridgeIntentAction & BridgeIntentMetadata;

export interface BridgeIntentContext {
  sessionId: string;
  generation: number;
}

export type BridgeIntentRejectionReason =
  | "invalid-shape"
  | "unknown-intent"
  | "invalid-piece-id"
  | "invalid-sequence"
  | "invalid-session"
  | "invalid-generation"
  | "stale-session"
  | "stale-generation"
  | "duplicate-sequence"
  | "stale-sequence";

export type BridgeIntentValidation =
  | { ok: true; intent: BridgeIntent }
  | { ok: false; reason: BridgeIntentRejectionReason };

export function isBridgeIntentType(value: unknown): value is BridgeIntentType {
  return (
    typeof value === "string" &&
    (BRIDGE_INTENT_TYPES as readonly string[]).includes(value)
  );
}

/** Convert an untrusted renderer payload to one of the closed action shapes. */
export function parseBridgeIntentAction(value: unknown): BridgeIntentAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!isBridgeIntentType(candidate.type)) return null;
  if (
    candidate.type === "selectPiece" ||
    candidate.type === "placePiece" ||
    candidate.type === "removePiece"
  ) {
    if (typeof candidate.pieceId !== "string" || candidate.pieceId.trim() === "") {
      return null;
    }
    return { type: candidate.type, pieceId: candidate.pieceId };
  }
  return { type: candidate.type } as BridgeIntentAction;
}

export function createBridgeIntent(
  action: BridgeIntentAction,
  context: BridgeIntentContext,
  seq: number,
): BridgeIntent {
  return { ...action, ...context, seq } as BridgeIntent;
}

/**
 * Validate untrusted input at the renderer boundary. Sequence values must be
 * strictly increasing within the active session; duplicates and old
 * generations fail closed.
 */
export function validateBridgeIntent(
  value: unknown,
  expected: BridgeIntentContext & { lastSeq: number },
): BridgeIntentValidation {
  if (!value || typeof value !== "object") {
    return { ok: false, reason: "invalid-shape" };
  }
  const candidate = value as Record<string, unknown>;
  if (!isBridgeIntentType(candidate.type)) {
    return { ok: false, reason: "unknown-intent" };
  }
  const action = parseBridgeIntentAction(candidate);
  if (!action) return { ok: false, reason: "invalid-piece-id" };
  if (!Number.isSafeInteger(candidate.seq) || Number(candidate.seq) < 1) {
    return { ok: false, reason: "invalid-sequence" };
  }
  if (typeof candidate.sessionId !== "string" || candidate.sessionId.trim() === "") {
    return { ok: false, reason: "invalid-session" };
  }
  if (
    !Number.isSafeInteger(candidate.generation) ||
    Number(candidate.generation) < 0
  ) {
    return { ok: false, reason: "invalid-generation" };
  }
  if (candidate.sessionId !== expected.sessionId) {
    return { ok: false, reason: "stale-session" };
  }
  if (candidate.generation !== expected.generation) {
    return { ok: false, reason: "stale-generation" };
  }
  if (Number(candidate.seq) <= expected.lastSeq) {
    return {
      ok: false,
      reason: Number(candidate.seq) === expected.lastSeq
        ? "duplicate-sequence"
        : "stale-sequence",
    };
  }
  return {
    ok: true,
    intent: createBridgeIntent(action, expected, Number(candidate.seq)),
  };
}
