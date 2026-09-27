import { describe, expect, it } from "vitest";
import { runGameConformanceTests } from "@setnessconsulting/game-platform-sdk/testing";
import {
  BRIDGE_BUILDER_GAME_IDENTITY,
  BridgeBuilderHostRuntime,
  readGpsdkSessionParams,
} from "@/lib/bridgeBuilder/hostRuntime";

describe("Bridge Builder Game Platform SDK conformance (SDK-6)", () => {
  it("passes runGameConformanceTests for the Bridge Builder identity", () => {
    const report = runGameConformanceTests({
      gameIdentity: BRIDGE_BUILDER_GAME_IDENTITY,
      supportsPause: false,
    });
    expect(report.failed, JSON.stringify(report.results, null, 2)).toBe(0);
    expect(report.passed).toBe(report.total);
  });

  it("reads gpsdkChannel and gpsdkSession together, otherwise stays standalone", () => {
    expect(readGpsdkSessionParams("")).toBeNull();
    expect(readGpsdkSessionParams("?gpsdkChannel=c1")).toBeNull();
    expect(readGpsdkSessionParams("?gpsdkSession=s1")).toBeNull();
    expect(readGpsdkSessionParams("?gpsdkChannel=c1&gpsdkSession=s1")).toEqual({
      channelId: "c1",
      sessionId: "s1",
    });
  });

  it("does not open a transport when session params are absent", () => {
    const runtime = new BridgeBuilderHostRuntime();
    expect(runtime.connect("")).toBe(false);
    expect(runtime.isConnected).toBe(false);
    runtime.destroy();
  });
});
