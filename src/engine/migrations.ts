import {
  sceneDocumentInputSchema,
  sceneDocumentSchema,
  sceneDocumentV11Schema,
  sceneDocumentV12Schema,
} from "./schema";
import { nearestNodeIdByWorldPoint } from "./scene";
import type {
  AnnotationLayer,
  LegacySceneDocument,
  SceneDocument,
  SceneDocumentInput,
  SceneDocumentV11,
  SceneDocumentV12,
  SceneMeta,
  SceneMetaBase,
  ScientificClaim,
  ValidationCheck,
  ValidationReport,
} from "./types";

export function ensureSceneV14(input: unknown): SceneDocument {
  const parsed = sceneDocumentInputSchema.parse(input) as SceneDocumentInput;

  if (parsed.version === "1.4.0") {
    const repaired = repairV14(parsed);
    return sceneDocumentSchema.parse(repaired);
  }

  if (parsed.version === "1.2.0") {
    const repaired = repairV12(parsed);
    const migrated = migrateScene_1_2_to_1_4(repaired);
    return sceneDocumentSchema.parse(migrated);
  }

  if (parsed.version === "1.1.0") {
    const repaired = repairV11(parsed);
    const migrated12 = migrateScene_1_1_to_1_2(repaired);
    const migrated14 = migrateScene_1_2_to_1_4(migrated12);
    return sceneDocumentSchema.parse(migrated14);
  }

  const migrated11 = migrateScene_1_0_to_1_1(parsed);
  const migrated12 = migrateScene_1_1_to_1_2(migrated11);
  const migrated14 = migrateScene_1_2_to_1_4(migrated12);
  return sceneDocumentSchema.parse(migrated14);
}

export const ensureSceneV12 = ensureSceneV14;

export function migrateScene_1_0_to_1_1(scene: LegacySceneDocument): SceneDocumentV11 {
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
    animations: scene.animations.map((animation) => ({
      ...animation,
      type: normalizeAnimationType(animation.type),
    })),
    annotations: {
      ...scene.annotations,
      labels,
      layout: defaultAnnotationLayout(),
    },
  };
}

export function migrateScene_1_1_to_1_2(scene: SceneDocumentV11): SceneDocumentV12 {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  return {
    ...scene,
    version: "1.2.0",
    responsive: defaultResponsiveConfig(),
    composition: {
      ...scene.composition,
      subjectNodeIds: defaultSubjectNodeIds(scene.nodes, scene.composition.focalNodeIds),
      baseNodeRoleFilter: defaultBaseNodeRoleFilter(),
      laneTemplate: inferLaneTemplate(scene.meta.concept),
      overlapPolicy: "avoid",
      laneGap: 1.25,
    },
    nodes: scene.nodes.map((node) => ({
      ...node,
      processRole: node.processRole ?? inferRoleFromNodeType(node.type),
      processGroup: node.processGroup ?? "default",
      ports: node.ports ?? defaultPortsForNode(node),
    })),
    animations: scene.animations.map((animation) => ({
      ...animation,
      type: normalizeAnimationType(animation.type),
      engine: animation.engine ?? "css",
      timeline: animation.timeline ?? defaultTimelineForType(animation.type),
      targets:
        animation.targets ??
        animation.targetNodeIds.map((nodeId) => ({
          nodeId,
        })),
      fallback:
        animation.fallback ??
        ({
          type: "css",
          recipe: normalizeAnimationType(animation.type),
        } as const),
    })),
    annotations: {
      ...scene.annotations,
      labels,
      layout: {
        ...defaultAnnotationLayout(),
        ...scene.annotations.layout,
      },
    },
  };
}

export function migrateScene_1_2_to_1_4(scene: SceneDocumentV12): SceneDocument {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  const nextMeta = enrichMeta(scene.meta, scene.nodes.map((node) => node.id));

  return {
    ...scene,
    version: "1.4.0",
    meta: nextMeta,
    nodes: scene.nodes.map((node) => ({
      ...node,
      processRole: node.processRole ?? inferRoleFromNodeType(node.type),
      processGroup: node.processGroup ?? "default",
      ports: node.ports ?? defaultPortsForNode(node),
    })),
    animations: scene.animations.map((animation) => ({
      ...animation,
      type: normalizeAnimationType(animation.type),
      engine: animation.engine ?? "css",
      timeline: animation.timeline ?? defaultTimelineForType(animation.type),
      targets:
        animation.targets ??
        animation.targetNodeIds.map((nodeId) => ({
          nodeId,
        })),
      fallback:
        animation.fallback ??
        ({
          type: "css",
          recipe: normalizeAnimationType(animation.type),
        } as const),
    })),
    annotations: {
      ...scene.annotations,
      labels,
      layout: {
        ...defaultAnnotationLayout(),
        ...scene.annotations.layout,
      },
    },
  };
}

function repairV11(scene: SceneDocumentV11): SceneDocumentV11 {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  const repaired: SceneDocumentV11 = {
    ...scene,
    annotations: {
      ...scene.annotations,
      labels,
      layout: scene.annotations.layout ?? defaultAnnotationLayout(),
    },
  };

  return sceneDocumentV11Schema.parse(repaired);
}

function repairV12(scene: SceneDocumentV12): SceneDocumentV12 {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  const repaired: SceneDocumentV12 = {
    ...scene,
    composition: {
      ...scene.composition,
      subjectNodeIds:
        scene.composition.subjectNodeIds && scene.composition.subjectNodeIds.length > 0
          ? scene.composition.subjectNodeIds
          : defaultSubjectNodeIds(scene.nodes, scene.composition.focalNodeIds),
      baseNodeRoleFilter:
        scene.composition.baseNodeRoleFilter && scene.composition.baseNodeRoleFilter.length > 0
          ? scene.composition.baseNodeRoleFilter
          : defaultBaseNodeRoleFilter(),
      laneTemplate: scene.composition.laneTemplate ?? inferLaneTemplate(scene.meta.concept),
      overlapPolicy: scene.composition.overlapPolicy ?? "avoid",
      laneGap: scene.composition.laneGap ?? 1.25,
    },
    annotations: {
      ...scene.annotations,
      labels,
      layout: {
        ...defaultAnnotationLayout(),
        ...scene.annotations.layout,
      },
    },
  };

  return sceneDocumentV12Schema.parse(repaired);
}

function repairV14(scene: SceneDocument): SceneDocument {
  const labels = scene.annotations.labels.map((label) => ({
    ...label,
    targetNodeId: label.targetNodeId ?? nearestNodeIdByWorldPoint(scene.nodes, label.at) ?? scene.nodes[0]?.id ?? "",
    anchorBias: label.anchorBias ?? "auto",
    priority: label.priority ?? 0,
  }));

  const annotations: AnnotationLayer = {
    ...scene.annotations,
    labels,
    layout: {
      ...defaultAnnotationLayout(),
      ...scene.annotations.layout,
    },
  };

  const meta = repairMeta(scene.meta, scene.nodes.map((node) => node.id));

  return {
    ...scene,
    meta,
    responsive: scene.responsive ?? defaultResponsiveConfig(),
    composition: {
      ...scene.composition,
      subjectNodeIds:
        scene.composition.subjectNodeIds && scene.composition.subjectNodeIds.length > 0
          ? scene.composition.subjectNodeIds
          : defaultSubjectNodeIds(scene.nodes, scene.composition.focalNodeIds),
      baseNodeRoleFilter:
        scene.composition.baseNodeRoleFilter && scene.composition.baseNodeRoleFilter.length > 0
          ? scene.composition.baseNodeRoleFilter
          : defaultBaseNodeRoleFilter(),
      laneTemplate: scene.composition.laneTemplate ?? inferLaneTemplate(scene.meta.concept),
      overlapPolicy: scene.composition.overlapPolicy ?? "avoid",
      laneGap: scene.composition.laneGap ?? 1.25,
    },
    nodes: scene.nodes.map((node) => ({
      ...node,
      processRole: node.processRole ?? inferRoleFromNodeType(node.type),
      processGroup: node.processGroup ?? "default",
      ports: node.ports ?? defaultPortsForNode(node),
    })),
    animations: scene.animations.map((animation) => ({
      ...animation,
      type: normalizeAnimationType(animation.type),
      engine: animation.engine ?? "css",
      timeline: animation.timeline ?? defaultTimelineForType(animation.type),
      targets:
        animation.targets ??
        animation.targetNodeIds.map((nodeId) => ({
          nodeId,
        })),
      fallback:
        animation.fallback ??
        ({
          type: "css",
          recipe: normalizeAnimationType(animation.type),
        } as const),
    })),
    annotations,
  };
}

function defaultResponsiveConfig(): SceneDocument["responsive"] {
  return {
    mode: "adaptive",
    breakpoints: [
      { id: "desktop", width: 1920, cameraPreset: "classic-iso", annotationMode: "outside-rails" },
      { id: "tablet", width: 1024, cameraPreset: "north-east", annotationMode: "outside-rails" },
      { id: "mobile", width: 640, cameraPreset: "north-east", annotationMode: "compact" },
    ],
  };
}

function defaultBaseNodeRoleFilter(): string[] {
  return ["base", "substrate", "ground"];
}

function defaultSubjectNodeIds(
  nodes: SceneDocument["nodes"],
  focalNodeIds: string[] | undefined
): string[] {
  const focal = (focalNodeIds ?? []).filter((id) => nodes.some((node) => node.id === id));
  if (focal.length > 0) {
    return focal;
  }

  const nonBase = nodes.filter((node) => node.processRole !== "base" && node.processRole !== "substrate" && node.processRole !== "ground");
  const source = nonBase.length > 0 ? nonBase : nodes;
  return source.slice(0, 4).map((node) => node.id);
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

function inferLaneTemplate(concept: SceneDocument["meta"]["concept"]): SceneDocument["composition"]["laneTemplate"] {
  if (concept === "saffron-growth") {
    return "organic-cross-section";
  }
  if (concept === "energy-data-storage") {
    return "board-radial";
  }
  return "board-3lane";
}

function inferRoleFromNodeType(nodeType: SceneDocument["nodes"][number]["type"]): string {
  if (nodeType === "wavefront") {
    return "input";
  }
  if (nodeType === "chip" || nodeType === "chiplet" || nodeType === "electrode-stack" || nodeType === "disk-array") {
    return "transform";
  }
  if (nodeType === "tank-horizontal" || nodeType === "cylinder" || nodeType === "rack") {
    return "storage";
  }
  if (nodeType === "bus" || nodeType === "pcb-trace" || nodeType === "arrow" || nodeType === "tube") {
    return "telemetry";
  }
  if (
    nodeType === "leaf" ||
    nodeType === "petal" ||
    nodeType === "root" ||
    nodeType === "petiole" ||
    nodeType === "filament" ||
    nodeType === "plant-cell" ||
    nodeType === "cell-cluster"
  ) {
    return "organic";
  }
  if (nodeType === "image-panel") {
    return "reference";
  }
  return "output";
}

function defaultPortsForNode(node: SceneDocument["nodes"][number]): NonNullable<SceneDocument["nodes"][number]["ports"]> {
  const p = node.transform3D.position;
  const scalar = Math.max(0.2, node.transform3D.scale);
  const x = 0.7 * scalar;
  const y = 0.4 * scalar;
  const z = 0.6 * scalar;

  if (
    node.type === "leaf" ||
    node.type === "petal" ||
    node.type === "root" ||
    node.type === "petiole" ||
    node.type === "filament" ||
    node.type === "plant-cell" ||
    node.type === "cell-cluster"
  ) {
    return [
      { id: "base", local: { x: 0, y: y, z: 0 }, direction: "in" },
      { id: "tip", local: { x: 0, y: -y, z: z * 0.3 }, direction: "out" },
    ];
  }

  if (node.type === "bus" || node.type === "tube" || node.type === "arrow" || node.type === "pcb-trace") {
    return [
      { id: "in", local: { x: -x, y: 0, z: 0 }, direction: "in" },
      { id: "out", local: { x: x, y: 0, z: 0 }, direction: "out" },
    ];
  }

  if (node.type === "image-panel") {
    return [
      { id: "left", local: { x: -x, y: 0, z: 0 }, direction: "bidirectional" },
      { id: "right", local: { x: x, y: 0, z: 0 }, direction: "bidirectional" },
      { id: "top", local: { x: 0, y: -y, z: 0 }, direction: "out" },
      { id: "bottom", local: { x: 0, y: y, z: 0 }, direction: "in" },
      { id: "center", local: { x: 0, y: 0, z: 0 }, direction: "bidirectional" },
    ];
  }

  return [
    { id: "left", local: { x: -x, y: 0, z: 0 }, direction: "bidirectional" },
    { id: "right", local: { x: x, y: 0, z: 0 }, direction: "bidirectional" },
    { id: "top", local: { x: 0, y: -y, z: 0 }, direction: "out" },
    { id: "bottom", local: { x: 0, y: y, z: 0 }, direction: "in" },
    { id: "front", local: { x: 0, y: 0, z }, direction: "bidirectional" },
    { id: "back", local: { x: 0, y: 0, z: -z }, direction: "bidirectional" },
    {
      id: "center",
      local: { x: 0, y: 0, z: 0 },
      direction: p.y > 0 ? "out" : "in",
    },
  ];
}

function defaultTimelineForType(type: string): string {
  if (type === "reaction-split") {
    return "reaction-split";
  }
  if (type === "charge-cycle") {
    return "charge-cycle";
  }
  if (type === "network-pulse") {
    return "network-pulse";
  }
  if (type === "growth-wave") {
    return "growth-wave";
  }
  if (type === "energy-flow") {
    return "energy-flow";
  }
  return type;
}

function normalizeAnimationType(type: string): SceneDocument["animations"][number]["type"] {
  const known = new Set([
    "pulse",
    "flow",
    "orbit",
    "growth",
    "energy-flow",
    "charge-cycle",
    "reaction-split",
    "network-pulse",
    "growth-wave",
  ]);
  if (known.has(type)) {
    return type as SceneDocument["animations"][number]["type"];
  }
  return "pulse";
}

function inferReferencePackId(meta: SceneMetaBase): string {
  if (meta.concept === "saffron-growth") {
    return "saffron-anatomy";
  }
  if (meta.concept === "energy-data-storage") {
    return "plant-cell";
  }
  return "plasmonic-energy";
}

function seedClaims(meta: SceneMetaBase, nodeIds: string[]): ScientificClaim[] {
  return [
    {
      id: `${meta.concept}-claim-1`,
      statement: meta.scientificNotes || meta.description,
      sourceIds: [],
      confidence: 0.55,
      status: "draft",
    },
    {
      id: `${meta.concept}-claim-2`,
      statement: `Scene ${meta.title} is represented with ${nodeIds.length} structural nodes.`,
      sourceIds: [],
      confidence: 0.4,
      status: "draft",
    },
  ];
}

function seedValidation(checks: ValidationCheck[]): ValidationReport {
  const passedRequired = checks.filter((check) => check.required && check.passed).length;
  const requiredTotal = Math.max(1, checks.filter((check) => check.required).length);
  const score = Math.round((passedRequired / requiredTotal) * 100);
  return {
    checklist: checks,
    score,
    ready: false,
    reviewedBy: "system-migration",
    reviewedAt: new Date().toISOString(),
    notes: "Migrated to v1.4.0; requires source-backed scientific review.",
  };
}

function buildDefaultChecks(meta: SceneMetaBase): ValidationCheck[] {
  return [
    {
      id: "required-parts-present",
      name: "Required parts present",
      required: true,
      passed: false,
      notes: `Verify anatomy/process parts for ${meta.concept}.`,
    },
    {
      id: "claims-backed",
      name: "Claims backed by at least one source",
      required: true,
      passed: false,
      notes: "Attach source IDs to each scientific claim.",
    },
    {
      id: "label-mapping",
      name: "Every label maps to a required part",
      required: true,
      passed: false,
      notes: "Check callout-target mapping before mark-ready.",
    },
  ];
}

function enrichMeta(meta: SceneMetaBase, nodeIds: string[]): SceneMeta {
  return {
    ...meta,
    scientificMode: "source-locked",
    referencePackId: inferReferencePackId(meta),
    claims: seedClaims(meta, nodeIds),
    validation: seedValidation(buildDefaultChecks(meta)),
  };
}

function repairMeta(meta: SceneMeta, nodeIds: string[]): SceneMeta {
  const defaulted = enrichMeta(meta, nodeIds);
  return {
    ...defaulted,
    ...meta,
    claims:
      meta.claims?.map((claim) => ({
        ...claim,
        confidence: clamp(claim.confidence ?? 0.4, 0, 1),
        sourceIds: claim.sourceIds ?? [],
        status: claim.status ?? "draft",
      })) ?? defaulted.claims,
    validation: {
      ...defaulted.validation,
      ...meta.validation,
      score: clamp(meta.validation?.score ?? defaulted.validation.score, 0, 100),
      checklist: meta.validation?.checklist ?? defaulted.validation.checklist,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
