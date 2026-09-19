import type { BridgeIntent, BridgeIntentAction, BridgeIntentContext } from "./intents";
import type { BridgeViewModel } from "./viewModel";

export type BridgeRendererStatus = "loading" | "ready" | "failed";

export interface BridgeRendererPortOptions {
  createIntent: (
    action: BridgeIntentAction,
    context: BridgeIntentContext,
  ) => BridgeIntent;
  onStatusChange?: (status: BridgeRendererStatus) => void;
  onVersionSkew?: (rendererVersion: string, viewModelVersion: string) => void;
  onInvalidIntent?: (reason: string) => void;
}

/** Narrow lifecycle boundary shared by Phaser and any future renderer. */
export interface BridgeRendererPort {
  mount(
    container: HTMLElement,
    initial: BridgeViewModel,
    options: BridgeRendererPortOptions,
  ): Promise<void>;
  applyViewModel(next: BridgeViewModel): void;
  onIntent(listener: (intent: BridgeIntent) => void): () => void;
  setReducedMotion(reduced: boolean): void;
  setMuted(muted: boolean): void;
  /** Pause/resume presentation animation without changing engine state. */
  setPaused(paused: boolean): void;
  resize?(width: number, height: number): void;
  dispose(): void;
}

/** v1.1 renderers accept additive v1.1+ views, but fail closed on pre-v1.1 schemas. */
export function isBridgeViewModelCompatible(
  viewModelVersion: string,
  rendererVersion = "1.1.0",
): boolean {
  const versionParts = (version: string) =>
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.exec(version);
  const view = versionParts(viewModelVersion);
  const renderer = versionParts(rendererVersion);
  return Boolean(
    view &&
      renderer &&
      view[1] === renderer[1] &&
      Number(view[2]) >= Number(renderer[2]),
  );
}
