/**
 * Host-runtime adapter for games-site iframe embedding (SDK-6).
 *
 * Gameplay authority stays in session.ts / Phaser. This module only opens the
 * Game Platform SDK postMessage transport when the host supplies both
 * gpsdkChannel and gpsdkSession query params, and reports a structural
 * session completion when the candidate round ends.
 */

import type {
  GameIdentity,
  SessionCompletionPayload,
} from "@setnessconsulting/game-platform-sdk/core";
import { IframeTransport, type HostTransport } from "@setnessconsulting/game-platform-sdk/host";

export const BRIDGE_BUILDER_GAME_IDENTITY: GameIdentity = {
  gameId: "bridge-builder",
  gameVersion: "0.1.0",
  sdkVersion: "0.1.0",
  protocolVersion: "1.0",
  runtimeKind: "web-canvas",
  capabilities: {
    canPause: false,
  },
};

export type GpsdkSessionIds = {
  channelId: string;
  sessionId: string;
};

export function readGpsdkSessionParams(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): GpsdkSessionIds | null {
  const params = new URLSearchParams(search);
  const channelId = params.get("gpsdkChannel");
  const sessionId = params.get("gpsdkSession");
  if (!channelId || !sessionId) return null;
  return { channelId, sessionId };
}

export type SessionCompleteReason = "game-completed" | "deadline" | "user-exit";

export class BridgeBuilderHostRuntime {
  private transport: HostTransport | null = null;
  private startedAtMs = 0;
  private completed = false;

  /** Returns true when a host transport was opened and HANDSHAKE_INIT sent. */
  connect(search?: string): boolean {
    const ids = readGpsdkSessionParams(search);
    if (!ids) return false;
    if (typeof window === "undefined") return false;
    if (window.parent === window) return false;

    const origin = window.location.origin;
    this.transport = new IframeTransport({
      channelId: ids.channelId,
      sessionId: ids.sessionId,
      targetWindow: window.parent,
      targetOrigin: origin,
      allowedOrigins: [origin],
    });
    this.startedAtMs = performance.now();
    this.completed = false;
    this.transport.sendMessage("HANDSHAKE_INIT", {
      gameIdentity: BRIDGE_BUILDER_GAME_IDENTITY,
    });
    return true;
  }

  get isConnected(): boolean {
    return this.transport !== null;
  }

  notifySessionComplete(reason: SessionCompleteReason = "game-completed"): void {
    if (!this.transport || this.completed) return;
    this.completed = true;
    const payload: SessionCompletionPayload = {
      sessionId: this.transport.sessionId,
      gameId: BRIDGE_BUILDER_GAME_IDENTITY.gameId,
      gameVersion: BRIDGE_BUILDER_GAME_IDENTITY.gameVersion,
      durationMs: Math.max(0, Math.round(performance.now() - this.startedAtMs)),
      reason,
    };
    this.transport.sendMessage("COMPLETE_SESSION", payload);
  }

  destroy(): void {
    this.transport?.destroy();
    this.transport = null;
  }
}
