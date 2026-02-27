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
  ]),
  layerId: z.string().min(1),
  transform3D: z.object({
    position: vector3Schema,
    rotation: vector3Schema,
    scale: z.number().positive(),
  }),
  styleRef: z.string().min(1),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), vector3Schema, z.array(vector3Schema)])),
  children: z.array(z.string()),
  renderPriority: z.number().optional(),
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

const annotationLayoutSchema = z.object({
  mode: z.literal("outside-rails"),
  rails: z.literal("dual"),
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
  anchorBias: z.enum(["left", "right", "auto"]).optional(),
  priority: z.number().optional(),
});

const annotationLabelV11Schema = annotationLabelV10Schema.extend({
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
  labels: z.array(annotationLabelV11Schema),
  leaders: z.array(annotationLeaderSchema),
  equations: z.array(annotationEquationSchema),
  legend: z.array(z.string()),
  layout: annotationLayoutSchema,
});

const compositionSchema = z.object({
  fitMode: z.enum(["auto", "manual"]),
  framePadding: z.number().min(8),
  minOccupancy: z.number().min(0.2).max(0.95),
  focalNodeIds: z.array(z.string()),
  templateId: z.string(),
});

const renderingSchema = z.object({
  showGridByDefault: z.boolean(),
  gridOpacity: z.number().min(0).max(1),
  gridPitch: z.number().positive(),
  gridMode: z.literal("isometric"),
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
  animations: z.array(
    z.object({
      id: z.string(),
      targetNodeIds: z.array(z.string()),
      type: z.enum(["pulse", "flow", "orbit", "growth"]),
      durationMs: z.number().positive(),
      repeat: z.union([z.literal("indefinite"), z.number().positive()]),
      phase: z.number(),
      easing: z.enum(["linear", "ease-in-out"]),
    })
  ),
});

export const sceneDocumentV10Schema = baseSceneSchema.extend({
  version: z.literal("1.0.0"),
  annotations: annotationV10Schema,
});

export const sceneDocumentSchema = baseSceneSchema.extend({
  version: z.literal("1.1.0"),
  composition: compositionSchema,
  rendering: renderingSchema,
  annotations: annotationV11Schema,
});

export const sceneDocumentInputSchema = z.union([sceneDocumentV10Schema, sceneDocumentSchema]);

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
