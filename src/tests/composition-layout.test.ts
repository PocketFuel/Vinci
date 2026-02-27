import { describe, expect, it } from "vitest";
import { presetManifest, presetScenes } from "../data/presets";
import { layoutOutsideRailLabels } from "../engine/annotations";
import { autoFitCamera, computeOccupancy, getVisibleNodes, projectSceneBounds } from "../engine/scene";

describe("composition + callout layout", () => {
  it("auto-fit keeps occupancy in target range for all presets", () => {
    const viewport = { width: 1220, height: 780 };

    presetManifest.forEach((manifest) => {
      const scene = structuredClone(presetScenes[manifest.presetId]);
      const nodes = getVisibleNodes(scene);
      const camera = autoFitCamera(scene, nodes, viewport, scene.camera);
      const bounds = projectSceneBounds(nodes, camera, viewport);
      const occupancy = computeOccupancy(bounds, viewport, scene.composition.framePadding);

      expect(occupancy).toBeGreaterThanOrEqual(0.68);
      expect(occupancy).toBeLessThanOrEqual(0.88);
    });
  });

  it("outside rail layout avoids label-label overlap and stays off composition bounds for all presets", () => {
    const viewport = { width: 1220, height: 780 };

    presetManifest.forEach((manifest) => {
      const scene = structuredClone(presetScenes[manifest.presetId]);
      const nodes = getVisibleNodes(scene);
      const camera = autoFitCamera(scene, nodes, viewport, scene.camera);
      const bounds = projectSceneBounds(nodes, camera, viewport);

      const placements = layoutOutsideRailLabels({
        labels: scene.annotations.labels,
        nodes,
        camera,
        viewport,
        bounds,
        railPadding: scene.annotations.layout.railPadding,
        minLabelGap: scene.annotations.layout.minLabelGap,
        maxLabelWidth: scene.annotations.layout.maxLabelWidth,
      });

      expect(placements.length).toBe(scene.annotations.labels.length);

      placements.forEach((placement) => {
        if (placement.side === "left") {
          expect(placement.x + placement.width).toBeLessThanOrEqual(bounds.minX - 4);
        } else {
          expect(placement.x).toBeGreaterThanOrEqual(bounds.maxX + 4);
        }
      });

      for (let i = 0; i < placements.length; i += 1) {
        for (let j = i + 1; j < placements.length; j += 1) {
          const a = placements[i];
          const b = placements[j];
          if (a.side !== b.side) {
            continue;
          }
          const overlap = !(a.top + a.height <= b.top || b.top + b.height <= a.top);
          expect(overlap).toBe(false);
        }
      }
    });
  });
});
