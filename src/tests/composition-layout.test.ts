import { describe, expect, it } from "vitest";
import { presetManifest, presetScenes } from "../data/presets";
import { layoutOutsideRailLabels } from "../engine/annotations";
import { autoFitCamera, computeOccupancy, getVisibleNodes, projectSceneBounds } from "../engine/scene";

describe("composition + callout layout", () => {
  it("auto-fit keeps scene-fit occupancy in target range for all presets", () => {
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

  it("subject-fit card previews center the subject and hit occupancy targets", () => {
    const viewport = { width: 960, height: 540 };

    presetManifest.forEach((manifest) => {
      const scene = structuredClone(presetScenes[manifest.presetId]);
      const nodes = getVisibleNodes(scene);
      const camera = autoFitCamera(scene, nodes, viewport, scene.camera, {
        fitTarget: "subject",
        fitNodeIds: scene.composition.subjectNodeIds,
        subjectPadding: 36,
      });
      const subjectNodeSet = new Set(scene.composition.subjectNodeIds);
      const subjectNodes = nodes.filter((node) => subjectNodeSet.has(node.id));
      const targetNodes = subjectNodes.length > 0 ? subjectNodes : nodes;
      const bounds = projectSceneBounds(targetNodes, camera, viewport);
      const occupancy = computeOccupancy(bounds, viewport, 36);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const toleranceX = viewport.width * 0.05;
      const toleranceY = viewport.height * 0.05;

      expect(occupancy).toBeGreaterThanOrEqual(0.62);
      expect(occupancy).toBeLessThanOrEqual(0.86);
      expect(Math.abs(centerX - viewport.width / 2)).toBeLessThanOrEqual(toleranceX);
      expect(Math.abs(centerY - viewport.height / 2)).toBeLessThanOrEqual(toleranceY);
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
