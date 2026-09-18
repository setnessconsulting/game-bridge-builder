import { describe, expect, it } from "vitest";
import {
  applyBridgeIntent,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import {
  createInputNormalizerState,
  normalizePointerEvent,
} from "@/lib/bridgeBuilder/phaser/normalizeInput";
import { BridgeSceneController } from "@/lib/bridgeBuilder/phaser/BridgeScene";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

const puzzle: BridgePuzzle = {
  id: "harness#1",
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
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 1,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

describe("GAME-131 Phaser harness reconciliation", () => {
  it("select → placePiece → reducer → view-model → scene reconcile → submit", () => {
    let session = createBridgeSession(puzzle);
    let input = createInputNormalizerState(null, 1);
    const intents: string[] = [];

    const down = normalizePointerEvent(input, {
      phase: "down",
      targetPieceId: "a",
      overGap: false,
      generation: 1,
    });
    input = down.state;
    for (const intent of down.intents) {
      intents.push(intent.type);
      session = applyBridgeIntent(session, intent).state;
    }

    const up = normalizePointerEvent(input, {
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation: 1,
    });
    input = up.state;
    for (const intent of up.intents) {
      intents.push(intent.type);
      session = applyBridgeIntent(session, intent).state;
    }

    expect(intents).toEqual(["selectPiece", "placePiece"]);
    expect(session.placed.map((p) => p.id)).toEqual(["a"]);

    // Explicit submit while underfill → incorrectSubmit
    session = applyBridgeIntent(session, { type: "submit" }).state;
    expect(session.phase).toBe("incorrectSubmit");

    // Reset while not exact clears composition
    session = applyBridgeIntent(session, { type: "reset" }).state;
    expect(session.placed).toEqual([]);
    expect(session.phase).toBe("building");

    session = applyBridgeIntent(session, {
      type: "placePiece",
      pieceId: "a",
    }).state;
    session = applyBridgeIntent(session, {
      type: "placePiece",
      pieceId: "b",
    }).state;
    expect(session.phase).toBe("exact");

    const vm = deriveBridgeViewModel(session, {
      layout: createBridgeLayout({ unitPx: 24 }),
    });
    expect(vm.exact).toBe(true);
    expect(vm.filledUnits).toBe(10);

    const destroyed: string[] = [];
    const labels: Array<{
      x: number;
      y: number;
      text: string;
      originX: number;
      originY: number;
      style?: Record<string, unknown>;
    }> = [];
    const controller = new BridgeSceneController({
      emitPointerEvent: () => {},
      getInputGeneration: () => input.inputGeneration,
    });
    controller.attach({
      add: {
        rectangle: (x: number, y: number, w: number, h: number) => ({
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
          destroy() {
            destroyed.push("rect");
          },
        }),
        text: (x: number, y: number, text: string, style?: Record<string, unknown>) => {
          const label = { x, y, text, originX: 0, originY: 0, style };
          labels.push(label);
          return {
            setText(value: string) {
              label.text = value;
              return this;
            },
            setPosition(nx: number, ny: number) {
              label.x = nx;
              label.y = ny;
              return this;
            },
            setOrigin(originX: number, originY: number) {
              label.originX = originX;
              label.originY = originY;
              return this;
            },
            destroy() {
              destroyed.push("text");
            },
          };
        },
      },
      input: { on() {}, off() {} },
      cameras: { main: { setBackgroundColor() {} } },
      scale: { width: 640, height: 360 },
    } as never);
    controller.reconcile(vm);
    expect(labels.slice(0, 3).map((label) => label.x)).toEqual([320, 320, 320]);
    expect(labels.slice(0, 3).every((label) => label.originX === 0.5 && label.originY === 0)).toBe(true);
    expect(labels.slice(3).every((label) => label.originX === 0.5 && label.originY === 0.5)).toBe(true);
    expect(labels.map((label) => label.text)).toContain("Target span: 10");
    expect(labels.map((label) => label.text)).toContain("4");
    expect(labels.map((label) => label.text)).not.toContain("4-unit plank");
    controller.destroy();
    expect(destroyed.length).toBeGreaterThan(0);
  });

  it("removePiece updates view model remaining span", () => {
    let session = createBridgeSession(puzzle);
    session = applyBridgeIntent(session, { type: "placePiece", pieceId: "a" }).state;
    session = applyBridgeIntent(session, { type: "removePiece", pieceId: "a" }).state;
    const vm = deriveBridgeViewModel(session);
    expect(vm.remainingSpan).toBe(10);
    expect(vm.pieceTray.some((p) => p.id === "a")).toBe(true);
  });
});
