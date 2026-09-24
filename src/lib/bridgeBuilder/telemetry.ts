import type { TelemetryEvent, TelemetryEventType } from "@/lib/games/core/types";

export type GameMode = "free" | "break" | "sandbox";

export interface SessionSink {
  emit(type: TelemetryEventType, payload: Record<string, unknown>): void;
  events(): readonly TelemetryEvent[];
  size(): number;
}

export function createSessionSink(mode: GameMode, now: () => number = Date.now): SessionSink {
  const events: TelemetryEvent[] = [];
  return {
    emit(type, payload) {
      events.push({ type, ts: now(), payload: { mode, ...payload } });
    },
    events() {
      return [...events];
    },
    size() {
      return events.length;
    },
  };
}

const EVENT_TYPES: ReadonlySet<string> = new Set<TelemetryEventType>([
  "session_start",
  "puzzle_start",
  "place_attempt",
  "hint_shown",
  "puzzle_solved",
  "second_build",
  "streak_update",
  "session_end",
  "break_flow",
  "piece_merge",
  "piece_split",
  "plank_lift",
  "invalid_intent_rejected",
  "stale_intent_dropped",
  "renderer_version_skew",
  "invariant_violation",
]);

const FORBIDDEN_PAYLOAD_KEYS = [
  "name",
  "email",
  "childId",
  "studentId",
  "userId",
  "accountId",
  "birthdate",
  "grade",
] as const;

export function validateEvent(event: TelemetryEvent): boolean {
  if (!EVENT_TYPES.has(event.type)) return false;
  if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) return false;
  if (typeof event.payload !== "object" || event.payload === null) return false;
  for (const key of Object.keys(event.payload)) {
    if ((FORBIDDEN_PAYLOAD_KEYS as readonly string[]).includes(key)) return false;
  }
  return true;
}

export interface GameSessionMinutes {
  game: string;
  minutes: number;
}

export interface ParentBriefItemization {
  totalMinutes: number;
  learningMinutes: number;
  gameMinutes: number;
  items: GameSessionMinutes[];
  learningShare: number;
  meetsGate: boolean;
}

export const LEARNING_SHARE_GATE = 0.8;

export function computeParentBrief(input: {
  learningMinutes: number;
  gameSessions: readonly GameSessionMinutes[];
}): ParentBriefItemization {
  const gameMinutes = input.gameSessions.reduce((a, s) => a + s.minutes, 0);
  const learningMinutes = Math.max(0, input.learningMinutes);
  const totalMinutes = learningMinutes + gameMinutes;
  const share = totalMinutes === 0 ? 1 : learningMinutes / totalMinutes;
  return {
    totalMinutes,
    learningMinutes,
    gameMinutes,
    items: input.gameSessions.map((s) => ({ ...s })),
    learningShare: share,
    meetsGate: share >= LEARNING_SHARE_GATE,
  };
}
