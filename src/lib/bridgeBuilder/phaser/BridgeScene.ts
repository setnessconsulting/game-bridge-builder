/**
 * Phaser Bridge scene — reconciles BridgeViewModel only.
 * No composition math; lengths and verdicts come from the authoritative model.
 */

import type { BridgePointerEvent, PointerPhase } from "./normalizeInput";
import type { BridgeViewModel } from "../viewModel";
import { formatScaled } from "../format";

export const BRIDGE_SCENE_KEY = "BridgeScene";
export const BRIDGE_CAR_TEXTURE_KEY = "bridge-builder-car";

const COLORS = {
  sky: 0xbfe8f5,
  cloud: 0xeaf8fb,
  water: 0x3f9ab2,
  waterDeep: 0x2b708c,
  waterLight: 0x75c9d2,
  cliff: 0xa76645,
  cliffLight: 0xc58a5f,
  cliffShadow: 0x74402f,
  stone: 0xe4c79c,
  stoneShadow: 0xb98e61,
  wood: 0xb77a3c,
  woodLight: 0xe6b56e,
  woodDark: 0x6a3a21,
  ink: 0x102a43,
  inkSoft: 0x38536a,
  target: 0xf5d27b,
  exact: 0x3c9a72,
  amber: 0xd0a33a,
  overfill: 0xb85c4a,
  white: 0xffffff,
} as const;

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
    hitWidth: number;
    hitHeight: number;
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

type GraphicsLike = {
  clear: () => GraphicsLike;
  fillStyle: (color: number, alpha?: number) => GraphicsLike;
  fillRect: (x: number, y: number, w: number, h: number) => GraphicsLike;
  fillCircle: (x: number, y: number, radius: number) => GraphicsLike;
  strokeCircle: (x: number, y: number, radius: number) => GraphicsLike;
  lineStyle: (width: number, color: number, alpha?: number) => GraphicsLike;
  lineBetween: (x1: number, y1: number, x2: number, y2: number) => GraphicsLike;
  strokeRect: (x: number, y: number, w: number, h: number) => GraphicsLike;
  destroy: () => void;
};

type TextLike = {
  setText: (value: string) => TextLike;
  setPosition: (x: number, y: number) => TextLike;
  setOrigin: (x: number, y: number) => TextLike;
  destroy: () => void;
};

type ImageLike = {
  setPosition: (x: number, y: number) => ImageLike;
  setDisplaySize: (w: number, h: number) => ImageLike;
  setOrigin?: (x: number, y: number) => ImageLike;
  setAlpha?: (alpha: number) => ImageLike;
  setRotation?: (rotation: number) => ImageLike;
  setDepth?: (depth: number) => ImageLike;
  destroy: () => void;
  x: number;
  y: number;
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
    image?: (x: number, y: number, key: string) => ImageLike;
    graphics?: () => GraphicsLike;
  };
  input: {
    on: (event: string, fn: (...args: unknown[]) => void) => void;
    off: (event: string, fn: (...args: unknown[]) => void) => void;
  };
  cameras: { main: { setBackgroundColor: (color: string) => void } };
  scale: { width: number; height: number };
  tweens?: {
    add: (config: Record<string, unknown>) => unknown;
    killTweensOf?: (target: unknown) => void;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function drawDashedLine(
  graphics: GraphicsLike,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length === 0) return;
  const dx = (x2 - x1) / length;
  const dy = (y2 - y1) / length;
  for (let offset = 0; offset < length; offset += dash + gap) {
    const end = Math.min(length, offset + dash);
    graphics.lineBetween(
      x1 + dx * offset,
      y1 + dy * offset,
      x1 + dx * end,
      y1 + dy * end,
    );
  }
}

export interface PlankPresentationOptions {
  selected?: boolean;
  placed?: boolean;
  overfill?: boolean;
  /** Lifted while dragged (GAME-133 sets draggingPieceId; decorative only). */
  dragging?: boolean;
  /** Dashed ghost of a would-be placement; never interactive. */
  preview?: boolean;
  /** Locked tray (expired/exact): dimmed + hatched, never color alone. */
  disabled?: boolean;
}

function drawPlank(
  graphics: GraphicsLike,
  x: number,
  centerY: number,
  width: number,
  height: number,
  options: PlankPresentationOptions = {},
): void {
  const safeWidth = Math.max(24, width);
  const halfHeight = height / 2;
  const endRadius = Math.min(halfHeight, Math.max(7, Math.min(14, safeWidth / 8)));
  const bodyX = x + endRadius;
  const bodyWidth = Math.max(1, safeWidth - endRadius * 2);
  // Dragging reads as lifted: shadow drops further, plank draws higher.
  const lift = options.dragging ? -6 : 0;
  const bodyY = centerY - halfHeight + lift;
  const shadowAlpha = options.dragging ? 0.38 : 0.24;
  const shadowDrop = options.dragging ? 11 : 6;
  const bodyAlpha = options.preview ? 0.55 : options.disabled ? 0.55 : 1;
  const bodyColor = options.overfill
    ? COLORS.overfill
    : options.selected
      ? COLORS.target
      : options.placed
        ? COLORS.wood
        : COLORS.woodLight;

  graphics
    .fillStyle(COLORS.woodDark, shadowAlpha)
    .fillRect(x + 2, bodyY + shadowDrop, safeWidth, height)
    .fillStyle(bodyColor, bodyAlpha)
    .fillRect(bodyX, bodyY, bodyWidth, height)
    .fillStyle(bodyColor, bodyAlpha)
    .fillCircle(bodyX, centerY + lift, endRadius)
    .fillCircle(bodyX + bodyWidth, centerY + lift, endRadius);
  if (options.preview || options.disabled) {
    graphics.lineStyle(options.preview ? 2 : 2, COLORS.ink, options.preview ? 0.85 : 0.6);
    drawDashedLine(graphics, bodyX, bodyY, bodyX + bodyWidth, bodyY, 6, 4);
    drawDashedLine(graphics, bodyX, bodyY + height, bodyX + bodyWidth, bodyY + height, 6, 4);
  } else {
    graphics.lineStyle(options.dragging || options.selected ? 3 : 2, options.overfill ? COLORS.ink : COLORS.woodDark, 1)
      .strokeRect(bodyX, bodyY, bodyWidth, height);
  }
  graphics
    .lineStyle(1, COLORS.woodLight, 0.7)
    .lineBetween(bodyX + 8, centerY + lift - 5, bodyX + bodyWidth - 8, centerY + lift - 5)
    .lineBetween(bodyX + 12, centerY + lift + 5, bodyX + bodyWidth - 12, centerY + lift + 5)
    .lineStyle(2, COLORS.woodDark, 0.9)
    .lineBetween(bodyX + 4, bodyY + 3, bodyX + 4, bodyY + height - 3)
    .lineBetween(bodyX + bodyWidth - 4, bodyY + 3, bodyX + bodyWidth - 4, bodyY + height - 3);
  // Bolt dots pin placed planks to the span (geometry, not color).
  if (options.placed && !options.preview) {
    graphics
      .fillStyle(COLORS.woodDark, 0.9)
      .fillCircle(bodyX + 9, centerY + lift, 2.4)
      .fillCircle(bodyX + bodyWidth - 9, centerY + lift, 2.4);
  }
  // Selection ticks at both ends: selected reads without color.
  if (options.selected && !options.disabled) {
    graphics
      .lineStyle(3, COLORS.ink, 0.9)
      .lineBetween(bodyX - 5, bodyY - 5, bodyX + 5, bodyY - 5)
      .lineBetween(bodyX - 5, bodyY - 5, bodyX - 5, bodyY + 5)
      .lineBetween(bodyX + bodyWidth - 5, bodyY + height + 5, bodyX + bodyWidth + 5, bodyY + height + 5)
      .lineBetween(bodyX + bodyWidth + 5, bodyY + height - 5, bodyX + bodyWidth + 5, bodyY + height + 5);
  }
  // Disabled hatch: diagonal bars across the plank, never color alone.
  if (options.disabled) {
    graphics.lineStyle(2, COLORS.ink, 0.4);
    for (let hx = bodyX + 6; hx < bodyX + bodyWidth - 2; hx += 12) {
      graphics.lineBetween(hx, bodyY + height - 3, Math.min(bodyX + bodyWidth, hx + 8), bodyY + 3);
    }
  }
  // Overfill cross-hatch on the plank body (matches the excess marker).
  if (options.overfill && !options.preview) {
    graphics.lineStyle(2, COLORS.white, 0.75);
    for (let hx = bodyX + 4; hx < bodyX + bodyWidth - 2; hx += 10) {
      graphics.lineBetween(hx, bodyY + 3, Math.min(bodyX + bodyWidth, hx + 7), bodyY + height - 3);
    }
  }
}

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
  private environmentLayer: GraphicsLike | null = null;
  private targetLayer: GraphicsLike | null = null;
  private pieceLayer: GraphicsLike | null = null;
  private effectLayer: GraphicsLike | null = null;
  private spanLabel: TextLike | null = null;
  private remainingLabel: TextLike | null = null;
  private feedbackLabel: TextLike | null = null;
  private carSprite: ImageLike | null = null;
  private carSignature: string | null = null;
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
    scene.cameras.main.setBackgroundColor("#bfe8f5");
    const centerX = scene.scale.width / 2;
    const fontSize = `${clamp(Math.round(scene.scale.width / 42), 12, 18)}px`;
    const smallFontSize = `${clamp(Math.round(scene.scale.width / 48), 11, 15)}px`;
    this.environmentLayer = scene.add.graphics?.() ?? null;
    this.targetLayer = scene.add.graphics?.() ?? null;
    this.pieceLayer = scene.add.graphics?.() ?? null;
    this.effectLayer = scene.add.graphics?.() ?? null;
    this.spanLabel = scene.add.text(centerX, 10, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize,
      fontStyle: "bold",
      color: "#102a43",
      align: "center",
    }).setOrigin(0.5, 0);
    this.remainingLabel = scene.add.text(centerX, 34, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: smallFontSize,
      fontStyle: "bold",
      color: "#102a43",
      align: "center",
    }).setOrigin(0.5, 0);
    this.feedbackLabel = scene.add.text(centerX, 56, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: smallFontSize,
      fontStyle: "bold",
      color: "#38536a",
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
    const gapY = clamp(scene.scale.height * 0.43, 82, Math.max(82, scene.scale.height - 92));
    const gapX = cliff;
    const gapW = vm.span * unitPx;
    const centerX = scene.scale.width / 2;

    this.spanLabel?.setPosition(centerX, 10).setText(`Target span: ${vm.spanLabel}`);
    // GAME-302: canvas mirrors the DOM teach copy. Math comes from the view
    // model (engine-authoritative); canvas only formats presentation text.
    const previewTeach = vm.previewOversize ?? (vm.selectedOversize
      ? { pieceId: vm.selectedPieceId ?? "", ...vm.selectedOversize }
      : null);
    this.remainingLabel?.setText(
      vm.exact
        ? "Exact fit"
        : vm.overfill
          ? "Too long"
          : previewTeach && vm.remainingSpan > 0
            ? `Too long for ${formatScaled(vm.remainingSpan, vm.denominator)} left`
            : `${formatScaled(vm.remainingSpan, vm.denominator)} left · ${formatScaled(vm.filledUnits, vm.denominator)} filled`,
    );
    this.remainingLabel?.setPosition(centerX, 34);
    this.feedbackLabel?.setText(
      vm.exact
        ? vm.crossing
          ? "Crossing the bridge"
          : "Bridge complete"
        : vm.incorrectSubmit
          ? vm.verdict === "underfill"
            ? "The car is stuck at the unfinished bridge"
            : "The car slipped into the water"
          : vm.overfill
            ? "The car slipped into the water"
            : previewTeach && vm.remainingSpan > 0
              ? `Would stick out by ${formatScaled(previewTeach.excessUnits, vm.denominator)} — choose a shorter plank`
              : "Build to match the target span",
    );
    this.feedbackLabel?.setPosition(centerX, 56);

    this.drawEnvironment(scene.scale.width, scene.scale.height, gapX, gapY, gapW, vm);
    this.drawTarget(gapX, gapY, gapW, vm);

    this.gapRect?.destroy();
    this.gapRect = scene.add.rectangle(gapX + gapW / 2, gapY, gapW, 48, COLORS.white, 0.01)
      .setData("role", "gap")
      .setInteractive();
    this.gapRect.on?.("pointerup", () => {
      this.host.emitPointerEvent({
        phase: "up",
        targetPieceId: null,
        overGap: true,
        generation: this.host.getInputGeneration(),
      });
    });

    this.pieceLayer?.clear();
    for (const rect of this.trayRects.values()) rect.destroy();
    for (const rect of this.placedRects.values()) rect.destroy();
    for (const label of this.pieceLabels.values()) label.destroy();
    this.trayRects.clear();
    this.placedRects.clear();
    this.pieceLabels.clear();

    let cursor = gapX;
    for (const piece of vm.placed) {
      const width = Math.max(24, piece.widthPx);
      drawPlank(this.pieceLayer ?? this.fallbackGraphics(), cursor, gapY, width, 30, {
        placed: true,
        overfill: vm.overfill,
      });
      const rect = this.createHitRect(scene, cursor + width / 2, gapY, width, 52, piece.id, "placed");
      this.placedRects.set(piece.id, rect);
      this.pieceLabels.set(
        piece.id,
        scene.add.text(cursor + width / 2, gapY, this.pieceFace(piece.units, piece.label, piece.kind), {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${clamp(Math.round(width / 8), 11, 16)}px`,
          fontStyle: "bold",
          color: "#102a43",
          align: "center",
        }).setOrigin(0.5, 0.5),
      );
      cursor += width;
    }

    this.effectLayer?.clear();
    const filledPx = clamp(Math.max(0, vm.filledUnits) * unitPx, 0, gapW);
    if (vm.overfill) {
      this.drawOverfillState(gapX, gapY, gapW, vm);
      this.drawSplash(gapX, gapY, gapW, this.waterLineY(scene.scale.height, gapY));
    } else if (previewTeach && vm.remainingSpan > 0) {
      // GAME-302: soft preview — geometry (excess width) + dashed outline,
      // not color alone. Static so reduced-motion needs no tween.
      this.drawOverhangPreview(gapX, gapY, gapW, previewTeach.excessUnits * unitPx);
    } else if (vm.underfill && !vm.exact && vm.remainingSpan > 0 && !vm.incorrectSubmit) {
      this.drawUnderfillState(gapX, gapY, gapW, filledPx);
    }
    // Placement ghost: dashed preview of the hovered/selected tray piece in
    // the open slot. Decorative only — no hit rect, never emits intents.
    const ghostId = vm.placementPreviewPieceId ?? vm.selectedPieceId;
    if (!vm.exact && !vm.overfill && ghostId && vm.remainingSpan > 0) {
      const ghost = vm.pieceTray.find((candidate) => candidate.id === ghostId);
      if (ghost) {
        const ghostWidth = Math.max(24, ghost.widthPx);
        drawPlank(this.effectLayer ?? this.fallbackGraphics(), gapX + filledPx, gapY, ghostWidth, 30, {
          preview: true,
        });
      }
    }

    // GAME-297: tray widths share one scale factor so planks stay
    // length-proportional (ratios preserved; 48px floor is a presentation
    // minimum only — math stays in engine units).
    const trayStartY = Math.min(scene.scale.height - 58, gapY + 92);
    const trayMargin = Math.max(14, Math.round(scene.scale.width * 0.04));
    const trayRowHeight = 56;
    const trayRight = scene.scale.width - trayMargin;
    const maxVisualWidth = Math.max(56, trayRight - trayMargin);
    const maxTrayPiecePx = Math.max(1, ...vm.pieceTray.map((piece) => piece.widthPx));
    const trayScale = Math.min(1, maxVisualWidth / Math.max(1, maxTrayPiecePx));
    // Locked tray (expired round or completed bridge): dimmed + hatched.
    const trayDisabled = vm.session.expired || vm.exact;
    let trayX = trayMargin;
    let trayY = trayStartY;
    for (const piece of vm.pieceTray) {
      const visualWidth = Math.min(maxVisualWidth, Math.max(48, Math.round(piece.widthPx * trayScale)));
      if (trayX > trayMargin && trayX + visualWidth > trayRight) {
        trayX = trayMargin;
        trayY += trayRowHeight;
      }
      const selected = piece.selected || piece.focused;
      const dragging = piece.id === vm.draggingPieceId;
      // GAME-302: oversized tray planks use the overfill fill + ⚠ glyph so the
      // signal is never color alone. Geometry preview lives in the gap.
      drawPlank(this.pieceLayer ?? this.fallbackGraphics(), trayX, trayY, visualWidth, 30, {
        selected: selected && !trayDisabled,
        overfill: piece.oversized && !trayDisabled,
        dragging,
        disabled: trayDisabled,
      });
      const visualCenterX = trayX + visualWidth / 2;
      const rect = this.createHitRect(scene, visualCenterX, trayY, visualWidth, 52, piece.id, "tray");
      rect.on?.("pointerdown", () => {
        this.host.emitPointerEvent({
          phase: "down",
          targetPieceId: piece.id,
          overGap: false,
          generation: this.host.getInputGeneration(),
        });
      });
      this.trayRects.set(piece.id, rect);
      const face = this.pieceFace(piece.units, piece.label, piece.kind);
      this.pieceLabels.set(
        piece.id,
        scene.add.text(visualCenterX, trayY, piece.oversized ? `⚠ ${face}` : face, {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${clamp(Math.round(visualWidth / 8), 11, 16)}px`,
          fontStyle: "bold",
          color: "#102a43",
          align: "center",
        }).setOrigin(0.5, 0.5),
      );
      trayX += visualWidth + 12;
    }

    this.successMarker?.destroy();
    this.successMarker = null;
    if (vm.success) {
      this.drawSuccessMarker(scene, gapX, gapY, gapW, vm);
    }
    this.drawCar(scene, gapX, gapY, gapW, vm);
  }

  private createHitRect(
    scene: SceneLike,
    x: number,
    y: number,
    visualWidth: number,
    hitHeight: number,
    pieceId: string,
    role: string,
  ): RectLike {
    const rect = scene.add.rectangle(x, y, visualWidth, hitHeight, COLORS.white, 0.01);
    rect.setData("pieceId", pieceId);
    rect.setData("role", role);
    rect.setInteractive();
    return rect;
  }

  private drawEnvironment(
    width: number,
    height: number,
    gapX: number,
    gapY: number,
    gapW: number,
    vm: BridgeViewModel,
  ): void {
    const graphics = this.environmentLayer;
    if (!graphics) return;
    graphics.clear();
    const waterY = this.waterLineY(height, gapY);
    const bankTop = gapY - 54;
    const bankBottom = Math.min(height, waterY + 18);
    const bankHeight = Math.max(20, bankBottom - bankTop);
    const cliffWidth = Math.max(gapX, width - (gapX + gapW));
    const supportHeight = Math.max(28, Math.min(72, height * 0.22));
    graphics
      .fillStyle(COLORS.sky, 1)
      .fillRect(0, 0, width, height)
      .fillStyle(COLORS.cloud, 0.7)
      .fillCircle(width * 0.18, height * 0.18, Math.max(12, width * 0.035))
      .fillCircle(width * 0.24, height * 0.2, Math.max(8, width * 0.024))
      .fillCircle(width * 0.82, height * 0.16, Math.max(10, width * 0.03))
      .fillStyle(COLORS.water, 1)
      .fillRect(0, waterY, width, height - waterY)
      .fillStyle(COLORS.waterDeep, 0.16)
      .fillRect(0, waterY + height * 0.2, width, height * 0.18)
      .lineStyle(2, COLORS.waterLight, 0.62)
      .lineBetween(0, waterY + 12, width, waterY + 12)
      .lineBetween(width * 0.08, waterY + 36, width * 0.46, waterY + 36)
      .lineBetween(width * 0.62, waterY + 48, width * 0.94, waterY + 48)
      .lineStyle(1, COLORS.waterDeep, 0.52)
      .lineBetween(width * 0.18, waterY + 68, width * 0.76, waterY + 68)
      .lineBetween(width * 0.02, waterY + 92, width * 0.3, waterY + 92)
      .lineBetween(width * 0.52, waterY + 108, width * 0.9, waterY + 108)
      .fillStyle(COLORS.cliff, 1)
      .fillRect(0, bankTop, gapX, bankHeight)
      .fillRect(gapX + gapW, bankTop, cliffWidth, bankHeight)
      .fillStyle(COLORS.cliffLight, 1)
      .fillRect(0, bankTop, gapX, 10)
      .fillRect(gapX + gapW, bankTop, cliffWidth, 10)
      .fillStyle(COLORS.cliffShadow, 0.45)
      .fillRect(Math.max(0, gapX - 12), gapY - 42, 12, bankBottom - gapY + 42)
      .fillRect(gapX + gapW, gapY - 42, Math.min(12, cliffWidth), bankBottom - gapY + 42)
      .lineStyle(2, COLORS.stone, 0.65)
      .lineBetween(8, gapY - 26, Math.max(8, gapX - 10), gapY - 26)
      .lineBetween(gapX + gapW + 10, gapY - 26, width - 8, gapY - 26)
      .lineStyle(3, COLORS.stoneShadow, 0.8)
      .lineBetween(10, gapY - 8, Math.max(10, gapX - 12), gapY - 8)
      .lineBetween(gapX + gapW + 12, gapY - 8, width - 10, gapY - 8)
      .lineStyle(3, COLORS.waterDeep, 0.8)
      .lineBetween(0, waterY, Math.max(0, gapX - 6), waterY)
      .lineBetween(gapX + gapW + 6, waterY, width, waterY)
      .fillStyle(COLORS.cliffShadow, 0.8)
      .fillRect(gapX + 14, gapY + 14, 14, supportHeight)
      .fillRect(gapX + gapW - 28, gapY + 14, 14, supportHeight)
      .fillStyle(COLORS.stone, 1)
      .fillRect(gapX + 11, gapY + 10, 20, 8)
      .fillRect(gapX + gapW - 31, gapY + 10, 20, 8)
      // Anchor bolts pin the span ends (geometry, never color alone).
      .fillStyle(COLORS.woodDark, 0.9)
      .fillCircle(gapX + 16, gapY + 14, 2.2)
      .fillCircle(gapX + 26, gapY + 14, 2.2)
      .fillCircle(gapX + gapW - 26, gapY + 14, 2.2)
      .fillCircle(gapX + gapW - 16, gapY + 14, 2.2);
    // Span ruler ticks along the target lip (presentation only; math stays in
    // engine units). Deterministic per layout so every reconcile matches.
    if (vm.environment.ticksVisible && vm.layout.unitPx > 0) {
      const step = vm.layout.unitPx;
      graphics.lineStyle(1, COLORS.ink, 0.35);
      for (let tickX = gapX + step; tickX < gapX + gapW - 1; tickX += step) {
        const major = Math.round((tickX - gapX) / step) % 5 === 0;
        graphics.lineBetween(tickX, gapY - 24, tickX, gapY - 24 + (major ? 9 : 5));
      }
    }
    // Deterministic cliff speckles from the presentation seed: the same puzzle
    // always renders the same stones. Decorative only.
    graphics.fillStyle(COLORS.cliffShadow, 0.5);
    let speckle = vm.renderSeed === 0 ? 0x9e3779b9 : vm.renderSeed;
    const speckleCount = 8;
    for (let index = 0; index < speckleCount; index += 1) {
      speckle = (Math.imul(speckle ^ (speckle >>> 15), 2246822519) >>> 0);
      const leftSide = index % 2 === 0;
      const span = Math.max(8, gapX - 16);
      const sx = leftSide
        ? 6 + (speckle % Math.max(1, span))
        : gapX + gapW + 6 + (speckle % Math.max(1, Math.max(8, cliffWidth - 16)));
      speckle = (Math.imul(speckle ^ (speckle >>> 13), 3266489917) >>> 0);
      const sy = gapY - 44 + (speckle % Math.max(1, Math.floor(bankHeight)));
      graphics.fillCircle(sx, sy, 1.8);
    }
  }

  private waterLineY(height: number, gapY: number): number {
    return clamp(gapY + Math.max(34, height * 0.1), 116, Math.max(116, height - 34));
  }

  private drawTarget(gapX: number, gapY: number, gapW: number, vm: BridgeViewModel): void {
    const graphics = this.targetLayer;
    if (!graphics) return;
    graphics.clear();
    const stateColor = vm.exact ? COLORS.exact : vm.overfill ? COLORS.overfill : COLORS.target;
    graphics
      .fillStyle(stateColor, vm.exact ? 0.18 : 0.12)
      .fillRect(gapX, gapY - 24, gapW, 48)
      .lineStyle(vm.exact ? 4 : 3, stateColor, 0.95);
    if (vm.exact) {
      // Exact fit: solid double frame + check geometry (never color alone).
      graphics
        .strokeRect(gapX, gapY - 24, gapW, 48)
        .lineStyle(2, stateColor, 0.9)
        .strokeRect(gapX + 4, gapY - 20, Math.max(1, gapW - 8), 40);
      const cx = gapX + gapW / 2;
      graphics
        .lineStyle(4, COLORS.ink, 0.95)
        .lineBetween(cx - 12, gapY - 34, cx - 3, gapY - 25)
        .lineBetween(cx - 3, gapY - 25, cx + 13, gapY - 44);
    } else {
      drawDashedLine(graphics, gapX, gapY - 24, gapX + gapW, gapY - 24, 10, 7);
      drawDashedLine(graphics, gapX, gapY + 24, gapX + gapW, gapY + 24, 10, 7);
      // Underfill open-span cue: dotted center line reads as "still open".
      if (!vm.overfill) {
        graphics.lineStyle(2, COLORS.ink, 0.4);
        drawDashedLine(graphics, gapX + 6, gapY, gapX + gapW - 6, gapY, 4, 6);
      }
    }
    graphics
      .lineBetween(gapX, gapY - 24, gapX, gapY + 24)
      .lineBetween(gapX + gapW, gapY - 24, gapX + gapW, gapY + 24)
      .fillStyle(stateColor, 1)
      .fillCircle(gapX, gapY, 6)
      .fillCircle(gapX + gapW, gapY, 6);
  }

  /**
   * Underfill geometry: hatch the still-open remainder of the span so the
   * "how much is left" cue is pattern + extent, never color alone. Purely
   * decorative: the authoritative remainder lives in viewModel.remainingSpan.
   */
  private drawUnderfillState(gapX: number, gapY: number, gapW: number, filledPx: number): void {
    const graphics = this.effectLayer;
    if (!graphics) return;
    const openStart = gapX + clamp(filledPx, 0, gapW);
    const openEnd = gapX + gapW;
    if (openEnd - openStart < 8) return;
    graphics.lineStyle(2, COLORS.ink, 0.5);
    drawDashedLine(graphics, openStart, gapY - 18, openEnd, gapY - 18, 6, 4);
    drawDashedLine(graphics, openStart, gapY + 18, openEnd, gapY + 18, 6, 4);
    graphics.lineStyle(1, COLORS.ink, 0.3);
    for (let hx = openStart + 4; hx < openEnd - 2; hx += 10) {
      graphics.lineBetween(hx, gapY + 14, Math.min(openEnd, hx + 7), gapY - 14);
    }
  }

  private drawOverfillState(gapX: number, gapY: number, gapW: number, vm: BridgeViewModel): void {
    const graphics = this.effectLayer;
    if (!graphics) return;
    const excess = vm.remainingSpan < 0
      ? Math.abs(vm.remainingSpan) * vm.layout.unitPx
      : Math.min(42, gapW * 0.12);
    const start = gapX + gapW;
    graphics
      .lineStyle(4, COLORS.overfill, 1)
      .lineBetween(start, gapY - 30, start + excess, gapY - 30)
      .lineBetween(start, gapY + 30, start + excess, gapY + 30)
      .lineStyle(2, COLORS.overfill, 0.9)
      .lineBetween(start + excess, gapY - 30, start + excess, gapY + 30);
    // Cross-hatch the excess segment + warning triangle at its tip.
    graphics.lineStyle(1, COLORS.ink, 0.55);
    for (let hx = start + 3; hx < start + excess - 1; hx += 8) {
      graphics.lineBetween(hx, gapY - 28, Math.min(start + excess, hx + 6), gapY + 28);
    }
    const tipX = start + excess;
    graphics
      .lineStyle(3, COLORS.ink, 0.95)
      .lineBetween(tipX + 4, gapY - 12, tipX + 4, gapY + 12)
      .lineBetween(tipX + 4, gapY - 12, tipX + 14, gapY)
      .lineBetween(tipX + 14, gapY, tipX + 4, gapY + 12)
      .fillStyle(COLORS.ink, 0.95)
      .fillCircle(tipX + 4, gapY, 1.6);
  }

  /**
   * GAME-302: soft overhang preview before commit. Same geometry language as
   * the committed overfill (excess width past the gap) but dashed to read as
   * "would stick out", never color alone (⚠ + text live in DOM + labels).
   */
  private drawOverhangPreview(gapX: number, gapY: number, gapW: number, excessPx: number): void {
    const graphics = this.effectLayer;
    if (!graphics) return;
    const excess = Math.max(16, Math.min(160, excessPx));
    const start = gapX + gapW;
    graphics.lineStyle(3, COLORS.overfill, 0.85);
    drawDashedLine(graphics, start, gapY - 30, start + excess, gapY - 30, 8, 5);
    drawDashedLine(graphics, start, gapY + 30, start + excess, gapY + 30, 8, 5);
    graphics
      .lineStyle(2, COLORS.ink, 0.9)
      .lineBetween(start + excess, gapY - 30, start + excess, gapY + 30)
      // Warning triangle at the would-be tip (matches committed overfill).
      .lineStyle(2, COLORS.ink, 0.9)
      .lineBetween(start + excess + 4, gapY - 10, start + excess + 4, gapY + 10)
      .lineBetween(start + excess + 4, gapY - 10, start + excess + 12, gapY)
      .lineBetween(start + excess + 12, gapY, start + excess + 4, gapY + 10);
  }

  /**
   * Crossing payoff flag + celebration rings. The flag carries an abstract
   * diamond load-marker (original LevelBest geometry; GAME-171 AC13 allows an
   * abstract marker instead of a character). Static when reduced-motion is on:
   * same shapes, no tween. Audio payoff is DOM-owned (sound.ts) with a mute
   * guard — Phaser runs with noAudio and never plays sound here.
   */
  private drawSuccessMarker(scene: SceneLike, gapX: number, gapY: number, gapW: number, vm: BridgeViewModel): void {
    const markerStart = gapX + gapW / 2;
    const markerEnd = gapX + gapW + Math.max(18, Math.min(34, scene.scale.width * 0.05));
    const markerX = vm.crossing && !vm.reducedMotion ? markerStart : markerEnd;
    this.successMarker = scene.add.rectangle(markerX, gapY - 38, 22, 12, COLORS.exact, 1);
    this.successMarker.setData("role", "success-marker");
    const poleX = markerX + 9;
    this.effectLayer
      ?.lineStyle(3, COLORS.exact, 1)
      .lineBetween(poleX, gapY - 31, poleX, gapY - 53)
      .lineBetween(poleX, gapY - 53, poleX + 11, gapY - 48)
      // Abstract diamond load-marker at the pole tip (original geometry).
      .lineStyle(2, COLORS.ink, 0.9)
      .lineBetween(poleX - 4, gapY - 58, poleX, gapY - 62)
      .lineBetween(poleX, gapY - 62, poleX + 4, gapY - 58)
      .lineBetween(poleX + 4, gapY - 58, poleX, gapY - 54)
      .lineBetween(poleX, gapY - 54, poleX - 4, gapY - 58)
      // Celebration rings + radiating cheer ticks around the flag.
      .lineStyle(2, COLORS.exact, 0.8)
      .strokeCircle(poleX + 5, gapY - 48, 10)
      .lineStyle(2, COLORS.target, 0.8)
      .strokeCircle(poleX + 5, gapY - 48, 16)
      .lineStyle(2, COLORS.ink, 0.6)
      .lineBetween(poleX - 12, gapY - 62, poleX - 17, gapY - 67)
      .lineBetween(poleX + 22, gapY - 62, poleX + 27, gapY - 67)
      .lineBetween(poleX + 5, gapY - 70, poleX + 5, gapY - 76);

    if (vm.crossing && !vm.reducedMotion && scene.tweens?.add) {
      scene.tweens.add({
        targets: this.successMarker,
        x: markerEnd,
        duration: 1_000,
        ease: "Sine.easeInOut",
      });
    }
  }

  /**
   * Splash rings where the car meets the water. Drawn statically in both
   * motion modes (the falling tween carries motion when allowed); the
   * reduced-motion equivalent is the same rings with the car parked at the
   * water line, announced by the DOM live region.
   */
  private drawSplash(gapX: number, gapY: number, gapW: number, waterY: number): void {
    const graphics = this.effectLayer;
    if (!graphics) return;
    const splashX = gapX + gapW * 0.68;
    graphics
      .lineStyle(3, COLORS.waterLight, 0.9)
      .strokeCircle(splashX, waterY + 6, 12)
      .lineStyle(2, COLORS.waterLight, 0.7)
      .strokeCircle(splashX, waterY + 6, 20)
      .lineStyle(2, COLORS.white, 0.8)
      .strokeCircle(splashX, waterY + 6, 28)
      .lineStyle(2, COLORS.ink, 0.5)
      .lineBetween(splashX - 18, waterY - 10, splashX - 24, waterY - 18)
      .lineBetween(splashX + 18, waterY - 10, splashX + 24, waterY - 18);
  }

  private drawCar(scene: SceneLike, gapX: number, gapY: number, gapW: number, vm: BridgeViewModel): void {
    const car = this.carSprite ?? (scene.add.image ? scene.add.image(0, 0, BRIDGE_CAR_TEXTURE_KEY) : null);
    if (!car) return;
    if (!this.carSprite) {
      this.carSprite = car;
      car.setOrigin?.(0.5, 1);
      car.setDepth?.(8);
    }

    const carWidth = clamp(scene.scale.width * 0.16, 82, 136);
    const carHeight = carWidth * 0.565;
    // Keep the sprite's wheels on the bridge lip without covering the target
    // plank in the static render. Crossing and failure tweens move it from
    // this presentation pose.
    const baseline = gapY - 4;
    const waterY = this.waterLineY(scene.scale.height, gapY);
    const startX = Math.max(28, gapX - carWidth * 0.28);
    const parkedX = Math.min(scene.scale.width - carWidth * 0.48, gapX + gapW + carWidth * 0.32);
    const filledPx = clamp(Math.max(0, vm.filledUnits) * vm.layout.unitPx, 0, gapW);
    const stuckX = clamp(gapX + filledPx - carWidth * 0.2, startX, gapX + gapW - carWidth * 0.18);
    const fallX = gapX + gapW * 0.68;
    const mode = vm.overfill
      ? "falling"
      : vm.incorrectSubmit && vm.verdict === "underfill"
        ? "stuck"
        : vm.crossing
          ? "crossing"
          : vm.exact
            ? "parked"
            : "ready";
    const signature = `${vm.puzzleId}:${vm.presentationGeneration}:${mode}:${vm.filledUnits}:${vm.lastPlacementStatus}`;

    car.setDisplaySize(carWidth, carHeight);
    if (signature === this.carSignature) return;
    this.carSignature = signature;
    if (scene.tweens?.killTweensOf) scene.tweens.killTweensOf(car);
    car.setAlpha?.(1);
    car.setRotation?.(0);

    if (mode === "crossing" && !vm.reducedMotion && scene.tweens?.add) {
      car.setPosition(startX, baseline);
      scene.tweens.add({
        targets: car,
        x: parkedX,
        y: baseline - 3,
        duration: 1_000,
        ease: "Sine.easeInOut",
      });
      return;
    }
    if (mode === "falling" && !vm.reducedMotion && scene.tweens?.add) {
      car.setPosition(Math.max(startX, fallX - carWidth * 0.4), baseline);
      scene.tweens.add({
        targets: car,
        x: fallX,
        y: waterY + carHeight,
        angle: 72,
        alpha: 0.08,
        duration: 900,
        ease: "Cubic.easeIn",
      });
      return;
    }
    if (mode === "stuck" && !vm.reducedMotion && scene.tweens?.add) {
      car.setPosition(Math.max(startX, stuckX - 26), baseline);
      scene.tweens.add({
        targets: car,
        x: stuckX,
        duration: 360,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
      });
      return;
    }

    const finalX = mode === "parked" ? parkedX : mode === "stuck" ? stuckX : startX;
    const finalY = mode === "falling" ? waterY + carHeight : baseline;
    car.setPosition(finalX, finalY);
    if (mode === "falling") {
      car.setRotation?.(1.25);
      car.setAlpha?.(0.16);
    }
  }

  private fallbackGraphics(): GraphicsLike {
    return {
      clear: () => this.fallbackGraphics(),
      fillStyle: () => this.fallbackGraphics(),
      fillRect: () => this.fallbackGraphics(),
      fillCircle: () => this.fallbackGraphics(),
      strokeCircle: () => this.fallbackGraphics(),
      lineStyle: () => this.fallbackGraphics(),
      lineBetween: () => this.fallbackGraphics(),
      strokeRect: () => this.fallbackGraphics(),
      destroy: () => undefined,
    };
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
        height: 30,
        hitWidth: rect.width,
        hitHeight: rect.height,
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
    const gap = this.getInteractionGeometry().gap;
    if (!gap) return false;
    return x >= gap.x && x <= gap.x + gap.width && Math.abs(y - gap.y) < 40;
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
      if (this.scene.tweens?.killTweensOf && this.successMarker) {
        this.scene.tweens.killTweensOf(this.successMarker);
      }
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
    this.environmentLayer?.destroy();
    this.targetLayer?.destroy();
    this.pieceLayer?.destroy();
    this.effectLayer?.destroy();
    if (this.scene?.tweens?.killTweensOf && this.carSprite) {
      this.scene.tweens.killTweensOf(this.carSprite);
    }
    this.carSprite?.destroy();
    this.carSprite = null;
    this.carSignature = null;
    this.environmentLayer = null;
    this.targetLayer = null;
    this.pieceLayer = null;
    this.effectLayer = null;
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
