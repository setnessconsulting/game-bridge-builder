/**
 * Engine-owned round clock and host-signal channel.
 *
 * Visibility and route changes are lifecycle inputs, not player intents. The
 * clock is deliberately independent from React, Phaser, and wall-clock
 * Date.now so tests can drive it with an exact fake monotonic timestamp.
 */

export const ROUND_CAP_SECONDS = 90;
export const ROUND_CAP_BRIDGES = 6;
export const FREE_SITE_PAUSE_BUDGET_MS = 60_000;

export type BridgeClockMode = "free" | "break";

export interface BridgeClockState {
  mode: BridgeClockMode;
  capSeconds: number;
  capBridges: number;
  startedAtMs: number;
  deadlineMs: number;
  nowMs: number;
  remainingMs: number;
  pauseBudgetRemainingMs: number;
  hiddenSinceMs: number | null;
  paused: boolean;
  expired: boolean;
}

export type BridgeHostSignal =
  | { type: "visibility"; hidden: boolean; atMs: number }
  | { type: "route"; active: boolean; atMs: number }
  | { type: "save-ack"; atMs: number };

export function createBridgeClock(
  options: {
    mode?: BridgeClockMode;
    nowMs?: number;
    capSeconds?: number;
    capBridges?: number;
  } = {}
): BridgeClockState {
  const nowMs = options.nowMs ?? 0;
  const capSeconds = options.capSeconds ?? ROUND_CAP_SECONDS;
  const mode = options.mode ?? "free";
  return {
    mode,
    capSeconds,
    capBridges: options.capBridges ?? ROUND_CAP_BRIDGES,
    startedAtMs: nowMs,
    deadlineMs: nowMs + capSeconds * 1000,
    nowMs,
    remainingMs: capSeconds * 1000,
    pauseBudgetRemainingMs: mode === "free" ? FREE_SITE_PAUSE_BUDGET_MS : 0,
    hiddenSinceMs: null,
    paused: false,
    expired: false,
  };
}

function withTime(state: BridgeClockState, nowMs: number): BridgeClockState {
  const safeNow = Math.max(state.nowMs, nowMs);
  const remainingMs = Math.max(0, state.deadlineMs - safeNow);
  return {
    ...state,
    nowMs: safeNow,
    remainingMs,
    expired: state.expired || remainingMs === 0,
  };
}

/** Advance from an injected monotonic timestamp. */
export function advanceBridgeClock(
  state: BridgeClockState,
  nowMs: number
): BridgeClockState {
  if (state.expired) return withTime(state, nowMs);
  // A free-site hidden tab pauses until resume. The break window keeps
  // counting, even while hidden.
  if (state.paused && state.mode === "free") {
    return { ...state, nowMs: Math.max(state.nowMs, nowMs) };
  }
  return withTime(state, nowMs);
}

/** Expire on the engine-owned bridge-count cap without extending the deadline. */
export function expireBridgeClockAtCap(
  state: BridgeClockState,
  bridgesSolved: number,
): BridgeClockState {
  if (state.expired || bridgesSolved < state.capBridges) return state;
  return { ...state, remainingMs: 0, expired: true };
}

function resumeFreeClock(
  state: BridgeClockState,
  atMs: number
): BridgeClockState {
  const hiddenSinceMs = state.hiddenSinceMs;
  if (hiddenSinceMs === null) return withTime({ ...state, paused: false }, atMs);

  const hiddenMs = Math.max(0, atMs - hiddenSinceMs);
  const creditMs = Math.min(hiddenMs, state.pauseBudgetRemainingMs);
  const next = {
    ...state,
    deadlineMs: state.deadlineMs + creditMs,
    pauseBudgetRemainingMs: state.pauseBudgetRemainingMs - creditMs,
    hiddenSinceMs: null,
    paused: false,
  };
  return withTime(next, atMs);
}

/** Apply a host lifecycle signal without changing the player-intent union. */
export function applyBridgeHostSignal(
  state: BridgeClockState,
  signal: BridgeHostSignal
): BridgeClockState {
  if (signal.type === "save-ack") {
    // Saving is an acknowledgement only. It cannot extend or revive a clock.
    return advanceBridgeClock(state, signal.atMs);
  }

  const hidden = signal.type === "visibility" ? signal.hidden : !signal.active;
  if (state.mode === "break") {
    return withTime(
      { ...state, paused: hidden, hiddenSinceMs: hidden ? signal.atMs : null },
      signal.atMs
    );
  }

  if (hidden) {
    if (state.hiddenSinceMs !== null) return state;
    return {
      ...state,
      nowMs: Math.max(state.nowMs, signal.atMs),
      hiddenSinceMs: signal.atMs,
      paused: true,
    };
  }

  return resumeFreeClock(state, signal.atMs);
}

export function formatClockMs(remainingMs: number): string {
  return `${Math.ceil(Math.max(0, remainingMs) / 1000)}s`;
}
