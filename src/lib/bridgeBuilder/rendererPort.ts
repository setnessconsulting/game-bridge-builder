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
  resize?(width: number, height: number): void;
  dispose(): void;
}

/** v1 renderers may consume additive fields, but never an unknown major. */
export function isBridgeViewModelCompatible(
  viewModelVersion: string,
  rendererVersion = "1.1.0",
): boolean {
  const majorOf = (version: string) => /^(0|[1-9]\d*)\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.exec(version)?.[1];
  const viewMajor = majorOf(viewModelVersion);
  const rendererMajor = majorOf(rendererVersion);
  return Boolean(viewMajor && rendererMajor && viewMajor === rendererMajor);
}
