/**
 * Bounded Bridge Builder intents shared by React, canvas, and keyboard paths.
 * Pixel/drag coordinates never appear here — only engine-owned identities.
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

export type BridgeIntent =
  | { type: "selectPiece"; pieceId: string }
  | { type: "placePiece"; pieceId: string }
  | { type: "removePiece"; pieceId: string }
  | { type: "reset" }
  | { type: "submit" }
  | { type: "requestHint" }
  | { type: "continue" }
  | { type: "presentationComplete" };

export function isBridgeIntentType(value: string): value is BridgeIntentType {
  return (BRIDGE_INTENT_TYPES as readonly string[]).includes(value);
}
