/**
 * GAME-304: clock-ended summary copy + deterministic coaching.
 *
 * Pure, deterministic helpers for the timeout → coaching → untimed retry
 * path. All copy follows UX_USER_FLOW §2 J1.8 + §10:
 * - honest 0/1-bridge states, never shaming
 * - no streak-loss language
 * - no "more time" / clock-extension affordance (see TIMEOUT_BANNED_PATTERNS)
 *
 * The untimed retry starts a NEW Relaxed round on the same skill — it never
 * extends the expired clock (new sessionId + generation + no deadline).
 */

import { formatScaled } from "./format";

export interface TimeoutCoachingInput {
  bridgesSolved: number;
  /** Exact filled units on the current (unfinished) puzzle at clock end. */
  filledUnits: number;
  gapUnits: number;
  denominator: number;
  attempts: number;
  failedPlacements: number;
}

/** Clock-ended headline (UX_USER_FLOW §2 J1.8, verbatim). */
export function timeoutHeadline(): string {
  return "Round over — here's what you built.";
}

/** Honest reason line for a clock-ended round. Never "you ran out of time". */
export function clockEndedReasonLine(): string {
  return "The clock reached zero.";
}

/** Honest bridges-closed line with 0/1 states (UX §10 verbatim). */
export function bridgesClosedLine(bridgesSolved: number): string {
  if (bridgesSolved <= 0) return "No bridges yet — want another go?";
  if (bridgesSolved === 1) return "You built 1 bridge.";
  return `You built ${bridgesSolved} bridges.`;
}

/**
 * Deterministic coaching line: near-miss / what to try next.
 * Pure function of round stats — same input always yields same output.
 * Never shaming, never streak-loss, never a verdict on the child.
 */
export function coachingLineForTimeout(input: TimeoutCoachingInput): string {
  const { bridgesSolved, filledUnits, gapUnits, denominator } = input;
  const remaining = gapUnits - filledUnits;

  if (bridgesSolved <= 0) {
    if (filledUnits <= 0) {
      return "Pick one plank to start — watch how the gap number changes.";
    }
    if (remaining > 0) {
      return `Close — ${formatScaled(remaining, denominator)} still open. Try a smaller plank to finish the span.`;
    }
    if (remaining < 0) {
      return `A little long by ${formatScaled(Math.abs(remaining), denominator)}. Try swapping one plank for a shorter one.`;
    }
    return "The span is closed — press Check it to finish the bridge.";
  }

  if (bridgesSolved === 1) {
    return "Good building — try two smaller planks that add up to the span.";
  }

  return "Strong building — keep combining planks to close each span.";
}

/** Primary CTA: starts a NEW untimed same-skill round (never extends). */
export function untimedRetryCtaLabel(): string {
  return "Try again — same skill, no timer";
}

/** Secondary path to the timed challenge, without guilt framing. */
export function timedChallengeCtaLabel(): string {
  return "Try the timed challenge";
}

/**
 * Banned copy audit for the timeout surface (GAME-304 AC4).
 * Covers: "more time" / extension affordances, pause-extension, administrative
 * freeze as the sole message, shame / streak-loss framing.
 *
 * Checked against lowercased DOM text + URL params. Internal engine
 * identifiers (e.g. `failedPlacements`) are code, not child-facing copy —
 * audit the rendered text, not source.
 */
export const TIMEOUT_BANNED_PATTERNS: readonly RegExp[] = [
  /more time/i,
  /extra time/i,
  /extra seconds?/i,
  /more seconds?/i,
  /\bextend\b/i,
  /extension/i,
  /keep playing/i,
  /don't lose/i,
  /\bhurr(y|ied)\b/i,
  /\bfrozen\b/i,
  /ran out of time/i,
  /\bstreak\b/i,
  /\blost\b/i,
  /\bfailed\b/i,
  /\bwrong\b/i,
  /roundSeconds/i,
  /deadline\s*=\s*never/i,
];

/** Returns the banned patterns that match the given text (empty = clean). */
export function auditTimeoutCopy(text: string): string[] {
  return TIMEOUT_BANNED_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}
