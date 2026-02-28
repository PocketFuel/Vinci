import { describe, expect, it } from "vitest";
import { getSceneByPresetId } from "../data/presets";
import { applyValidationToScene, validateSceneScientificGrounding } from "../engine/scientificValidation";

describe("scientific validation", () => {
  it("fails source-locked checks when claims are unsourced", () => {
    const scene = getSceneByPresetId("sf-03-bloom-anatomy-harvest-view");
    const report = validateSceneScientificGrounding(scene, { scoreThreshold: 80 });
    expect(report.ready).toBe(false);
    expect(report.score).toBeLessThan(80);
  });

  it("passes when required labels and sourced claims are present", () => {
    const scene = getSceneByPresetId("sf-03-bloom-anatomy-harvest-view");
    const requiredLabels = ["Stigma", "Stamen", "Petals", "Perianth Tube", "Leaves", "Corm", "Roots"];
    const seedLabel = scene.annotations.labels[0];
    if (!seedLabel) {
      throw new Error("Expected at least one annotation label in scene fixture.");
    }
    const patched = {
      ...scene,
      annotations: {
        ...scene.annotations,
        labels: requiredLabels.map((labelText, index) => ({
          ...seedLabel,
          id: `${seedLabel.id}-${index + 1}`,
          text: labelText,
        })),
      },
      meta: {
        ...scene.meta,
        claims: scene.meta.claims.map((claim) => ({
          ...claim,
          sourceIds: ["rhs-crocus-sativus"],
          status: "supported" as const,
          confidence: 0.82,
        })),
      },
    };

    const report = validateSceneScientificGrounding(patched, { scoreThreshold: 80 });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.ready).toBe(true);
  });

  it("writes validation back to scene metadata", () => {
    const scene = getSceneByPresetId("ec-01-plasmonic-array-field-focus");
    const updated = applyValidationToScene(scene);
    expect(updated.meta.validation.reviewedBy).toBe("validator");
  });
});
