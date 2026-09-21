/**
 * GAME-305: first-session / learn onboarding for the Relaxed (untimed) path.
 *
 * UX_USER_FLOW §1.1: the only unclocked mode in v1 is **Relaxed build**, and it
 * is **free-site only** — hidden inside the earned break. The retired names
 * "Workshop" / "Sandbox" (and any free-build shelf) are an explicit non-goal;
 * no player-facing copy may market them.
 *
 * First session leads with the untimed path so a new player is never forced
 * into 90 s of clock pressure before they have learned the loop. The timed
 * challenge stays one tap away and is never removed or reframed as guilt.
 */

export type RelaxedSurface = "free" | "break";

/**
 * Containment rule (UX_USER_FLOW §1.1): Relaxed build is reachable on the free
 * site only. From an earned-break entry no route, control, flag or parameter
 * may reach it. Encoding the rule as a pure predicate keeps it unit-testable
 * instead of relying on a visible-strings DOM scan.
 */
export function isRelaxedAvailableForSurface(surface: RelaxedSurface): boolean {
  return surface === "free";
}

export const RELAXED_PREF_KEY = "bb.s0.relaxed.v1";
export const VISITED_KEY = "bb.s0.visited.v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    // Storage can throw (private mode, hardened contexts). Onboarding still
    // works in-session; it just cannot be remembered.
    return null;
  }
}

export interface RelaxedOnboarding {
  /** True when no earlier visit has been recorded on this device. */
  firstSession: boolean;
  /** Explicit remembered choice, or null when the player has not chosen yet. */
  rememberedRelaxed: boolean | null;
}

export function resolveRelaxedOnboarding(
  storage: StorageLike | null = defaultStorage(),
): RelaxedOnboarding {
  const visited = storage?.getItem(VISITED_KEY) === "1";
  const raw = storage?.getItem(RELAXED_PREF_KEY);
  const rememberedRelaxed = raw === "true" ? true : raw === "false" ? false : null;
  return { firstSession: !visited, rememberedRelaxed };
}

/** Record the player's explicit Relaxed choice and mark this device visited. */
export function persistRelaxedChoice(
  storage: StorageLike | null = defaultStorage(),
  relaxed: boolean,
): void {
  if (!storage) return;
  try {
    storage.setItem(RELAXED_PREF_KEY, relaxed ? "true" : "false");
    storage.setItem(VISITED_KEY, "1");
  } catch {
    // Best-effort only — never block play on a storage failure.
  }
}

/** First-session lead copy: untimed-first, honest, never markets retired modes. */
export function firstSessionLeadCopy(): string {
  return "New to Bridge Builder? Start with no timer — Relaxed build lets you finish up to 6 bridges with no clock.";
}

/** The timed challenge stays available on the first session, stated plainly. */
export function firstSessionTimedCopy(): string {
  return "Prefer the clock? The timed challenge is 90 seconds or 6 bridges, whichever comes first.";
}

/** Retired mode names that must never appear in player-facing copy (§1.1). */
export const RETIRED_MODE_NAMES: readonly RegExp[] = [
  /workshop/i,
  /sandbox/i,
  /free-build/i,
];

/** Returns the retired-mode patterns that match the given text (empty = clean). */
export function auditRetiredModeCopy(text: string): string[] {
  return RETIRED_MODE_NAMES.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}
