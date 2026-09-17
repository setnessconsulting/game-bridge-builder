import { useEffect, useRef, useState } from "react";
import type { BridgeIntent } from "@/lib/bridgeBuilder/intents";
import { createBridgeLayout, withResize } from "@/lib/bridgeBuilder/layout";
import type { BridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import {
  bumpInputGeneration,
  createInputNormalizerState,
} from "@/lib/bridgeBuilder/phaser/normalizeInput";
import type { BridgeGameHandle } from "@/lib/bridgeBuilder/phaser/createBridgeGame";

interface Props {
  viewModel: BridgeViewModel;
  onIntent: (intent: BridgeIntent) => void;
  onStatusChange?: (status: "loading" | "ready" | "failed") => void;
}

/** Real Phaser presentation surface. The DOM mirror remains the semantic source. */
export default function BridgeCanvas({ viewModel, onIntent, onStatusChange }: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<BridgeGameHandle | null>(null);
  const inputRef = useRef(createInputNormalizerState());
  const [layout, setLayout] = useState(() =>
    createBridgeLayout({ canvasWidth: 640, canvasHeight: 360 })
  );

  useEffect(() => {
    let cancelled = false;
    onStatusChange?.("loading");
    const parent = parentRef.current;
    if (!parent) return;

    void import("@/lib/bridgeBuilder/phaser/createBridgeGame")
      .then(({ createBridgeGame }) =>
        createBridgeGame({
          parent,
          width: layout.canvasWidth,
          height: layout.canvasHeight,
          host: {
            emitIntent: (raw) => {
              if (raw.type === "selectPiece" && raw.pieceId) {
                onIntent({ type: "selectPiece", pieceId: raw.pieceId });
              } else if (raw.type === "placePiece" && raw.pieceId) {
                onIntent({ type: "placePiece", pieceId: raw.pieceId });
              } else if (raw.type === "removePiece" && raw.pieceId) {
                onIntent({ type: "removePiece", pieceId: raw.pieceId });
              }
            },
            getInputGeneration: () => inputRef.current.inputGeneration,
          },
        })
      )
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        gameRef.current = handle;
        onStatusChange?.("ready");
        handle.reconcile(viewModel);
      })
      .catch(() => {
        if (!cancelled) onStatusChange?.("failed");
      });

    return () => {
      cancelled = true;
      inputRef.current = bumpInputGeneration(inputRef.current);
      gameRef.current?.destroy();
      gameRef.current = null;
    };
    // The canvas mounts once for this candidate surface. View models reconcile below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gameRef.current?.reconcile(viewModel);
  }, [viewModel]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(260, Math.floor(entry.contentRect.height));
      const dpr = typeof window === "undefined" ? 1 : Math.min(3, window.devicePixelRatio || 1);
      setLayout((previous) => withResize(previous, { width, height, dpr }));
      if (gameRef.current) {
        void import("@/lib/bridgeBuilder/phaser/createBridgeGame").then(
          ({ resizeBridgeGame }) => resizeBridgeGame(gameRef.current!, width, height),
        );
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bb-candidate-canvas" ref={parentRef} data-testid="bridge-phaser-canvas-host">
      <p className="sr-only" data-testid="phaser-render-status">
        Phaser rendering surface loading.
      </p>
    </div>
  );
}
