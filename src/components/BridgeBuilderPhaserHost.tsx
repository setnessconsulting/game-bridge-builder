"use client";

/**
 * GAME-132 representative Phaser vertical slice.
 * The TypeScript session reducer is the only mathematical/game authority.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  applyBridgeIntent,
  createBridgeSession,
  type BridgeSessionState,
} from "@/lib/bridgeBuilder/session";
import type { BridgeIntent } from "@/lib/bridgeBuilder/intents";
import { createBridgeLayout, withResize } from "@/lib/bridgeBuilder/layout";
import { deriveBridgeSemanticState } from "@/lib/bridgeBuilder/semantic";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";
import {
  bumpInputGeneration,
  createInputNormalizerState,
  normalizeDirectInput,
  normalizePointerEvent,
  type BridgeDirectInputSource,
  type InputNormalizerState,
  type NormalizeResult,
} from "@/lib/bridgeBuilder/phaser/normalizeInput";
import type { BridgeGameHandle } from "@/lib/bridgeBuilder/phaser/createBridgeGame";

const DEMO_PUZZLE: BridgePuzzle = {
  id: "game-132-vertical-slice#1",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10",
  ticksVisible: true,
  tray: [
    { id: "a", units: 4, label: "4", kind: "plank" },
    { id: "b", units: 6, label: "6", kind: "plank" },
    { id: "c", units: 3, label: "3", kind: "plank" },
    { id: "d", units: 7, label: "7", kind: "plank" },
    { id: "e", units: 5, label: "5", kind: "plank" },
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 2,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

export interface BridgeBuilderPhaserHostProps {
  puzzle?: BridgePuzzle;
  reducedMotion?: boolean;
}

function activationSource(
  event: ReactMouseEvent<HTMLButtonElement>
): BridgeDirectInputSource {
  return event.detail === 0 ? "keyboard" : "tap";
}

export default function BridgeBuilderPhaserHost({
  puzzle = DEMO_PUZZLE,
  reducedMotion = false,
}: BridgeBuilderPhaserHostProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<BridgeGameHandle | null>(null);
  const inputRef = useRef<InputNormalizerState>(createInputNormalizerState());
  const crossingGenerationRef = useRef<number | null>(null);
  const [session, setSession] = useState<BridgeSessionState>(() =>
    createBridgeSession(puzzle)
  );
  const [layout, setLayout] = useState(() =>
    createBridgeLayout({ canvasWidth: 640, canvasHeight: 360 })
  );
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [crossing, setCrossing] = useState(false);
  const [ready, setReady] = useState(false);

  const viewModel = useMemo(
    () =>
      deriveBridgeViewModel(session, {
        layout,
        reducedMotion,
        draggingPieceId,
        crossing,
      }),
    [session, layout, reducedMotion, draggingPieceId, crossing]
  );
  const semantic = useMemo(
    () => deriveBridgeSemanticState(session, viewModel),
    [session, viewModel]
  );

  function dispatch(intent: BridgeIntent) {
    setSession((prev) => applyBridgeIntent(prev, intent).state);
  }

  function applyNormalized(result: NormalizeResult) {
    inputRef.current = result.state;
    setDraggingPieceId(result.state.draggingPieceId);
    for (const intent of result.intents) dispatch(intent);
  }

  function handleDirect(source: BridgeDirectInputSource, intent: BridgeIntent) {
    applyNormalized(
      normalizeDirectInput(inputRef.current, {
        source,
        intent,
      })
    );
  }

  useEffect(() => {
    let cancelled = false;
    if (!parentRef.current) return;

    void (async () => {
      const { createBridgeGame } = await import(
        "@/lib/bridgeBuilder/phaser/createBridgeGame"
      );
      if (cancelled || !parentRef.current) return;
      const handle = await createBridgeGame({
        parent: parentRef.current,
        width: layout.canvasWidth,
        height: layout.canvasHeight,
        host: {
          emitPointerEvent: (event) => {
            applyNormalized(normalizePointerEvent(inputRef.current, event));
          },
          getInputGeneration: () => inputRef.current.inputGeneration,
          onSceneReady: () => {
            if (!cancelled) setReady(true);
          },
        },
      });
      if (cancelled) {
        handle.destroy();
        return;
      }
      gameRef.current = handle;
      handle.reconcile(viewModel);
    })();

    return () => {
      cancelled = true;
      inputRef.current = bumpInputGeneration(inputRef.current);
      setDraggingPieceId(null);
      setCrossing(false);
      gameRef.current?.destroy();
      gameRef.current = null;
      setReady(false);
    };
    // Mount once per puzzle session; reconciliation happens below.
  }, [puzzle.id]);

  useEffect(() => {
    gameRef.current?.reconcile(viewModel);
  }, [viewModel]);

  useEffect(() => {
    if (session.phase !== "exact") return;

    if (reducedMotion) {
      setCrossing(false);
      dispatch({ type: "presentationComplete" });
      return;
    }

    const generation = session.presentationGeneration;
    if (crossingGenerationRef.current === generation) return;
    crossingGenerationRef.current = generation;
    setCrossing(true);
    const timer = window.setTimeout(() => {
      setCrossing(false);
      dispatch({ type: "presentationComplete" });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [session.phase, session.presentationGeneration, reducedMotion]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        inputRef.current = bumpInputGeneration(inputRef.current);
        setDraggingPieceId(null);
        gameRef.current?.pause();
      } else {
        gameRef.current?.resume();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent || typeof ResizeObserver === "undefined") return;
    let cancelled = false;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || cancelled) return;
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(240, Math.floor(entry.contentRect.height));
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      setLayout((prev) => withResize(prev, { width, height, dpr }));
      void import("@/lib/bridgeBuilder/phaser/createBridgeGame").then(
        ({ resizeBridgeGame }) => {
          if (!cancelled && gameRef.current) {
            resizeBridgeGame(gameRef.current, width, height);
          }
        }
      );
    });
    ro.observe(parent);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, []);

  const shellStyle: CSSProperties = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(0, 1fr)",
  };

  return (
    <div
      style={shellStyle}
      data-testid="bridge-phaser-host"
      data-responsive={viewModel.responsive}
      data-reduced-motion={String(reducedMotion)}
      data-ready={String(ready)}
    >
      <div
        ref={parentRef}
        data-testid="bridge-phaser-canvas-host"
        style={{
          width: "100%",
          minHeight: 360,
          borderRadius: 12,
          overflow: "hidden",
          background: "#e8f1f8",
          border: "1px solid #c5d5e2",
        }}
        aria-hidden="true"
      />

      <section
        role="region"
        aria-label="Bridge Builder controls and status"
        data-testid="bridge-phaser-a11y"
      >
        <h2 tabIndex={-1}>Build exactly to {viewModel.spanLabel}</h2>
        <dl>
          <dt>Target span</dt>
          <dd data-testid="bridge-target">{semantic.target}</dd>
          <dt>Selected piece</dt>
          <dd data-testid="bridge-selected-piece">{semantic.selectedPiece}</dd>
          <dt>Current bridge composition</dt>
          <dd data-testid="bridge-composition">{semantic.composition}</dd>
          <dt>Difference</dt>
          <dd data-testid="bridge-difference">{semantic.difference}</dd>
          <dt>Verdict</dt>
          <dd data-testid="bridge-verdict">{semantic.verdict}</dd>
          <dt>Presentation</dt>
          <dd data-testid="bridge-responsive-state">
            {viewModel.responsive}; DPR {viewModel.layout.dpr}; reduced motion{" "}
            {reducedMotion ? "on" : "off"}
          </dd>
        </dl>

        <p aria-live="polite" data-testid="bridge-feedback">
          {semantic.feedback}
          {ready ? "" : " Canvas loading…"}
        </p>

        <div role="group" aria-label="Piece tray">
          {viewModel.pieceTray.map((piece) => (
            <button
              key={piece.id}
              type="button"
              aria-pressed={session.selectedPieceId === piece.id}
              onClick={(event) =>
                handleDirect(activationSource(event), {
                  type: "selectPiece",
                  pieceId: piece.id,
                })
              }
            >
              {piece.label} ({piece.units} units)
            </button>
          ))}
        </div>

        <div role="group" aria-label="Placed pieces">
          {session.placed.map((piece) => (
            <button
              key={piece.id}
              type="button"
              onClick={(event) =>
                handleDirect(activationSource(event), {
                  type: "removePiece",
                  pieceId: piece.id,
                })
              }
            >
              Remove {piece.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={(event) => {
              if (session.selectedPieceId) {
                handleDirect(activationSource(event), {
                  type: "placePiece",
                  pieceId: session.selectedPieceId,
                });
              }
            }}
            disabled={!session.selectedPieceId || viewModel.exact}
          >
            Place selected
          </button>
          {session.phase === "incorrectSubmit" ? (
            <button
              type="button"
              onClick={(event) =>
                handleDirect(activationSource(event), { type: "continue" })
              }
            >
              Keep building
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) =>
              handleDirect(activationSource(event), { type: "reset" })
            }
            disabled={viewModel.exact}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={(event) =>
              handleDirect(activationSource(event), { type: "submit" })
            }
            disabled={viewModel.exact}
          >
            Check it
          </button>
        </div>

        <p data-testid="bridge-actions">
          Available actions:{" "}
          {semantic.availableActions.length > 0
            ? semantic.availableActions.join(", ")
            : "bridge complete"}
          .
        </p>
        <p aria-live="polite" data-testid="bridge-completion">
          {semantic.completion === "crossing"
            ? "Crossing the completed bridge."
            : semantic.completion === "complete"
              ? "Complete. The bridge is ready."
              : "Bridge not complete yet."}
        </p>
      </section>
    </div>
  );
}
