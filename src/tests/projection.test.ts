import { describe, expect, it } from "vitest";
import { buildIsometricGridPaths, cameraPresets, projectPoint } from "../engine/projection";

describe("projection", () => {
  it("projects deterministically for the same input", () => {
    const point = { x: 1.2, y: 0.5, z: -0.2 };
    const p1 = projectPoint(point, cameraPresets["classic-iso"], { width: 1200, height: 800 });
    const p2 = projectPoint(point, cameraPresets["classic-iso"], { width: 1200, height: 800 });

    expect(p1).toEqual(p2);
  });

  it("changes projection when camera preset changes", () => {
    const point = { x: 1, y: 1, z: 1 };
    const iso = projectPoint(point, cameraPresets["classic-iso"], { width: 1200, height: 800 });
    const top = projectPoint(point, cameraPresets["top-iso"], { width: 1200, height: 800 });

    expect({ x: iso.x, y: iso.y, depth: iso.depth }).not.toEqual({
      x: top.x,
      y: top.y,
      depth: top.depth,
    });
  });

  it("builds true isometric grid path families", () => {
    const grid = buildIsometricGridPaths({ width: 1200, height: 800 }, cameraPresets["classic-iso"], 0.75, 0.35);
    expect(grid.xPath.length).toBeGreaterThan(100);
    expect(grid.yPath.length).toBeGreaterThan(100);
    expect(grid.zPath.length).toBeGreaterThan(100);

    const o = projectPoint({ x: 0, y: 0, z: 0 }, cameraPresets["classic-iso"], { width: 1200, height: 800 });
    const xAxis = projectPoint({ x: 1, y: 0, z: 0 }, cameraPresets["classic-iso"], { width: 1200, height: 800 });
    const yAxis = projectPoint({ x: 0, y: 1, z: 0 }, cameraPresets["classic-iso"], { width: 1200, height: 800 });
    const zAxis = projectPoint({ x: 0, y: 0, z: 1 }, cameraPresets["classic-iso"], { width: 1200, height: 800 });

    const slopeX = slope(o, xAxis);
    const slopeY = slope(o, yAxis);
    const slopeZ = slope(o, zAxis);

    expect(slopeX).not.toBe(slopeY);
    expect(slopeX).not.toBe(slopeZ);
    expect(slopeY).not.toBe(slopeZ);
  });
});

function slope(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const x1 = a.x;
  const y1 = a.y;
  const x2 = b.x;
  const y2 = b.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 0.0001) {
    return "inf";
  }
  return (dy / dx).toFixed(3);
}
