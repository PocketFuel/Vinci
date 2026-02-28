import { describe, expect, it } from "vitest";
import { referenceAssetSchema, sceneDocumentInputSchema, sceneDocumentSchema, tokenSetSchemaExport } from "../engine/schema";
import { presetScenes } from "../data/presets";
import { vinciPaperWireframe } from "../data/tokens";
import { referenceAssetManifest } from "../data/referenceAssets";

describe("schema validation", () => {
  it("validates token set", () => {
    const parsed = tokenSetSchemaExport.parse(vinciPaperWireframe);
    expect(parsed.id).toBe("vinci-paper-wireframe");
  });

  it("validates all preset scenes", () => {
    Object.values(presetScenes).forEach((scene) => {
      expect(() => sceneDocumentSchema.parse(scene)).not.toThrow();
      const parsed = sceneDocumentSchema.parse(scene);
      expect(parsed.version).toBe("1.4.0");
      expect(parsed.annotations.labels.every((label) => Boolean(label.targetNodeId))).toBe(true);
      expect(parsed.responsive.mode).toBe("adaptive");
      expect(parsed.composition.subjectNodeIds.length).toBeGreaterThan(0);
      expect(parsed.composition.baseNodeRoleFilter.includes("base")).toBe(true);
    });
  });

  it("accepts legacy v1.0 scene inputs for migration", () => {
    const sample = Object.values(presetScenes)[0];
    const legacy = {
      ...sample,
      version: "1.0.0",
      annotations: {
        ...sample.annotations,
        labels: sample.annotations.labels.map((label) => ({ id: label.id, text: label.text, at: label.at })),
      },
    };
    const { composition, rendering, ...legacyInput } = legacy;
    expect(() => sceneDocumentInputSchema.parse(legacyInput)).not.toThrow();
  });

  it("validates reference asset manifest", () => {
    referenceAssetManifest.forEach((asset) => {
      expect(() => referenceAssetSchema.parse(asset)).not.toThrow();
    });
  });
});
