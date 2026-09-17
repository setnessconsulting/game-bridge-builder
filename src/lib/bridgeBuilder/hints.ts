import type { HintContext, HintOutcome, TutorAdapter } from "@/lib/games/core/types";
import { findSubset } from "./math";

export const STUCK_MS_FREE = 25000;
export const STUCK_MS_RELAXED = 50000;

export function stuckThresholdMs(relaxed: boolean): number {
  return relaxed ? STUCK_MS_RELAXED : STUCK_MS_FREE;
}

function formatNumber(value: number, denominator: number, formatter: (u: number, d: number) => string): string {
  return formatter(value, denominator);
}

export function computeNextHint(
  context: HintContext,
  options: {
    pieces?: ReadonlyMap<number, string>;
    denominator?: number;
    formatDiff?: (units: number, denominator: number) => string;
  } = {}
): HintOutcome | null {
  const need = context.gapUnits - context.filledUnits;
  const denominator = options.denominator ?? 1;
  const fmt = options.formatDiff ?? ((u: number, d: number) => `${u}/${d}`);
  const level = context.hintLevelShown;

  if (level >= 3) return null;

  if (level === 0) {
    const made = formatNumber(context.filledUnits, denominator, fmt);
    const total = formatNumber(context.gapUnits, denominator, fmt);
    return {
      level: 1,
      message: `Your planks make ${made}. The gap needs ${total}.`,
    };
  }

  if (need < 0) {
    const shims = context.trayValues
      .filter((value) => value < 0)
      .sort((a, b) => Math.abs(a) - Math.abs(b));
    const shim = shims.find((value) => Math.abs(value) === Math.abs(need)) ?? shims[0];
    if (shim === undefined) return null;
    if (level === 1) {
      const highlightPieceId = options.pieces?.get(shim);
      return highlightPieceId
        ? { level: 2, highlightPieceId }
        : { level: 2, message: "A minus shim can bring the bridge back to the target." };
    }
    return {
      level: 3,
      message: "The bridge is over the target. Use a minus shim to bring it back.",
      ghostUnits: Math.abs(shim),
    };
  }

  const pool = sortedPositive(context.trayValues, need);
  const subset = findSubset(pool, Math.abs(need));
  if (!subset || subset.length === 0) return null;

  if (level === 1) {
    const highlightPieceId = options.pieces?.get(subset[0] as number);
    if (!highlightPieceId) return null;
    return { level: 2, highlightPieceId };
  }

  return { level: 3, ghostUnits: subset[0] };
}

function sortedPositive(values: readonly number[], cap: number): number[] {
  return values
    .filter((v) => v > 0 && v <= cap)
    .sort((a, b) => a - b);
}

export function createRuleTutor(): TutorAdapter {
  return {
    nextHint(context, pieces) {
      return computeNextHint(context, { pieces });
    },
  };
}
