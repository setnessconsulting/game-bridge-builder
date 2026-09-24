import { useEffect, useRef, useState } from "react";
import type {
  BridgeIntent,
  BridgeIntentAction,
  BridgeIntentContext,
} from "@/lib/bridgeBuilder/intents";
import type { BridgeRendererPortOptions, BridgeRendererStatus } from "@/lib/bridgeBuilder/rendererPort";
import type { BridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import { PhaserBridgeRendererPort } from "@/lib/bridgeBuilder/phaser/PhaserBridgeRendererPort";

interface Props {
  viewModel: BridgeViewModel;
  createIntent: (action: BridgeIntentAction, context: BridgeIntentContext) => BridgeIntent;
  onIntent: (intent: BridgeIntent) => void;
  onStatusChange?: (status: BridgeRendererStatus) => void;
  onVersionSkew?: (rendererVersion: string, viewModelVersion: string) => void;
  onInvalidIntent?: (reason: string) => void;
  onResize?: (width: number, height: number) => void;
  paused?: boolean;
}

/** Real Phaser surface. React remains the semantic and keyboard-accessible source. */
export default function BridgeCanvas(props: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const portRef = useRef<PhaserBridgeRendererPort | null>(null);
  const lastResizeRef = useRef<{ width: number; height: number } | null>(null);
  const propsRef = useRef(props);
  const [rendererStatus, setRendererStatus] = useState<BridgeRendererStatus>("loading");
  propsRef.current = props;

  function reportStatus(status: BridgeRendererStatus): void {
    setRendererStatus(status);
    propsRef.current.onStatusChange?.(status);
  }

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    const port = new PhaserBridgeRendererPort();
    portRef.current = port;
    const unsubscribe = port.onIntent((intent) => propsRef.current.onIntent(intent));
    const options: BridgeRendererPortOptions = {
      createIntent: (action, context) => propsRef.current.createIntent(action, context),
      onStatusChange: reportStatus,
      onVersionSkew: (rendererVersion, viewModelVersion) =>
        propsRef.current.onVersionSkew?.(rendererVersion, viewModelVersion),
      onInvalidIntent: (reason) => propsRef.current.onInvalidIntent?.(reason),
    };

    void port.mount(parent, propsRef.current.viewModel, options)
      .then(() => port.setPaused(Boolean(propsRef.current.paused)))
      .catch(() => {
        // The accessible DOM mirror remains live when the optional canvas fails.
        reportStatus("failed");
      });

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(([entry]) => {
            if (!entry) return;
            const width = Math.max(280, Math.floor(entry.contentRect.width));
            const height = Math.max(180, Math.round(entry.contentRect.height || (width * 360) / 640));
            const previous = lastResizeRef.current;
            if (previous?.width === width && previous.height === height) return;
            lastResizeRef.current = { width, height };
            port.resize?.(width, height);
            propsRef.current.onResize?.(width, height);
          });
    observer?.observe(parent);

    return () => {
      observer?.disconnect();
      unsubscribe();
      port.dispose();
      portRef.current = null;
    };
    // The port is mounted once per session generation. State updates flow through
    // applyViewModel below, while reset remounts the host with a new generation.
  }, []);

  useEffect(() => {
    portRef.current?.applyViewModel(props.viewModel);
    portRef.current?.setReducedMotion(props.viewModel.flags.reducedMotion);
    portRef.current?.setMuted(props.viewModel.flags.mute);
    portRef.current?.setPaused(Boolean(props.paused));
  }, [props.paused, props.viewModel]);

  return (
    <div
      className="bb-candidate-canvas"
      ref={parentRef}
      data-testid="bridge-phaser-canvas-host"
      data-responsive={props.viewModel.responsive}
      data-paused={props.paused ? "true" : "false"}
    >
      <p className="sr-only" data-testid="phaser-render-status" role="status" aria-live="polite">
        {rendererStatus === "ready"
          ? "Phaser rendering surface ready."
          : rendererStatus === "failed"
            ? "Phaser rendering surface unavailable. Accessible bridge view active."
            : "Phaser rendering surface loading."}
      </p>
    </div>
  );
}
