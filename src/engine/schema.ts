import { z } from "zod";

const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const cameraSchema = z.object({
  yaw: z.number(),
  pitch: z.number(),
  scale: z.number().positive(),
  origin: z.object({ x: z.number(), y: z.number() }),
  presetId: z.enum(["classic-iso", "north-east", "north-west", "top-iso", "section-cut"]),
  manualZoom: z.number().positive().optional(),
  manualPan: z.object({ x: z.number(), y: z.number() }).optional(),
});

const responsiveBreakpointSchema = z.object({
  id: z.enum(["desktop", "tablet", "mobile"]),
  width: z.number().positive(),
  cameraPreset: z.enum(["classic-iso", "north-east", "north-west", "top-iso", "section-cut"]),
  annotationMode: z.enum(["outside-rails", "compact"]),
});

const responsiveSchema = z.object({
  mode: z.literal("adaptive"),
  breakpoints: z.array(responsiveBreakpointSchema).min(1),
});

const tokenSetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bgPaper: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  inkPrimary: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  inkSecondary: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  fillTop: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  fillLeft: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  fillRight: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  lineWidth: z.number().positive(),
  hatchDensity: z.number().min(0).max(1),
});

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "atom",
    "bond",
    "box",
    "prism",
    "cone",
    "capsule",
    "ring",
    "dome",
    "plate",
    "cylinder",
    "disk-array",
    "arrow",
    "tube",
    "leaf",
    "petal",
    "root",
    "rack",
    "label-anchor",
    "pcb-trace",
    "chip",
    "chiplet",
    "bus",
    "manifold",
    "tank-horizontal",
    "electrode-stack",
    "wavefront",
    "petiole",
    "filament",
    "plant-cell",
    "cell-cluster",
  ]),
  layerId: z.string().min(1),
  transform3D: z.object({
    position: vector3Schema,
    rotation: vector3Schema,
    scale: z.number().positive(),
  }),
  styleRef: z.string().min(1),
  params: z.record(
    z.string(),
    z.union([
      z.number(),
      z.string(),
      z.boolean(),
      vector3Schema,
      z.array(vector3Schema),
      z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
      z.array(z.record(z.string(), z.string())),
    ])
  ),
  children: z.array(z.string()),
  renderPriority: z.number().optional(),
  processRole: z.string().optional(),
  processGroup: z.string().optional(),
  ports: z
    .array(
      z.object({
        id: z.string().min(1),
        local: vector3Schema,
        direction: z.enum(["in", "out", "bidirectional"]),
      })
    )
    .optional(),
});

const annotationLeaderSchema = z.object({
  id: z.string(),
  from: vector3Schema,
  to: vector3Schema,
  text: z.string().optional(),
});

const annotationEquationSchema = z.object({
  id: z.string(),
  latexLike: z.string(),
  at: vector3Schema,
});

const annotationLayoutV11Schema = z.object({
  mode: z.literal("outside-rails"),
  rails: z.literal("dual"),
  railPadding: z.number().min(8),
  minLabelGap: z.number().min(4),
  maxLabelWidth: z.number().min(80),
  leaderStyle: z.enum(["solid", "dashed"]),
});

const annotationLayoutV12Schema = z.object({
  mode: z.enum(["outside-rails", "manual"]),
  rails: z.enum(["dual", "single"]),
  railPadding: z.number().min(8),
  minLabelGap: z.number().min(4),
  maxLabelWidth: z.number().min(80),
  leaderStyle: z.enum(["solid", "dashed"]),
});

const annotationLabelV10Schema = z.object({
  id: z.string(),
  text: z.string(),
  at: vector3Schema,
  targetNodeId: z.string().optional(),
  targetPortId: z.string().optional(),
  anchorBias: z.enum(["left", "right", "auto"]).optional(),
  priority: z.number().optional(),
});

const annotationLabelV11PlusSchema = annotationLabelV10Schema.extend({
  targetNodeId: z.string(),
});

const annotationV10Schema = z.object({
  visible: z.boolean(),
  labels: z.array(annotationLabelV10Schema),
  leaders: z.array(annotationLeaderSchema),
  equations: z.array(annotationEquationSchema),
  legend: z.array(z.string()),
});

const annotationV11Schema = z.object({
  visible: z.boolean(),
  labels: z.array(annotationLabelV11PlusSchema),
  leaders: z.array(annotationLeaderSchema),
  equations: z.array(annotationEquationSchema),
  legend: z.array(z.string()),
  layout: annotationLayoutV11Schema,
});

const annotationV12Schema = z.object({
  visible: z.boolean(),
  labels: z.array(annotationLabelV11PlusSchema),
  leaders: z.array(annotationLeaderSchema),
  equations: z.array(annotationEquationSchema),
  legend: z.array(z.string()),
  layout: annotationLayoutV12Schema,
});

const compositionV11Schema = z.object({
  fitMode: z.enum(["auto", "manual"]),
  framePadding: z.number().min(8),
  minOccupancy: z.number().min(0.2).max(0.95),
  focalNodeIds: z.array(z.string()),
  templateId: z.string(),
});

const compositionV12Schema = compositionV11Schema.extend({
  subjectNodeIds: z.array(z.string()).default([]),
  baseNodeRoleFilter: z.array(z.string().min(1)).default(["base", "substrate", "ground"]),
  laneTemplate: z.enum(["board-3lane", "board-radial", "organic-cross-section"]),
  overlapPolicy: z.enum(["avoid", "allow"]),
  laneGap: z.number().positive(),
});

const renderingSchema = z.object({
  showGridByDefault: z.boolean(),
  gridOpacity: z.number().min(0).max(1),
  gridPitch: z.number().positive(),
  gridMode: z.literal("isometric"),
});

const animationTypeSchema = z.enum([
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

const animationV11Schema = z.object({
  id: z.string(),
  targetNodeIds: z.array(z.string()),
  type: animationTypeSchema,
  durationMs: z.number().positive(),
  repeat: z.union([z.literal("indefinite"), z.number().positive()]),
  phase: z.number(),
  easing: z.enum(["linear", "ease-in-out"]),
});

const animationV12Schema = animationV11Schema.extend({
  engine: z.enum(["css", "gsap"]).optional(),
  timeline: z.string().optional(),
  targets: z
    .array(
      z.object({
        nodeId: z.string().min(1),
        part: z.string().optional(),
      })
    )
    .optional(),
  fallback: z
    .object({
      type: z.enum(["css", "smil"]),
      recipe: animationTypeSchema,
    })
    .optional(),
});

const baseSceneSchema = z.object({
  id: z.string().min(1),
  meta: z.object({
    title: z.string(),
    concept: z.enum(["energy-creation", "energy-data-storage", "saffron-growth"]),
    description: z.string(),
    scientificNotes: z.string(),
  }),
  camera: cameraSchema,
  tokens: tokenSetSchema,
  layers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      visible: z.boolean(),
    })
  ),
  nodes: z.array(nodeSchema),
});

export const sceneDocumentV10Schema = baseSceneSchema.extend({
  version: z.literal("1.0.0"),
  animations: z.array(animationV11Schema),
  annotations: annotationV10Schema,
});

export const sceneDocumentV11Schema = baseSceneSchema.extend({
  version: z.literal("1.1.0"),
  composition: compositionV11Schema,
  rendering: renderingSchema,
  animations: z.array(animationV11Schema),
  annotations: annotationV11Schema,
});

export const sceneDocumentSchema = baseSceneSchema.extend({
  version: z.literal("1.2.0"),
  responsive: responsiveSchema,
  composition: compositionV12Schema,
  rendering: renderingSchema,
  animations: z.array(animationV12Schema),
  annotations: annotationV12Schema,
});

export const sceneDocumentInputSchema = z.union([
  sceneDocumentV10Schema,
  sceneDocumentV11Schema,
  sceneDocumentSchema,
]);

export const referenceAssetSchema = z.object({
  assetId: z.string(),
  title: z.string(),
  path: z.string(),
  mime: z.string(),
  kind: z.enum(["html", "pptx"]),
  embedAllowed: z.boolean(),
  downloadLabel: z.string(),
  checksumOptional: z.string().optional(),
  metadata: z
    .object({
      dimensions: z.string().optional(),
      generatedOn: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
});

export const tokenSetSchemaExport = tokenSetSchema;
