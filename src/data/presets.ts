import { cameraPresets } from "../engine/projection";
import { ensureSceneV11 } from "../engine/migrations";
import type { AnimationSpec, Node, PresetManifest, SceneDocument, Vector3 } from "../engine/types";
import { vinciPaperWireframe } from "./tokens";

const baseLayers = [
  { id: "main", name: "Main", visible: true },
  { id: "support", name: "Support", visible: true },
  { id: "annotations", name: "Annotations", visible: true },
];

function node(
  id: string,
  type: Node["type"],
  position: Vector3,
  params: Node["params"] = {},
  layerId = "main",
  renderPriority = 0
): Node {
  return {
    id,
    type,
    layerId,
    transform3D: {
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
    styleRef: vinciPaperWireframe.id,
    params,
    children: [],
    renderPriority,
  };
}

const defaultAnnotationLayout: SceneDocument["annotations"]["layout"] = {
  mode: "outside-rails",
  rails: "dual",
  railPadding: 92,
  minLabelGap: 16,
  maxLabelWidth: 180,
  leaderStyle: "solid",
};

function scene(
  id: string,
  title: string,
  concept: SceneDocument["meta"]["concept"],
  description: string,
  scientificNotes: string,
  nodes: Node[],
  animations: AnimationSpec[],
  annotations: Omit<SceneDocument["annotations"], "layout"> & { layout?: SceneDocument["annotations"]["layout"] }
): SceneDocument {
  return {
    id,
    version: "1.1.0",
    meta: {
      title,
      concept,
      description,
      scientificNotes,
    },
    camera: { ...cameraPresets["classic-iso"], origin: { x: 0, y: 8 }, scale: 1 },
    composition: {
      fitMode: "auto",
      framePadding: 54,
      minOccupancy: 0.78,
      focalNodeIds: nodes.slice(0, 3).map((item) => item.id),
      templateId: `${concept}-balanced`,
    },
    rendering: {
      showGridByDefault: false,
      gridOpacity: 0.26,
      gridPitch: 0.75,
      gridMode: "isometric",
    },
    tokens: { ...vinciPaperWireframe },
    layers: structuredClone(baseLayers),
    nodes,
    animations,
    annotations: {
      ...annotations,
      layout: annotations.layout ?? defaultAnnotationLayout,
    },
  };
}

function tuneNode(
  entry: Node,
  options: {
    rotation?: Vector3;
    scale?: number;
    renderPriority?: number;
  } = {}
): Node {
  return {
    ...entry,
    renderPriority: options.renderPriority ?? entry.renderPriority,
    transform3D: {
      ...entry.transform3D,
      scale: options.scale ?? entry.transform3D.scale,
      rotation: options.rotation ?? entry.transform3D.rotation,
    },
  };
}

type BaseConfig = {
  y?: number;
  rows?: number;
  cols?: number;
  holeRadius?: number;
  traceDensity?: number;
  traceRadius?: number;
  tracePoints?: Vector3[];
  plinths?: Array<{ id: string; x: number; z: number; width: number; height: number; depth: number }>;
};

function motherboardBaseNodes(sceneId: string, width: number, depth: number, config: BaseConfig = {}): Node[] {
  const y = config.y ?? 3.35;
  const plinths =
    config.plinths ??
    [
      { id: "a", x: -width * 0.24, z: -depth * 0.19, width: 1.22, height: 0.44, depth: 0.82 },
      { id: "b", x: width * 0.24, z: depth * 0.2, width: 1.14, height: 0.42, depth: 0.75 },
    ];
  const defaultTrace = [
    { x: -width * 0.35, y: 0, z: -depth * 0.2 },
    { x: -width * 0.1, y: 0, z: -depth * 0.2 },
    { x: -width * 0.1, y: 0, z: depth * 0.06 },
    { x: width * 0.16, y: 0, z: depth * 0.06 },
    { x: width * 0.16, y: 0, z: depth * 0.27 },
    { x: width * 0.34, y: 0, z: depth * 0.27 },
  ];

  return [
    node(
      `${sceneId}-base-plate`,
      "plate",
      { x: 0, y, z: 0 },
      {
        width,
        depth,
        thickness: 0.34,
        rows: config.rows ?? 10,
        cols: config.cols ?? 16,
        holeRadius: config.holeRadius ?? 0.035,
        traceDensity: config.traceDensity ?? 0.72,
      },
      "support",
      -50
    ),
    ...plinths.map((plinth) =>
      node(
        `${sceneId}-base-plinth-${plinth.id}`,
        "box",
        { x: plinth.x, y: y - 0.2, z: plinth.z },
        { width: plinth.width, height: plinth.height, depth: plinth.depth, panelInset: 0.08 },
        "support",
        -45
      )
    ),
    node(
      `${sceneId}-base-trace`,
      "tube",
      { x: 0, y: y - 0.17, z: 0 },
      {
        radius: config.traceRadius ?? 0.04,
        points: config.tracePoints ?? defaultTrace,
      },
      "support",
      -40
    ),
  ];
}

function engineeringBaseConfig(sceneId: string): { width: number; depth: number; config: BaseConfig } {
  switch (sceneId) {
    case "ec-01-plasmonic-array-field-focus":
      return {
        width: 10,
        depth: 7.6,
        config: {
          rows: 12,
          cols: 18,
          traceDensity: 0.78,
          tracePoints: [
            { x: -3.7, y: 0, z: -1.8 },
            { x: -2.1, y: 0, z: -1.8 },
            { x: -2.1, y: 0, z: 0.2 },
            { x: -0.2, y: 0, z: 0.2 },
            { x: -0.2, y: 0, z: 1.9 },
            { x: 2.9, y: 0, z: 1.9 },
          ],
        },
      };
    case "ec-02-water-splitting-reaction":
      return {
        width: 9.8,
        depth: 7.8,
        config: {
          rows: 11,
          cols: 17,
          traceDensity: 0.66,
          tracePoints: [
            { x: -3.3, y: 0, z: 1.8 },
            { x: -1.2, y: 0, z: 1.8 },
            { x: -1.2, y: 0, z: -0.4 },
            { x: 1.4, y: 0, z: -0.4 },
            { x: 1.4, y: 0, z: -1.8 },
            { x: 3.2, y: 0, z: -1.8 },
          ],
          plinths: [
            { id: "a", x: -2.2, z: -1.1, width: 1.6, height: 0.42, depth: 0.85 },
            { id: "b", x: 2.3, z: 1.25, width: 1.35, height: 0.4, depth: 0.9 },
          ],
        },
      };
    case "ec-03-h2-storage-to-power-loop":
      return {
        width: 10.2,
        depth: 7.2,
        config: {
          rows: 11,
          cols: 16,
          traceDensity: 0.74,
          tracePoints: [
            { x: -3.6, y: 0, z: -1.4 },
            { x: -2.4, y: 0, z: -1.4 },
            { x: -2.4, y: 0, z: 1.5 },
            { x: 0.8, y: 0, z: 1.5 },
            { x: 0.8, y: 0, z: -1.1 },
            { x: 3.4, y: 0, z: -1.1 },
          ],
        },
      };
    case "ds-01-microgrid-energy-data-stack":
      return {
        width: 11.4,
        depth: 8.2,
        config: {
          rows: 12,
          cols: 18,
          traceDensity: 0.82,
          traceRadius: 0.046,
        },
      };
    case "ds-02-redundant-storage-cluster":
      return {
        width: 11.1,
        depth: 8,
        config: {
          rows: 12,
          cols: 17,
          traceDensity: 0.8,
          tracePoints: [
            { x: -4.2, y: 0, z: -2.0 },
            { x: -1.3, y: 0, z: -2.0 },
            { x: -1.3, y: 0, z: 1.7 },
            { x: 1.8, y: 0, z: 1.7 },
            { x: 1.8, y: 0, z: -1.7 },
            { x: 3.9, y: 0, z: -1.7 },
          ],
        },
      };
    case "ds-03-containerized-storage-system":
      return {
        width: 12,
        depth: 8.4,
        config: {
          rows: 13,
          cols: 19,
          traceDensity: 0.7,
          plinths: [
            { id: "a", x: -2.7, z: 1.6, width: 2.05, height: 0.44, depth: 0.92 },
            { id: "b", x: 3.0, z: -1.4, width: 2.0, height: 0.44, depth: 0.88 },
          ],
        },
      };
    default:
      return { width: 10, depth: 7.6, config: {} };
  }
}

function engineeringAccentNodes(sceneId: string): Node[] {
  switch (sceneId) {
    case "ec-01-plasmonic-array-field-focus":
      return [
        node("ec01-resonator-a", "cylinder", { x: -1.7, y: 2.12, z: -0.7 }, { radius: 0.22, height: 1.45 }, "support", -8),
        node("ec01-resonator-b", "cylinder", { x: 0.2, y: 2.05, z: -0.25 }, { radius: 0.26, height: 1.58 }, "support", -8),
        node("ec01-resonator-c", "cylinder", { x: 1.85, y: 2.18, z: 0.52 }, { radius: 0.2, height: 1.38 }, "support", -8),
        node(
          "ec01-field-bus",
          "tube",
          { x: 0, y: 2.55, z: 0 },
          {
            radius: 0.05,
            points: [
              { x: -2.1, y: -0.15, z: -0.65 },
              { x: -1.2, y: -0.38, z: -0.38 },
              { x: 0.0, y: -0.5, z: -0.15 },
              { x: 1.22, y: -0.3, z: 0.22 },
              { x: 2.1, y: -0.1, z: 0.55 },
            ],
          },
          "support",
          -7
        ),
        node("ec01-focus-pad", "box", { x: 0.05, y: 2.72, z: 0.78 }, { width: 0.95, height: 0.28, depth: 0.62, panelInset: 0.08 }, "support", -6),
      ];
    case "ec-02-water-splitting-reaction":
      return [
        node("ec02-reactor-left", "box", { x: -2.15, y: 2.28, z: -0.6 }, { width: 1.8, height: 1.2, depth: 1.1, panelInset: 0.12 }, "support", -9),
        node("ec02-reactor-right", "box", { x: 2.15, y: 2.2, z: 0.62 }, { width: 1.7, height: 1.14, depth: 1.08, panelInset: 0.12 }, "support", -9),
        node("ec02-cell-stack", "rack", { x: 0, y: 2.16, z: -0.1 }, { width: 1.45, height: 1.52, depth: 0.9, slots: 6, panelInset: 0.16 }, "support", -8),
        node(
          "ec02-feed-line",
          "tube",
          { x: 0, y: 2.72, z: 0 },
          {
            radius: 0.045,
            points: [
              { x: -2.5, y: -0.18, z: -0.6 },
              { x: -1.5, y: -0.42, z: -0.36 },
              { x: 0.0, y: -0.5, z: -0.2 },
              { x: 1.52, y: -0.38, z: 0.25 },
              { x: 2.5, y: -0.12, z: 0.65 },
            ],
          },
          "support",
          -7
        ),
      ];
    case "ec-03-h2-storage-to-power-loop":
      return [
        node("ec03-inverter-rack", "rack", { x: 0, y: 2.08, z: 0.92 }, { width: 1.2, height: 1.92, depth: 0.88, slots: 5 }, "support", -8),
        node("ec03-buffer-a", "cylinder", { x: -2.25, y: 2.32, z: -0.92 }, { radius: 0.3, height: 1.5 }, "support", -8),
        node("ec03-buffer-b", "cylinder", { x: 2.3, y: 2.28, z: 0.85 }, { radius: 0.28, height: 1.4 }, "support", -8),
        node(
          "ec03-loop-manifold",
          "tube",
          { x: 0, y: 2.78, z: 0 },
          {
            radius: 0.05,
            points: [
              { x: -2.7, y: -0.18, z: -0.95 },
              { x: -1.4, y: -0.55, z: -0.2 },
              { x: 0.0, y: -0.65, z: 0.5 },
              { x: 1.35, y: -0.42, z: 0.2 },
              { x: 2.7, y: -0.18, z: 0.85 },
            ],
          },
          "support",
          -7
        ),
      ];
    case "ds-01-microgrid-energy-data-stack":
      return [
        node("ds01-switch-core", "box", { x: 0.1, y: 2.75, z: -0.45 }, { width: 1.35, height: 0.85, depth: 1.05, panelInset: 0.1 }, "support", -9),
        node("ds01-edge-a", "box", { x: -3.2, y: 2.46, z: 1.15 }, { width: 1.02, height: 1.0, depth: 0.85, panelInset: 0.08 }, "support", -9),
        node("ds01-edge-b", "box", { x: 3.25, y: 2.4, z: -1.05 }, { width: 1.02, height: 1.0, depth: 0.85, panelInset: 0.08 }, "support", -9),
        node(
          "ds01-data-trunk",
          "tube",
          { x: 0, y: 2.96, z: 0 },
          {
            radius: 0.046,
            points: [
              { x: -3.15, y: -0.1, z: 1.0 },
              { x: -1.7, y: -0.45, z: 0.6 },
              { x: 0.2, y: -0.56, z: -0.3 },
              { x: 1.8, y: -0.35, z: -0.65 },
              { x: 3.2, y: -0.08, z: -0.95 },
            ],
          },
          "support",
          -8
        ),
      ];
    case "ds-02-redundant-storage-cluster":
      return [
        node("ds02-quorum-core", "cylinder", { x: 0.25, y: 2.38, z: -0.42 }, { radius: 0.52, height: 1.5 }, "support", -9),
        node("ds02-backup-a", "box", { x: -3.4, y: 2.38, z: -1.35 }, { width: 1.05, height: 1.15, depth: 0.88, panelInset: 0.08 }, "support", -9),
        node("ds02-backup-b", "box", { x: 3.45, y: 2.3, z: 1.25 }, { width: 1.05, height: 1.15, depth: 0.88, panelInset: 0.08 }, "support", -9),
        node(
          "ds02-ring-link",
          "tube",
          { x: 0, y: 2.92, z: 0 },
          {
            radius: 0.05,
            points: [
              { x: -3.5, y: -0.18, z: -1.15 },
              { x: -1.1, y: -0.56, z: -0.78 },
              { x: 0.3, y: -0.72, z: -0.34 },
              { x: 1.6, y: -0.5, z: 0.42 },
              { x: 3.45, y: -0.12, z: 1.15 },
            ],
          },
          "support",
          -8
        ),
      ];
    case "ds-03-containerized-storage-system":
      return [
        node("ds03-lift-frame", "box", { x: 0, y: 2.7, z: -1.35 }, { width: 4.4, height: 0.62, depth: 0.45, panelInset: 0.06 }, "support", -9),
        node("ds03-module-shell-a", "box", { x: -3.25, y: 2.4, z: 0.8 }, { width: 1.7, height: 1.35, depth: 1.15, panelInset: 0.12 }, "support", -9),
        node("ds03-module-shell-b", "box", { x: 3.2, y: 2.32, z: -0.85 }, { width: 1.7, height: 1.35, depth: 1.15, panelInset: 0.12 }, "support", -9),
        node(
          "ds03-container-rail",
          "tube",
          { x: 0, y: 2.96, z: 0 },
          {
            radius: 0.048,
            points: [
              { x: -3.5, y: -0.1, z: 0.72 },
              { x: -2.0, y: -0.48, z: 0.2 },
              { x: 0.2, y: -0.58, z: -0.52 },
              { x: 2.0, y: -0.44, z: -0.7 },
              { x: 3.4, y: -0.1, z: -0.82 },
            ],
          },
          "support",
          -8
        ),
      ];
    default:
      return [];
  }
}

function polishEngineeringScene(sceneDef: SceneDocument): SceneDocument {
  const base = engineeringBaseConfig(sceneDef.id);

  return {
    ...sceneDef,
    composition: {
      ...sceneDef.composition,
      framePadding: 44,
      minOccupancy: 0.78,
      templateId: `${sceneDef.composition.templateId}-cad-unique`,
    },
    nodes: [
      ...motherboardBaseNodes(sceneDef.id, base.width, base.depth, base.config),
      ...engineeringAccentNodes(sceneDef.id),
      ...sceneDef.nodes,
    ],
  };
}

function plantBaseConfig(sceneId: string): { width: number; depth: number; config: BaseConfig } {
  switch (sceneId) {
    case "sf-01-seedling-root-initiation":
      return {
        width: 8.9,
        depth: 6.8,
        config: {
          rows: 10,
          cols: 14,
          traceDensity: 0.54,
          traceRadius: 0.03,
          tracePoints: [
            { x: -2.9, y: 0, z: 1.15 },
            { x: -0.8, y: 0, z: 1.15 },
            { x: -0.8, y: 0, z: -0.85 },
            { x: 1.4, y: 0, z: -0.85 },
            { x: 1.4, y: 0, z: 1.28 },
            { x: 2.9, y: 0, z: 1.28 },
          ],
          plinths: [
            { id: "soil-a", x: -2.2, z: -1.0, width: 1.35, height: 0.38, depth: 0.7 },
            { id: "soil-b", x: 2.25, z: 1.0, width: 1.35, height: 0.38, depth: 0.7 },
          ],
        },
      };
    case "sf-02-vegetative-structure":
      return {
        width: 9.6,
        depth: 7.1,
        config: {
          rows: 11,
          cols: 15,
          traceDensity: 0.48,
          traceRadius: 0.028,
        },
      };
    case "sf-03-bloom-anatomy-harvest-view":
      return {
        width: 9.4,
        depth: 7.2,
        config: {
          rows: 11,
          cols: 15,
          traceDensity: 0.5,
          traceRadius: 0.03,
          plinths: [
            { id: "tray-a", x: -2.0, z: 1.2, width: 1.45, height: 0.35, depth: 0.68 },
            { id: "tray-b", x: 2.1, z: -1.1, width: 1.45, height: 0.35, depth: 0.68 },
          ],
        },
      };
    default:
      return { width: 8.8, depth: 6.8, config: {} };
  }
}

function plantAccentNodes(sceneId: string): Node[] {
  switch (sceneId) {
    case "sf-01-seedling-root-initiation":
      return [
        tuneNode(node("sf01-leaf-a", "leaf", { x: -0.42, y: 1.05, z: 0.2 }, { width: 0.34, height: 1.56, curl: 0.31, asymmetry: 0.22, veins: 6 }), {
          rotation: { x: 0, y: 0, z: -14 },
        }),
        tuneNode(node("sf01-leaf-b", "leaf", { x: 0.34, y: 1.08, z: -0.18 }, { width: 0.32, height: 1.46, curl: 0.24, asymmetry: -0.16, veins: 5 }), {
          rotation: { x: 0, y: 0, z: 12 },
        }),
        node("sf01-root-web-a", "root", { x: -0.05, y: 2.3, z: 0.08 }, {
          width: 1.1,
          points: [
            { x: 0, y: 0, z: 0 },
            { x: -0.25, y: 0.5, z: 0.1 },
            { x: -0.74, y: 1.04, z: 0.22 },
          ],
          branch1: [
            { x: -0.34, y: 0.62, z: 0.12 },
            { x: -0.62, y: 0.95, z: -0.12 },
          ],
          branch2: [
            { x: -0.08, y: 0.34, z: 0.08 },
            { x: 0.18, y: 0.76, z: 0.34 },
            { x: 0.32, y: 1.08, z: 0.42 },
          ],
        }),
        node("sf01-root-web-b", "root", { x: 0.16, y: 2.28, z: -0.12 }, {
          width: 1.02,
          points: [
            { x: 0, y: 0, z: 0 },
            { x: 0.24, y: 0.44, z: -0.1 },
            { x: 0.56, y: 1.06, z: -0.26 },
          ],
          branch1: [
            { x: 0.26, y: 0.6, z: -0.14 },
            { x: 0.3, y: 1.04, z: -0.42 },
          ],
        }),
      ];
    case "sf-02-vegetative-structure":
      return [
        tuneNode(node("sf02-leaf-4", "leaf", { x: -1.32, y: 1.18, z: 0.48 }, { width: 0.37, height: 2.06, curl: 0.28, asymmetry: 0.2, veins: 7 }), {
          rotation: { x: 0, y: 0, z: -19 },
        }),
        tuneNode(node("sf02-leaf-5", "leaf", { x: 1.3, y: 1.14, z: -0.42 }, { width: 0.36, height: 2.02, curl: 0.22, asymmetry: -0.18, veins: 7 }), {
          rotation: { x: 0, y: 0, z: 18 },
        }),
        tuneNode(node("sf02-leaf-6", "leaf", { x: 0.05, y: 0.9, z: 0.58 }, { width: 0.31, height: 2.14, curl: 0.24, asymmetry: 0.12, veins: 6 }), {
          rotation: { x: 0, y: 0, z: -4 },
        }),
        node("sf02-corm-cluster-a", "cylinder", { x: -0.38, y: 2.22, z: -0.14 }, { radius: 0.22, height: 0.6 }, "support", -5),
        node("sf02-corm-cluster-b", "cylinder", { x: 0.36, y: 2.24, z: 0.08 }, { radius: 0.2, height: 0.56 }, "support", -5),
        node("sf02-root-3", "root", { x: 0.03, y: 2.4, z: 0.04 }, {
          width: 1.18,
          points: [
            { x: 0, y: 0, z: 0 },
            { x: -0.34, y: 0.48, z: 0.14 },
            { x: -0.92, y: 1.08, z: 0.24 },
          ],
          branch1: [
            { x: -0.42, y: 0.62, z: 0.2 },
            { x: -0.5, y: 1.08, z: 0.46 },
          ],
          branch2: [
            { x: -0.14, y: 0.34, z: 0.12 },
            { x: 0.22, y: 0.72, z: 0.38 },
          ],
        }),
      ];
    case "sf-03-bloom-anatomy-harvest-view":
      return [
        tuneNode(node("sf03-petal-4", "petal", { x: -1.1, y: 1.3, z: 0.28 }, { width: 0.57, height: 1.1, flare: 0.2 }), {
          rotation: { x: 0, y: 0, z: -12 },
        }),
        tuneNode(node("sf03-petal-5", "petal", { x: 1.12, y: 1.28, z: -0.3 }, { width: 0.57, height: 1.08, flare: 0.22 }), {
          rotation: { x: 0, y: 0, z: 12 },
        }),
        tuneNode(node("sf03-petal-6", "petal", { x: 0.0, y: 1.46, z: 0.38 }, { width: 0.49, height: 0.96, flare: 0.16 }), {
          rotation: { x: 0, y: 0, z: 0 },
        }),
        node("sf03-stigma-a", "root", { x: -0.12, y: 1.58, z: 0.06 }, {
          width: 0.95,
          points: [
            { x: 0, y: 0, z: 0 },
            { x: -0.14, y: 0.24, z: 0.05 },
            { x: -0.38, y: 0.56, z: 0.15 },
          ],
        }),
        node("sf03-stigma-b", "root", { x: 0.12, y: 1.56, z: -0.05 }, {
          width: 0.95,
          points: [
            { x: 0, y: 0, z: 0 },
            { x: 0.14, y: 0.22, z: -0.05 },
            { x: 0.36, y: 0.54, z: -0.2 },
          ],
        }),
        node("sf03-harvest-tray", "box", { x: 0.0, y: 2.9, z: 1.22 }, { width: 1.8, height: 0.22, depth: 0.9, panelInset: 0.08 }, "support", -8),
      ];
    default:
      return [];
  }
}

function polishPlantScene(sceneDef: SceneDocument): SceneDocument {
  const base = plantBaseConfig(sceneDef.id);

  return {
    ...sceneDef,
    composition: {
      ...sceneDef.composition,
      framePadding: 46,
      minOccupancy: 0.78,
      templateId: `${sceneDef.composition.templateId}-organic-illustrated`,
    },
    nodes: [
      ...motherboardBaseNodes(sceneDef.id, base.width, base.depth, base.config),
      ...plantAccentNodes(sceneDef.id),
      ...sceneDef.nodes,
    ],
  };
}

const ec01 = scene(
  "ec-01-plasmonic-array-field-focus",
  "Plasmonic Array Field Focus",
  "energy-creation",
  "Nanodisk array under incident light with localized field concentration.",
  "Conceptual representation of plasmonic hotspots on nanodisk arrays.",
  [
    node("substrate", "disk-array", { x: 0, y: 2.8, z: 0 }, { rows: 9, cols: 12, spacing: 0.46, diskRadius: 0.11 }),
    node("hotspot-1", "atom", { x: -0.5, y: 0.6, z: 0.2 }, { radius: 18 }),
    node("hotspot-2", "atom", { x: 0.5, y: 0.8, z: -0.1 }, { radius: 15 }),
    node("photon-1", "arrow", { x: -1.2, y: -1.2, z: 0.4 }, { points: [{ x: 0, y: 0, z: 0 }, { x: 1.7, y: 1.2, z: -0.3 }] }, "support"),
    node("photon-2", "arrow", { x: 1.1, y: -1.0, z: -0.2 }, { points: [{ x: 0, y: 0, z: 0 }, { x: -1.5, y: 1.1, z: 0.2 }] }, "support"),
  ],
  [
    { id: "a-ec01-1", targetNodeIds: ["hotspot-1", "hotspot-2"], type: "pulse", durationMs: 2400, repeat: "indefinite", phase: 0, easing: "ease-in-out" },
    { id: "a-ec01-2", targetNodeIds: ["photon-1", "photon-2"], type: "flow", durationMs: 1800, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-hotspot", text: "Localized plasmonic field", at: { x: 0.7, y: 0.1, z: -0.2 }, targetNodeId: "hotspot-2", anchorBias: "right", priority: 2 },
      { id: "lbl-array", text: "Au nanodisk array", at: { x: -2, y: 2.3, z: 1.2 }, targetNodeId: "substrate", anchorBias: "left", priority: 1 },
    ],
    leaders: [
      { id: "ldr-1", from: { x: 0.7, y: 0.25, z: -0.2 }, to: { x: 0.5, y: 0.8, z: -0.1 } },
      { id: "ldr-2", from: { x: -1.8, y: 2.3, z: 1.1 }, to: { x: -1.3, y: 2.9, z: 0.6 } },
    ],
    equations: [],
    legend: ["Conceptual not-to-scale rendering", "Wireframe token profile: vinci-paper-wireframe"],
  }
);

const ec02 = scene(
  "ec-02-water-splitting-reaction",
  "Water Splitting Reaction",
  "energy-creation",
  "Catalyst surface depiction of H2 and O2 generation from water.",
  "Concept-accurate reaction framing: 2H2O -> 2H2 + O2.",
  [
    node("surface", "disk-array", { x: 0, y: 3.0, z: 0 }, { rows: 8, cols: 10, spacing: 0.52, diskRadius: 0.12 }),
    node("water-o", "atom", { x: -0.1, y: 0.8, z: 0.2 }, { radius: 16 }),
    node("water-h1", "atom", { x: -0.55, y: 1.1, z: 0.3 }, { radius: 10 }),
    node("water-h2", "atom", { x: 0.35, y: 1.05, z: 0.0 }, { radius: 10 }),
    node("bond-1", "bond", { x: -0.35, y: 0.95, z: 0.25 }, { points: [{ x: -0.15, y: 0.1, z: 0.03 }, { x: 0.15, y: -0.1, z: -0.03 }] }),
    node("bond-2", "bond", { x: 0.12, y: 0.95, z: 0.1 }, { points: [{ x: -0.15, y: -0.1, z: 0.03 }, { x: 0.15, y: 0.1, z: -0.03 }] }),
    node("split-arrow", "arrow", { x: 0.7, y: 0.8, z: -0.1 }, { points: [{ x: -0.2, y: 0, z: 0 }, { x: 1.2, y: -0.15, z: 0 }] }, "support"),
    node("h2-out", "atom", { x: 2.0, y: 0.6, z: -0.3 }, { radius: 12 }),
    node("o2-out", "atom", { x: 2.5, y: 0.9, z: 0.1 }, { radius: 14 }),
  ],
  [
    { id: "a-ec02-1", targetNodeIds: ["water-o", "water-h1", "water-h2"], type: "pulse", durationMs: 2200, repeat: "indefinite", phase: 0, easing: "ease-in-out" },
    { id: "a-ec02-2", targetNodeIds: ["split-arrow"], type: "flow", durationMs: 1600, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-h2o", text: "Water molecule at catalyst interface", at: { x: -1.7, y: 0.8, z: 0.6 }, targetNodeId: "water-o", anchorBias: "left", priority: 2 },
      { id: "lbl-products", text: "Hydrogen + oxygen outputs", at: { x: 2.6, y: 0.3, z: -0.1 }, targetNodeId: "h2-out", anchorBias: "right", priority: 1 },
    ],
    leaders: [
      { id: "ldr-h2o", from: { x: -1.2, y: 0.9, z: 0.5 }, to: { x: -0.1, y: 0.8, z: 0.2 } },
      { id: "ldr-prod", from: { x: 2.5, y: 0.35, z: -0.1 }, to: { x: 2.1, y: 0.6, z: -0.3 } },
    ],
    equations: [{ id: "eq-ws", latexLike: "2H2O -> 2H2 + O2", at: { x: 0.1, y: -1.3, z: 0 } }],
    legend: ["Reaction pathway is conceptual", "Array shown for explanatory clarity"],
  }
);

const ec03 = scene(
  "ec-03-h2-storage-to-power-loop",
  "Hydrogen Storage to Power Loop",
  "energy-creation",
  "Hydrogen production, storage, and conversion to power in one loop.",
  "Conceptual energy loop with fuel-cell output and water by-product.",
  [
    node("gen-unit", "box", { x: -2.5, y: 1.9, z: 0 }, { width: 1.4, height: 1.6, depth: 1.2 }),
    node("h2-tank", "cylinder", { x: 0, y: 1.9, z: -0.1 }, { radius: 0.7, height: 2.2 }),
    node("fuel-cell", "box", { x: 2.4, y: 1.9, z: 0.2 }, { width: 1.6, height: 1.4, depth: 1.3 }),
    node("flow-1", "arrow", { x: -1.4, y: 1.0, z: 0.1 }, { points: [{ x: -0.2, y: 0, z: 0 }, { x: 1.1, y: 0, z: 0 }] }, "support"),
    node("flow-2", "arrow", { x: 1.0, y: 1.0, z: 0.05 }, { points: [{ x: -0.2, y: 0, z: 0 }, { x: 1.1, y: 0, z: 0 }] }, "support"),
    node("return-water", "arrow", { x: 1.1, y: 2.9, z: 0.2 }, { points: [{ x: 1.0, y: 0, z: 0 }, { x: -3.2, y: 0, z: -0.2 }] }, "support"),
  ],
  [
    { id: "a-ec03-1", targetNodeIds: ["flow-1", "flow-2", "return-water"], type: "flow", durationMs: 2100, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-gen", text: "Plasmonic H2 generation", at: { x: -3.2, y: 1.2, z: 0.4 }, targetNodeId: "gen-unit", anchorBias: "left", priority: 2 },
      { id: "lbl-tank", text: "Hydrogen storage", at: { x: -0.2, y: 0.7, z: 0.2 }, targetNodeId: "h2-tank", anchorBias: "auto", priority: 2 },
      { id: "lbl-fuel", text: "Fuel-cell conversion", at: { x: 2.8, y: 1.0, z: 0.2 }, targetNodeId: "fuel-cell", anchorBias: "right", priority: 1 },
    ],
    leaders: [
      { id: "ldr-gen", from: { x: -2.9, y: 1.2, z: 0.4 }, to: { x: -2.5, y: 1.9, z: 0 } },
      { id: "ldr-tank", from: { x: -0.2, y: 0.9, z: 0.2 }, to: { x: 0, y: 1.8, z: -0.1 } },
      { id: "ldr-fuel", from: { x: 2.6, y: 1.1, z: 0.2 }, to: { x: 2.4, y: 1.9, z: 0.2 } },
    ],
    equations: [{ id: "eq-loop", latexLike: "2H2 + O2 -> 2H2O + electricity + heat", at: { x: -0.3, y: -1.3, z: 0 } }],
    legend: ["Loop illustrates generation, storage, and conversion"],
  }
);

const ds01 = scene(
  "ds-01-microgrid-energy-data-stack",
  "Microgrid Energy and Data Stack",
  "energy-data-storage",
  "Server stack with connected hydrogen and battery systems.",
  "Data path and energy path are conceptual overlays.",
  [
    node("rack-a", "rack", { x: -1.8, y: 2, z: 0 }, { width: 1.4, height: 2.2, depth: 1.0, slots: 4 }),
    node("rack-b", "rack", { x: 0.2, y: 2.2, z: 0.4 }, { width: 1.4, height: 2.5, depth: 1.0, slots: 5 }),
    node("h2-store", "cylinder", { x: 2.2, y: 2.2, z: -0.2 }, { radius: 0.6, height: 2.1 }),
    node("power-link", "arrow", { x: 0.8, y: 1.3, z: 0.2 }, { points: [{ x: -0.8, y: 0, z: 0 }, { x: 1.2, y: 0, z: -0.2 }] }, "support"),
    node("data-link", "arrow", { x: -0.8, y: 0.9, z: 0.2 }, { points: [{ x: -0.6, y: 0, z: 0 }, { x: 1.8, y: 0, z: 0.2 }] }, "support"),
  ],
  [
    { id: "a-ds01-1", targetNodeIds: ["power-link", "data-link"], type: "flow", durationMs: 1800, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-rack", text: "Compute + control stack", at: { x: -2.6, y: 1.0, z: 0.2 }, targetNodeId: "rack-a", anchorBias: "left", priority: 2 },
      { id: "lbl-storage", text: "Hydrogen energy buffer", at: { x: 2.4, y: 1.1, z: -0.1 }, targetNodeId: "h2-store", anchorBias: "right", priority: 1 },
    ],
    leaders: [{ id: "ldr-rack", from: { x: -2.2, y: 1.1, z: 0.2 }, to: { x: -1.8, y: 2, z: 0 } }],
    equations: [],
    legend: ["Dual-path architecture: power + data"],
  }
);

const ds02 = scene(
  "ds-02-redundant-storage-cluster",
  "Redundant Storage Cluster",
  "energy-data-storage",
  "Clustered nodes with failover routing.",
  "Shows redundancy pattern, not network protocol details.",
  [
    node("cluster-a", "rack", { x: -2.1, y: 2.3, z: -0.2 }, { width: 1.2, height: 1.8, depth: 0.9, slots: 3 }),
    node("cluster-b", "rack", { x: -0.5, y: 2.0, z: 0.4 }, { width: 1.2, height: 1.8, depth: 0.9, slots: 3 }),
    node("cluster-c", "rack", { x: 1.1, y: 2.2, z: -0.1 }, { width: 1.2, height: 1.8, depth: 0.9, slots: 3 }),
    node("cluster-d", "rack", { x: 2.7, y: 2.0, z: 0.3 }, { width: 1.2, height: 1.8, depth: 0.9, slots: 3 }),
    node("route-1", "arrow", { x: -1.3, y: 1.2, z: 0.2 }, { points: [{ x: -0.6, y: 0, z: 0 }, { x: 1.0, y: 0, z: 0.1 }] }, "support"),
    node("route-2", "arrow", { x: 0.3, y: 1.2, z: 0.1 }, { points: [{ x: -0.6, y: 0, z: 0 }, { x: 1.0, y: 0, z: -0.1 }] }, "support"),
    node("route-3", "arrow", { x: 1.9, y: 1.2, z: 0.2 }, { points: [{ x: -0.6, y: 0, z: 0.1 }, { x: 1.0, y: 0, z: 0 }] }, "support"),
  ],
  [
    { id: "a-ds02-1", targetNodeIds: ["route-1", "route-2", "route-3"], type: "flow", durationMs: 1400, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [{ id: "lbl-fail", text: "Failover routing path", at: { x: -1.8, y: 0.8, z: 0.4 }, targetNodeId: "route-2", anchorBias: "left", priority: 2 }],
    leaders: [{ id: "ldr-fail", from: { x: -1.3, y: 0.9, z: 0.4 }, to: { x: -1.3, y: 1.2, z: 0.2 } }],
    equations: [],
    legend: ["Route highlight pulses indicate active handoff"],
  }
);

const ds03 = scene(
  "ds-03-containerized-storage-system",
  "Containerized Storage System",
  "energy-data-storage",
  "Modular container stack for energy and data storage subsystems.",
  "Container internals simplified for communication clarity.",
  [
    node("container-a", "box", { x: -1.5, y: 2.1, z: 0 }, { width: 2.5, height: 1.8, depth: 1.3 }),
    node("container-b", "box", { x: 1.5, y: 2.1, z: 0.2 }, { width: 2.5, height: 1.8, depth: 1.3 }),
    node("buffer-tank", "cylinder", { x: 0, y: 1.5, z: -0.6 }, { radius: 0.45, height: 1.7 }),
    node("link-a", "arrow", { x: -0.8, y: 1.1, z: -0.1 }, { points: [{ x: -0.8, y: 0, z: 0 }, { x: 0.8, y: 0, z: -0.2 }] }, "support"),
    node("link-b", "arrow", { x: 0.8, y: 1.15, z: -0.1 }, { points: [{ x: -0.8, y: 0, z: 0.2 }, { x: 0.8, y: 0, z: 0 }] }, "support"),
  ],
  [
    { id: "a-ds03-1", targetNodeIds: ["link-a", "link-b"], type: "flow", durationMs: 1650, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-mod", text: "Modular container blocks", at: { x: -2.8, y: 1.0, z: 0.3 }, targetNodeId: "container-a", anchorBias: "left", priority: 2 },
      { id: "lbl-buffer", text: "Shared storage buffer", at: { x: 0.3, y: 0.9, z: -0.4 }, targetNodeId: "buffer-tank", anchorBias: "right", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Containerized architecture scales by module count"],
  }
);

const sf01 = scene(
  "sf-01-seedling-root-initiation",
  "Saffron Seedling Root Initiation",
  "saffron-growth",
  "Early corm and root emergence in isometric section.",
  "Botanical staging is conceptual and annotation-led.",
  [
    node("corm", "cylinder", { x: 0, y: 1.9, z: 0 }, { radius: 0.7, height: 1.0 }),
    node("sprout", "leaf", { x: 0, y: 0.8, z: 0 }, { width: 0.5, height: 1.2 }),
    node("root-main", "root", { x: 0, y: 2.25, z: 0 }, { points: [{ x: 0, y: 0, z: 0 }, { x: 0.1, y: 0.6, z: 0 }, { x: -0.05, y: 1.2, z: 0 }] }),
    node("root-side", "root", { x: 0, y: 2.35, z: 0.1 }, { points: [{ x: 0, y: 0, z: 0 }, { x: 0.3, y: 0.4, z: -0.2 }, { x: 0.5, y: 0.8, z: -0.2 }] }),
  ],
  [
    { id: "a-sf01-1", targetNodeIds: ["sprout", "root-main", "root-side"], type: "growth", durationMs: 5200, repeat: "indefinite", phase: 0, easing: "ease-in-out" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-corm", text: "Corm body", at: { x: -1.2, y: 1.8, z: 0.5 }, targetNodeId: "corm", anchorBias: "left", priority: 2 },
      { id: "lbl-root", text: "Primary root initiation", at: { x: 0.6, y: 3.1, z: -0.1 }, targetNodeId: "root-main", anchorBias: "right", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Stage 1: emergence"],
  }
);

const sf02 = scene(
  "sf-02-vegetative-structure",
  "Saffron Vegetative Structure",
  "saffron-growth",
  "Mid-growth canopy and root architecture depiction.",
  "Leaf and root network shown as modular primitives.",
  [
    node("leaf-1", "leaf", { x: -0.8, y: 1.1, z: 0.2 }, { width: 0.45, height: 1.6 }),
    node("leaf-2", "leaf", { x: 0.0, y: 0.9, z: 0.1 }, { width: 0.45, height: 1.8 }),
    node("leaf-3", "leaf", { x: 0.8, y: 1.15, z: -0.1 }, { width: 0.45, height: 1.5 }),
    node("root-net", "root", { x: -0.2, y: 2.4, z: 0 }, { points: [{ x: 0, y: 0, z: 0 }, { x: 0.3, y: 0.5, z: 0.2 }, { x: 0.8, y: 1.1, z: 0.4 }] }),
    node("root-net-2", "root", { x: 0.2, y: 2.2, z: 0 }, { points: [{ x: 0, y: 0, z: 0 }, { x: -0.3, y: 0.5, z: -0.1 }, { x: -0.8, y: 1.2, z: -0.3 }] }),
  ],
  [
    { id: "a-sf02-1", targetNodeIds: ["leaf-1", "leaf-2", "leaf-3"], type: "growth", durationMs: 6200, repeat: "indefinite", phase: 0, easing: "ease-in-out" },
    { id: "a-sf02-2", targetNodeIds: ["root-net", "root-net-2"], type: "flow", durationMs: 2400, repeat: "indefinite", phase: 0, easing: "linear" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-canopy", text: "Vegetative leaves", at: { x: -1.6, y: 0.8, z: 0.4 }, targetNodeId: "leaf-2", anchorBias: "left", priority: 2 },
      { id: "lbl-rootnet", text: "Expanding root network", at: { x: 1.1, y: 2.9, z: 0.2 }, targetNodeId: "root-net", anchorBias: "right", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Stage 2: vegetative growth"],
  }
);

const sf03 = scene(
  "sf-03-bloom-anatomy-harvest-view",
  "Saffron Bloom Anatomy and Harvest View",
  "saffron-growth",
  "Flower bloom with stigma-focused anatomy annotation.",
  "Botanical cross-section indicators are conceptual.",
  [
    node("petal-1", "petal", { x: -0.8, y: 1.1, z: 0.1 }, { width: 0.55, height: 0.95 }),
    node("petal-2", "petal", { x: 0, y: 0.9, z: 0 }, { width: 0.55, height: 1.1 }),
    node("petal-3", "petal", { x: 0.8, y: 1.1, z: -0.1 }, { width: 0.55, height: 0.95 }),
    node("stigma", "leaf", { x: 0, y: 1.55, z: 0 }, { width: 0.2, height: 0.7 }),
    node("stem", "cylinder", { x: 0, y: 2.6, z: 0 }, { radius: 0.15, height: 1.8 }),
  ],
  [
    { id: "a-sf03-1", targetNodeIds: ["petal-1", "petal-2", "petal-3"], type: "growth", durationMs: 5000, repeat: "indefinite", phase: 0, easing: "ease-in-out" },
    { id: "a-sf03-2", targetNodeIds: ["stigma"], type: "pulse", durationMs: 2400, repeat: "indefinite", phase: 0, easing: "ease-in-out" },
  ],
  {
    visible: true,
    labels: [
      { id: "lbl-bloom", text: "Bloom stage", at: { x: -1.7, y: 0.9, z: 0.5 }, targetNodeId: "petal-2", anchorBias: "left", priority: 1 },
      { id: "lbl-stigma", text: "Stigma (harvest target)", at: { x: 0.6, y: 1.2, z: 0.1 }, targetNodeId: "stigma", anchorBias: "right", priority: 2 },
    ],
    leaders: [],
    equations: [],
    legend: ["Stage 3: bloom and harvest anatomy"],
  }
);

const polishedScenes: SceneDocument[] = [
  polishEngineeringScene(ec01),
  polishEngineeringScene(ec02),
  polishEngineeringScene(ec03),
  polishEngineeringScene(ds01),
  polishEngineeringScene(ds02),
  polishEngineeringScene(ds03),
  polishPlantScene(sf01),
  polishPlantScene(sf02),
  polishPlantScene(sf03),
];

export const presetScenes: Record<string, SceneDocument> = Object.fromEntries(
  polishedScenes.map((sceneDef) => [sceneDef.id, sceneDef])
) as Record<string, SceneDocument>;

export const presetManifest: PresetManifest[] = [
  {
    presetId: "ec-01-plasmonic-array-field-focus",
    concept: "energy-creation",
    title: "Plasmonic Array Field Focus",
    sceneRef: "ec-01-plasmonic-array-field-focus",
    tags: ["plasmonic", "array", "field"],
    scientificNotes: "Localized field concentration around nanostructures.",
  },
  {
    presetId: "ec-02-water-splitting-reaction",
    concept: "energy-creation",
    title: "Water Splitting Reaction",
    sceneRef: "ec-02-water-splitting-reaction",
    tags: ["reaction", "hydrogen", "oxygen"],
    scientificNotes: "Concept equation included: 2H2O -> 2H2 + O2.",
  },
  {
    presetId: "ec-03-h2-storage-to-power-loop",
    concept: "energy-creation",
    title: "H2 Storage to Power Loop",
    sceneRef: "ec-03-h2-storage-to-power-loop",
    tags: ["fuel-cell", "storage", "loop"],
    scientificNotes: "Concept equation included for power conversion loop.",
  },
  {
    presetId: "ds-01-microgrid-energy-data-stack",
    concept: "energy-data-storage",
    title: "Microgrid Energy and Data Stack",
    sceneRef: "ds-01-microgrid-energy-data-stack",
    tags: ["microgrid", "stack", "compute"],
    scientificNotes: "Power/data paths shown as visual overlays.",
  },
  {
    presetId: "ds-02-redundant-storage-cluster",
    concept: "energy-data-storage",
    title: "Redundant Storage Cluster",
    sceneRef: "ds-02-redundant-storage-cluster",
    tags: ["redundancy", "failover", "cluster"],
    scientificNotes: "Failover pathways shown as conceptual routing.",
  },
  {
    presetId: "ds-03-containerized-storage-system",
    concept: "energy-data-storage",
    title: "Containerized Storage System",
    sceneRef: "ds-03-containerized-storage-system",
    tags: ["container", "modular", "storage"],
    scientificNotes: "Container internals are intentionally simplified.",
  },
  {
    presetId: "sf-01-seedling-root-initiation",
    concept: "saffron-growth",
    title: "Saffron Seedling Root Initiation",
    sceneRef: "sf-01-seedling-root-initiation",
    tags: ["saffron", "seedling", "root"],
    scientificNotes: "Early-stage growth depicted for explanation.",
  },
  {
    presetId: "sf-02-vegetative-structure",
    concept: "saffron-growth",
    title: "Saffron Vegetative Structure",
    sceneRef: "sf-02-vegetative-structure",
    tags: ["saffron", "vegetative", "leaf"],
    scientificNotes: "Mid-stage growth and root architecture.",
  },
  {
    presetId: "sf-03-bloom-anatomy-harvest-view",
    concept: "saffron-growth",
    title: "Saffron Bloom Anatomy and Harvest View",
    sceneRef: "sf-03-bloom-anatomy-harvest-view",
    tags: ["saffron", "bloom", "anatomy"],
    scientificNotes: "Bloom and stigma emphasis for harvest context.",
  },
];

export function getSceneByPresetId(presetId: string): SceneDocument {
  const scene = presetScenes[presetId];
  if (!scene) {
    return ensureSceneV11(structuredClone(ec01));
  }
  return ensureSceneV11(structuredClone(scene));
}
