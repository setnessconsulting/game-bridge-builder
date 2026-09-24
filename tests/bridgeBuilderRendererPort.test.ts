import { describe, expect, it, vi } from "vitest";
import { PhaserBridgeRendererPort } from "@/lib/bridgeBuilder/phaser/PhaserBridgeRendererPort";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import { createBridgeIntent } from "@/lib/bridgeBuilder/intents";
import { createBridgeSession } from "@/lib/bridgeBuilder/session";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";

const puzzle: BridgePuzzle = {
  id: "port#1",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10",
  ticksVisible: true,
  tray: [{ id: "a", units: 4, label: "4", kind: "plank" }],
  presetPlaced: [],
  parPieces: 1,
  solutionCount: 1,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

describe("Phaser renderer port version boundary", () => {
  it("fails closed and reports version skew before mounting an incompatible renderer", async () => {
    const viewModel = {
      ...deriveBridgeViewModel(createBridgeSession(puzzle), {
        layout: createBridgeLayout(),
      }),
      version: "2.0.0",
    } as unknown as ReturnType<typeof deriveBridgeViewModel>;
    const onStatusChange = vi.fn();
    const onVersionSkew = vi.fn();
    const port = new PhaserBridgeRendererPort();

    await expect(
      port.mount({} as HTMLElement, viewModel, {
        createIntent: (action, context) => createBridgeIntent(action, context, 1),
        onStatusChange,
        onVersionSkew,
      }),
    ).rejects.toThrow("incompatible");

    expect(onVersionSkew).toHaveBeenCalledWith("1.1.0", "2.0.0");
    expect(onStatusChange).toHaveBeenNthCalledWith(1, "loading");
    expect(onStatusChange).toHaveBeenLastCalledWith("failed");
    port.dispose();
  });

  it("rejects the v1.0 schema before Phaser initialization so the caller can keep the DOM path", async () => {
    const viewModel = {
      ...deriveBridgeViewModel(createBridgeSession(puzzle), {
        layout: createBridgeLayout(),
      }),
      version: "1.0.0",
    } as unknown as ReturnType<typeof deriveBridgeViewModel>;
    const onStatusChange = vi.fn();
    const onVersionSkew = vi.fn();
    const port = new PhaserBridgeRendererPort();

    await expect(
      port.mount({} as HTMLElement, viewModel, {
        createIntent: (action, context) => createBridgeIntent(action, context, 1),
        onStatusChange,
        onVersionSkew,
      }),
    ).rejects.toThrow("incompatible");

    expect(onVersionSkew).toHaveBeenCalledWith("1.1.0", "1.0.0");
    expect(onStatusChange).toHaveBeenNthCalledWith(1, "loading");
    expect(onStatusChange).toHaveBeenLastCalledWith("failed");
    port.dispose();
  });
});
