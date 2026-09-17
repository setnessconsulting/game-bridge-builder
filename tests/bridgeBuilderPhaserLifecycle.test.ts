import { describe, expect, it, vi } from "vitest";
import {
  applyBridgeIntent,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import { createBridgeLayout, withResize } from "@/lib/bridgeBuilder/layout";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import { BridgeSceneController } from "@/lib/bridgeBuilder/phaser/BridgeScene";
import {
  createBridgeGame,
  resizeBridgeGame,
  type PhaserModuleLike,
} from "@/lib/bridgeBuilder/phaser/createBridgeGame";
import { bumpInputGeneration, createInputNormalizerState } from "@/lib/bridgeBuilder/phaser/normalizeInput";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

const puzzle: BridgePuzzle = {
  id: "life#1",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10",
  ticksVisible: true,
  tray: [
    { id: "a", units: 4, label: "4", kind: "plank" },
    { id: "b", units: 6, label: "6", kind: "plank" },
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 1,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

function mockPhaserModule(): PhaserModuleLike {
  const destroy = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();
  const resize = vi.fn();
  class FakeScene {
    add = {
      rectangle: () => ({
        setPosition() {
          return this;
        },
        setDisplaySize() {
          return this;
        },
        setFillStyle() {
          return this;
        },
        setData() {
          return this;
        },
        getData() {
          return null;
        },
        setInteractive() {
          return this;
        },
        destroy() {},
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      }),
      text: () => ({
        setText() {
          return this;
        },
        setPosition() {
          return this;
        },
        destroy() {},
      }),
    };
    input = { on() {}, off() {} };
    cameras = { main: { setBackgroundColor() {} } };
    scale = { width: 640, height: 360 };
    create() {}
  }
  return {
    AUTO: 0,
    Scene: FakeScene as never,
    Game: class {
      destroy = destroy;
      scene = { add() {}, pause, resume, getScene() { return null; } };
      scale = { resize };
      constructor(config: Record<string, unknown>) {
        const scenes = config.scene as Array<{ create?: () => void; prototype?: unknown }>;
        // Instantiation side-effect only; scene create is optional in tests.
        void scenes;
      }
    } as never,
  };
}

describe("GAME-131 Phaser lifecycle", () => {
  it("creates and destroys one game handle without leaking", async () => {
    const parent = { id: "host" } as unknown as HTMLElement;
    const handle = await createBridgeGame({
      parent,
      width: 640,
      height: 360,
      host: {
        emitIntent: () => {},
        getInputGeneration: () => 1,
      },
      PhaserModule: mockPhaserModule(),
    });
    expect(handle.game).not.toBeNull();
    handle.destroy();
    expect(handle.game).toBeNull();
    handle.destroy(); // idempotent
  });

  it("resize/DPR does not change filledUnits", () => {
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    const before = deriveBridgeViewModel(state, {
      layout: createBridgeLayout({ unitPx: 24, canvasWidth: 400, dpr: 1 }),
    });
    const after = deriveBridgeViewModel(state, {
      layout: withResize(before.layout, { width: 1200, height: 800, dpr: 2 }),
    });
    expect(after.filledUnits).toBe(before.filledUnits);
    expect(after.filledUnits).toBe(4);
  });

  it("controller reconcile is presentation-only", () => {
    const controller = new BridgeSceneController({
      emitIntent: () => {},
      getInputGeneration: () => 1,
    });
    const rects: Array<{ destroy: () => void }> = [];
    const scene = {
      add: {
        rectangle: (x: number, y: number, w: number, h: number) => {
          const rect = {
            x,
            y,
            width: w,
            height: h,
            setPosition(nx: number, ny: number) {
              this.x = nx;
              this.y = ny;
              return this;
            },
            setDisplaySize(nw: number, nh: number) {
              this.width = nw;
              this.height = nh;
              return this;
            },
            setFillStyle() {
              return this;
            },
            data: {} as Record<string, unknown>,
            setData(key: string, value: unknown) {
              this.data[key] = value;
              return this;
            },
            getData(key: string) {
              return this.data[key];
            },
            setInteractive() {
              return this;
            },
            destroy() {},
          };
          rects.push(rect);
          return rect;
        },
        text: () => ({
          setText() {
            return this;
          },
          setPosition() {
            return this;
          },
          destroy() {},
        }),
      },
      input: { on() {}, off() {} },
      cameras: { main: { setBackgroundColor() {} } },
      scale: { width: 640, height: 360 },
    };
    controller.attach(scene as never);
    let state = createBridgeSession(puzzle);
    state = applyBridgeIntent(state, { type: "placePiece", pieceId: "a" }).state;
    const vm = deriveBridgeViewModel(state, {
      layout: createBridgeLayout({ unitPx: 24 }),
    });
    controller.reconcile(vm);
    expect(vm.filledUnits).toBe(4);
    controller.destroy();
  });

  it("bumps generation on remount/pause pattern", () => {
    let input = createInputNormalizerState("a", 1);
    input = bumpInputGeneration(input);
    expect(input.inputGeneration).toBe(2);
    expect(input.draggingPieceId).toBeNull();
  });

  it("resizeBridgeGame is a no-op without a live game", () => {
    expect(() =>
      resizeBridgeGame(
        {
          game: null,
          controller: new BridgeSceneController({
            emitIntent: () => {},
            getInputGeneration: () => 1,
          }),
          destroy() {},
          reconcile() {},
          pause() {},
          resume() {},
        },
        800,
        450
      )
    ).not.toThrow();
  });
});
