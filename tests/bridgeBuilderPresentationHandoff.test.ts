import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GAME-171 AC8: the implementation handoff must record which of the 20
 * presentation states are Phaser-owned versus React/DOM-owned, and every name
 * must be accounted for exactly once.
 *
 * This locks the handoff to the live state union so the document cannot drift
 * from `viewModel.ts`. It asserts code truth only. It does not assert anything
 * about the Figma file, which GAME-171 still owns and which cannot be verified
 * without Figma access.
 */

const CONTRACT = "docs/games/bridge-builder/PHASER_RENDERER_CONTRACT.md";
const VIEW_MODEL = "src/lib/bridgeBuilder/viewModel.ts";

function read(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

function unionFromSource(source: string): string[] {
  const block = source.slice(
    source.indexOf("export type BridgePresentationStateName ="),
  );
  const body = block.slice(block.indexOf("|"), block.indexOf(";"));
  return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function ownershipFromContract(): Map<string, string> {
  const contract = read(CONTRACT);
  const start = contract.indexOf("## Presentation ownership");
  expect(start, "contract has a Presentation ownership section").toBeGreaterThan(-1);
  const section = contract.slice(start, contract.indexOf("\n## ", start + 1));
  const rows = section.split("\n").filter((line) => line.startsWith("| `"));
  const owners = new Map<string, string>();
  for (const row of rows) {
    const [, name, owner] = row.split("|").map((cell) => cell.trim());
    const state = name.replace(/`/g, "");
    expect(owners.has(state), `${state} appears once in the ownership table`).toBe(false);
    owners.set(state, owner);
  }
  return owners;
}

describe("GAME-171 presentation-state handoff", () => {
  const states = unionFromSource(read(VIEW_MODEL));

  it("derives the 20 frozen presentation state names from the view model", () => {
    expect(states).toHaveLength(20);
  });

  it("assigns every presentation state an owner exactly once", () => {
    const owners = ownershipFromContract();
    expect([...owners.keys()].sort()).toEqual([...states].sort());
  });

  it("records a recognised owner for every presentation state", () => {
    const owners = ownershipFromContract();
    const phaserOnly = [...owners].filter(([, o]) => o === "Phaser").length;
    const domOnly = [...owners].filter(([, o]) => o === "DOM").length;
    const both = [...owners].filter(([, o]) => o === "Both").length;
    // Every row names exactly one of the three recognised owners.
    expect(phaserOnly + domOnly + both).toBe(owners.size);
    expect(phaserOnly, "some states are Phaser-owned").toBeGreaterThan(0);
    expect(domOnly, "some states are DOM-owned").toBeGreaterThan(0);
  });

  it("marks the Figma frame mapping as unverified rather than claiming it", () => {
    const contract = read(CONTRACT);
    expect(contract).toMatch(/GAME-171 handoff status/);
    expect(contract).toMatch(/unverified/i);
    // The handoff must not silently present the GAME-130 shells as production frames.
    expect(contract).toMatch(/GAME-130 shells/);
  });

  it("keeps the decorative reconcile contract free of gameplay intents", () => {
    const intents = read("src/lib/bridgeBuilder/intents.ts");
    const names = [...intents.matchAll(/type:\s*"([a-zA-Z]+)"/g)].map((m) => m[1]);
    for (const emitted of ["presentationComplete"]) {
      expect(names).toContain(emitted);
    }
    // Eight bounded names remain closed.
    expect(new Set(names).size).toBeLessThanOrEqual(8);
  });
});