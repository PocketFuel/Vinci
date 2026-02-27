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
  | "plate"
  | "cylinder"
  | "disk-array"
  | "arrow"
  | "tube"
  | "leaf"
  | "petal"
  | "root"
  | "rack"
  | "label-anchor";

export type PrimitiveParams = Record<string, number | string | boolean | Vector3 | Vector3[]>;

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
};

export type AnimationType = "pulse" | "flow" | "orbit" | "growth";

export type AnimationSpec = {
  id: string;
  targetNodeIds: string[];
  type: AnimationType;
  durationMs: number;
  repeat: "indefinite" | number;
  phase: number;
  easing: "linear" | "ease-in-out";
};

export type AnnotationLabel = {
  id: string;
  text: string;
  at: Vector3;
  targetNodeId: string;
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
  mode: "outside-rails";
  rails: "dual";
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
  templateId: string;
};

export type SceneRendering = {
  showGridByDefault: boolean;
  gridOpacity: number;
  gridPitch: number;
  gridMode: "isometric";
};

export type SceneDocument = {
  id: string;
  version: "1.1.0";
  meta: {
    title: string;
    concept: "energy-creation" | "energy-data-storage" | "saffron-growth";
    description: string;
    scientificNotes: string;
  };
  camera: CameraSpec;
  composition: SceneComposition;
  rendering: SceneRendering;
  tokens: TokenSet;
  layers: SceneLayer[];
  nodes: Node[];
  animations: AnimationSpec[];
  annotations: AnnotationLayer;
};

export type LegacySceneDocument = Omit<SceneDocument, "version" | "composition" | "rendering" | "annotations"> & {
  version: "1.0.0";
  annotations: Omit<AnnotationLayer, "layout" | "labels"> & {
    labels: LegacyAnnotationLabel[];
  };
};

export type SceneDocumentInput = SceneDocument | LegacySceneDocument;

export type PresetManifest = {
  presetId: string;
  concept: SceneDocument["meta"]["concept"];
  title: string;
  sceneRef: string;
  thumbnailRef?: string;
  tags: string[];
  scientificNotes: string;
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
