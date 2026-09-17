/**
 * Pure Bridge Builder session reducer.
 *
 * Exact composition and verdicts are authoritative here. Pixel positions from
 * any renderer never enter this module. Timers, speech, and DOM focus stay in
 * the host.
 */

import { computeNextHint } from "./hints";
import {
  availableTray,
  BRIDGE_MAX_BRIDGES,
  BRIDGE_SESSION_SECONDS,
  compositionUnits,
  exactFitVerdict,
  maxShimAbs,
} from "./exactness";
import type { BridgeIntent } from "./intents";
import {
  evaluatePlacement,
  formatDiff,
  scorePuzzle,
  starsFor,
} from "./engine";
import type {
  BridgePuzzle,
  Piece,
  PlacementOutcome,
  PlacementStatus,
} from "./types";

export type BridgePuzzlePhase =
  | "building"
  | "exact"
  | "incorrectSubmit"
  | "awaitingContinue";

export interface BridgeSessionState {
  puzzle: BridgePuzzle;
  /** Full tray inventory for this puzzle (placed pieces remain listed until removed). */
  tray: Piece[];
  placed: Piece[];
  selectedPieceId: string | null;
  attempts: number;
  failedPlacements: number;
  hintLevel: 0 | 1 | 2 | 3;
  secondActive: boolean;
  phase: BridgePuzzlePhase;
  lastOutcome: PlacementOutcome | null;
  lastOverhang: { units: number; label: string } | null;
  lastHintMessage: string | null;
  highlightPieceId: string | null;
  ghostUnits: number | null;
  score: number;
  starsTotal: number;
  bridgesSolved: number;
  maxBridges: number;
  sessionSeconds: number;
  presentationGeneration: number;
}

export type BridgeSessionEffect =
  | { type: "announce"; text: string }
  | { type: "cue"; cue: "place" | "overhang" | "solve" | "pickup" }
  | { type: "telemetry"; event: string; payload: Record<string, unknown> }
  | { type: "offerSecondBuild" }
  | { type: "advanceOrFinish" }
  | { type: "freshTray" };

export interface BridgeSessionResult {
  state: BridgeSessionState;
  effects: BridgeSessionEffect[];
}

export function createBridgeSession(
  puzzle: BridgePuzzle,
  options: {
    secondActive?: boolean;
    score?: number;
    starsTotal?: number;
    bridgesSolved?: number;
    maxBridges?: number;
    sessionSeconds?: number;
  } = {}
): BridgeSessionState {
  return {
    puzzle,
    tray: [...puzzle.tray],
    placed: [],
    selectedPieceId: null,
    attempts: 0,
    failedPlacements: 0,
    hintLevel: 0,
    secondActive: options.secondActive ?? false,
    phase: "building",
    lastOutcome: null,
    lastOverhang: null,
    lastHintMessage: null,
    highlightPieceId: null,
    ghostUnits: null,
    score: options.score ?? 0,
    starsTotal: options.starsTotal ?? 0,
    bridgesSolved: options.bridgesSolved ?? 0,
    maxBridges: options.maxBridges ?? BRIDGE_MAX_BRIDGES,
    sessionSeconds: options.sessionSeconds ?? BRIDGE_SESSION_SECONDS,
    presentationGeneration: 0,
  };
}

export function filledUnitsOf(state: BridgeSessionState): number {
  return compositionUnits(state.puzzle, state.placed);
}

export function traySortedOf(state: BridgeSessionState): Piece[] {
  return availableTray(state.tray, state.placed);
}

function withEffects(
  state: BridgeSessionState,
  effects: BridgeSessionEffect[] = []
): BridgeSessionResult {
  return { state, effects };
}

function noop(state: BridgeSessionState): BridgeSessionResult {
  return withEffects(state);
}

function findTrayPiece(state: BridgeSessionState, pieceId: string): Piece | undefined {
  return traySortedOf(state).find((piece) => piece.id === pieceId);
}

function selectPiece(state: BridgeSessionState, pieceId: string): BridgeSessionResult {
  if (state.phase !== "building") return noop(state);
  const piece = findTrayPiece(state, pieceId);
  if (!piece) return noop(state);
  return withEffects({
    ...state,
    selectedPieceId: pieceId,
    lastOverhang: null,
  });
}

function placePiece(state: BridgeSessionState, pieceId: string): BridgeSessionResult {
  if (state.phase !== "building") return noop(state);
  const piece = findTrayPiece(state, pieceId);
  if (!piece) {
    return withEffects(state, [
      { type: "announce", text: "Tap a plank first, then the gap." },
    ]);
  }

  const filled = filledUnitsOf(state);
  if (piece.units < 0 && filled <= state.puzzle.gapUnits) {
    return withEffects(state, [
      {
        type: "announce",
        text: "Minus shims repair an overshoot. Build up to the gap first.",
      },
    ]);
  }

  const tray = traySortedOf(state);
  const outcome = evaluatePlacement(state.puzzle, filled, piece.units, {
    allowOvershootUpTo: maxShimAbs(tray),
  });
  const attempts = state.attempts + 1;
  const effects: BridgeSessionEffect[] = [
    {
      type: "telemetry",
      event: "place_attempt",
      payload: { pieceUnits: piece.units, result: outcome.status, diff: outcome.diff },
    },
  ];

  if (outcome.status === "overhang") {
    return withEffects(
      {
        ...state,
        attempts,
        failedPlacements: state.failedPlacements + 1,
        lastOutcome: outcome,
        lastOverhang: { units: piece.units, label: piece.label },
        selectedPieceId: state.selectedPieceId === pieceId ? null : state.selectedPieceId,
      },
      [
        ...effects,
        { type: "cue", cue: "overhang" },
        {
          type: "announce",
          text: `${piece.label} is too long by ${formatDiff(outcome.diff, state.puzzle.denominator)}.`,
        },
      ]
    );
  }

  const nextPlaced = [...state.placed, piece];
  let nextState: BridgeSessionState = {
    ...state,
    attempts,
    placed: nextPlaced,
    selectedPieceId: null,
    lastOutcome: outcome,
    lastOverhang: null,
  };
  effects.push({ type: "cue", cue: "place" });

  if (outcome.status === "overshoot") {
    nextState = {
      ...nextState,
      failedPlacements: state.failedPlacements + 1,
    };
    effects.push({
      type: "announce",
      text: `Overshot by ${formatDiff(outcome.diff, state.puzzle.denominator)}. Add a minus shim to fix it.`,
    });
    return withEffects(nextState, effects);
  }

  if (outcome.status === "fit") {
    return resolveExactFit(nextState, effects, attempts);
  }

  effects.push({
    type: "announce",
    text: `Placed ${piece.label}. Filled so far: ${formatDiff(outcome.filledAfter, state.puzzle.denominator)}.`,
  });

  const remainingTray = availableTray(nextState.tray, nextPlaced);
  const remainingPositive = remainingTray
    .filter((p) => p.units > 0)
    .reduce((sum, p) => sum + p.units, 0);
  const remainingNeed = state.puzzle.gapUnits - outcome.filledAfter;
  if (remainingNeed > 0 && remainingPositive < remainingNeed) {
    effects.push({
      type: "telemetry",
      event: "invariant_violation",
      payload: { where: "tray-cannot-cover-gap", puzzleId: state.puzzle.id },
    });
    effects.push({ type: "announce", text: "Fresh planks delivered." });
    effects.push({ type: "freshTray" });
    return withEffects(
      {
        ...nextState,
        placed: [],
        selectedPieceId: null,
        lastOutcome: null,
      },
      effects
    );
  }

  return withEffects(nextState, effects);
}

function resolveExactFit(
  state: BridgeSessionState,
  effects: BridgeSessionEffect[],
  attempts: number
): BridgeSessionResult {
  const earned = scorePuzzle({
    hintLevelMax: state.hintLevel,
    secondBuild: state.secondActive,
    streakBefore: state.bridgesSolved,
  });
  const earnedStars = starsFor({
    piecesUsed: state.placed.length,
    par: state.puzzle.parPieces,
    hintLevelMax: state.hintLevel,
  });
  effects.push({ type: "cue", cue: "solve" });
  effects.push({
    type: "telemetry",
    event: "puzzle_solved",
    payload: {
      puzzleId: state.puzzle.id,
      skillId: state.puzzle.skillId,
      piecesUsed: state.placed.length,
      par: state.puzzle.parPieces,
      hintLevelMax: state.hintLevel,
      secondBuild: state.secondActive,
      points: earned,
      attempts,
    },
  });
  effects.push({
    type: "announce",
    text: state.secondActive
      ? `Different build fits! Plus ${earned} points.`
      : `It fits exactly! Plus ${earned} points.`,
  });

  const bridgesSolved = state.bridgesSolved + 1;
  const offerSecond =
    !state.secondActive &&
    state.puzzle.supportsSecondConstruction &&
    bridgesSolved % 2 === 0;

  const next: BridgeSessionState = {
    ...state,
    failedPlacements: 0,
    phase: "exact",
    score: state.score + earned,
    starsTotal: state.starsTotal + earnedStars,
    bridgesSolved,
    lastOutcome: { status: "fit", diff: 0, filledAfter: state.puzzle.gapUnits },
    presentationGeneration: state.presentationGeneration + 1,
  };

  if (offerSecond) {
    effects.push({ type: "offerSecondBuild" });
  } else {
    effects.push({ type: "advanceOrFinish" });
  }

  return withEffects(next, effects);
}

function removePiece(state: BridgeSessionState, pieceId: string): BridgeSessionResult {
  if (state.phase !== "building") return noop(state);
  const piece = state.placed.find((p) => p.id === pieceId);
  if (!piece) return noop(state);
  return withEffects(
    {
      ...state,
      placed: state.placed.filter((p) => p.id !== pieceId),
      lastOutcome: null,
      lastOverhang: null,
      phase: "building",
    },
    [
      {
        type: "telemetry",
        event: "plank_lift",
        payload: { pieceId: piece.id, units: piece.units },
      },
      { type: "announce", text: `Picked ${piece.label} back up.` },
    ]
  );
}

function reset(state: BridgeSessionState): BridgeSessionResult {
  if (state.phase === "exact") return noop(state);
  return withEffects(
    {
      ...state,
      placed: [],
      selectedPieceId: null,
      lastOutcome: null,
      lastOverhang: null,
      phase: "building",
      highlightPieceId: null,
      ghostUnits: null,
    },
    [{ type: "announce", text: "Bridge cleared. Fresh start." }]
  );
}

function submit(state: BridgeSessionState): BridgeSessionResult {
  if (state.phase !== "building") return noop(state);
  const filled = filledUnitsOf(state);
  const verdict = exactFitVerdict(state.puzzle.gapUnits, filled);
  if (verdict === "exact") {
    return resolveExactFit(
      {
        ...state,
        attempts: Math.max(1, state.attempts),
      },
      [],
      Math.max(1, state.attempts)
    );
  }
  const remaining = Math.abs(state.puzzle.gapUnits - filled);
  return withEffects(
    {
      ...state,
      phase: "incorrectSubmit",
      lastOutcome: {
        status: (verdict === "underfill" ? "partial" : "overhang") as PlacementStatus,
        diff: remaining,
        filledAfter: filled,
      },
    },
    [
      {
        type: "announce",
        text:
          verdict === "underfill"
            ? `Still short by ${formatDiff(remaining, state.puzzle.denominator)}.`
            : `Too long by ${formatDiff(remaining, state.puzzle.denominator)}.`,
      },
    ]
  );
}

function requestHint(state: BridgeSessionState): BridgeSessionResult {
  if (state.phase !== "building" && state.phase !== "incorrectSubmit") {
    return noop(state);
  }
  const tray = traySortedOf(state);
  const pieces = new Map(tray.map((piece) => [piece.units, piece.id] as const));
  const hint = computeNextHint(
    {
      gapUnits: state.puzzle.gapUnits,
      filledUnits: filledUnitsOf(state),
      trayValues: tray.map((piece) => piece.units),
      attempts: state.attempts,
      hintLevelShown: state.hintLevel,
    },
    {
      pieces,
      denominator: state.puzzle.denominator,
      formatDiff,
    }
  );
  if (!hint) return noop(state);
  return withEffects(
    {
      ...state,
      phase: "building",
      hintLevel: hint.level,
      lastHintMessage: hint.message ?? state.lastHintMessage,
      highlightPieceId: hint.highlightPieceId ?? null,
      ghostUnits: hint.ghostUnits ?? null,
    },
    [
      {
        type: "telemetry",
        event: "hint_shown",
        payload: { level: hint.level, auto: false },
      },
      ...(hint.message ? [{ type: "announce" as const, text: hint.message }] : []),
    ]
  );
}

function continueSession(state: BridgeSessionState): BridgeSessionResult {
  if (state.phase === "incorrectSubmit") {
    return withEffects({ ...state, phase: "building" });
  }
  if (state.phase === "exact" || state.phase === "awaitingContinue") {
    return withEffects(
      { ...state, phase: "awaitingContinue" },
      [{ type: "advanceOrFinish" }]
    );
  }
  return noop(state);
}

function presentationComplete(state: BridgeSessionState): BridgeSessionResult {
  if (state.phase !== "exact") return noop(state);
  return withEffects({
    ...state,
    phase: "awaitingContinue",
    presentationGeneration: state.presentationGeneration + 1,
  });
}

export function applyBridgeIntent(
  state: BridgeSessionState,
  intent: BridgeIntent
): BridgeSessionResult {
  switch (intent.type) {
    case "selectPiece":
      return selectPiece(state, intent.pieceId);
    case "placePiece":
      return placePiece(state, intent.pieceId);
    case "removePiece":
      return removePiece(state, intent.pieceId);
    case "reset":
      return reset(state);
    case "submit":
      return submit(state);
    case "requestHint":
      return requestHint(state);
    case "continue":
      return continueSession(state);
    case "presentationComplete":
      return presentationComplete(state);
    default: {
      const _exhaustive: never = intent;
      void _exhaustive;
      return noop(state);
    }
  }
}

/** Begin a second-construction attempt on the same puzzle. */
export function beginSecondBuild(state: BridgeSessionState): BridgeSessionState {
  return {
    ...state,
    placed: [],
    selectedPieceId: null,
    hintLevel: 0,
    attempts: 0,
    failedPlacements: 0,
    secondActive: true,
    phase: "building",
    lastOutcome: null,
    lastOverhang: null,
    lastHintMessage: null,
    highlightPieceId: null,
    ghostUnits: null,
  };
}

/** Load the next puzzle while preserving session score totals. */
export function loadPuzzleIntoSession(
  state: BridgeSessionState,
  puzzle: BridgePuzzle
): BridgeSessionState {
  return createBridgeSession(puzzle, {
    score: state.score,
    starsTotal: state.starsTotal,
    bridgesSolved: state.bridgesSolved,
    maxBridges: state.maxBridges,
    sessionSeconds: state.sessionSeconds,
  });
}

/**
 * Hydrate a playing snapshot from the React host so place/remove/reset share
 * one pure authority with every presentation adapter.
 */
export function hydrateBridgeSession(input: {
  puzzle: BridgePuzzle;
  tray: Piece[];
  placed: Piece[];
  selectedPieceId: string | null;
  attempts: number;
  failedPlacements: number;
  hintLevel: 0 | 1 | 2 | 3;
  secondActive: boolean;
  score: number;
  starsTotal: number;
  bridgesSolved: number;
}): BridgeSessionState {
  return {
    ...createBridgeSession(input.puzzle, {
      secondActive: input.secondActive,
      score: input.score,
      starsTotal: input.starsTotal,
      bridgesSolved: input.bridgesSolved,
    }),
    tray: [...input.tray],
    placed: [...input.placed],
    selectedPieceId: input.selectedPieceId,
    attempts: input.attempts,
    failedPlacements: input.failedPlacements,
    hintLevel: input.hintLevel,
  };
}
