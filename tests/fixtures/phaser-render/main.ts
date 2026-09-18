import * as Phaser from "phaser";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import {
  applyBridgeIntent,
  createBridgeSession,
} from "@/lib/bridgeBuilder/session";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import {
  createBridgeGame,
  type BridgeGameHandle,
} from "@/lib/bridgeBuilder/phaser/createBridgeGame";
import { BRIDGE_SCENE_KEY } from "@/lib/bridgeBuilder/phaser/BridgeScene";

const WIDTH = 640;
const HEIGHT = 360;
const EXPECTED_RGB = { red: 47, green: 111, blue: 237 } as const;

const puzzle: BridgePuzzle = {
  id: "game-166-real-render",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10",
  ticksVisible: true,
  tray: [
    { id: "placed-four", units: 4, label: "4", kind: "plank" },
    { id: "tray-six", units: 6, label: "6", kind: "plank" },
  ],
  presetPlaced: [],
  parPieces: 2,
  solutionCount: 1,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

type SnapshotColor = {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
  r?: number;
  g?: number;
  b?: number;
  a?: number;
};

type RendererLike = {
  constructor?: { name?: string };
  gl?: WebGLRenderingContext | WebGL2RenderingContext;
  snapshotPixel?: (
    x: number,
    y: number,
    callback: (color: SnapshotColor) => void
  ) => unknown;
};

type SceneLike = {
  sys?: { isActive?: () => boolean };
  children?: { list?: unknown[] };
};

type GameLike = {
  renderer?: RendererLike;
  getFrame?: () => number;
  scene?: { getScene?: (key: string) => SceneLike };
};

export interface Game166Diagnostics {
  phaserVersion: string;
  frame: number;
  sceneActive: boolean;
  rendererClass: string;
  isWebGL: boolean;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  rendererIdentity: string;
  glError: number;
  displayListCount: number;
  canvasCount: number;
}

export interface Game166Harness {
  mode: "positive" | "negative";
  sample: { x: number; y: number };
  expectedRgb: typeof EXPECTED_RGB;
  getDiagnostics: () => Game166Diagnostics;
  snapshotExpectedPixel: () => Promise<Required<SnapshotColor>>;
  destroy: () => void;
}

declare global {
  interface Window {
    __GAME_166__?: Game166Harness;
  }
}

function rendererIdentity(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const extension = gl.getExtension("WEBGL_debug_renderer_info") as
    | { UNMASKED_RENDERER_WEBGL: number }
    | null;
  if (extension) {
    return String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL));
  }
  return String(gl.getParameter(gl.RENDERER));
}

function normalizeColor(color: SnapshotColor): Required<SnapshotColor> {
  return {
    red: color.red ?? color.r ?? -1,
    green: color.green ?? color.g ?? -1,
    blue: color.blue ?? color.b ?? -1,
    alpha: color.alpha ?? color.a ?? -1,
    r: color.r ?? color.red ?? -1,
    g: color.g ?? color.green ?? -1,
    b: color.b ?? color.blue ?? -1,
    a: color.a ?? color.alpha ?? -1,
  };
}

const parent = document.querySelector<HTMLElement>("#game");
if (!parent) {
  throw new Error("Missing GAME-166 fixture parent");
}
const fixtureParent = parent;

const mode =
  new URLSearchParams(window.location.search).get("mode") === "negative"
    ? "negative"
    : "positive";

const layout = createBridgeLayout({
  unitPx: 24,
  cliffPx: 46,
  canvasWidth: WIDTH,
  canvasHeight: HEIGHT,
  dpr: 1,
});

let session = createBridgeSession(puzzle);
if (mode === "positive") {
  session = applyBridgeIntent(session, {
    type: "placePiece",
    pieceId: "placed-four",
  }).state;
}
const viewModel = deriveBridgeViewModel(session, { layout });

const handle: BridgeGameHandle = await createBridgeGame({
  parent: fixtureParent,
  width: WIDTH,
  height: HEIGHT,
  host: {
    emitPointerEvent: () => {},
    getInputGeneration: () => 1,
  },
});

// Reconcile immediately to exercise the pre-Scene.create pending-view-model path.
handle.reconcile(viewModel);

const game = handle.game as unknown as GameLike;
const sample = {
  x: Math.round(layout.cliffPx + (puzzle.tray[0].units * layout.unitPx) / 2),
  y: Math.round(Math.max(120, HEIGHT * 0.45)),
};

function getDiagnostics(): Game166Diagnostics {
  const renderer = game.renderer;
  const gl = renderer?.gl;
  const scene = game.scene?.getScene?.(BRIDGE_SCENE_KEY);
  return {
    phaserVersion: Phaser.VERSION,
    frame: game.getFrame?.() ?? -1,
    sceneActive: Boolean(scene?.sys?.isActive?.()),
    rendererClass: renderer?.constructor?.name ?? "unknown",
    isWebGL: Boolean(gl && renderer?.snapshotPixel),
    drawingBufferWidth: gl?.drawingBufferWidth ?? 0,
    drawingBufferHeight: gl?.drawingBufferHeight ?? 0,
    rendererIdentity: gl ? rendererIdentity(gl) : "none",
    glError: gl ? gl.getError() : -1,
    displayListCount: scene?.children?.list?.length ?? 0,
    canvasCount: fixtureParent.querySelectorAll("canvas").length,
  };
}

function snapshotExpectedPixel(): Promise<Required<SnapshotColor>> {
  const renderer = game.renderer;
  if (!renderer?.snapshotPixel) {
    return Promise.reject(new Error("Phaser WebGLRenderer.snapshotPixel is unavailable"));
  }
  return new Promise((resolve) => {
    renderer.snapshotPixel?.(sample.x, sample.y, (color) => {
      resolve(normalizeColor(color));
    });
  });
}

let destroyed = false;
function destroy(): void {
  if (destroyed) return;
  destroyed = true;
  handle.destroy();
}

window.__GAME_166__ = {
  mode,
  sample,
  expectedRgb: EXPECTED_RGB,
  getDiagnostics,
  snapshotExpectedPixel,
  destroy,
};

window.addEventListener("beforeunload", destroy, { once: true });
