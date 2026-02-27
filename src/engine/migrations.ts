import { sceneDocumentInputSchema, sceneDocumentSchema } from "./schema";
import { nearestNodeIdByWorldPoint } from "./scene";
import type { AnnotationLayer, LegacySceneDocument, SceneDocument, SceneDocumentInput } from "./types";

export function ensureSceneV11(input: unknown): SceneDocument {
  const parsed = sceneDocumentInputSchema.parse(input) as SceneDocumentInput;

  if (parsed.version === "1.1.0") {
    const repaired = repairV11(parsed);
    return sceneDocumentSchema.parse(repaired);
  }

  const migrated = migrateScene_1_0_to_1_1(parsed);
  return sceneDocumentSchema.parse(migrated);
}

export function migrateScene_1_0_to_1_1(scene: LegacySceneDocument): SceneDocument {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  return {
    ...scene,
    version: "1.1.0",
    composition: {
      fitMode: "auto",
      framePadding: 64,
      minOccupancy: 0.74,
      focalNodeIds: scene.nodes.slice(0, 3).map((node) => node.id),
      templateId: `${scene.meta.concept}-default`,
    },
    rendering: {
      showGridByDefault: false,
      gridOpacity: 0.32,
      gridPitch: 0.75,
      gridMode: "isometric",
    },
    annotations: {
      ...scene.annotations,
      labels,
      layout: defaultAnnotationLayout(),
    },
  };
}

function repairV11(scene: SceneDocument): SceneDocument {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  const annotations: AnnotationLayer = {
    ...scene.annotations,
    labels,
    layout: scene.annotations.layout ?? defaultAnnotationLayout(),
  };

  return {
    ...scene,
    composition: scene.composition ?? {
      fitMode: "auto",
      framePadding: 64,
      minOccupancy: 0.74,
      focalNodeIds: scene.nodes.slice(0, 3).map((node) => node.id),
      templateId: `${scene.meta.concept}-default`,
    },
    rendering: scene.rendering ?? {
      showGridByDefault: false,
      gridOpacity: 0.32,
      gridPitch: 0.75,
      gridMode: "isometric",
    },
    annotations,
  };
}

function defaultAnnotationLayout(): AnnotationLayer["layout"] {
  return {
    mode: "outside-rails",
    rails: "dual",
    railPadding: 84,
    minLabelGap: 14,
    maxLabelWidth: 260,
    leaderStyle: "dashed",
  };
}
