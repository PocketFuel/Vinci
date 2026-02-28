import { describe, expect, it } from "vitest";
import { getSceneByPresetId } from "../data/presets";
import { ensureSceneV14 } from "../engine/migrations";

describe("scene migration", () => {
  it("migrates v1.0 scene documents to v1.4 with defaults", () => {
    const scene = getSceneByPresetId("ec-01-plasmonic-array-field-focus");
    const legacy = {
      ...scene,
      version: "1.0.0" as const,
      annotations: {
        ...scene.annotations,
        labels: scene.annotations.labels.map((label) => ({
          id: label.id,
          text: label.text,
          at: label.at,
        })),
      },
    };
    // Remove v1.1-only fields for legacy fixture.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { composition, rendering, responsive, ...legacyCore } = legacy;

    const migrated = ensureSceneV14(legacyCore);

    expect(migrated.version).toBe("1.4.0");
    expect(migrated.composition.fitMode).toBe("auto");
    expect(migrated.composition.laneTemplate).toBe("board-3lane");
    expect(migrated.composition.subjectNodeIds.length).toBeGreaterThan(0);
    expect(migrated.composition.baseNodeRoleFilter.includes("base")).toBe(true);
    expect(migrated.rendering.gridMode).toBe("isometric");
    expect(migrated.responsive.mode).toBe("adaptive");
    expect(migrated.meta.scientificMode).toBe("source-locked");
    expect(migrated.meta.validation.ready).toBe(false);
    expect(migrated.annotations.layout.mode).toBe("outside-rails");
    expect(migrated.annotations.labels.every((label) => Boolean(label.targetNodeId))).toBe(true);
  });
});
