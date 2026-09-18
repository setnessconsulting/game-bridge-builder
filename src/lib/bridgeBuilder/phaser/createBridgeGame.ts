/**
 * Create / destroy a single Phaser.Game for a Bridge Builder harness session.
 * Dynamic-import Phaser so the engine graph stays free of a hard dependency.
 */

import type { BridgeViewModel } from "../viewModel";
import { BridgeSceneController, BRIDGE_SCENE_KEY, type BridgeSceneHost } from "./BridgeScene";

export interface BridgeGameHandle {
  game: { destroy: (removeCanvas?: boolean) => void } | null;
  controller: BridgeSceneController;
  destroy: () => void;
  reconcile: (vm: BridgeViewModel) => void;
  pause: () => void;
  resume: () => void;
}

export interface CreateBridgeGameOptions {
  parent: HTMLElement;
  width: number;
  height: number;
  host: BridgeSceneHost;
  /** Injected Phaser module for tests; production passes dynamic import. */
  PhaserModule?: PhaserModuleLike;
}

export interface PhaserModuleLike {
  AUTO: number | string;
  Game: new (config: Record<string, unknown>) => {
    destroy: (removeCanvas?: boolean) => void;
    scene: {
      add: (
        key: string,
        scene: unknown,
        autoStart?: boolean
      ) => void;
      pause: (key?: string) => void;
      resume: (key?: string) => void;
      getScene: (key: string) => unknown;
    };
    scale: {
      resize: (width: number, height: number) => void;
    };
  };
  Scene: new (config?: string | Record<string, unknown>) => object;
}

/**
 * Mount one Phaser game. Caller must destroy on unmount/pause/background.
 */
export async function createBridgeGame(
  options: CreateBridgeGameOptions
): Promise<BridgeGameHandle> {
  const controller = new BridgeSceneController(options.host);
  let destroyed = false;
  let game: BridgeGameHandle["game"] = null;

  const PhaserModule =
    options.PhaserModule ??
    ((await import("phaser")) as unknown as PhaserModuleLike);

  // The hosted production scene must be a genuine Phaser.Scene so the same
  // scene lifecycle and renderer plumbing exercised in-browser are used here.
  class HostedBridgeScene extends PhaserModule.Scene {
    static KEY = BRIDGE_SCENE_KEY;

    constructor() {
      super({ key: BRIDGE_SCENE_KEY });
    }

    create(): void {
      controller.attach(this as never);
    }
  }

  game = new PhaserModule.Game({
    type: PhaserModule.AUTO,
    parent: options.parent,
    width: options.width,
    height: options.height,
    backgroundColor: "#e8f1f8",
    scene: [HostedBridgeScene],
    banner: false,
    audio: { noAudio: true },
    input: { activePointers: 1 },
  });

  const handle: BridgeGameHandle = {
    game,
    controller,
    reconcile(vm: BridgeViewModel) {
      if (destroyed) return;
      controller.reconcile(vm);
    },
    pause() {
      if (destroyed || !game) return;
      try {
        (game as unknown as { scene: { pause: (key?: string) => void } }).scene.pause(
          BRIDGE_SCENE_KEY
        );
      } catch {
        // Scene may not be ready yet in harness/tests.
      }
    },
    resume() {
      if (destroyed || !game) return;
      try {
        (game as unknown as { scene: { resume: (key?: string) => void } }).scene.resume(
          BRIDGE_SCENE_KEY
        );
      } catch {
        // ignore
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.destroy();
      try {
        game?.destroy(true);
      } catch {
        // ignore double-destroy
      }
      game = null;
      handle.game = null;
    },
  };

  return handle;
}

/** Resize helper: layout/DPR only — session state unchanged. */
export function resizeBridgeGame(
  handle: BridgeGameHandle,
  width: number,
  height: number
): void {
  if (!handle.game) return;
  try {
    (
      handle.game as unknown as {
        scale: { resize: (w: number, h: number) => void };
      }
    ).scale.resize(width, height);
  } catch {
    // ignore
  }
}
