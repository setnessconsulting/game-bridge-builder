import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBridgeIntent } from "@/lib/bridgeBuilder/intents";
import type { BridgeIntentAction, BridgeIntentContext } from "@/lib/bridgeBuilder/intents";
import { createBridgeLayout } from "@/lib/bridgeBuilder/layout";
import { PhaserBridgeRendererPort } from "@/lib/bridgeBuilder/phaser/PhaserBridgeRendererPort";
import { createBridgeSession } from "@/lib/bridgeBuilder/session";
import { deriveBridgeViewModel } from "@/lib/bridgeBuilder/viewModel";
import type { BridgeGameHandle, CreateBridgeGameOptions } from "@/lib/bridgeBuilder/phaser/createBridgeGame";
import type { BridgePuzzle } from "@/lib/bridgeBuilder/types";

const { createBridgeGameMock } = vi.hoisted(() => ({ createBridgeGameMock: vi.fn() }));

vi.mock("@/lib/bridgeBuilder/phaser/createBridgeGame", () => ({
  createBridgeGame: createBridgeGameMock,
}));

const puzzle: BridgePuzzle = {
  id: "port-lifecycle#1",
  skillId: "bb-compose-10",
  band: "g12",
  denominator: 1,
  gapUnits: 10,
  gapLabel: "10",
  ticksVisible: true,
  tray: [{ id: "piece-4", units: 4, label: "4", kind: "plank" }],
  presetPlaced: [],
  parPieces: 1,
  solutionCount: 1,
  supportsSecondConstruction: false,
  hasEquivalenceRelation: false,
};

function makeHandle(): BridgeGameHandle {
  return {
    game: { destroy: vi.fn() },
    controller: {} as BridgeGameHandle["controller"],
    ready: Promise.resolve(),
    destroy: vi.fn(),
    reconcile: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
}

const viewModel = deriveBridgeViewModel(createBridgeSession(puzzle), {
  layout: createBridgeLayout(),
  session: { sessionId: "session-v1", generation: 4 },
});

beforeEach(() => {
  createBridgeGameMock.mockReset();
});

describe("GAME-294 renderer lifecycle", () => {
  it("keeps v1.0 views on the DOM-only path without creating Phaser", async () => {
    const oldViewModel = {
      ...viewModel,
      version: "1.0.0",
    } as unknown as typeof viewModel;
    const statuses: string[] = [];
    const port = new PhaserBridgeRendererPort();

    await expect(
      port.mount({} as HTMLElement, oldViewModel, {
        createIntent: (action, context) => createBridgeIntent(action, context, 1),
        onStatusChange: (status) => statuses.push(status),
      }),
    ).rejects.toThrow("incompatible");

    expect(createBridgeGameMock).not.toHaveBeenCalled();
    expect(statuses).toEqual(["loading", "failed"]);
    port.dispose();
  });

  it("mounts, forwards only bounded intents, applies view models, and disposes idempotently", async () => {
    const handle = makeHandle();
    let host: CreateBridgeGameOptions["host"] | undefined;
    createBridgeGameMock.mockImplementation(async (options: CreateBridgeGameOptions) => {
      host = options.host;
      return handle;
    });

    const port = new PhaserBridgeRendererPort();
    const statuses: string[] = [];
    const listener = vi.fn();
    const createIntent = vi.fn((action: BridgeIntentAction, context: BridgeIntentContext) =>
      createBridgeIntent(action, context, 1),
    );
    const unsubscribe = port.onIntent(listener);
    await port.mount({} as HTMLElement, viewModel, {
      createIntent,
      onStatusChange: (status) => statuses.push(status),
    });

    expect(statuses).toEqual(["loading", "ready"]);
    expect(handle.reconcile).toHaveBeenCalledWith(viewModel);
    expect(host).toBeDefined();
    const firstPieceId = viewModel.pieceTray[0].id;
    const generation = viewModel.session.generation;
    host!.emitPointerEvent({
      phase: "down",
      targetPieceId: firstPieceId,
      overGap: false,
      generation,
    });
    expect(createIntent).toHaveBeenCalledWith(
      { type: "selectPiece", pieceId: firstPieceId },
      { sessionId: "session-v1", generation: 4 },
    );
    expect(listener).toHaveBeenCalledWith(
      createBridgeIntent(
        { type: "selectPiece", pieceId: firstPieceId },
        { sessionId: "session-v1", generation: 4 },
        1,
      ),
    );

    unsubscribe();
    host!.emitPointerEvent({
      phase: "move",
      targetPieceId: null,
      overGap: false,
      generation,
    });
    host!.emitPointerEvent({
      phase: "up",
      targetPieceId: null,
      overGap: true,
      generation,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    const updated = {
      ...viewModel,
      flags: { ...viewModel.flags, reducedMotion: true },
      reducedMotion: true,
      session: { ...viewModel.session, generation: 5 },
    };
    port.applyViewModel(updated);
    expect(handle.reconcile).toHaveBeenLastCalledWith(updated);
    port.setReducedMotion(false);
    expect(handle.reconcile).toHaveBeenLastCalledWith(
      expect.objectContaining({ flags: expect.objectContaining({ reducedMotion: false }) }),
    );
    port.setMuted(true);
    expect(handle.reconcile).toHaveBeenLastCalledWith(
      expect.objectContaining({ flags: expect.objectContaining({ mute: true }) }),
    );
    port.setPaused(true);
    expect(handle.pause).toHaveBeenCalledTimes(1);
    port.setPaused(false);
    expect(handle.resume).toHaveBeenCalledTimes(1);

    port.dispose();
    port.dispose();
    expect(handle.destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys a late-created game when the host disposes during asynchronous mount", async () => {
    const handle = makeHandle();
    let resolveGame!: (value: BridgeGameHandle) => void;
    let markCalled!: () => void;
    const called = new Promise<void>((resolve) => {
      markCalled = resolve;
    });
    const pendingGame = new Promise<BridgeGameHandle>((resolve) => {
      resolveGame = resolve;
    });
    createBridgeGameMock.mockImplementation(() => {
      markCalled();
      return pendingGame;
    });

    const port = new PhaserBridgeRendererPort();
    const statuses: string[] = [];
    const mounting = port.mount({} as HTMLElement, viewModel, {
      createIntent: (action, context) => createBridgeIntent(action, context, 1),
      onStatusChange: (status) => statuses.push(status),
    });
    await called;
    port.dispose();
    resolveGame(handle);
    await mounting;

    expect(handle.destroy).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["loading"]);
  });
});
