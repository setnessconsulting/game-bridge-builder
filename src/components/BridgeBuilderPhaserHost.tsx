"use client";

/**
 * Client-only Phaser host for Bridge Builder harness.
 * Production /games Bridge Builder remains the React renderer.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  applyBridgeIntent,
  createBridgeSession,
  type BridgeSessionState,
} from "@/lib/bridgeBuilder/session";
import type { BridgeIntent } from "@/lib/bridgeBuilder/intents";
import { createBridgeLayout, withResize } from "@/lib/bridgeBuilder/layout";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";
import {
  bumpInputGeneration,
  createInputNormalizerState,
  type InputNormalizerState,
} from "@/lib/bridgeBuilder/phaser/normalizeInput";
import type { BridgeGameHandle } from "@/lib/bridgeBuilder/phaser/createBridgeGame";

const DEMO_PUZZLE: BridgePuzzle = {
  id: "phaser-harness#1",
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

export default function BridgeBuilderPhaserHost({
  puzzle = DEMO_PUZZLE,
  reducedMotion = false,
}: BridgeBuilderPhaserHostProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<BridgeGameHandle | null>(null);
  const inputRef = useRef<InputNormalizerState>(createInputNormalizerState());
  const [session, setSession] = useState<BridgeSessionState>(() =>
    createBridgeSession(puzzle)
  );
  const [layout, setLayout] = useState(() =>
    createBridgeLayout({ canvasWidth: 640, canvasHeight: 360 })
  );
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const viewModel = useMemo(
    () =>
      deriveBridgeViewModel(session, {
        layout,
        reducedMotion,
        draggingPieceId,
      }),
    [session, layout, reducedMotion, draggingPieceId]
  );

  function dispatch(intent: BridgeIntent) {
    setSession((prev) => applyBridgeIntent(prev, intent).state);
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
          emitIntent: (raw) => {
            if (raw.type === "selectPiece" && raw.pieceId) {
              dispatch({ type: "selectPiece", pieceId: raw.pieceId });
            } else if (raw.type === "placePiece" && raw.pieceId) {
              dispatch({ type: "placePiece", pieceId: raw.pieceId });
            } else if (raw.type === "removePiece" && raw.pieceId) {
              dispatch({ type: "removePiece", pieceId: raw.pieceId });
            } else if (raw.type === "reset") {
              dispatch({ type: "reset" });
            } else if (raw.type === "submit") {
              dispatch({ type: "submit" });
            }
          },
          getInputGeneration: () => inputRef.current.inputGeneration,
        },
      });
      if (cancelled) {
        handle.destroy();
        return;
      }
      gameRef.current = handle;
      handle.reconcile(viewModel);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      inputRef.current = bumpInputGeneration(inputRef.current);
      setDraggingPieceId(null);
      gameRef.current?.destroy();
      gameRef.current = null;
      setReady(false);
    };
    // Mount once per puzzle session; reconcile happens in a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  useEffect(() => {
    gameRef.current?.reconcile(viewModel);
  }, [viewModel]);

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

  const available = session.tray.filter(
    (p) => !session.placed.some((pl) => pl.id === p.id)
  );

  const shellStyle: CSSProperties = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(0, 1fr)",
  };

  return (
    <div style={shellStyle} data-testid="bridge-phaser-host">
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

      {/* Semantic DOM sibling for a11y — same intents as Phaser. */}
      <div
        role="region"
        aria-label="Bridge Builder controls"
        data-testid="bridge-phaser-a11y"
      >
        <p>
          Span {viewModel.spanLabel} ({viewModel.span} units). Remaining{" "}
          {viewModel.remainingSpan}. Filled {viewModel.filledUnits}.
          {viewModel.exact ? " Exact fit." : ""}
          {ready ? "" : " Canvas loading…"}
        </p>
        <div role="group" aria-label="Piece tray">
          {available.map((piece) => (
            <button
              key={piece.id}
              type="button"
              aria-pressed={session.selectedPieceId === piece.id}
              onClick={() => {
                inputRef.current = {
                  ...inputRef.current,
                  selectedPieceId: piece.id,
                  draggingPieceId: null,
                  dragStarted: false,
                };
                setDraggingPieceId(null);
                dispatch({ type: "selectPiece", pieceId: piece.id });
              }}
            >
              {piece.label} ({piece.units})
            </button>
          ))}
        </div>
        <div role="group" aria-label="Placed pieces">
          {session.placed.map((piece) => (
            <button
              key={piece.id}
              type="button"
              onClick={() => dispatch({ type: "removePiece", pieceId: piece.id })}
            >
              Remove {piece.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (session.selectedPieceId) {
                dispatch({ type: "placePiece", pieceId: session.selectedPieceId });
              }
            }}
            disabled={!session.selectedPieceId}
          >
            Place selected
          </button>
          <button type="button" onClick={() => dispatch({ type: "reset" })}>
            Reset
          </button>
          <button type="button" onClick={() => dispatch({ type: "submit" })}>
            Submit
          </button>
        </div>
        <p aria-live="polite">
          Selected: {session.selectedPieceId ?? "none"}. Phase: {session.phase}.
        </p>
      </div>
    </div>
  );
}
