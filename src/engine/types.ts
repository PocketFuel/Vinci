export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type CameraPresetId =
  | "classic-iso"
  | "north-east"
  | "north-west"
  | "top-iso"
  | "section-cut";

export type CameraSpec = {
  yaw: number;
  pitch: number;
  scale: number;
  origin: { x: number; y: number };
  presetId: CameraPresetId;
  manualZoom?: number;
  manualPan?: { x: number; y: number };
};

export type ResponsiveBreakpoint = {
  id: "desktop" | "tablet" | "mobile";
  width: number;
  cameraPreset: CameraPresetId;
  annotationMode: "outside-rails" | "compact";
};

export type ResponsiveConfig = {
  mode: "adaptive";
  breakpoints: ResponsiveBreakpoint[];
};

export type TokenSet = {
  id: string;
  name: string;
  bgPaper: string;
  inkPrimary: string;
  inkSecondary: string;
  fillTop: string;
  fillLeft: string;
  fillRight: string;
  lineWidth: number;
  hatchDensity: number;
};

export type SceneLayer = {
  id: string;
  name: string;
  visible: boolean;
};

export type NodeType =
  | "atom"
  | "bond"
  | "box"
  | "prism"
  | "cone"
  | "capsule"
  | "ring"
  | "dome"
  | "plate"
  | "cylinder"
  | "disk-array"
  | "arrow"
  | "tube"
  | "leaf"
  | "petal"
  | "root"
  | "rack"
  | "label-anchor"
  | "pcb-trace"
  | "chip"
  | "chiplet"
  | "bus"
  | "manifold"
  | "tank-horizontal"
  | "electrode-stack"
  | "wavefront"
  | "petiole"
  | "filament"
  | "plant-cell"
  | "cell-cluster"
  | "image-panel";

export type PrimitiveParams = Record<
  string,
  number | string | boolean | Vector3 | Vector3[] | Record<string, string | number | boolean> | Array<Record<string, string>>
>;

export type Node = {
  id: string;
  type: NodeType;
  layerId: string;
  transform3D: {
    position: Vector3;
    rotation: Vector3;
    scale: number;
  };
  styleRef: string;
  params: PrimitiveParams;
  children: string[];
  renderPriority?: number;
  processRole?: string;
  processGroup?: string;
  ports?: {
    id: string;
    local: Vector3;
    direction: "in" | "out" | "bidirectional";
  }[];
};

export type AnimationType =
  | "pulse"
  | "flow"
  | "orbit"
  | "growth"
  | "energy-flow"
  | "charge-cycle"
  | "reaction-split"
  | "network-pulse"
  | "growth-wave";

export type AnimationSpec = {
  id: string;
  targetNodeIds: string[];
  type: AnimationType;
  durationMs: number;
  repeat: "indefinite" | number;
  phase: number;
  easing: "linear" | "ease-in-out";
  engine?: "css" | "gsap";
  timeline?: string;
  targets?: { nodeId: string; part?: string }[];
  fallback?: { type: "css" | "smil"; recipe: AnimationType };
};

export type ScientificMode = "source-locked" | "guided-creative" | "fast-draft";

export type ScientificClaim = {
  id: string;
  statement: string;
  sourceIds: string[];
  confidence: number;
  status: "supported" | "needs-review" | "draft";
};

export type ReferenceSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  year: number;
  type: "paper" | "textbook" | "government" | "organization" | "internal";
};

export type ValidationCheck = {
  id: string;
  name: string;
  required: boolean;
  passed: boolean;
  notes: string;
};

export type ValidationReport = {
  checklist: ValidationCheck[];
  score: number;
  ready: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
};

export type AnnotationLabel = {
  id: string;
  text: string;
  at: Vector3;
  targetNodeId: string;
  targetPortId?: string;
  anchorBias?: "left" | "right" | "auto";
  priority?: number;
};

export type LegacyAnnotationLabel = Omit<AnnotationLabel, "targetNodeId"> & {
  targetNodeId?: string;
};

export type AnnotationLeader = {
  id: string;
  from: Vector3;
  to: Vector3;
  text?: string;
};

export type AnnotationEquation = {
  id: string;
  latexLike: string;
  at: Vector3;
};

export type AnnotationLayout = {
  mode: "outside-rails" | "manual";
  rails: "dual" | "single";
  railPadding: number;
  minLabelGap: number;
  maxLabelWidth: number;
  leaderStyle: "solid" | "dashed";
};

export type AnnotationLayer = {
  visible: boolean;
  labels: AnnotationLabel[];
  leaders: AnnotationLeader[];
  equations: AnnotationEquation[];
  legend: string[];
  layout: AnnotationLayout;
};

export type SceneComposition = {
  fitMode: "auto" | "manual";
  framePadding: number;
  minOccupancy: number;
  focalNodeIds: string[];
  subjectNodeIds: string[];
  baseNodeRoleFilter: string[];
  templateId: string;
  laneTemplate: "board-3lane" | "board-radial" | "organic-cross-section";
  overlapPolicy: "avoid" | "allow";
  laneGap: number;
};

export type SceneRendering = {
  showGridByDefault: boolean;
  gridOpacity: number;
  gridPitch: number;
  gridMode: "isometric";
};

export type SceneMetaBase = {
  title: string;
  concept: "energy-creation" | "energy-data-storage" | "saffron-growth";
  description: string;
  scientificNotes: string;
};

export type SceneMeta = SceneMetaBase & {
  scientificMode: ScientificMode;
  referencePackId: string;
  claims: ScientificClaim[];
  validation: ValidationReport;
};

export type SceneDocument = {
  id: string;
  version: "1.4.0";
  meta: SceneMeta;
  camera: CameraSpec;
  responsive: ResponsiveConfig;
  composition: SceneComposition;
  rendering: SceneRendering;
  tokens: TokenSet;
  layers: SceneLayer[];
  nodes: Node[];
  animations: AnimationSpec[];
  annotations: AnnotationLayer;
};

export type SceneCompositionV11 = Omit<
  SceneComposition,
  "laneTemplate" | "overlapPolicy" | "laneGap" | "subjectNodeIds" | "baseNodeRoleFilter"
>;

export type SceneDocumentV12 = Omit<SceneDocument, "version" | "meta"> & {
  version: "1.2.0";
  meta: SceneMetaBase;
};

export type SceneDocumentV11 = Omit<SceneDocument, "version" | "responsive" | "composition" | "meta"> & {
  version: "1.1.0";
  meta: SceneMetaBase;
  composition: SceneCompositionV11;
};

export type LegacySceneDocument = Omit<
  SceneDocument,
  "version" | "composition" | "rendering" | "responsive" | "annotations" | "meta"
> & {
  version: "1.0.0";
  meta: SceneMetaBase;
  annotations: Omit<AnnotationLayer, "layout" | "labels"> & {
    labels: LegacyAnnotationLabel[];
  };
};

export type SceneDocumentInput = SceneDocument | SceneDocumentV12 | SceneDocumentV11 | LegacySceneDocument;

export type PresetManifest = {
  presetId: string;
  concept: SceneDocument["meta"]["concept"];
  title: string;
  sceneRef: string;
  thumbnailRef?: string;
  tags: string[];
  scientificNotes: string;
  referencePackId?: string;
};

export type ReferenceAsset = {
  assetId: string;
  title: string;
  path: string;
  mime: string;
  kind: "html" | "pptx";
  embedAllowed: boolean;
  downloadLabel: string;
  checksumOptional?: string;
  metadata?: {
    dimensions?: string;
    generatedOn?: string;
    note?: string;
  };
};

export type Bounds2D = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};
