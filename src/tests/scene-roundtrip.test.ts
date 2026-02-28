import { describe, expect, it } from "vitest";
import { getSceneByPresetId } from "../data/presets";
import { jsonToScene, sceneToJson } from "../engine/exporters";

describe("scene json roundtrip", () => {
  it("re-imports exported scene json without data loss for key fields", () => {
    const original = getSceneByPresetId("ec-03-h2-storage-to-power-loop");
    const json = sceneToJson(original);
    const restored = jsonToScene(json);

    expect(restored.id).toBe(original.id);
    expect(restored.version).toBe("1.2.0");
    expect(restored.nodes.length).toBe(original.nodes.length);
    expect(restored.tokens.id).toBe("vinci-paper-wireframe");
    expect(restored.annotations.equations[0]?.latexLike).toContain("2H2");
    expect(restored.annotations.labels.every((label) => Boolean(label.targetNodeId))).toBe(true);
    expect(restored.composition.subjectNodeIds.length).toBeGreaterThan(0);
  });
});
