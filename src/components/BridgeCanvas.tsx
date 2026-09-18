import { useEffect, useRef } from "react";
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
}

/** Real Phaser surface. React remains the semantic and keyboard-accessible source. */
export default function BridgeCanvas(props: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const portRef = useRef<PhaserBridgeRendererPort | null>(null);
  const lastResizeRef = useRef<{ width: number; height: number } | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    const port = new PhaserBridgeRendererPort();
    portRef.current = port;
    const unsubscribe = port.onIntent((intent) => propsRef.current.onIntent(intent));
    const options: BridgeRendererPortOptions = {
      createIntent: (action, context) => propsRef.current.createIntent(action, context),
      onStatusChange: (status) => propsRef.current.onStatusChange?.(status),
      onVersionSkew: (rendererVersion, viewModelVersion) =>
        propsRef.current.onVersionSkew?.(rendererVersion, viewModelVersion),
      onInvalidIntent: (reason) => propsRef.current.onInvalidIntent?.(reason),
    };

    void port.mount(parent, propsRef.current.viewModel, options).catch(() => {
      // The accessible DOM mirror remains live when the optional canvas fails.
      propsRef.current.onStatusChange?.("failed");
    });

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(([entry]) => {
            if (!entry) return;
            const width = Math.max(320, Math.floor(entry.contentRect.width));
            const height = Math.max(240, Math.round((width * 360) / 640));
            const previous = lastResizeRef.current;
            if (previous?.width === width && previous.height === height) return;
            lastResizeRef.current = { width, height };
            port.resize?.(width, height);
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
  }, [props.viewModel]);

  return (
    <div className="bb-candidate-canvas" ref={parentRef} data-testid="bridge-phaser-canvas-host">
      <p className="sr-only" data-testid="phaser-render-status">
        Phaser rendering surface loading.
      </p>
    </div>
  );
}
