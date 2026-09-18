/**
 * Phaser Bridge scene — reconciles BridgeViewModel only.
 * No composition math; lengths and verdicts come from the authoritative model.
 */

import type { BridgePointerEvent, PointerPhase } from "./normalizeInput";
import type { BridgeViewModel } from "../viewModel";
import { formatScaled } from "../format";

export const BRIDGE_SCENE_KEY = "BridgeScene";

export interface BridgeSceneHost {
  emitPointerEvent: (event: BridgePointerEvent) => void;
  getInputGeneration: () => number;
  /** Fired only after Phaser Scene.create() has attached input/render surfaces. */
  onSceneReady?: () => void;
}

export interface BridgeInteractionGeometry {
  tray: Array<{
    pieceId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  gap: { x: number; y: number; width: number; height: number } | null;
}

type RectLike = {
  setPosition: (x: number, y: number) => RectLike;
  setDisplaySize: (w: number, h: number) => RectLike;
  setFillStyle: (color: number, alpha?: number) => RectLike;
  setData: (key: string, value: unknown) => RectLike;
  getData: (key: string) => unknown;
  setInteractive: () => RectLike;
  on?: (event: string, fn: (...args: unknown[]) => void) => RectLike;
  destroy: () => void;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextLike = {
  setText: (value: string) => TextLike;
  setPosition: (x: number, y: number) => TextLike;
  setOrigin: (x: number, y: number) => TextLike;
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

/**
 * Lightweight scene controller usable with real Phaser or test doubles.
 * It performs presentation hit-testing, then forwards pointer facts to the
 * host normalizer. It never emits game intents or evaluates correctness.
 */
export class BridgeSceneController {
  private host: BridgeSceneHost;
  private scene: SceneLike | null = null;
  private viewModel: BridgeViewModel | null = null;
  private trayRects = new Map<string, RectLike>();
  private placedRects = new Map<string, RectLike>();
  private pieceLabels = new Map<string, TextLike>();
  private gapRect: RectLike | null = null;
  private successMarker: RectLike | null = null;
  private spanLabel: TextLike | null = null;
  private remainingLabel: TextLike | null = null;
  private feedbackLabel: TextLike | null = null;
  private destroyed = false;

  private readonly onPointerMove = (...args: unknown[]) => {
    this.forwardPointer("move", args[0]);
  };

  private readonly onPointerUp = (...args: unknown[]) => {
    this.forwardPointer("up", args[0]);
  };

  private readonly onPointerCancel = (...args: unknown[]) => {
    this.forwardPointer("cancel", args[0]);
  };

  constructor(host: BridgeSceneHost) {
    this.host = host;
  }

  attach(scene: SceneLike): void {
    this.scene = scene;
    scene.cameras.main.setBackgroundColor("#e8f1f8");
    const centerX = scene.scale.width / 2;
    this.spanLabel = scene.add.text(centerX, 12, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#102a43",
      align: "center",
    }).setOrigin(0.5, 0);
    this.remainingLabel = scene.add.text(centerX, 39, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#102a43",
      align: "center",
    }).setOrigin(0.5, 0);
    this.feedbackLabel = scene.add.text(centerX, 64, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#102a43",
      align: "center",
    }).setOrigin(0.5, 0);

    scene.input.on("pointermove", this.onPointerMove);
    scene.input.on("pointerup", this.onPointerUp);
    scene.input.on("pointerupoutside", this.onPointerCancel);
    this.host.onSceneReady?.();

    // GAME-166: React may reconcile before Phaser invokes Scene.create().
    // Retain and replay that authoritative view model after scene attachment.
    if (this.viewModel) {
      this.reconcile(this.viewModel);
    }
  }

  reconcile(vm: BridgeViewModel): void {
    if (this.destroyed) return;
    this.viewModel = vm;
    if (!this.scene) return;
    const scene = this.scene;
    const cliff = vm.layout.cliffPx;
    const unitPx = vm.layout.unitPx;
    const gapY = Math.max(120, scene.scale.height * 0.45);
    const gapX = cliff;
    const gapW = vm.span * unitPx;

    const centerX = scene.scale.width / 2;
    this.spanLabel?.setPosition(centerX, 12).setText(`Target span: ${vm.spanLabel}`);
    this.remainingLabel?.setText(
      vm.exact
        ? "Exact fit"
        : vm.overfill
          ? "Too long"
          : `${formatScaled(vm.remainingSpan, vm.denominator)} units left · ${formatScaled(vm.filledUnits, vm.denominator)} filled`
    );
    this.remainingLabel?.setPosition(centerX, 39);
    this.feedbackLabel?.setText(
      vm.exact
        ? vm.reducedMotion
          ? "Bridge complete · reduced motion"
          : vm.crossing
            ? "Crossing the bridge"
            : "Bridge complete"
        : vm.incorrectSubmit
          ? "Check the fit details below"
          : "Build to match the target span"
    );
    this.feedbackLabel?.setPosition(centerX, 64);

    // Gap bed
    this.gapRect?.destroy();
    this.gapRect = scene.add
      .rectangle(gapX + gapW / 2, gapY, gapW, 10, 0x7aa0b8, 0.35)
      .setData("role", "gap")
      .setInteractive() as RectLike;
    this.gapRect.on?.("pointerup", () => {
      this.host.emitPointerEvent({
        phase: "up",
        targetPieceId: null,
        overGap: true,
        generation: this.host.getInputGeneration(),
      });
    });

    // Clear previous piece rects.
    for (const rect of this.trayRects.values()) rect.destroy();
    for (const rect of this.placedRects.values()) rect.destroy();
    for (const label of this.pieceLabels.values()) label.destroy();
    this.trayRects.clear();
    this.placedRects.clear();
    this.pieceLabels.clear();

    let cursor = gapX;
    for (const piece of vm.placed) {
      const w = piece.widthPx;
      const rect = scene.add.rectangle(cursor + w / 2, gapY, w, 28, 0x2f6fed, 1);
      rect.setData("pieceId", piece.id);
      rect.setData("role", "placed");
      rect.setInteractive();
      this.placedRects.set(piece.id, rect);
      this.pieceLabels.set(
        piece.id,
        scene.add.text(cursor + w / 2, gapY, this.pieceFace(piece.units, piece.label, piece.kind), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#ffffff",
          align: "center",
        }).setOrigin(0.5, 0.5),
      );
      cursor += w;
    }

    const trayStartY = Math.min(scene.scale.height - 84, gapY + 90);
    const trayMargin = 24;
    const trayRowHeight = 44;
    const trayRight = scene.scale.width - trayMargin;
    let trayX = trayMargin;
    let trayY = trayStartY;
    for (const piece of vm.pieceTray) {
      const w = Math.min(trayRight - trayMargin, Math.max(48, piece.widthPx * 0.85));
      if (trayX > trayMargin && trayX + w > trayRight) {
        trayX = trayMargin;
        trayY += trayRowHeight;
      }
      const color = piece.selected ? 0xf0a202 : 0x4caf7a;
      const rect = scene.add.rectangle(trayX + w / 2, trayY, w, 32, color, 1);
      rect.setData("pieceId", piece.id);
      rect.setData("role", "tray");
      rect.setInteractive();
      rect.on?.("pointerdown", () => {
        this.host.emitPointerEvent({
          phase: "down",
          targetPieceId: piece.id,
          overGap: false,
          generation: this.host.getInputGeneration(),
        });
      });
      this.trayRects.set(piece.id, rect);
      this.pieceLabels.set(
        piece.id,
        scene.add.text(trayX + w / 2, trayY, this.pieceFace(piece.units, piece.label, piece.kind), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#102a43",
          align: "center",
        }).setOrigin(0.5, 0.5),
      );
      trayX += w + 12;
    }

    // Crossing is decorative and begins only after the engine has already
    // produced exact=true. Reduced motion jumps directly to the far bank.
    this.successMarker?.destroy();
    this.successMarker = null;
    if (vm.success) {
      const markerX =
        vm.crossing && !vm.reducedMotion ? gapX + gapW / 2 : gapX + gapW + 18;
      this.successMarker = scene.add
        .rectangle(markerX, gapY - 28, 20, 12, 0x176b4d, 1)
        .setData("role", "success-marker") as RectLike;
    }
  }

  /**
   * Presentation geometry for deterministic input adapters/tests.
   * These pixels are never converted into mathematical bridge lengths.
   */
  getInteractionGeometry(): BridgeInteractionGeometry {
    return {
      tray: [...this.trayRects.entries()].map(([pieceId, rect]) => ({
        pieceId,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })),
      gap: this.gapRect
        ? {
            x: this.gapRect.x,
            y: this.gapRect.y,
            width: this.gapRect.width,
            height: this.gapRect.height,
          }
        : null,
    };
  }

  private pieceFace(units: number, label: string, kind: string): string {
    if (this.viewModel?.flags.numberFace === "dots" && kind === "plank" && units > 0 && units <= 10) {
      return Array.from({ length: units }, () => "●").join(" ");
    }
    if (kind === "beam-x" || kind === "beam-2x" || kind === "shim") return label;
    return formatScaled(units, this.viewModel?.denominator ?? 1);
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

  private forwardPointer(phase: PointerPhase, rawPointer: unknown): void {
    if (this.destroyed || !this.scene) return;
    if (!rawPointer || typeof rawPointer !== "object") return;
    const pointer = rawPointer as { x?: unknown; y?: unknown };
    const x = Number(pointer.x);
    const y = Number(pointer.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const hit = this.pieceAt(x, y);
    this.host.emitPointerEvent({
      phase,
      targetPieceId: hit?.role === "tray" ? hit.pieceId : null,
      overGap: this.isOverGap(x, y),
      generation: this.host.getInputGeneration(),
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.scene) {
      this.scene.input.off("pointermove", this.onPointerMove);
      this.scene.input.off("pointerup", this.onPointerUp);
      this.scene.input.off("pointerupoutside", this.onPointerCancel);
    }
    this.gapRect?.destroy();
    this.successMarker?.destroy();
    this.gapRect = null;
    this.successMarker = null;
    for (const rect of this.trayRects.values()) rect.destroy();
    for (const rect of this.placedRects.values()) rect.destroy();
    for (const label of this.pieceLabels.values()) label.destroy();
    this.trayRects.clear();
    this.placedRects.clear();
    this.pieceLabels.clear();
    this.spanLabel?.destroy();
    this.remainingLabel?.destroy();
    this.feedbackLabel?.destroy();
    this.spanLabel = null;
    this.remainingLabel = null;
    this.feedbackLabel = null;
    this.scene = null;
    this.viewModel = null;
  }
}
