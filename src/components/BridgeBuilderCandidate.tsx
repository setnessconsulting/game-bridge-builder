import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, DragEvent, KeyboardEvent } from "react";
import {
  advanceBridgeClock,
  applyBridgeHostSignal,
  createBridgeClock,
  formatClockMs,
  type BridgeClockState,
} from "@/lib/bridgeBuilder/clock";
import { CANDIDATE_PUZZLE } from "@/lib/bridgeBuilder/candidatePuzzle";
import type { BridgeIntent } from "@/lib/bridgeBuilder/intents";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import {
  applyBridgeIntent,
  createBridgeSession,
  type BridgeSessionState,
} from "@/lib/bridgeBuilder/session";
import type { Piece } from "@/lib/bridgeBuilder/types";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
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

export default function BridgeBuilderCandidate() {
  const [session, setSession] = useState<BridgeSessionState>(() =>
    createBridgeSession(CANDIDATE_PUZZLE),
  );
  const [clock, setClock] = useState<BridgeClockState>(() =>
    createBridgeClock({ nowMs: performance.now() }),
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState(feedbackFor(session));
  const [rendererStatus, setRendererStatus] = useState<"loading" | "ready" | "failed">("loading");

  const layout = useMemo(() => createBridgeLayout({ canvasWidth: 640, canvasHeight: 360 }), []);
  const viewModel = useMemo(
    () => deriveBridgeViewModel(session, { layout, reducedMotion }),
    [layout, reducedMotion, session],
  );
  const availablePieces = viewModel.pieceTray;
  const expired = clock.expired || clock.remainingMs === 0;
  const selectedPiece = session.selectedPieceId
    ? CANDIDATE_PUZZLE.tray.find((piece) => piece.id === session.selectedPieceId)
    : undefined;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (expired && session.phase !== "exact") {
      setAnnouncement("Time is up. This round is frozen before returning.");
    }
  }, [expired, session.phase]);

  function dispatch(intent: BridgeIntent) {
    if (expired || session.phase === "exact") return;
    const result = applyBridgeIntent(session, intent);
    setSession(result.state);
    setAnnouncement(feedbackFor(result.state));
  }

  function dispatchSequence(intents: readonly BridgeIntent[]) {
    if (expired || session.phase === "exact") return;
    let next = session;
    for (const intent of intents) {
      const result = applyBridgeIntent(next, intent);
      next = result.state;
    }
    setSession(next);
    setAnnouncement(feedbackFor(next));
  }

  function togglePause() {
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
        dispatch({ type: "removePiece", pieceId: piece.id });
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
    const piece = CANDIDATE_PUZZLE.tray.find((candidate) => candidate.id === pieceId);
    if (piece) {
      dispatchSequence([
        { type: "selectPiece", pieceId: piece.id },
        { type: "placePiece", pieceId: piece.id },
      ]);
    }
  }

  function resetRound() {
    setSession(createBridgeSession(CANDIDATE_PUZZLE));
    setClock(createBridgeClock({ nowMs: performance.now() }));
    setPaused(false);
    setAnnouncement("Bridge reset. Choose a plank, then place it in the open span.");
  }

  const bridgeStyle = {
    "--bb-span-width": `${Math.max(240, viewModel.span * 24)}px`,
  } as CSSProperties;

  return (
    <div
      className={`bb-candidate ${reducedMotion ? "bb-reduce-motion" : ""}`}
      data-testid="bridge-builder-candidate"
      onKeyDown={handleKeyDown}
    >
      <header className="bb-candidate-header">
        <div>
          <p className="eyebrow">Qualification vertical slice</p>
          <h2>Build the bridge</h2>
          <p className="bb-candidate-lede">
            Compose the labeled planks so the 10-unit span closes exactly. The engine decides the
            answer; the canvas only presents it.
          </p>
        </div>
        <div className="bb-candidate-settings" aria-label="Game settings">
          <span className="pill">Early bridge math</span>
          <button type="button" className="bb-small-button" onClick={() => setReducedMotion((value) => !value)}>
            {reducedMotion ? "Motion off" : "Reduce motion"}
          </button>
          <button type="button" className="bb-small-button" onClick={() => setMuted((value) => !value)}>
            {muted ? "Sound off" : "Mute sound"}
          </button>
        </div>
      </header>

      <div className="bb-candidate-status" aria-label="Round status">
        <span>Bridge {Math.min(session.bridgesSolved + 1, 6)} of 6</span>
        <span data-testid="bridge-clock" className={clock.remainingMs <= 10_000 ? "timer-low" : "timer"}>
          {formatClockMs(clock.remainingMs)}
        </span>
        <span>{formatPoints(session)}</span>
        <button type="button" className="link-button" onClick={togglePause}>
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      <div className="bb-candidate-board">
        <BridgeCanvas viewModel={viewModel} onIntent={dispatch} onStatusChange={setRendererStatus} />

        <section className="bb-candidate-mirror" data-testid="bridge-dom-mirror" aria-labelledby="bridge-mirror-title">
          <div className="bb-mirror-heading">
            <div>
              <p className="eyebrow">Accessible bridge view</p>
              <h3 id="bridge-mirror-title">Place the planks</h3>
            </div>
            <span className="bb-renderer-status" data-testid="renderer-status">
              {rendererStatus === "ready" ? "Canvas ready" : rendererStatus === "failed" ? "DOM view active" : "Canvas loading"}
            </span>
          </div>

          <p className="bb-span-copy" aria-live="polite">
            The gap needs <strong>{viewModel.spanLabel}</strong>. You have filled <strong>{viewModel.filledUnits}</strong>.
            {viewModel.remainingSpan > 0 ? ` ${viewModel.remainingSpan} units remain.` : " The span is closed."}
          </p>

          <div className="bb-candidate-bridge" style={bridgeStyle} role="group" aria-label="Bridge span">
            {viewModel.placed.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className="bb-candidate-placed"
                data-testid={`placed-${piece.id}`}
                aria-label={`Remove ${piece.label}`}
                onClick={() => dispatch({ type: "removePiece", pieceId: piece.id })}
              >
                {piece.units}
              </button>
            ))}
            <button
              type="button"
              className={`bb-candidate-open-slot ${viewModel.overfill ? "is-over" : ""}`}
              data-testid="bridge-open-slot"
              aria-label={selectedPiece ? `Place ${selectedPiece.label} in the open span` : "Open span; select a plank first"}
              disabled={expired || session.phase === "exact"}
              onClick={() => selectedPiece && dispatch({ type: "placePiece", pieceId: selectedPiece.id })}
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
                className={`bb-candidate-piece ${piece.selected ? "is-selected" : ""}`}
                data-testid={`piece-${piece.id}`}
                data-piece-id={piece.id}
                data-units={piece.units}
                draggable={!expired}
                aria-pressed={piece.selected}
                onClick={() => dispatch({ type: "selectPiece", pieceId: piece.id })}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", piece.id)}
              >
                <span className="bb-piece-grain" aria-hidden="true"></span>
                <span>{piece.label}</span>
              </button>
            ))}
          </div>

          <div className="bb-candidate-actions">
            <button
              type="button"
              className="button primary"
              data-testid="bridge-submit"
              disabled={!session.placed.length || expired || session.phase === "exact"}
              onClick={() => dispatch({ type: "submit" })}
            >
              Check it
            </button>
            <button
              type="button"
              className="button"
              data-testid="bridge-undo"
              disabled={!lastPlaced(session) || expired || session.phase === "exact"}
              onClick={() => {
                const piece = lastPlaced(session);
                if (piece) dispatch({ type: "removePiece", pieceId: piece.id });
              }}
            >
              Undo
            </button>
            <button type="button" className="button" data-testid="bridge-reset" onClick={resetRound}>
              Reset
            </button>
            {session.phase === "incorrectSubmit" ? (
              <button type="button" className="button" data-testid="bridge-retry" onClick={() => dispatch({ type: "continue" })}>
                Try again
              </button>
            ) : null}
          </div>

          <p className={`bb-candidate-feedback ${viewModel.exact ? "is-success" : viewModel.overfill || viewModel.incorrectSubmit ? "is-correction" : ""}`} data-testid="bridge-feedback" aria-live="polite">
            {announcement}
          </p>
        </section>
      </div>

      {paused ? (
        <div className="bb-candidate-pause" role="dialog" aria-modal="true" aria-label="Game paused">
          <div className="bb-candidate-pause-card">
            <p className="eyebrow">Paused</p>
            <h3>Take your time</h3>
            <p>The free-site pause budget is {Math.ceil(clock.pauseBudgetRemainingMs / 1000)} seconds.</p>
            <button type="button" className="button primary" onClick={togglePause}>Resume bridge</button>
          </div>
        </div>
      ) : null}

      {expired && session.phase !== "exact" ? (
        <div className="bb-candidate-expired" role="status" data-testid="bridge-expired">
          <strong>Round complete</strong>
          <span>The deadline expired and the state is frozen.</span>
          <button type="button" className="button" onClick={resetRound}>Play again</button>
        </div>
      ) : null}

      {session.phase === "exact" ? (
        <section className="bb-candidate-summary" data-testid="bridge-summary" aria-labelledby="bridge-summary-title">
          <p className="eyebrow">Bridge complete</p>
          <h3 id="bridge-summary-title">You made an exact fit.</h3>
          <p>{formatPoints(session)} · {session.placed.length} planks · {session.attempts} placement attempts</p>
          <p className="muted-label">This qualification build keeps progress in the current tab only.</p>
          <button type="button" className="button primary" onClick={resetRound}>Play again</button>
        </section>
      ) : null}
    </div>
  );
}
