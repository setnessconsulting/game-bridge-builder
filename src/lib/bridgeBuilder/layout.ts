/**
 * Explicit view-boundary conversions between exact scaled units and pixels.
 * Never feed pixel results back into applyBridgeIntent.
 */

export const DEFAULT_UNIT_PX = 24;
export const DEFAULT_CLIFF_PX = 46;

export interface BridgeLayoutConfig {
  unitPx: number;
  cliffPx: number;
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function createBridgeLayout(
  partial: Partial<BridgeLayoutConfig> = {}
): BridgeLayoutConfig {
  return {
    unitPx: partial.unitPx ?? DEFAULT_UNIT_PX,
    cliffPx: partial.cliffPx ?? DEFAULT_CLIFF_PX,
    dpr: partial.dpr ?? 1,
    canvasWidth: partial.canvasWidth ?? 640,
    canvasHeight: partial.canvasHeight ?? 360,
  };
}

/** Exact units → display pixels (presentation only). */
export function unitsToPx(units: number, unitPx: number): number {
  return Math.abs(units) * unitPx;
}

/**
 * Display pixels → layout hint only. Must never become authoritative length.
 * Kept for hit-testing diagnostics; engine still uses piece ids + units.
 */
export function pxToLayoutUnits(px: number, unitPx: number): number {
  if (unitPx <= 0) return 0;
  return px / unitPx;
}

export function bridgeSpanWidthPx(gapUnits: number, layout: BridgeLayoutConfig): number {
  return Math.max(320, gapUnits * layout.unitPx + layout.cliffPx * 2);
}

export function withResize(
  layout: BridgeLayoutConfig,
  size: { width: number; height: number; dpr?: number }
): BridgeLayoutConfig {
  return {
    ...layout,
    canvasWidth: size.width,
    canvasHeight: size.height,
    dpr: size.dpr ?? layout.dpr,
  };
}
