import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, KeyboardEvent } from "react";
import {
  advanceBridgeClock,
  applyBridgeHostSignal,
  createBridgeClock,
  expireBridgeClockAtCap,
  formatClockMs,
  type BridgeClockState,
} from "@/lib/bridgeBuilder/clock";
import { CANDIDATE_PUZZLE } from "@/lib/bridgeBuilder/candidatePuzzle";
import {
  createBridgeIntent,
  validateBridgeIntent,
  type BridgeIntent,
  type BridgeIntentAction,
  type BridgeIntentContext,
  type BridgeIntentRejectionReason,
} from "@/lib/bridgeBuilder/intents";
import { createSessionSink } from "@/lib/bridgeBuilder/telemetry";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import {
  applyBridgeIntent,
  createBridgeSession,
  type BridgeSessionState,
  type BridgeSessionEffect,
} from "@/lib/bridgeBuilder/session";
import { formatScaled } from "@/lib/bridgeBuilder/format";
import { createQualificationRound } from "@/lib/bridgeBuilder/qualificationRound";
import { closeBridgeSoundContext, playBridgeCue } from "@/lib/bridgeBuilder/sound";
import type { BridgePuzzle, Piece } from "@/lib/bridgeBuilder/types";
import { deriveBridgeViewModel, type BridgeNumberFace } from "@/lib/bridgeBuilder/viewModel";
import BridgeCanvas from "./BridgeCanvas";

function lastPlaced(state: BridgeSessionState): Piece | undefined {
  return state.placed[state.placed.length - 1];
}

function feedbackFor(state: BridgeSessionState): string {
  if (state.phase === "exact") return "Exact fit. The crossing is ready.";
  if (state.phase === "incorrectSubmit") {
    return state.lastOutcome?.status === "partial"
      ? `Still short by ${Math.abs(state.lastOutcome.diff)} units.`
      : `Too long by ${Math.abs(state.lastOutcome?.diff ?? 0)} units.`;
  }
  if (state.lastOutcome?.status === "overhang") {
    return `Too long by ${Math.abs(state.lastOutcome.diff)} units. Choose another plank.`;
  }
  if (state.lastOutcome?.status === "partial") {
    return `Placed. ${state.puzzle.gapUnits - state.lastOutcome.filledAfter} units remain.`;
  }
  return "Choose a plank, then place it in the open span.";
}

function formatPoints(state: BridgeSessionState): string {
  return `${state.score} points`;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `bb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function pieceLabel(piece: { units: number; label: string }): string {
  return `${piece.units} unit${Math.abs(piece.units) === 1 ? "" : "s"} plank`;
}

function targetSpanLabel(puzzle: BridgePuzzle): string {
  const value = formatScaled(puzzle.gapUnits, puzzle.denominator);
  const unit = Math.abs(puzzle.gapUnits) === puzzle.denominator ? "unit" : "units";
  return `${value} ${unit}`;
}

function questionText(puzzle: BridgePuzzle, bridgeNumber: number): string {
  const target = `${formatScaled(puzzle.gapUnits, puzzle.denominator)}-unit span`;
  const instruction = puzzle.presetPlaced.length > 0
    ? `Finish the ${target} by filling the missing amount.`
    : `Build the ${target} using the planks.`;
  return `Bridge ${bridgeNumber}: ${instruction}`;
}

function PieceFace({
  units,
  label,
  mode,
}: {
  units: number;
  label: string;
  mode: BridgeNumberFace;
}) {
  if (mode === "dots" && Number.isInteger(units) && units > 0 && units <= 10) {
    return (
      <span className="bb-dot-face" aria-hidden="true" data-testid="dot-face">
        {Array.from({ length: units }, (_, index) => (
          <span className="bb-dot" key={index} />
        ))}
      </span>
    );
  }
  return <span aria-hidden="true">{label}</span>;
}

export default function BridgeBuilderCandidate() {
  const roundSeedRef = useRef(20_260_919);
  const [roundPuzzles, setRoundPuzzles] = useState(() =>
    createQualificationRound(20_260_918, { firstPuzzle: CANDIDATE_PUZZLE }),
  );
  const [session, setSession] = useState<BridgeSessionState>(() =>
    createBridgeSession(roundPuzzles[0] ?? CANDIDATE_PUZZLE),
  );
  const [clock, setClock] = useState<BridgeClockState>(() =>
    createBridgeClock({ nowMs: performance.now() }),
  );
  const [intentContext, setIntentContext] = useState<BridgeIntentContext>(() => ({
    sessionId: newSessionId(),
    generation: 0,
  }));
  const intentContextRef = useRef(intentContext);
  const intentSequenceRef = useRef(0);
  const lastAcceptedSequenceRef = useRef(0);
  const telemetryRef = useRef(createSessionSink("free", () => performance.now()));
  const retryNoticeTimerRef = useRef<number | null>(null);
  const presentationDispatchRef = useRef<() => void>(() => {});
  const [hasStarted, setHasStarted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  const [muted, setMuted] = useState(false);
  const [numberFace, setNumberFace] = useState<BridgeNumberFace>("numerals");
  const [paused, setPaused] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 360 });
  const [announcement, setAnnouncement] = useState(feedbackFor(session));
  const [intentIssue, setIntentIssue] = useState<string | null>(null);
  const [rendererStatus, setRendererStatus] = useState<"loading" | "ready" | "failed">("loading");
  const soundRef = useRef<AudioContext | null>(null);
  const finishCuePlayedRef = useRef(false);

  const layout = useMemo(
    () => createBridgeLayout({ canvasWidth: canvasSize.width, canvasHeight: canvasSize.height }),
    [canvasSize],
  );
  const expired = clock.expired || clock.remainingMs === 0;
  const currentPuzzleIndex = Math.max(
    0,
    roundPuzzles.findIndex((puzzle) => puzzle.id === session.puzzle.id),
  );
  const roundComplete = expired || session.bridgesSolved >= clock.capBridges;
  const viewModel = useMemo(
    () =>
      deriveBridgeViewModel(session, {
        layout,
        reducedMotion,
        muted,
        numberFace,
        crossing: session.phase === "exact" && !reducedMotion,
        session: {
          mode: clock.mode,
          sessionId: intentContext.sessionId,
          generation: intentContext.generation,
          capSeconds: clock.capSeconds,
          capBridges: clock.capBridges,
          deadlineMs: clock.deadlineMs,
          remainingMs: clock.remainingMs,
          pauseBudgetRemainingMs: clock.pauseBudgetRemainingMs,
          expired,
        },
      }),
    [clock, expired, intentContext, layout, muted, numberFace, reducedMotion, session],
  );
  const availablePieces = viewModel.pieceTray;
  const selectedPiece = session.selectedPieceId
    ? session.puzzle.tray.find((piece) => piece.id === session.selectedPieceId)
    : undefined;

  function playEffects(effects: readonly BridgeSessionEffect[]): void {
    if (muted) return;
    for (const effect of effects) {
      if (effect.type === "cue") playBridgeCue(soundRef, effect.cue);
    }
  }

  function playCue(cue: "pickup" | "finish"): void {
    if (!muted) playBridgeCue(soundRef, cue);
  }

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    const timer = window.setInterval(() => {
      setClock((previous) => advanceBridgeClock(previous, performance.now()));
    }, 200);
    const onVisibility = () => {
      setClock((previous) =>
        applyBridgeHostSignal(previous, {
          type: "visibility",
          hidden: document.hidden,
          atMs: performance.now(),
        }),
      );
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (expired && session.phase !== "exact") {
      setAnnouncement("Time is up. Your round is frozen.");
    }
  }, [expired, session.phase]);

  useEffect(() => {
    setClock((previous) => expireBridgeClockAtCap(previous, session.bridgesSolved));
  }, [session.bridgesSolved]);

  useEffect(() => {
    if (
      session.phase !== "exact" ||
      expired ||
      session.bridgesSolved >= clock.capBridges
    ) {
      return;
    }
    if (reducedMotion) {
      presentationDispatchRef.current();
      return;
    }
    const timer = window.setTimeout(() => presentationDispatchRef.current(), 600);
    return () => window.clearTimeout(timer);
  }, [clock.capBridges, expired, reducedMotion, session.bridgesSolved, session.phase, session.presentationGeneration]);

  useEffect(() => {
    if (session.phase !== "awaitingContinue" || expired || session.bridgesSolved >= clock.capBridges) return;

    const nextPuzzleIndex = session.bridgesSolved;
    const nextPuzzle = roundPuzzles[nextPuzzleIndex];
    if (!nextPuzzle) return;

    const nextContext = {
      ...intentContextRef.current,
      generation: intentContextRef.current.generation + 1,
    };
    intentContextRef.current = nextContext;
    setIntentContext(nextContext);
    setRendererStatus("loading");
    clearIntentIssue();
    setSession((previous) => {
      if (previous.phase !== "awaitingContinue" || previous.bridgesSolved !== nextPuzzleIndex) {
        return previous;
      }
      return createBridgeSession(nextPuzzle, {
        score: previous.score,
        starsTotal: previous.starsTotal,
        bridgesSolved: previous.bridgesSolved,
        maxBridges: previous.maxBridges,
        sessionSeconds: previous.sessionSeconds,
      });
    });
    setAnnouncement(questionText(nextPuzzle, nextPuzzleIndex + 1));
  }, [clock.capBridges, expired, roundPuzzles, session.bridgesSolved, session.phase]);

  useEffect(() => () => {
    if (retryNoticeTimerRef.current !== null) {
      window.clearTimeout(retryNoticeTimerRef.current);
    }
    closeBridgeSoundContext(soundRef);
  }, []);

  useEffect(() => {
    if (session.bridgesSolved >= clock.capBridges && !finishCuePlayedRef.current) {
      playCue("finish");
      finishCuePlayedRef.current = true;
    }
    if (session.bridgesSolved < clock.capBridges) finishCuePlayedRef.current = false;
  }, [clock.capBridges, muted, session.bridgesSolved]);

  function clearIntentIssue() {
    if (retryNoticeTimerRef.current !== null) {
      window.clearTimeout(retryNoticeTimerRef.current);
      retryNoticeTimerRef.current = null;
    }
    setIntentIssue(null);
  }

  function createIntent(action: BridgeIntentAction, context: BridgeIntentContext): BridgeIntent {
    intentSequenceRef.current += 1;
    return createBridgeIntent(action, context, intentSequenceRef.current);
  }

  function rejectIntent(reason: BridgeIntentRejectionReason | string, intentType?: string) {
    const safeReason: BridgeIntentRejectionReason = [
      "invalid-shape",
      "unknown-intent",
      "invalid-piece-id",
      "invalid-sequence",
      "invalid-session",
      "invalid-generation",
      "stale-session",
      "stale-generation",
      "duplicate-sequence",
      "stale-sequence",
    ].includes(reason)
      ? (reason as BridgeIntentRejectionReason)
      : "invalid-shape";
    const stale = ["stale-session", "stale-generation", "duplicate-sequence", "stale-sequence"].includes(safeReason);
    telemetryRef.current.emit(stale ? "stale_intent_dropped" : "invalid_intent_rejected", {
      reason: safeReason,
      intentType: typeof intentType === "string" ? intentType : "unknown",
    });
    clearIntentIssue();
    retryNoticeTimerRef.current = window.setTimeout(() => {
      setIntentIssue("That action could not be used. Tap again to retry.");
      retryNoticeTimerRef.current = null;
    }, 500);
  }

  function dispatch(intent: BridgeIntent) {
    const validation = validateBridgeIntent(intent, {
      ...intentContextRef.current,
      lastSeq: lastAcceptedSequenceRef.current,
    });
    if (!validation.ok) {
      rejectIntent(validation.reason, "type" in intent ? String(intent.type) : "unknown");
      return;
    }
    lastAcceptedSequenceRef.current = validation.intent.seq;
    clearIntentIssue();
    if (!hasStarted || expired) return;
    if (session.phase === "exact" && validation.intent.type !== "presentationComplete") return;
    if (validation.intent.type === "selectPiece") playCue("pickup");
    const result = applyBridgeIntent(session, validation.intent);
    playEffects(result.effects);
    setSession(result.state);
    setAnnouncement(feedbackFor(result.state));
  }

  function dispatchAction(action: BridgeIntentAction) {
    dispatch(createIntent(action, intentContextRef.current));
  }

  presentationDispatchRef.current = () => dispatchAction({ type: "presentationComplete" });

  function dispatchSequence(actions: readonly BridgeIntentAction[]) {
    if (!hasStarted || expired || session.phase === "exact") return;
    let next = session;
    for (const action of actions) {
      const intent = createIntent(action, intentContextRef.current);
      const validation = validateBridgeIntent(intent, {
        ...intentContextRef.current,
        lastSeq: lastAcceptedSequenceRef.current,
      });
      if (!validation.ok) {
        rejectIntent(validation.reason, action.type);
        return;
      }
      lastAcceptedSequenceRef.current = validation.intent.seq;
      if (validation.intent.type === "selectPiece") playCue("pickup");
      const result = applyBridgeIntent(next, validation.intent);
      playEffects(result.effects);
      next = result.state;
    }
    clearIntentIssue();
    setSession(next);
    setAnnouncement(feedbackFor(next));
  }

  function togglePause() {
    if (!hasStarted || expired) return;
    const nextPaused = !paused;
    setPaused(nextPaused);
    setClock((previous) =>
      applyBridgeHostSignal(previous, {
        type: "route",
        active: !nextPaused,
        atMs: performance.now(),
      }),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key.toLowerCase() === "u") {
      const piece = lastPlaced(session);
      if (piece) {
        event.preventDefault();
        dispatchAction({ type: "removePiece", pieceId: piece.id });
      }
    } else if (event.key.toLowerCase() === "r") {
      setAnnouncement(feedbackFor(session));
    } else if (event.key === "Escape") {
      event.preventDefault();
      togglePause();
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const pieceId = event.dataTransfer.getData("text/plain");
    const piece = session.puzzle.tray.find((candidate) => candidate.id === pieceId);
    if (piece) {
      dispatchSequence([
        { type: "selectPiece", pieceId: piece.id },
        { type: "placePiece", pieceId: piece.id },
      ]);
    }
  }

  function beginRound() {
    setClock(createBridgeClock({ nowMs: performance.now() }));
    setPaused(false);
    setHasStarted(true);
    setAnnouncement(questionText(session.puzzle, 1));
  }

  function startNewRound() {
    const nextPuzzles = createQualificationRound(roundSeedRef.current++, {
      previousPuzzle: session.puzzle,
    });
    const firstPuzzle = nextPuzzles[0] ?? CANDIDATE_PUZZLE;
    const nextContext = {
      sessionId: newSessionId(),
      generation: intentContextRef.current.generation + 1,
    };
    intentContextRef.current = nextContext;
    setIntentContext(nextContext);
    intentSequenceRef.current = 0;
    lastAcceptedSequenceRef.current = 0;
    setRoundPuzzles(nextPuzzles);
    setSession(createBridgeSession(firstPuzzle));
    setClock(createBridgeClock({ nowMs: performance.now() }));
    setPaused(false);
    setHasStarted(true);
    clearIntentIssue();
    setRendererStatus("loading");
    setAnnouncement(questionText(firstPuzzle, 1));
  }

  const bridgeStyle = {
    "--bb-span-width": `${Math.max(240, viewModel.span * viewModel.layout.unitPx)}px`,
  } as CSSProperties;

  return (
    <div
      className={`bb-candidate ${reducedMotion ? "bb-reduce-motion" : ""}`}
      data-testid="bridge-builder-candidate"
      data-verdict={viewModel.verdict ?? "building"}
      data-responsive={viewModel.responsive}
      data-paused={paused ? "true" : "false"}
      onKeyDown={handleKeyDown}
    >
      {!hasStarted ? (
        <section className="bb-candidate-setup" data-testid="bridge-setup" aria-labelledby="bridge-setup-title">
          <p className="eyebrow">Before you start</p>
          <h2 id="bridge-setup-title">Ready to build a bridge?</h2>
          <p>Each solved bridge brings a fresh target and plank set. Build up to 6 bridges in 90 seconds.</p>
          <fieldset className="bb-face-choice">
            <legend>How should plank values appear?</legend>
            <button
              type="button"
              data-testid="setup-numerals"
              aria-pressed={numberFace === "numerals"}
              onClick={() => setNumberFace("numerals")}
            >
              Numerals
            </button>
            <button
              type="button"
              data-testid="setup-dots"
              aria-pressed={numberFace === "dots"}
              onClick={() => setNumberFace("dots")}
            >
              Dots
            </button>
          </fieldset>
          <p className="muted-label">Numbers are the default. Dots show each plank value visually.</p>
          <button type="button" className="button primary" data-testid="bridge-start" onClick={beginRound}>
            Start building
          </button>
        </section>
      ) : (
        <>
          <header className="bb-candidate-header">
            <div>
              <p className="eyebrow">Your bridge</p>
              <h2>Build the bridge</h2>
              <p
                className="bb-candidate-lede"
                data-testid="bridge-question"
                data-puzzle-id={session.puzzle.id}
                data-gap-units={session.puzzle.gapUnits}
                aria-live="polite"
              >
                {questionText(session.puzzle, currentPuzzleIndex + 1)}
              </p>
            </div>
            <div className="bb-candidate-settings" aria-label="Game settings">
              <span className="bb-setting-label">Number style</span>
              <button type="button" className="bb-small-button" onClick={() => setReducedMotion((value) => !value)}>
                {reducedMotion ? "Motion off" : "Reduce motion"}
              </button>
              <button type="button" className="bb-small-button" onClick={() => setMuted((value) => !value)}>
                {muted ? "Sound off" : "Mute sound"}
              </button>
              <button
                type="button"
                className="bb-small-button"
                data-testid="toggle-face-mode"
                onClick={() => setNumberFace((face) => face === "numerals" ? "dots" : "numerals")}
              >
                {numberFace === "numerals" ? "Use dots" : "Use numbers"}
              </button>
            </div>
          </header>

          <div className="bb-candidate-status" aria-label="Round status">
            <span data-testid="bridge-progress">
              Bridge {Math.min(currentPuzzleIndex + 1, clock.capBridges)} of {clock.capBridges}
            </span>
            <span data-testid="bridge-clock" className={clock.remainingMs <= 10_000 ? "timer-low" : "timer"}>
              {formatClockMs(clock.remainingMs)}
            </span>
            <span>{formatPoints(session)}</span>
            <button type="button" className="link-button" onClick={togglePause}>
              {paused ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="bb-candidate-board">
            <BridgeCanvas
              key={intentContext.generation}
              viewModel={viewModel}
              paused={paused}
              onResize={(width, height) => setCanvasSize((previous) =>
                previous.width === width && previous.height === height ? previous : { width, height },
              )}
              createIntent={createIntent}
              onIntent={dispatch}
              onStatusChange={setRendererStatus}
              onVersionSkew={(rendererVersion, viewModelVersion) => {
                telemetryRef.current.emit("renderer_version_skew", {
                  rendererVersion,
                  viewModelVersion,
                });
                setIntentIssue("This display version needs a refresh. Your bridge can still be played in the accessible view.");
              }}
              onInvalidIntent={(reason) => rejectIntent(reason)}
            />

            <section
              className="bb-candidate-mirror"
              data-testid="bridge-dom-mirror"
              data-verdict={viewModel.verdict ?? "building"}
              data-crossing={viewModel.crossing ? "true" : "false"}
              data-reduced-motion={reducedMotion ? "true" : "false"}
              aria-labelledby="bridge-mirror-title"
            >
              <div className="bb-mirror-heading">
                <div>
                  <p className="eyebrow">Accessible bridge view</p>
                  <h3 id="bridge-mirror-title">
                    {session.puzzle.presetPlaced.length > 0 ? "Find the missing amount" : "Place the planks"}
                  </h3>
                </div>
                <span className="bb-renderer-status" data-testid="renderer-status">
                  {rendererStatus === "ready" ? "Canvas ready" : rendererStatus === "failed" ? "DOM view active" : "Canvas loading"}
                </span>
              </div>

              <p className="bb-span-copy" data-testid="bridge-span-copy" aria-live="polite">
                The gap needs <strong>{targetSpanLabel(session.puzzle)}</strong>. You have filled <strong>{viewModel.filledUnits}</strong>.
                {viewModel.remainingSpan > 0 ? ` ${viewModel.remainingSpan} units remain.` : " The span is closed."}
              </p>

              <div
                className={`bb-candidate-bridge ${viewModel.exact ? "is-exact" : ""} ${viewModel.overfill ? "is-over" : ""}`}
                style={bridgeStyle}
                data-state={viewModel.exact ? "exact" : viewModel.overfill ? "overfill" : "underfill"}
                role="group"
                aria-label="Bridge span"
              >
                {viewModel.placed.map((piece) => (
                  <button
                    key={piece.id}
                    type="button"
                    className="bb-candidate-placed"
                    data-testid={`placed-${piece.id}`}
                    aria-label={`Remove ${pieceLabel(piece)}`}
                    disabled={expired || session.phase === "exact"}
                    onClick={() => dispatchAction({ type: "removePiece", pieceId: piece.id })}
                  >
                    <PieceFace units={piece.units} label={String(piece.units)} mode={numberFace} />
                  </button>
                ))}
                <button
                  type="button"
                  className={`bb-candidate-open-slot ${viewModel.overfill ? "is-over" : ""} ${viewModel.exact ? "is-exact" : ""}`}
                  data-testid="bridge-open-slot"
                  aria-label={selectedPiece ? `Place ${pieceLabel(selectedPiece)} in the open span` : "Open span; select a plank first"}
                  disabled={!viewModel.capabilities.canPlace}
                  onClick={() => selectedPiece && dispatchAction({ type: "placePiece", pieceId: selectedPiece.id })}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  {viewModel.remainingSpan > 0 ? `${viewModel.remainingSpan} open` : "Closed"}
                </button>
              </div>

              <div className="bb-candidate-tray" role="group" aria-label="Piece tray">
                {availablePieces.map((piece) => (
                  <button
                    key={piece.id}
                    type="button"
                    className={`bb-candidate-piece ${piece.selected ? "is-selected" : ""} ${piece.focused ? "is-focused" : ""}`}
                    data-testid={`piece-${piece.id}`}
                    data-piece-id={piece.id}
                    data-units={piece.units}
                    data-face-mode={numberFace}
                    draggable={!expired}
                    disabled={expired}
                    aria-label={pieceLabel(piece)}
                    aria-pressed={piece.selected}
                    onClick={() => dispatchAction({ type: "selectPiece", pieceId: piece.id })}
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", piece.id)}
                  >
                    <span className="bb-piece-grain" aria-hidden="true"></span>
                    <PieceFace units={piece.units} label={piece.label} mode={numberFace} />
                  </button>
                ))}
              </div>

              <div className="bb-candidate-actions">
                <button
                  type="button"
                  className="button primary"
                  data-testid="bridge-submit"
                  disabled={!viewModel.capabilities.canSubmit}
                  onClick={() => dispatchAction({ type: "submit" })}
                >
                  Check it
                </button>
                <button
                  type="button"
                  className="button"
                  data-testid="bridge-undo"
                  disabled={!viewModel.capabilities.canRemove}
                  onClick={() => {
                    const piece = lastPlaced(session);
                    if (piece) dispatchAction({ type: "removePiece", pieceId: piece.id });
                  }}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="button"
                  data-testid="bridge-reset"
                  disabled={expired || session.phase === "exact" || session.phase === "awaitingContinue"}
                  onClick={() => dispatchAction({ type: "reset" })}
                >
                  Reset
                </button>
                {session.phase === "incorrectSubmit" ? (
                  <button type="button" className="button" data-testid="bridge-retry" onClick={() => dispatchAction({ type: "continue" })}>
                    Try again
                  </button>
                ) : null}
              </div>

              {intentIssue ? (
                <p className="bb-intent-retry" role="status" data-testid="intent-retry">
                  {intentIssue}{" "}
                  <button type="button" className="link-button" onClick={clearIntentIssue}>Tap again</button>
                </p>
              ) : null}

              <p
                className={`bb-candidate-feedback ${viewModel.exact ? "is-success" : viewModel.overfill || viewModel.incorrectSubmit ? "is-correction" : ""}`}
                data-testid="bridge-feedback"
                data-state={viewModel.exact ? "exact" : viewModel.overfill ? "overfill" : viewModel.underfill ? "underfill" : "building"}
                aria-live="polite"
              >
                {announcement}
              </p>
            </section>
          </div>

          {paused ? (
            <div className="bb-candidate-pause" role="dialog" aria-modal="true" aria-label="Game paused">
              <div className="bb-candidate-pause-card">
                <p className="eyebrow">Paused</p>
                <h3>Paused — the clock is waiting.</h3>
                <p>
                  {clock.pauseBudgetRemainingMs > 0
                    ? `Up to ${Math.ceil(clock.pauseBudgetRemainingMs / 1000)} seconds of pause.`
                    : "No pause time remains; resume to keep going."}
                </p>
                <button type="button" className="button primary" onClick={togglePause}>Resume bridge</button>
              </div>
            </div>
          ) : null}

          {expired && session.phase !== "exact" ? (
            <div className="bb-candidate-expired" role="status" data-testid="bridge-expired">
              <strong>Round complete</strong>
              <span>
                {session.bridgesSolved >= clock.capBridges
                  ? "All six bridges are complete."
                  : "Time is up. Your round is frozen."}
              </span>
            </div>
          ) : null}

          {roundComplete ? (
            <section className="bb-candidate-summary" data-testid="bridge-summary" aria-labelledby="bridge-summary-title">
              <p className="eyebrow">Round complete</p>
              <h3 id="bridge-summary-title">
                You solved {session.bridgesSolved} bridge{session.bridgesSolved === 1 ? "" : "s"}.
              </h3>
              <p>{formatPoints(session)} · {session.starsTotal} stars</p>
              <p className="muted-label">Your progress stays on this device for this round.</p>
              <button type="button" className="button primary" onClick={startNewRound}>Start a new round</button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
