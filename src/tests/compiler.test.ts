import { describe, expect, it } from "vitest";
import { compileSceneToSvg } from "../engine/compiler";
import { getSceneByPresetId } from "../data/presets";

describe("SVG compiler", () => {
  it("emits stable svg structure for a preset", () => {
    const scene = getSceneByPresetId("ec-01-plasmonic-array-field-focus");
    const svg = compileSceneToSvg(scene, {
      width: 900,
      height: 540,
      includeAnnotations: true,
      showGrid: false,
      fitToFrame: true,
      annotationLayoutMode: "auto-outside",
    });

    expect(svg).toContain("id=\"layer-main\"");
    expect(svg).toContain("data-token-profile=\"vinci-paper-wireframe\"");
    expect(svg).toContain("layer-annotations");
    expect(svg).not.toContain("layer-grid");
    expect(svg).toMatchSnapshot();
  });

  it("emits isometric grid layer when enabled", () => {
    const scene = getSceneByPresetId("ec-01-plasmonic-array-field-focus");
    const svg = compileSceneToSvg(scene, { width: 900, height: 540, showGrid: true, fitToFrame: true });
    expect(svg).toContain("layer-grid");
  });
});
