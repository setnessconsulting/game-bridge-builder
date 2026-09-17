/**
 * Phaser Bridge scene — reconciles BridgeViewModel only.
 * No composition math; lengths come from the view model.
 */

import type { BridgeViewModel } from "../viewModel";

export const BRIDGE_SCENE_KEY = "BridgeScene";

export type BridgeIntentEmitter = (intent: {
  type: string;
  pieceId?: string;
}) => void;

export interface BridgeSceneHost {
  emitIntent: BridgeIntentEmitter;
  getInputGeneration: () => number;
}

type PointerLike = {
  x?: number;
  y?: number;
  worldX?: number;
  worldY?: number;
};

type RectLike = {
  setPosition: (x: number, y: number) => RectLike;
  setDisplaySize: (w: number, h: number) => RectLike;
  setFillStyle: (color: number, alpha?: number) => RectLike;
  setData: (key: string, value: unknown) => RectLike;
  getData: (key: string) => unknown;
  setInteractive: () => RectLike;
  destroy: () => void;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextLike = {
  setText: (value: string) => TextLike;
  setPosition: (x: number, y: number) => TextLike;
  destroy: () => void;
};

type SceneLike = {
  add: {
    rectangle: (
      x: number,
      y: number,
      w: number,
      h: number,
      color: number,
      alpha?: number
    ) => RectLike;
    text: (
      x: number,
      y: number,
      text: string,
      style?: Record<string, unknown>
    ) => TextLike;
  };
  input: {
    on: (event: string, fn: (...args: unknown[]) => void) => void;
    off: (event: string, fn: (...args: unknown[]) => void) => void;
  };
  cameras: { main: { setBackgroundColor: (color: string) => void } };
  scale: { width: number; height: number };
};

function pointerPoint(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const pointer = value as PointerLike;
  const x = pointer.worldX ?? pointer.x;
  const y = pointer.worldY ?? pointer.y;
  return typeof x === "number" && typeof y === "number" ? { x, y } : null;
}

/**
 * Lightweight scene controller usable with real Phaser or test doubles.
 * Kept free of top-level `import("phaser")` so engine tests stay Phaser-free.
 */
export class BridgeSceneController {
  private host: BridgeSceneHost;
  private scene: SceneLike | null = null;
  private viewModel: BridgeViewModel | null = null;
  private trayRects = new Map<string, RectLike>();
  private placedRects = new Map<string, RectLike>();
  private gapRect: RectLike | null = null;
  private spanLabel: TextLike | null = null;
  private remainingLabel: TextLike | null = null;
  private pointerGeneration: number | null = null;
  private draggingPieceId: string | null = null;
  private readonly pointerDownHandler = (...args: unknown[]) => {
    const point = pointerPoint(args[0]);
    if (!point || !this.viewModel) return;

    const hit = this.pieceAt(point.x, point.y);
    if (hit?.role === "tray") {
      this.pointerGeneration = this.host.getInputGeneration();
      this.draggingPieceId = hit.pieceId;
      this.host.emitIntent({ type: "selectPiece", pieceId: hit.pieceId });
      return;
    }

    if (hit?.role === "placed") {
      this.host.emitIntent({ type: "removePiece", pieceId: hit.pieceId });
      return;
    }

    // Tap-then-tap uses the selected engine identity; no pixel coordinate
    // becomes a length or a correctness input.
    if (this.isOverGap(point.x, point.y) && this.viewModel.selectedPieceId) {
      this.host.emitIntent({
        type: "placePiece",
        pieceId: this.viewModel.selectedPieceId,
      });
    }
  };
  private readonly pointerUpHandler = (...args: unknown[]) => {
    const point = pointerPoint(args[0]);
    if (!point || !this.viewModel) return;
    const generation = this.pointerGeneration;
    this.pointerGeneration = null;
    const pieceId = this.draggingPieceId;
    this.draggingPieceId = null;
    if (!pieceId || generation !== this.host.getInputGeneration()) return;
    if (this.isOverGap(point.x, point.y)) {
      this.host.emitIntent({ type: "placePiece", pieceId });
    }
  };
  private destroyed = false;

  constructor(host: BridgeSceneHost) {
    this.host = host;
  }

  attach(scene: SceneLike): void {
    this.scene = scene;
    scene.cameras.main.setBackgroundColor("#e8f1f8");
    this.spanLabel = scene.add.text(16, 12, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#1a2b3c",
    });
    this.remainingLabel = scene.add.text(16, 34, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      color: "#334455",
    });
    scene.input.on("pointerdown", this.pointerDownHandler);
    scene.input.on("pointerup", this.pointerUpHandler);
  }

  reconcile(vm: BridgeViewModel): void {
    if (this.destroyed || !this.scene) return;
    this.viewModel = vm;
    const scene = this.scene;
    const cliff = vm.layout.cliffPx;
    const unitPx = vm.layout.unitPx;
    const gapY = Math.max(120, scene.scale.height * 0.45);
    const gapX = cliff;
    const gapW = vm.span * unitPx;

    this.spanLabel?.setText(`span ${vm.spanLabel} (${vm.span} units)`);
    this.remainingLabel?.setText(
      vm.exact
        ? "exact fit"
        : `remaining ${vm.remainingSpan} · filled ${vm.filledUnits}`
    );

    // Gap bed
    this.gapRect?.destroy();
    this.gapRect = scene.add
      .rectangle(gapX + gapW / 2, gapY, gapW, 10, 0x7aa0b8, 0.35)
      .setData("role", "gap") as RectLike;

    // Clear previous piece rects
    for (const rect of this.trayRects.values()) rect.destroy();
    for (const rect of this.placedRects.values()) rect.destroy();
    this.trayRects.clear();
    this.placedRects.clear();

    let cursor = gapX;
    for (const piece of vm.placed) {
      const w = piece.widthPx;
      const rect = scene.add.rectangle(cursor + w / 2, gapY, w, 28, 0x2f6fed, 1);
      rect.setData("pieceId", piece.id);
      rect.setData("role", "placed");
      rect.setInteractive();
      this.placedRects.set(piece.id, rect);
      cursor += w;
    }

    const trayY = Math.min(scene.scale.height - 48, gapY + 90);
    let trayX = 24;
    for (const piece of vm.pieceTray) {
      const w = Math.max(36, piece.widthPx * 0.85);
      const color = piece.selected ? 0xf0a202 : 0x4caf7a;
      const rect = scene.add.rectangle(trayX + w / 2, trayY, w, 32, color, 1);
      rect.setData("pieceId", piece.id);
      rect.setData("role", "tray");
      rect.setInteractive();
      this.trayRects.set(piece.id, rect);
      trayX += w + 12;
    }
  }

  /** Hit-test helper for tests / adapter without real Phaser input. */
  pieceAt(x: number, y: number): { pieceId: string; role: string } | null {
    const all = [...this.trayRects.values(), ...this.placedRects.values()];
    for (const rect of all) {
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      if (
        x >= rect.x - halfW &&
        x <= rect.x + halfW &&
        y >= rect.y - halfH &&
        y <= rect.y + halfH
      ) {
        return {
          pieceId: String(rect.getData("pieceId") ?? ""),
          role: String(rect.getData("role") ?? ""),
        };
      }
    }
    return null;
  }

  isOverGap(x: number, y: number): boolean {
    const vm = this.viewModel;
    if (!vm || !this.scene) return false;
    const cliff = vm.layout.cliffPx;
    const gapY = Math.max(120, this.scene.scale.height * 0.45);
    const gapW = vm.span * vm.layout.unitPx;
    return x >= cliff && x <= cliff + gapW && Math.abs(y - gapY) < 40;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.scene) {
      this.scene.input.off("pointerdown", this.pointerDownHandler);
      this.scene.input.off("pointerup", this.pointerUpHandler);
    }
    this.pointerGeneration = null;
    this.draggingPieceId = null;
    this.gapRect?.destroy();
    this.gapRect = null;
    for (const rect of this.trayRects.values()) rect.destroy();
    for (const rect of this.placedRects.values()) rect.destroy();
    this.trayRects.clear();
    this.placedRects.clear();
    this.spanLabel?.destroy();
    this.remainingLabel?.destroy();
    this.spanLabel = null;
    this.remainingLabel = null;
    this.scene = null;
    this.viewModel = null;
  }
}
