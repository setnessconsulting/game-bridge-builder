import type { BridgeIntent, BridgeIntentContext } from "../intents";
import type { BridgeRendererPort, BridgeRendererPortOptions } from "../rendererPort";
import { isBridgeViewModelCompatible } from "../rendererPort";
import type { BridgeViewModel } from "../viewModel";
import { createBridgeLayout } from "../layout";
import {
  createInputNormalizerState,
  normalizePointerEvent,
  type BridgePointerEvent,
  type InputNormalizerState,
} from "./normalizeInput";
import type { BridgeGameHandle } from "./createBridgeGame";

const PHASER_RENDERER_VERSION = "1.1.0";

function renderSignature(viewModel: BridgeViewModel): string {
  return JSON.stringify({
    version: viewModel.version,
    puzzleId: viewModel.puzzleId,
    renderSeed: viewModel.renderSeed,
    span: viewModel.span,
    filledUnits: viewModel.filledUnits,
    remainingSpan: viewModel.remainingSpan,
    verdict: viewModel.verdict,
    selectedPieceId: viewModel.selectedPieceId,
    focusedPieceId: viewModel.focusedPieceId,
    pieceTray: viewModel.pieceTray.map(({ id, units, selected, focused }) => [id, units, selected, focused]),
    placed: viewModel.placed.map(({ id, units, removable }) => [id, units, removable]),
    hints: viewModel.hints,
    crossing: viewModel.crossing,
    flags: viewModel.flags,
    layout: viewModel.layout,
    generation: viewModel.session.generation,
    expired: viewModel.session.expired,
  });
}

/** Phaser adapter. It renders engine-authored view models and emits only intents. */
export class PhaserBridgeRendererPort implements BridgeRendererPort {
  private game: BridgeGameHandle | null = null;
  private viewModel: BridgeViewModel | null = null;
  private options: BridgeRendererPortOptions | null = null;
  private listeners = new Set<(intent: BridgeIntent) => void>();
  private disposed = false;
  private reducedMotion = false;
  private muted = false;
  private lastRenderedSignature: string | null = null;
  private inputState: InputNormalizerState | null = null;

  async mount(
    container: HTMLElement,
    initial: BridgeViewModel,
    options: BridgeRendererPortOptions,
  ): Promise<void> {
    this.options = options;
    this.viewModel = initial;
    this.inputState = createInputNormalizerState(
      initial.selectedPieceId ?? null,
      initial.session.generation,
    );
    this.disposed = false;
    options.onStatusChange?.("loading");
    if (!isBridgeViewModelCompatible(initial.version, PHASER_RENDERER_VERSION)) {
      options.onVersionSkew?.(PHASER_RENDERER_VERSION, initial.version);
      options.onStatusChange?.("failed");
      throw new Error("Bridge Renderer version is incompatible with the view model");
    }

    const layout = initial.layout ?? createBridgeLayout();
    try {
      const { createBridgeGame } = await import("./createBridgeGame");
      const handle = await createBridgeGame({
        parent: container,
        width: layout.canvasWidth,
        height: layout.canvasHeight,
        host: {
          emitPointerEvent: (event) => this.handlePointerEvent(event),
          getInputGeneration: () => this.viewModel?.session.generation ?? -1,
        },
      });
      let readyTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          handle.ready,
          new Promise<never>((_, reject) => {
            readyTimeout = setTimeout(
              () => reject(new Error("Phaser scene did not become ready")),
              8_000,
            );
          }),
        ]);
      } catch (error) {
        handle.destroy();
        throw error;
      } finally {
        if (readyTimeout !== undefined) clearTimeout(readyTimeout);
      }
      if (this.disposed) {
        handle.destroy();
        return;
      }
      this.game = handle;
      const current = this.viewModel ?? initial;
      this.reducedMotion = current.flags.reducedMotion;
      this.muted = current.flags.mute;
      this.lastRenderedSignature = renderSignature(current);
      handle.reconcile(current);
      options.onStatusChange?.("ready");
    } catch (error) {
      if (!this.disposed) options.onStatusChange?.("failed");
      throw error;
    }
  }

  applyViewModel(next: BridgeViewModel): void {
    if (this.disposed) return;
    if (!isBridgeViewModelCompatible(next.version, PHASER_RENDERER_VERSION)) {
      this.options?.onVersionSkew?.(PHASER_RENDERER_VERSION, next.version);
      this.options?.onStatusChange?.("failed");
      this.dispose();
      return;
    }
    if (this.inputState?.inputGeneration !== next.session.generation) {
      this.inputState = createInputNormalizerState(
        next.selectedPieceId ?? null,
        next.session.generation,
      );
    }
    this.viewModel = next;
    this.reducedMotion = next.flags.reducedMotion;
    this.muted = next.flags.mute;
    this.reconcileIfChanged();
  }

  onIntent(listener: (intent: BridgeIntent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (this.viewModel && this.viewModel.flags.reducedMotion !== reduced) {
      this.viewModel = {
        ...this.viewModel,
        reducedMotion: reduced,
        flags: { ...this.viewModel.flags, reducedMotion: reduced },
      };
      this.reconcileIfChanged();
    }
  }

  setMuted(muted: boolean): void {
    // Phaser audio is disabled for this qualification slice; the state is still
    // explicit at the port so a future approved cue layer has one control path.
    this.muted = muted;
    if (this.viewModel && this.viewModel.flags.mute !== muted) {
      this.viewModel = {
        ...this.viewModel,
        flags: { ...this.viewModel.flags, mute: muted },
      };
      this.reconcileIfChanged();
    }
  }

  resize(width: number, height: number): void {
    if (!this.game) return;
    void import("./createBridgeGame").then(({ resizeBridgeGame }) => {
      if (this.game) resizeBridgeGame(this.game, width, height);
    });
  }

  private reconcileIfChanged(): void {
    if (!this.game || !this.viewModel) return;
    const signature = renderSignature(this.viewModel);
    if (signature === this.lastRenderedSignature) return;
    this.lastRenderedSignature = signature;
    this.game.reconcile(this.viewModel);
  }

  private handlePointerEvent(event: BridgePointerEvent): void {
    const current = this.viewModel;
    const activeOptions = this.options;
    if (!current || !activeOptions || !this.inputState) return;
    const result = normalizePointerEvent(this.inputState, event);
    this.inputState = result.state;
    const context: BridgeIntentContext = {
      sessionId: current.session.sessionId,
      generation: current.session.generation,
    };
    for (const action of result.intents) {
      const intent: BridgeIntent = activeOptions.createIntent(action, context);
      for (const listener of this.listeners) listener(intent);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.game?.destroy();
    this.game = null;
    this.viewModel = null;
    this.lastRenderedSignature = null;
    this.inputState = null;
    this.options = null;
    this.listeners.clear();
  }
}
