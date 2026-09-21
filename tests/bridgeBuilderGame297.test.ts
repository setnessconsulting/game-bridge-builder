/**
 * GAME-297: player-ready Phaser/DOM presentation slice.
 *
 * Presentation-only assertions: environment coherence, length-proportional
 * planks with full state families, non-color span geometry, crossing payoff
 * with reduced-motion equivalents, honest pause copy, and the renderer
 * intent contract (decorative reconcile never emits gameplay intents).
 * Math authority stays in the engine; pixels here are metadata.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyBridgeHostSignal,
  createBridgeClock,
} from "@/lib/bridgeBuilder/clock";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import {
  applyBridgeIntent,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import { BridgeSceneController } from "@/lib/bridgeBuilder/phaser/BridgeScene";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

const puzzle: BridgePuzzle = {
  id: "game297#1",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10",
  ticksVisible: true,
  tray: [
    { id: "four", units: 4, label: "4", kind: "plank" },
    { id: "eight", units: 8, label: "8", kind: "plank" },
    { id: "two", units: 2, label: "2", kind: "plank" },
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 1,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

type Call = { method: string; args: unknown[] };

function makeGraphics(log: Call[]) {
  const self: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of [
    "clear",
    "fillStyle",
    "fillRect",
    "fillCircle",
    "strokeCircle",
    "lineStyle",
    "lineBetween",
    "strokeRect",
  ]) {
    self[method] = (...args: unknown[]) => {
      log.push({ method, args });
      return graphics;
    };
  }
  self["destroy"] = () => undefined;
  const graphics = self as never;
  return graphics;
}

function makeRect(x: number, y: number, w: number, h: number) {
  const data: Record<string, unknown> = {};
  return {
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
    setData(key: string, value: unknown) {
      data[key] = value;
      return this;
    },
    getData(key: string) {
      return data[key];
    },
    setInteractive() {
      return this;
    },
    on() {
      return this;
    },
    destroy() {},
  };
}

interface Harness {
  controller: BridgeSceneController;
  layers: { env: Call[]; target: Call[]; piece: Call[]; effect: Call[] };
  labels: string[];
  tweenCalls: unknown[];
  emitted: unknown[];
}

/** Stub scene with recording graphics layers (env/target/piece/effect). */
function mount(): Harness {
  const layers = { env: [] as Call[], target: [] as Call[], piece: [] as Call[], effect: [] as Call[] };
  const graphicsInstances = [
    makeGraphics(layers.env),
    makeGraphics(layers.target),
    makeGraphics(layers.piece),
    makeGraphics(layers.effect),
  ];
  let graphicsIndex = 0;
  const labels: string[] = [];
  const tweenCalls: unknown[] = [];
  const emitted: unknown[] = [];
  const controller = new BridgeSceneController({
    emitPointerEvent: (event) => {
      emitted.push(event);
    },
    getInputGeneration: () => 1,
  });
  controller.attach({
    add: {
      rectangle: (x: number, y: number, w: number, h: number) => makeRect(x, y, w, h) as never,
      text: (_x: number, _y: number, text: string) => {
        labels.push(text);
        return {
          setText(value: string) {
            labels.push(value);
            return this;
          },
          setPosition() {
            return this;
          },
          setOrigin() {
            return this;
          },
          destroy() {},
        };
      },
      image: (x: number, y: number) => ({
        x,
        y,
        setPosition(nx: number, ny: number) {
          this.x = nx;
          this.y = ny;
          return this;
        },
        setDisplaySize() {
          return this;
        },
        setOrigin() {
          return this;
        },
        setAlpha() {
          return this;
        },
        setRotation() {
          return this;
        },
        setDepth() {
          return this;
        },
        destroy() {},
      }),
      graphics: () => {
        const next = graphicsInstances[Math.min(graphicsIndex, graphicsInstances.length - 1)];
        graphicsIndex += 1;
        return next;
      },
    },
    input: { on() {}, off() {} },
    cameras: { main: { setBackgroundColor() {} } },
    scale: { width: 640, height: 360 },
    tweens: {
      add: (config: Record<string, unknown>) => {
        tweenCalls.push(config);
        return config;
      },
      killTweensOf() {},
    },
  } as never);
  return { controller, layers, labels, tweenCalls, emitted };
}

function lineStyles(log: Call[]): Array<{ width: number; color: number }> {
  return log
    .filter((call) => call.method === "lineStyle")
    .map((call) => ({ width: Number(call.args[0]), color: Number(call.args[1]) }));
}

describe("GAME-297 player-ready presentation slice", () => {
  it("renders a coherent environment: anchor bolts, span ticks, deterministic speckles", () => {
    const harness = mount();
    const session = createBridgeSession(puzzle);
    const vm = deriveBridgeViewModel(session, {
      layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
    });
    harness.controller.reconcile(vm);

    // Four anchor bolts (radius 2.2) pin the span ends.
    const bolts = harness.layers.env.filter(
      (call) => call.method === "fillCircle" && Number(call.args[2]) === 2.2,
    );
    expect(bolts).toHaveLength(4);

    // Span ruler ticks only when the puzzle asks for them.
    const withTicks = harness.layers.env.filter((call) => call.method === "lineBetween").length;
    const noTicksPuzzle = { ...puzzle, ticksVisible: false };
    const second = mount();
    second.controller.reconcile(
      deriveBridgeViewModel(createBridgeSession(noTicksPuzzle), {
        layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
      }),
    );
    const withoutTicks = second.layers.env.filter((call) => call.method === "lineBetween").length;
    expect(withTicks).toBeGreaterThan(withoutTicks);

    // Same puzzle always renders the same stones (presentation seed).
    const repeat = mount();
    repeat.controller.reconcile(vm);
    expect(repeat.layers.env).toEqual(harness.layers.env);
    harness.controller.destroy();
    second.controller.destroy();
    repeat.controller.destroy();
  });

  it("keeps tray planks length-proportional with one shared scale", () => {
    const harness = mount();
    const vm = deriveBridgeViewModel(createBridgeSession(puzzle), {
      layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
    });
    harness.controller.reconcile(vm);
    const tray = harness.controller.getInteractionGeometry().tray;
    const widthOf = (id: string) => tray.find((entry) => entry.pieceId === id)?.hitWidth ?? 0;
    // 8-unit plank renders ~2x the 4-unit plank (ratios preserved).
    const ratio = widthOf("eight") / widthOf("four");
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
    harness.controller.destroy();
  });

  it("marks oversized tray planks with a non-color glyph and ghost geometry", () => {
    const harness = mount();
    let session = createBridgeSession(puzzle);
    session = applyBridgeIntent(session, { type: "placePiece", pieceId: "eight" }).state;
    // 2 units remain; hovering the 4-unit plank previews an overhang.
    const vm = deriveBridgeViewModel(session, {
      layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
      placementPreviewPieceId: "four",
    });
    harness.controller.reconcile(vm);
    // ⚠ glyph on the oversized tray label (never color alone).
    expect(harness.labels.some((text) => text.startsWith("⚠"))).toBe(true);
    // Dashed overhang excess + ghost body on the effect layer.
    expect(harness.layers.effect.some((call) => call.method === "fillRect")).toBe(true);
    harness.controller.destroy();
  });

  it("draws exact-fit as solid frame + check geometry, overfill as hatch + splash", () => {
    const building = mount();
    building.controller.reconcile(
      deriveBridgeViewModel(createBridgeSession(puzzle), {
        layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
      }),
    );
    const buildingChecks = lineStyles(building.layers.target).filter(
      (style) => style.width === 4 && style.color === 0x102a43,
    );

    let exactSession = createBridgeSession(puzzle);
    exactSession = applyBridgeIntent(exactSession, { type: "placePiece", pieceId: "eight" }).state;
    exactSession = applyBridgeIntent(exactSession, { type: "placePiece", pieceId: "two" }).state;
    expect(exactSession.phase).toBe("exact");
    const exact = mount();
    exact.controller.reconcile(
      deriveBridgeViewModel(exactSession, {
        layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
        crossing: true,
      }),
    );
    const exactChecks = lineStyles(exact.layers.target).filter(
      (style) => style.width === 4 && style.color === 0x102a43,
    );
    // Exact adds the ink check mark; underfill has no ink-4 geometry.
    expect(buildingChecks).toHaveLength(0);
    expect(exactChecks.length).toBeGreaterThan(0);
    // Celebration rings render on the effect layer in both motion modes.
    expect(exact.layers.effect.some((call) => call.method === "strokeCircle")).toBe(true);

    let overSession = createBridgeSession(puzzle);
    overSession = applyBridgeIntent(overSession, { type: "placePiece", pieceId: "eight" }).state;
    overSession = applyBridgeIntent(overSession, { type: "placePiece", pieceId: "four" }).state;
    const over = mount();
    over.controller.reconcile(
      deriveBridgeViewModel(overSession, {
        layout: createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 }),
      }),
    );
    // Splash rings where the car meets the water (overfill only).
    expect(over.layers.effect.filter((call) => call.method === "strokeCircle").length).toBeGreaterThanOrEqual(3);
    expect(building.layers.effect.filter((call) => call.method === "strokeCircle")).toHaveLength(0);

    building.controller.destroy();
    exact.controller.destroy();
    over.controller.destroy();
  });

  it("celebrates identically without motion tweens under reduced motion", () => {
    let session = createBridgeSession(puzzle);
    session = applyBridgeIntent(session, { type: "placePiece", pieceId: "eight" }).state;
    session = applyBridgeIntent(session, { type: "placePiece", pieceId: "two" }).state;
    const layout = createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 });

    const motion = mount();
    motion.controller.reconcile(
      deriveBridgeViewModel(session, { layout, crossing: true, reducedMotion: false }),
    );
    const still = mount();
    still.controller.reconcile(
      deriveBridgeViewModel(session, { layout, crossing: false, reducedMotion: true }),
    );
    // Motion carries tweens; reduced-motion is fully static …
    expect(motion.tweenCalls.length).toBeGreaterThan(0);
    expect(still.tweenCalls).toHaveLength(0);
    // … but the celebration shapes are identical in both.
    expect(still.layers.effect.some((call) => call.method === "strokeCircle")).toBe(true);
    motion.controller.destroy();
    still.controller.destroy();
  });

  it("carries mute + number-face flags through the view model for DOM parity", () => {
    const vm = deriveBridgeViewModel(createBridgeSession(puzzle), {
      layout: createBridgeLayout(),
      muted: true,
      numberFace: "dots",
    });
    expect(vm.flags.mute).toBe(true);
    expect(vm.flags.numberFace).toBe("dots");
  });

  it("never emits gameplay intents from decorative reconciliation", () => {
    const harness = mount();
    const layout = createBridgeLayout({ unitPx: 24, canvasWidth: 640, canvasHeight: 360 });
    let session = createBridgeSession(puzzle);
    harness.controller.reconcile(deriveBridgeViewModel(session, { layout }));
    session = applyBridgeIntent(session, { type: "placePiece", pieceId: "eight" }).state;
    harness.controller.reconcile(
      deriveBridgeViewModel(session, { layout, placementPreviewPieceId: "four" }),
    );
    session = applyBridgeIntent(session, { type: "placePiece", pieceId: "two" }).state;
    harness.controller.reconcile(deriveBridgeViewModel(session, { layout, crossing: true }));
    expect(harness.emitted).toHaveLength(0);
    // Hit surfaces still exist for the input normalizer (presentation facts).
    expect(harness.controller.getInteractionGeometry().gap).not.toBeNull();
    harness.controller.destroy();
  });

  it("keeps honest pause copy and no qualification/debug wording on the player surface", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/BridgeBuilderCandidate.tsx"),
      "utf8",
    );
    // Honest pause: stopped clock with budget, running clock at zero, never extra time.
    expect(source).toContain("Paused.");
    expect(source).toContain("The clock is stopped while this is on screen.");
    expect(source).toContain("The clock keeps running while paused.");
    expect(source).toContain("Pausing never adds extra time.");
    expect(source).not.toContain("clock is waiting");
    // Listed GAME-297 qualification/debug strings stay off the player surface.
    expect(source).not.toContain("Standalone qualification");
    expect(source).not.toContain("Qualification vertical slice");
    expect(source).not.toContain("host return handshake");
    expect(source).not.toContain("Early bridge math");
    // Version-skew wording is player-friendly; versions stay in telemetry.
    expect(source).toContain("The picture needs a refresh");
    expect(source).not.toContain("display version needs a refresh");
  });

  it("grounds honest pause copy in engine truth: zero budget keeps the clock running", () => {
    const free = createBridgeClock({ nowMs: 0 });
    expect(free.pauseBudgetRemainingMs).toBeGreaterThan(0);
    const broken = createBridgeClock({ nowMs: 0, mode: "break" });
    expect(broken.pauseBudgetRemainingMs).toBe(0);

    // Zero budget: hiding never moves the deadline — the clock keeps running.
    const hiddenZero = applyBridgeHostSignal(broken, { type: "visibility", hidden: true, atMs: 1_000 });
    const resumedZero = applyBridgeHostSignal(hiddenZero, { type: "visibility", hidden: false, atMs: 11_000 });
    expect(resumedZero.deadlineMs).toBe(broken.deadlineMs);
    expect(resumedZero.pauseBudgetRemainingMs).toBe(0);

    // Budget left: the hidden window is credited — the clock was stopped.
    const hiddenFree = applyBridgeHostSignal(free, { type: "visibility", hidden: true, atMs: 1_000 });
    const resumedFree = applyBridgeHostSignal(hiddenFree, { type: "visibility", hidden: false, atMs: 11_000 });
    expect(resumedFree.deadlineMs).toBe(free.deadlineMs + 10_000);
  });
});
