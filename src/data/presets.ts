import { cameraPresets } from "../engine/projection";
import { ensureSceneV12 } from "../engine/migrations";
import type { AnimationSpec, Node, PresetManifest, SceneDocument, Vector3 } from "../engine/types";
import { vinciPaperWireframe } from "./tokens";

const baseLayers = [
  { id: "main", name: "Main", visible: true },
  { id: "support", name: "Support", visible: true },
  { id: "annotations", name: "Annotations", visible: true },
];

const defaultResponsive: SceneDocument["responsive"] = {
  mode: "adaptive",
  breakpoints: [
    { id: "desktop", width: 1920, cameraPreset: "classic-iso", annotationMode: "outside-rails" },
    { id: "tablet", width: 1024, cameraPreset: "north-east", annotationMode: "outside-rails" },
    { id: "mobile", width: 640, cameraPreset: "north-east", annotationMode: "compact" },
  ],
};

const defaultAnnotationLayout: SceneDocument["annotations"]["layout"] = {
  mode: "outside-rails",
  rails: "dual",
  railPadding: 96,
  minLabelGap: 16,
  maxLabelWidth: 220,
  leaderStyle: "solid",
};

function n(
  id: string,
  type: Node["type"],
  position: Vector3,
  options: {
    params?: Node["params"];
    layerId?: string;
    renderPriority?: number;
    processRole?: string;
    processGroup?: string;
    rotation?: Vector3;
    scale?: number;
    ports?: NonNullable<Node["ports"]>;
  } = {}
): Node {
  return {
    id,
    type,
    layerId: options.layerId ?? "main",
    transform3D: {
      position,
      rotation: options.rotation ?? { x: 0, y: 0, z: 0 },
      scale: options.scale ?? 1,
    },
    styleRef: vinciPaperWireframe.id,
    params: options.params ?? {},
    children: [],
    renderPriority: options.renderPriority ?? 0,
    processRole: options.processRole,
    processGroup: options.processGroup,
    ports: options.ports,
  };
}

function a(
  id: string,
  type: AnimationSpec["type"],
  targetNodeIds: string[],
  options: {
    durationMs?: number;
    easing?: AnimationSpec["easing"];
    repeat?: AnimationSpec["repeat"];
    engine?: "css" | "gsap";
    timeline?: string;
    fallback?: AnimationSpec["fallback"];
  } = {}
): AnimationSpec {
  return {
    id,
    type,
    targetNodeIds,
    durationMs: options.durationMs ?? 2400,
    repeat: options.repeat ?? "indefinite",
    phase: 0,
    easing: options.easing ?? "ease-in-out",
    engine: options.engine ?? "gsap",
    timeline: options.timeline ?? type,
    targets: targetNodeIds.map((nodeId) => ({ nodeId })),
    fallback: options.fallback ?? {
      type: "css",
      recipe: type,
    },
  };
}

function boardBase(
  sceneId: string,
  width: number,
  depth: number,
  profile: "energy" | "storage" | "organic"
): Node[] {
  const boardStyle = {
    boardY: 3.42,
    thickness: profile === "storage" ? 0.38 : profile === "organic" ? 0.34 : 0.34,
    rows: profile === "energy" ? 12 : profile === "storage" ? 10 : 8,
    cols: profile === "energy" ? 19 : profile === "storage" ? 15 : 12,
    holeRadius: profile === "energy" ? 0.034 : profile === "storage" ? 0.04 : 0.028,
    traceDensity: profile === "energy" ? 0.78 : profile === "storage" ? 0.62 : 0.34,
    traceStyle: "orthogonal",
    holePattern: "checker",
    surfaceType: "pcb",
    includeClock: profile !== "organic",
    clockPos: { x: 0, y: 3.18, z: -depth * 0.2 },
    topFill: undefined as string | undefined,
    leftFill: undefined as string | undefined,
    rightFill: undefined as string | undefined,
    soilFurrows: 0,
    soilPebbleDensity: 0,
  };

  const supportNodes: Node[] = [];

  switch (sceneId) {
    case "ec01":
      boardStyle.traceStyle = "orthogonal";
      boardStyle.holePattern = "checker";
      supportNodes.push(
        n(`${sceneId}-power-module`, "manifold", { x: -width * 0.23, y: 3.2, z: -depth * 0.28 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: 0.88, height: 0.44, depth: 0.62, bevel: 0.06 },
        })
      );
      break;
    case "ec02":
      boardStyle.traceStyle = "radial";
      boardStyle.holePattern = "bands";
      supportNodes.push(
        n(`${sceneId}-feed-plenum`, "box", { x: -width * 0.24, y: 3.24, z: depth * 0.24 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: 0.92, height: 0.2, depth: 0.58, bevel: 0.08, panelInset: 0.04 },
        }),
        n(`${sceneId}-resonance-post`, "cylinder", { x: width * 0.24, y: 3.19, z: -depth * 0.2 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -53,
          params: { radius: 0.22, height: 0.32 },
        })
      );
      break;
    case "ec03":
      boardStyle.traceStyle = "parallel";
      boardStyle.holePattern = "sparse";
      supportNodes.push(
        n(`${sceneId}-loop-spine-a`, "box", { x: -width * 0.06, y: 3.24, z: -depth * 0.31 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: Math.max(2.2, width * 0.28), height: 0.16, depth: 0.28, panelInset: 0 },
        }),
        n(`${sceneId}-loop-spine-b`, "box", { x: width * 0.12, y: 3.24, z: depth * 0.28 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: Math.max(1.9, width * 0.22), height: 0.16, depth: 0.28, panelInset: 0 },
        })
      );
      break;
    case "ec05":
      boardStyle.traceStyle = "radial";
      boardStyle.holePattern = "bands";
      boardStyle.traceDensity = 0.32;
      supportNodes.push(
        n(`${sceneId}-hex-hub`, "chiplet", { x: 0.05, y: 3.2, z: -depth * 0.08 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -50,
          params: { width: 0.86, depth: 0.72, height: 0.24, pins: 6 },
        })
      );
      break;
    case "ds01":
      boardStyle.traceStyle = "diagonal";
      boardStyle.holePattern = "checker";
      supportNodes.push(
        n(`${sceneId}-hub-pedestal`, "cylinder", { x: 0.05, y: 3.2, z: 0 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -53,
          params: { radius: 0.24, height: 0.28 },
        })
      );
      break;
    case "ds02":
      boardStyle.traceStyle = "orthogonal";
      boardStyle.holePattern = "radial";
      supportNodes.push(
        n(`${sceneId}-brace-left`, "box", { x: -width * 0.2, y: 3.23, z: -depth * 0.28 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: 1.44, height: 0.16, depth: 0.26, panelInset: 0 },
        }),
        n(`${sceneId}-brace-right`, "box", { x: width * 0.22, y: 3.23, z: depth * 0.22 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: 1.24, height: 0.16, depth: 0.26, panelInset: 0 },
        })
      );
      break;
    case "ds03":
      boardStyle.traceStyle = "parallel";
      boardStyle.holePattern = "bands";
      supportNodes.push(
        n(`${sceneId}-container-spine`, "box", { x: width * 0.03, y: 3.23, z: -depth * 0.33 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -52,
          params: { width: Math.max(2.8, width * 0.36), height: 0.18, depth: 0.34, panelInset: 0.03 },
        })
      );
      break;
    case "sf01":
      boardStyle.surfaceType = "soil";
      boardStyle.holePattern = "none";
      boardStyle.traceDensity = 0;
      boardStyle.rows = 9;
      boardStyle.cols = 12;
      boardStyle.topFill = "#E6DDC9";
      boardStyle.leftFill = "#D8CCB5";
      boardStyle.rightFill = "#CABCA1";
      boardStyle.includeClock = false;
      boardStyle.soilFurrows = 7;
      boardStyle.soilPebbleDensity = 0.62;
      supportNodes.push(
        n(`${sceneId}-soil-mound-a`, "cylinder", { x: -width * 0.2, y: 3.26, z: -depth * 0.16 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -53,
          params: { radius: 0.18, height: 0.14 },
        }),
        n(`${sceneId}-soil-mound-b`, "cylinder", { x: width * 0.18, y: 3.26, z: depth * 0.12 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -53,
          params: { radius: 0.16, height: 0.12 },
        })
      );
      break;
    case "sf02":
      boardStyle.surfaceType = "soil";
      boardStyle.holePattern = "none";
      boardStyle.traceDensity = 0;
      boardStyle.rows = 10;
      boardStyle.cols = 13;
      boardStyle.topFill = "#E4DAC5";
      boardStyle.leftFill = "#D3C6AD";
      boardStyle.rightFill = "#C4B599";
      boardStyle.includeClock = false;
      boardStyle.soilFurrows = 8;
      boardStyle.soilPebbleDensity = 0.54;
      supportNodes.push(
        n(`${sceneId}-soil-ridge`, "box", { x: 0.18, y: 3.28, z: -depth * 0.22 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -53,
          params: { width: 1.8, height: 0.12, depth: 0.38, bevel: 0.12, panelInset: 0 },
        })
      );
      break;
    case "sf03":
      boardStyle.surfaceType = "soil";
      boardStyle.holePattern = "none";
      boardStyle.traceDensity = 0;
      boardStyle.rows = 10;
      boardStyle.cols = 14;
      boardStyle.topFill = "#E5DCC8";
      boardStyle.leftFill = "#D4C8B0";
      boardStyle.rightFill = "#C5B79B";
      boardStyle.includeClock = false;
      boardStyle.soilFurrows = 6;
      boardStyle.soilPebbleDensity = 0.68;
      supportNodes.push(
        n(`${sceneId}-soil-bed-lift`, "box", { x: -0.05, y: 3.27, z: depth * 0.18 }, {
          layerId: "support",
          processRole: "base",
          renderPriority: -53,
          params: { width: 1.46, height: 0.12, depth: 0.44, bevel: 0.1, panelInset: 0 },
        })
      );
      break;
    default:
      supportNodes.push(
        profile === "energy"
          ? n(`${sceneId}-power-module`, "manifold", { x: -width * 0.23, y: 3.2, z: -depth * 0.28 }, {
              layerId: "support",
              processRole: "base",
              renderPriority: -52,
              params: { width: 0.88, height: 0.44, depth: 0.62 },
            })
          : profile === "storage"
          ? n(`${sceneId}-bus-spine`, "box", { x: 0, y: 3.24, z: -depth * 0.34 }, {
              layerId: "support",
              processRole: "base",
              renderPriority: -52,
              params: { width: Math.max(2.4, width * 0.34), height: 0.18, depth: 0.32, panelInset: 0.05 },
            })
          : n(`${sceneId}-growth-pad`, "cylinder", { x: 0.2, y: 3.24, z: -depth * 0.28 }, {
              layerId: "support",
              processRole: "base",
              renderPriority: -52,
              params: { radius: 0.24, height: 0.28 },
            })
      );
      break;
  }

  const baseNodes: Node[] = [
    n(
      `${sceneId}-board`,
      "plate",
      { x: 0, y: boardStyle.boardY, z: 0 },
      {
        layerId: "support",
        processRole: "base",
        renderPriority: -60,
        params: {
          width,
          depth,
          thickness: boardStyle.thickness,
          rows: boardStyle.rows,
          cols: boardStyle.cols,
          holeRadius: boardStyle.holeRadius,
          traceDensity: boardStyle.traceDensity,
          traceStyle: boardStyle.traceStyle,
          holePattern: boardStyle.holePattern,
          surfaceType: boardStyle.surfaceType,
          ...(boardStyle.topFill ? { topFill: boardStyle.topFill } : {}),
          ...(boardStyle.leftFill ? { leftFill: boardStyle.leftFill } : {}),
          ...(boardStyle.rightFill ? { rightFill: boardStyle.rightFill } : {}),
          soilFurrows: boardStyle.soilFurrows,
          soilPebbleDensity: boardStyle.soilPebbleDensity,
        },
      }
    ),
  ];

  if (boardStyle.includeClock) {
    baseNodes.push(
      n(
        `${sceneId}-clock`,
        "chiplet",
        boardStyle.clockPos,
        {
          layerId: "support",
          processRole: "base",
          renderPriority: -48,
          params: {
            width: 0.62,
            depth: 0.56,
            height: 0.2,
            pins: 4,
            panelInset: 0.03,
          },
        }
      )
    );
  }

  baseNodes.push(...supportNodes);
  return baseNodes;
}

function orbNode(
  id: string,
  position: Vector3,
  options: {
    radius: number;
    color: string;
    strokeColor?: string;
    highlight?: boolean;
    ringColor?: string;
    layerId?: string;
    processRole?: string;
    processGroup?: string;
    renderPriority?: number;
  }
): Node {
  return n(id, "atom", position, {
    layerId: options.layerId,
    processRole: options.processRole,
    processGroup: options.processGroup,
    renderPriority: options.renderPriority,
    params: {
      radius: options.radius,
      color: options.color,
      strokeColor: options.strokeColor ?? "#3A2411",
      highlight: options.highlight ?? false,
      ringColor: options.ringColor ?? "#EFCB85",
    },
  });
}

function buildOrbGrid(config: {
  idPrefix: string;
  center: Vector3;
  rows: number;
  cols: number;
  spacing: number;
  radius: number;
  palette: string[];
  processRole?: string;
  processGroup?: string;
  renderPriority?: number;
  yWobble?: number;
  highlightEvery?: number;
}): Node[] {
  const nodes: Node[] = [];
  const rowStrideZ = config.spacing * 0.86;

  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      const offsetX = row % 2 === 0 ? 0 : config.spacing * 0.5;
      const x = config.center.x + (col - (config.cols - 1) / 2) * config.spacing + offsetX;
      const z = config.center.z + (row - (config.rows - 1) / 2) * rowStrideZ;
      const wobble = config.yWobble ? Math.sin(row * 0.9 + col * 0.7) * config.yWobble : 0;
      const paletteIndex = (row * config.cols + col) % config.palette.length;
      const color = config.palette[paletteIndex];
      const highlightEvery = Math.max(3, config.highlightEvery ?? 11);
      const highlight = (row * config.cols + col) % highlightEvery === 0;

      nodes.push(
        orbNode(
          `${config.idPrefix}-r${row}-c${col}`,
          { x, y: config.center.y + wobble, z },
          {
            radius: config.radius,
            color,
            highlight,
            processRole: config.processRole,
            processGroup: config.processGroup,
            renderPriority: config.renderPriority,
          }
        )
      );
    }
  }

  return nodes;
}

function buildOrbRing(config: {
  idPrefix: string;
  center: Vector3;
  ringRadius: number;
  count: number;
  radius: number;
  palette: string[];
  processRole?: string;
  processGroup?: string;
  renderPriority?: number;
}): Node[] {
  const nodes: Node[] = [];
  const count = Math.max(4, config.count);

  for (let i = 0; i < count; i += 1) {
    const theta = (Math.PI * 2 * i) / count;
    const x = config.center.x + Math.cos(theta) * config.ringRadius;
    const z = config.center.z + Math.sin(theta) * config.ringRadius;
    const color = config.palette[i % config.palette.length];
    const highlight = i % Math.max(5, Math.round(count / 3)) === 0;
    nodes.push(
      orbNode(
        `${config.idPrefix}-i${i}`,
        { x, y: config.center.y, z },
        {
          radius: config.radius,
          color,
          highlight,
          processRole: config.processRole,
          processGroup: config.processGroup,
          renderPriority: config.renderPriority,
        }
      )
    );
  }

  return nodes;
}

function buildOrbCanopy(config: {
  idPrefix: string;
  center: Vector3;
  radius: number;
  layers: number;
  depth: number;
  orbRadius: number;
  palette: string[];
  processRole?: string;
  processGroup?: string;
  renderPriority?: number;
}): Node[] {
  const nodes: Node[] = [];
  const layers = Math.max(3, config.layers);
  for (let layer = 0; layer < layers; layer += 1) {
    const t = layers <= 1 ? 0 : layer / (layers - 1);
    const ringRadius = Math.max(0.14, config.radius * Math.sin(t * (Math.PI / 2)));
    const count = Math.max(6, Math.round(ringRadius * 10));
    const layerY = config.center.y + t * config.depth;
    nodes.push(
      ...buildOrbRing({
        idPrefix: `${config.idPrefix}-l${layer}`,
        center: { x: config.center.x, y: layerY, z: config.center.z },
        ringRadius,
        count,
        radius: config.orbRadius * (0.82 + t * 0.24),
        palette: config.palette,
        processRole: config.processRole,
        processGroup: config.processGroup,
        renderPriority: config.renderPriority,
      })
    );
  }

  nodes.push(
    orbNode(`${config.idPrefix}-crown`, config.center, {
      radius: config.orbRadius * 1.1,
      color: config.palette[1] ?? config.palette[0] ?? "#D08A38",
      highlight: true,
      processRole: config.processRole,
      processGroup: config.processGroup,
      renderPriority: config.renderPriority,
    })
  );
  return nodes;
}

function makeScene(def: {
  id: string;
  title: string;
  concept: SceneDocument["meta"]["concept"];
  description: string;
  scientificNotes: string;
  nodes: Node[];
  animations: AnimationSpec[];
  annotations: Omit<SceneDocument["annotations"], "layout">;
  laneTemplate: SceneDocument["composition"]["laneTemplate"];
  camera?: SceneDocument["camera"];
  minOccupancy?: number;
  laneGap?: number;
  subjectNodeIds?: string[];
}): SceneDocument {
  const subjectNodes = def.nodes.filter(
    (node) =>
      node.processRole !== "base" &&
      node.processRole !== "substrate" &&
      node.processRole !== "ground" &&
      node.type !== "plate"
  );
  const focalSource = subjectNodes.length > 0 ? subjectNodes : def.nodes;
  const focalNodeIds = focalSource.slice(0, 4).map((node) => node.id);
  const subjectNodeIds = (def.subjectNodeIds ?? focalNodeIds).filter((id) => focalSource.some((node) => node.id === id));

  return {
    id: def.id,
    version: "1.2.0",
    meta: {
      title: def.title,
      concept: def.concept,
      description: def.description,
      scientificNotes: def.scientificNotes,
    },
    camera: def.camera ?? { ...cameraPresets["classic-iso"], origin: { x: 0, y: 8 }, scale: 1 },
    responsive: structuredClone(defaultResponsive),
    composition: {
      fitMode: "auto",
      framePadding: 44,
      minOccupancy: def.minOccupancy ?? 0.86,
      focalNodeIds,
      subjectNodeIds,
      baseNodeRoleFilter: ["base", "substrate", "ground"],
      templateId: `${def.id}-template`,
      laneTemplate: def.laneTemplate,
      overlapPolicy: "avoid",
      laneGap: def.laneGap ?? 1.24,
    },
    rendering: {
      showGridByDefault: false,
      gridOpacity: 0.26,
      gridPitch: 0.72,
      gridMode: "isometric",
    },
    tokens: { ...vinciPaperWireframe },
    layers: structuredClone(baseLayers),
    nodes: def.nodes,
    animations: def.animations,
    annotations: {
      ...def.annotations,
      layout: { ...defaultAnnotationLayout },
    },
  };
}

const ec01 = makeScene({
  id: "ec-01-plasmonic-array-field-focus",
  title: "Plasmonic Array Field Focus",
  concept: "energy-creation",
  description: "Incident wave energy focusing on a nanodisk catalyst field, then routed to hydrogen output.",
  scientificNotes:
    "Conceptual process model: input wavefront -> plasmonic concentration over nanodisks -> downstream hydrogen-ready output.",
  laneTemplate: "board-3lane",
  laneGap: 1.35,
  subjectNodeIds: ["ec01-wave", "ec01-controller", "ec01-array", "ec01-focus-manifold", "ec01-h2-node", "ec01-out-chip"],
  nodes: [
    ...boardBase("ec01", 11.2, 8.2, "energy"),
    n("ec01-wave", "wavefront", { x: -4.2, y: 1.35, z: -0.3 }, { processRole: "input", params: { radius: 0.95, lines: 5 } }),
    n("ec01-controller", "chip", { x: -3.2, y: 2.15, z: -1.2 }, {
      processRole: "input",
      processGroup: "control",
      params: { width: 1.7, depth: 1.25, height: 0.32, pins: 10, bevel: 0.1 },
      ports: [
        { id: "left", local: { x: -0.9, y: 0, z: 0 }, direction: "in" },
        { id: "right", local: { x: 0.9, y: 0, z: 0 }, direction: "out" },
      ],
    }),
    n("ec01-array", "disk-array", { x: -0.6, y: 2.55, z: 0 }, {
      processRole: "transform",
      processGroup: "catalyst",
      params: { rows: 8, cols: 10, spacing: 0.46, diskRadius: 0.14 },
    }),
    n("ec01-hotspot-a", "atom", { x: -0.2, y: 1.5, z: -0.35 }, {
      processRole: "transform",
      params: { radius: 14, color: "#A4D3A0", strokeColor: "#1F3B28", highlight: true, ringColor: "#2A6E49" },
    }),
    n("ec01-hotspot-b", "atom", { x: 0.4, y: 1.4, z: 0.22 }, {
      processRole: "transform",
      params: { radius: 12, color: "#95C995", strokeColor: "#1F3B28", highlight: true, ringColor: "#2A6E49" },
    }),
    n("ec01-focus-manifold", "manifold", { x: 1.4, y: 2.18, z: 0.08 }, {
      processRole: "transform",
      params: { width: 1.2, height: 0.7, depth: 0.92, bevel: 0.07 },
    }),
    n("ec01-h2-node", "tank-horizontal", { x: 3.1, y: 2.05, z: 0.6 }, {
      processRole: "storage",
      processGroup: "hydrogen",
      params: { radius: 0.38, height: 2.1 },
      rotation: { x: 0, y: 0, z: 90 },
    }),
    n("ec01-telemetry", "chiplet", { x: 4.25, y: 2.18, z: -0.95 }, {
      processRole: "telemetry",
      params: { width: 0.95, depth: 0.82, height: 0.24, pins: 6 },
    }),
    n("ec01-out-chip", "chip", { x: 4.1, y: 2.02, z: 0.9 }, {
      processRole: "output",
      processGroup: "output",
      params: { width: 1.46, depth: 1.1, height: 0.3, pins: 8, bevel: 0.08 },
    }),
    n("ec01-link-in", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 2,
        routePlaneY: 2.28,
        routeLayer: 1,
        axisPreference: "x-first",
        keepWaypoints: false,
        points: [
          { x: -3.1, y: 2.14, z: -1.2 },
          { x: -1.8, y: 2.3, z: -0.9 },
          { x: -0.9, y: 2.48, z: -0.5 },
          { x: -0.35, y: 2.55, z: -0.2 },
        ],
        portRefs: [
          { nodeId: "ec01-controller", portId: "right" },
          { nodeId: "ec01-array", portId: "left" },
        ],
      },
    }),
    n("ec01-link-out", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.09,
        routePlaneY: 2.2,
        routeLayer: 2,
        axisPreference: "x-first",
        keepWaypoints: false,
        points: [
          { x: 0.8, y: 2.38, z: 0.08 },
          { x: 1.9, y: 2.24, z: 0.22 },
          { x: 2.9, y: 2.14, z: 0.58 },
          { x: 4.1, y: 2.06, z: 0.82 },
        ],
        portRefs: [
          { nodeId: "ec01-focus-manifold", portId: "right" },
          { nodeId: "ec01-out-chip", portId: "left" },
        ],
      },
    }),
    n("ec01-link-telemetry", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.4,
        routePlaneY: 2.16,
        routeLayer: 3,
        axisPreference: "z-first",
        keepWaypoints: false,
        points: [
          { x: 2.2, y: 2.1, z: 0.45 },
          { x: 3.1, y: 2.08, z: -0.1 },
          { x: 4.15, y: 2.16, z: -0.86 },
        ],
        portRefs: [
          { nodeId: "ec01-h2-node", portId: "right" },
          { nodeId: "ec01-telemetry", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("ec01-anim-wave", "energy-flow", ["ec01-wave", "ec01-link-in"], { durationMs: 1900, timeline: "energy-flow" }),
    a("ec01-anim-hotspots", "reaction-split", ["ec01-hotspot-a", "ec01-hotspot-b"], { durationMs: 2600 }),
    a("ec01-anim-output", "network-pulse", ["ec01-link-out", "ec01-link-telemetry", "ec01-telemetry"], { durationMs: 2000 }),
  ],
  annotations: {
    visible: true,
    labels: [
      {
        id: "ec01-label-wave",
        text: "Incident wave input",
        at: { x: -4.2, y: 1.3, z: -0.3 },
        targetNodeId: "ec01-wave",
        targetPortId: "right",
        anchorBias: "left",
        priority: 3,
      },
      {
        id: "ec01-label-array",
        text: "Au nanodisk catalyst array",
        at: { x: -0.6, y: 2.5, z: 0 },
        targetNodeId: "ec01-array",
        targetPortId: "top",
        anchorBias: "left",
        priority: 3,
      },
      {
        id: "ec01-label-focus",
        text: "Localized plasmonic hotspots",
        at: { x: 0.2, y: 1.45, z: 0.04 },
        targetNodeId: "ec01-hotspot-a",
        targetPortId: "right",
        anchorBias: "right",
        priority: 2,
      },
      {
        id: "ec01-label-output",
        text: "Hydrogen-ready output + telemetry",
        at: { x: 4.15, y: 2.08, z: 0.76 },
        targetNodeId: "ec01-out-chip",
        targetPortId: "right",
        anchorBias: "right",
        priority: 2,
      },
    ],
    leaders: [],
    equations: [],
    legend: ["Conceptual energy-routing diagram", "Not to scale"],
  },
});

const ec02 = makeScene({
  id: "ec-02-water-splitting-reaction",
  title: "Water Splitting Reaction",
  concept: "energy-creation",
  description: "Electrode stack and manifold showing water input splitting into hydrogen and oxygen paths.",
  scientificNotes: "Equation overlay: 2H2O -> 2H2 + O2. Structural depiction is conceptual, chemistry is real.",
  laneTemplate: "board-3lane",
  laneGap: 1.32,
  nodes: [
    ...boardBase("ec02", 10.8, 7.9, "energy"),
    n("ec02-feed-chip", "chiplet", { x: -3.6, y: 2.1, z: -0.9 }, { processRole: "input", params: { width: 0.92, depth: 0.7, height: 0.22, pins: 6 } }),
    n("ec02-water-wave", "wavefront", { x: -4.1, y: 1.2, z: -0.2 }, { processRole: "input", params: { radius: 0.82, lines: 4 } }),
    n("ec02-electrode", "electrode-stack", { x: -0.3, y: 2.1, z: 0 }, {
      processRole: "transform",
      params: { width: 1.9, depth: 1.15, count: 7, thickness: 0.08, gap: 0.05 },
    }),
    n("ec02-reactor", "manifold", { x: 1.25, y: 2.1, z: 0.12 }, { processRole: "transform", params: { width: 1.3, height: 0.8, depth: 1.0 } }),
    n("ec02-h2", "atom", { x: 3.3, y: 1.44, z: -0.5 }, { processRole: "output", params: { radius: 13 } }),
    n("ec02-o2", "atom", { x: 3.7, y: 1.56, z: 0.46 }, { processRole: "output", params: { radius: 15 } }),
    n("ec02-h2-tank", "tank-horizontal", { x: 4.15, y: 2.0, z: -0.82 }, {
      processRole: "storage",
      params: { radius: 0.31, height: 1.8 },
      rotation: { x: 0, y: 0, z: 90 },
    }),
    n("ec02-o2-bus", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.075,
        routePlaneY: 1.94,
        routeLayer: 1,
        axisPreference: "x-first",
        points: [
          { x: 1.1, y: 2.05, z: 0.18 },
          { x: 2.2, y: 1.9, z: 0.34 },
          { x: 3.6, y: 1.58, z: 0.46 },
        ],
        portRefs: [
          { nodeId: "ec02-reactor", portId: "right" },
          { nodeId: "ec02-o2", portId: "left" },
        ],
      },
    }),
    n("ec02-h2-bus", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.08,
        routePlaneY: 1.86,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [
          { x: 1.1, y: 2.04, z: 0.06 },
          { x: 2.3, y: 1.76, z: -0.18 },
          { x: 3.35, y: 1.42, z: -0.52 },
        ],
        portRefs: [
          { nodeId: "ec02-reactor", portId: "right" },
          { nodeId: "ec02-h2", portId: "left" },
        ],
      },
    }),
    n("ec02-feed-trace", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.75,
        routePlaneY: 2.14,
        routeLayer: 1,
        axisPreference: "x-first",
        points: [
          { x: -3.5, y: 2.08, z: -0.86 },
          { x: -2.1, y: 2.18, z: -0.52 },
          { x: -0.9, y: 2.14, z: -0.18 },
          { x: -0.35, y: 2.12, z: 0.0 },
        ],
        portRefs: [
          { nodeId: "ec02-feed-chip", portId: "right" },
          { nodeId: "ec02-electrode", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("ec02-feed", "energy-flow", ["ec02-water-wave", "ec02-feed-trace"], { durationMs: 1800 }),
    a("ec02-reaction", "reaction-split", ["ec02-electrode", "ec02-reactor"], { durationMs: 2500 }),
    a("ec02-products", "network-pulse", ["ec02-h2-bus", "ec02-o2-bus", "ec02-h2", "ec02-o2"], { durationMs: 2100 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "ec02-l1", text: "Water feed + control", at: { x: -3.55, y: 2.08, z: -0.88 }, targetNodeId: "ec02-feed-chip", targetPortId: "right", anchorBias: "left", priority: 2 },
      { id: "ec02-l2", text: "Electrode catalyst stack", at: { x: -0.3, y: 2.1, z: 0 }, targetNodeId: "ec02-electrode", targetPortId: "top", anchorBias: "left", priority: 3 },
      { id: "ec02-l3", text: "Reaction manifold split", at: { x: 1.25, y: 2.08, z: 0.1 }, targetNodeId: "ec02-reactor", targetPortId: "right", anchorBias: "right", priority: 2 },
      { id: "ec02-l4", text: "Hydrogen and oxygen products", at: { x: 3.6, y: 1.5, z: 0.2 }, targetNodeId: "ec02-o2", targetPortId: "left", anchorBias: "right", priority: 2 },
    ],
    leaders: [],
    equations: [{ id: "ec02-eq", latexLike: "2H2O -> 2H2 + O2", at: { x: 0, y: -1.25, z: 0 } }],
    legend: ["Structural flow is conceptual", "Chemical equation is canonical"],
  },
});

const ec03 = makeScene({
  id: "ec-03-h2-storage-to-power-loop",
  title: "H2 Storage to Power Loop",
  concept: "energy-creation",
  description: "Generation, storage and fuel-cell conversion loop with return-water branch.",
  scientificNotes: "Shows power loop logic: production -> tank -> conversion -> electrical output + water return.",
  laneTemplate: "board-3lane",
  laneGap: 1.4,
  nodes: [
    ...boardBase("ec03", 11.4, 8.1, "energy"),
    n("ec03-gen-chip", "chip", { x: -3.5, y: 2.1, z: -0.8 }, { processRole: "input", params: { width: 1.7, depth: 1.2, height: 0.32, pins: 8 } }),
    n("ec03-reactor", "electrode-stack", { x: -1.2, y: 2.08, z: -0.16 }, { processRole: "transform", params: { width: 1.7, depth: 0.95, count: 6 } }),
    n("ec03-store-a", "tank-horizontal", { x: 1.5, y: 2.05, z: -0.72 }, { processRole: "storage", params: { radius: 0.34, height: 2.1 }, rotation: { x: 0, y: 0, z: 90 } }),
    n("ec03-store-b", "tank-horizontal", { x: 1.8, y: 2.02, z: 0.74 }, { processRole: "storage", params: { radius: 0.34, height: 2.1 }, rotation: { x: 0, y: 0, z: 90 } }),
    n("ec03-fuel-cell", "chip", { x: 4.1, y: 2.06, z: 0.15 }, { processRole: "output", params: { width: 1.55, depth: 1.16, height: 0.3, pins: 10 } }),
    n("ec03-grid-out", "chiplet", { x: 5.35, y: 2.02, z: 0.18 }, { processRole: "output", params: { width: 0.92, depth: 0.7, height: 0.24, pins: 6 } }),
    n("ec03-water-return", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.07,
        routePlaneY: 1.56,
        routeLayer: 3,
        axisPreference: "z-first",
        points: [
          { x: 4.0, y: 1.96, z: 0.2 },
          { x: 2.3, y: 1.4, z: 0.85 },
          { x: -0.8, y: 1.35, z: 0.6 },
          { x: -3.2, y: 1.9, z: 0.1 },
        ],
        portRefs: [
          { nodeId: "ec03-fuel-cell", portId: "left" },
          { nodeId: "ec03-gen-chip", portId: "left" },
        ],
      },
    }),
    n("ec03-loop-1", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.09,
        routePlaneY: 2.08,
        routeLayer: 1,
        axisPreference: "x-first",
        points: [
          { x: -3.35, y: 2.08, z: -0.75 },
          { x: -2.4, y: 2.12, z: -0.48 },
          { x: -1.2, y: 2.09, z: -0.15 },
        ],
        portRefs: [
          { nodeId: "ec03-gen-chip", portId: "right" },
          { nodeId: "ec03-reactor", portId: "left" },
        ],
      },
    }),
    n("ec03-loop-2", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.09,
        routePlaneY: 2.05,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [
          { x: -0.35, y: 2.05, z: -0.16 },
          { x: 0.8, y: 2.05, z: -0.44 },
          { x: 1.55, y: 2.05, z: -0.68 },
          { x: 1.82, y: 2.03, z: 0.7 },
          { x: 3.0, y: 2.05, z: 0.42 },
          { x: 4.0, y: 2.06, z: 0.17 },
        ],
        portRefs: [
          { nodeId: "ec03-reactor", portId: "right" },
          { nodeId: "ec03-fuel-cell", portId: "left" },
        ],
      },
    }),
    n("ec03-out-bus", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.55,
        routePlaneY: 2.0,
        routeLayer: 4,
        axisPreference: "x-first",
        points: [
          { x: 4.2, y: 2.08, z: 0.18 },
          { x: 4.8, y: 1.82, z: 0.18 },
        ],
        portRefs: [
          { nodeId: "ec03-fuel-cell", portId: "right" },
          { nodeId: "ec03-grid-out", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("ec03-flow-main", "energy-flow", ["ec03-loop-1", "ec03-loop-2"], { durationMs: 1900 }),
    a("ec03-storage", "charge-cycle", ["ec03-store-a", "ec03-store-b"], { durationMs: 3000 }),
    a("ec03-return", "network-pulse", ["ec03-water-return"], { durationMs: 2500 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "ec03-l1", text: "Plasmonic generation controller", at: { x: -3.45, y: 2.08, z: -0.8 }, targetNodeId: "ec03-gen-chip", targetPortId: "right", anchorBias: "left", priority: 2 },
      { id: "ec03-l2", text: "Hydrogen storage pair", at: { x: 1.7, y: 2.03, z: 0 }, targetNodeId: "ec03-store-a", targetPortId: "right", anchorBias: "right", priority: 3 },
      { id: "ec03-l3", text: "Fuel-cell power conversion", at: { x: 4.05, y: 2.05, z: 0.15 }, targetNodeId: "ec03-fuel-cell", targetPortId: "right", anchorBias: "right", priority: 2 },
      { id: "ec03-l4", text: "Water return branch", at: { x: 2.1, y: 1.48, z: 0.83 }, targetNodeId: "ec03-water-return", targetPortId: "left", anchorBias: "left", priority: 1 },
    ],
    leaders: [],
    equations: [{ id: "ec03-eq", latexLike: "2H2 + O2 -> 2H2O + electricity + heat", at: { x: 0, y: -1.3, z: 0 } }],
    legend: ["Closed-loop concept diagram", "Connector routes map process flow"],
  },
});

const ec04 = makeScene({
  id: "ec-04-plasmonic-orb-resonance-field",
  title: "Plasmonic Orb Resonance Field",
  concept: "energy-creation",
  description: "Orb-packed catalyst field with resonant neck focusing and hydrogen output branch.",
  scientificNotes:
    "This scene is a conceptual structural analog of plasmonic field amplification: incident energy concentrates through a necked orb lattice before routed output.",
  laneTemplate: "board-radial",
  laneGap: 1.52,
  minOccupancy: 0.82,
  subjectNodeIds: ["ec04-wave", "ec04-focal-orb", "ec04-canopy-crown", "ec04-output-manifold", "ec04-h2-node"],
  nodes: [
    ...buildOrbGrid({
      idPrefix: "ec04-floor",
      center: { x: 0, y: 3.38, z: 0.06 },
      rows: 15,
      cols: 21,
      spacing: 0.52,
      radius: 8.2,
      palette: ["#A95D22", "#B86B2A", "#C87B2F", "#8E4A19"],
      processRole: "substrate",
      processGroup: "catalyst-field",
      renderPriority: -34,
      yWobble: 0.035,
      highlightEvery: 17,
    }),
    ...buildOrbGrid({
      idPrefix: "ec04-floor-mid",
      center: { x: 0.14, y: 2.94, z: 0.3 },
      rows: 11,
      cols: 15,
      spacing: 0.56,
      radius: 7.4,
      palette: ["#CC8A3A", "#BC7730", "#E1AA58", "#A55F24"],
      processRole: "transform",
      processGroup: "floating-field",
      renderPriority: -26,
      yWobble: 0.04,
      highlightEvery: 9,
    }),
    ...buildOrbCanopy({
      idPrefix: "ec04-canopy",
      center: { x: 0.18, y: 0.82, z: 0.04 },
      radius: 2.8,
      layers: 6,
      depth: 1.56,
      orbRadius: 8.8,
      palette: ["#B36426", "#C2712B", "#D48533", "#9A541F"],
      processRole: "transform",
      processGroup: "resonance",
      renderPriority: -4,
    }),
    ...buildOrbRing({
      idPrefix: "ec04-neck-l1",
      center: { x: 0.18, y: 2.74, z: 0.04 },
      ringRadius: 1.25,
      count: 16,
      radius: 7.8,
      palette: ["#DDAE58", "#E6C678", "#D8A255", "#C88940"],
      processRole: "transform",
      processGroup: "neck",
      renderPriority: -8,
    }),
    ...buildOrbRing({
      idPrefix: "ec04-neck-l2",
      center: { x: 0.18, y: 2.44, z: 0.04 },
      ringRadius: 1.02,
      count: 14,
      radius: 7.6,
      palette: ["#E4B966", "#EDCF88", "#DAA456", "#CA8A41"],
      processRole: "transform",
      processGroup: "neck",
      renderPriority: -6,
    }),
    ...buildOrbRing({
      idPrefix: "ec04-neck-l3",
      center: { x: 0.18, y: 2.14, z: 0.04 },
      ringRadius: 0.78,
      count: 12,
      radius: 7.2,
      palette: ["#F0CF86", "#E8C071", "#D89E4D", "#C88735"],
      processRole: "transform",
      processGroup: "neck",
      renderPriority: -4,
    }),
    ...buildOrbRing({
      idPrefix: "ec04-neck-l4",
      center: { x: 0.18, y: 1.84, z: 0.04 },
      ringRadius: 0.58,
      count: 10,
      radius: 6.8,
      palette: ["#F5D594", "#EDC677", "#DFA859", "#CF913E"],
      processRole: "transform",
      processGroup: "neck",
      renderPriority: -2,
    }),
    ...Array.from({ length: 8 }, (_, i) =>
      orbNode(
        `ec04-neck-core-${i}`,
        { x: 0.18, y: 2.9 - i * 0.27, z: 0.04 },
        {
          radius: 7.0 - i * 0.2,
          color: i < 4 ? "#F0D28A" : "#E3B963",
          highlight: i % 2 === 0,
          processRole: "transform",
          processGroup: "focal-column",
          renderPriority: 2,
        }
      )
    ),
    ...buildOrbCanopy({
      idPrefix: "ec04-satellite-left",
      center: { x: -4.45, y: 1.94, z: 2.18 },
      radius: 1.18,
      layers: 4,
      depth: 0.8,
      orbRadius: 6.6,
      palette: ["#D6B073", "#C99D62", "#B7864F"],
      processRole: "transform",
      processGroup: "ambient-field",
      renderPriority: -24,
    }),
    ...buildOrbCanopy({
      idPrefix: "ec04-satellite-right",
      center: { x: 4.58, y: 2.08, z: 2.28 },
      radius: 1.24,
      layers: 4,
      depth: 0.84,
      orbRadius: 6.4,
      palette: ["#D8B57F", "#CBA066", "#BD8B52"],
      processRole: "transform",
      processGroup: "ambient-field",
      renderPriority: -22,
    }),
    n("ec04-wave", "wavefront", { x: -5.15, y: 1.95, z: -0.2 }, {
      processRole: "input",
      processGroup: "input-wave",
      params: { radius: 1.15, lines: 6 },
      renderPriority: 6,
    }),
    n("ec04-feed-chip", "chiplet", { x: -4.12, y: 2.16, z: -0.66 }, {
      processRole: "input",
      processGroup: "control",
      params: { width: 0.96, depth: 0.72, height: 0.22, pins: 6 },
      renderPriority: 8,
    }),
    orbNode("ec04-focal-orb", { x: 0.18, y: 2.06, z: 0.04 }, {
      radius: 11.6,
      color: "#F3D48C",
      highlight: true,
      processRole: "transform",
      processGroup: "focal",
      renderPriority: 10,
    }),
    n("ec04-output-manifold", "manifold", { x: 3.6, y: 2.02, z: 0.66 }, {
      processRole: "output",
      processGroup: "manifold",
      params: { width: 1.25, height: 0.7, depth: 0.95, bevel: 0.08 },
      renderPriority: 12,
    }),
    n("ec04-h2-node", "tank-horizontal", { x: 5.25, y: 1.98, z: 0.88 }, {
      processRole: "storage",
      processGroup: "hydrogen",
      params: { radius: 0.36, height: 2.06 },
      rotation: { x: 0, y: 0, z: 90 },
      renderPriority: 11,
    }),
    n("ec04-telemetry", "chiplet", { x: 4.62, y: 2.22, z: -0.98 }, {
      processRole: "telemetry",
      processGroup: "telemetry",
      params: { width: 0.92, depth: 0.72, height: 0.22, pins: 6 },
      renderPriority: 11,
    }),
    n("ec04-feed-link", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "input-flow",
      params: {
        radius: 0.08,
        routePlaneY: 2.08,
        routeLayer: 1,
        axisPreference: "x-first",
        keepWaypoints: false,
        points: [
          { x: -4.02, y: 2.16, z: -0.66 },
          { x: -2.4, y: 2.22, z: -0.34 },
          { x: -1.0, y: 2.14, z: -0.08 },
          { x: 0.05, y: 2.08, z: 0.02 },
        ],
        portRefs: [
          { nodeId: "ec04-feed-chip", portId: "right" },
          { nodeId: "ec04-focal-orb", portId: "left" },
        ],
      },
      renderPriority: 9,
    }),
    n("ec04-output-link", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "output-flow",
      params: {
        radius: 0.09,
        routePlaneY: 2.02,
        routeLayer: 2,
        axisPreference: "x-first",
        keepWaypoints: false,
        points: [
          { x: 0.42, y: 2.03, z: 0.04 },
          { x: 1.68, y: 2.02, z: 0.24 },
          { x: 2.85, y: 2.02, z: 0.45 },
          { x: 3.54, y: 2.02, z: 0.66 },
          { x: 5.12, y: 1.98, z: 0.86 },
        ],
        portRefs: [
          { nodeId: "ec04-focal-orb", portId: "right" },
          { nodeId: "ec04-h2-node", portId: "left" },
        ],
      },
      renderPriority: 10,
    }),
    n("ec04-telemetry-link", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "telemetry-flow",
      params: {
        width: 1.45,
        routePlaneY: 2.16,
        routeLayer: 3,
        axisPreference: "z-first",
        keepWaypoints: false,
        points: [
          { x: 2.85, y: 2.05, z: 0.4 },
          { x: 3.84, y: 2.16, z: -0.02 },
          { x: 4.54, y: 2.2, z: -0.92 },
        ],
        portRefs: [
          { nodeId: "ec04-output-manifold", portId: "right" },
          { nodeId: "ec04-telemetry", portId: "left" },
        ],
      },
      renderPriority: 10,
    }),
  ],
  animations: [
    a("ec04-anim-wave", "energy-flow", ["ec04-wave", "ec04-feed-link"], { durationMs: 1800, timeline: "energy-flow" }),
    a("ec04-anim-focal", "reaction-split", ["ec04-focal-orb", "ec04-canopy-crown"], { durationMs: 2400 }),
    a("ec04-anim-out", "network-pulse", ["ec04-output-link", "ec04-telemetry-link", "ec04-h2-node"], { durationMs: 2100 }),
  ],
  annotations: {
    visible: true,
    labels: [
      {
        id: "ec04-l1",
        text: "Orb-packed catalyst field (floating lattice)",
        at: { x: 0, y: 3.34, z: 0.22 },
        targetNodeId: "ec04-floor-r7-c10",
        targetPortId: "top",
        anchorBias: "left",
        priority: 3,
      },
      {
        id: "ec04-l2",
        text: "Resonance neck concentrates field",
        at: { x: 0.18, y: 2.1, z: 0.04 },
        targetNodeId: "ec04-focal-orb",
        targetPortId: "top",
        anchorBias: "right",
        priority: 3,
      },
      {
        id: "ec04-l3",
        text: "Canopy plasmonic envelope",
        at: { x: 0.2, y: 0.92, z: 0.02 },
        targetNodeId: "ec04-canopy-crown",
        targetPortId: "top",
        anchorBias: "right",
        priority: 2,
      },
      {
        id: "ec04-l4",
        text: "Hydrogen-ready output branch",
        at: { x: 4.95, y: 2.0, z: 0.84 },
        targetNodeId: "ec04-h2-node",
        targetPortId: "right",
        anchorBias: "right",
        priority: 2,
      },
    ],
    leaders: [],
    equations: [],
    legend: ["Structural depiction is conceptual", "Orb lattice represents nanostructured plasmonic field geometry"],
  },
});

const ec05 = makeScene({
  id: "ec-05-multimodal-orb-constellation",
  title: "Multimodal Orb Constellation",
  concept: "energy-creation",
  description: "Hex-linked domains around a plasmonic core with routed multimodal branches.",
  scientificNotes:
    "Conceptual map of six coupled capability domains around a plasmonic central node. Structural links communicate modality coupling, not literal apparatus.",
  laneTemplate: "board-radial",
  laneGap: 1.46,
  minOccupancy: 0.84,
  subjectNodeIds: [
    "ec05-core",
    "ec05-domain-plasmonics",
    "ec05-domain-imaging",
    "ec05-domain-nanofab",
    "ec05-domain-microfluidics",
    "ec05-domain-sensors",
    "ec05-domain-spectroscopy",
  ],
  nodes: [
    orbNode("ec05-core", { x: 0, y: 1.95, z: 0 }, {
      radius: 13.4,
      color: "#1B1712",
      strokeColor: "#6A5A45",
      highlight: true,
      ringColor: "#C6A060",
      processRole: "transform",
      processGroup: "core",
      renderPriority: 8,
    }),
    n("ec05-core-ring", "ring", { x: 0, y: 2.02, z: 0 }, {
      processRole: "transform",
      processGroup: "core",
      renderPriority: 7,
      params: { radius: 1.08, band: 0.24, lift: 0.09 },
    }),

    orbNode("ec05-domain-plasmonics", { x: -1.2, y: 2.02, z: -1.85 }, {
      radius: 10.8,
      color: "#20A5CC",
      highlight: true,
      processRole: "transform",
      processGroup: "domain",
      renderPriority: 9,
    }),
    orbNode("ec05-domain-imaging", { x: 1.25, y: 2.0, z: -1.8 }, {
      radius: 10.6,
      color: "#2E9A56",
      highlight: true,
      processRole: "transform",
      processGroup: "domain",
      renderPriority: 9,
    }),
    orbNode("ec05-domain-nanofab", { x: 2.7, y: 2.02, z: -0.15 }, {
      radius: 10.8,
      color: "#D2B13D",
      highlight: true,
      processRole: "transform",
      processGroup: "domain",
      renderPriority: 9,
    }),
    orbNode("ec05-domain-microfluidics", { x: 1.35, y: 2.03, z: 1.7 }, {
      radius: 10.9,
      color: "#BF3EA1",
      highlight: true,
      processRole: "transform",
      processGroup: "domain",
      renderPriority: 9,
    }),
    orbNode("ec05-domain-sensors", { x: -1.25, y: 2.05, z: 1.72 }, {
      radius: 10.7,
      color: "#4B55B5",
      highlight: true,
      processRole: "transform",
      processGroup: "domain",
      renderPriority: 9,
    }),
    orbNode("ec05-domain-spectroscopy", { x: -2.68, y: 2.02, z: 0.04 }, {
      radius: 10.7,
      color: "#C6453D",
      highlight: true,
      processRole: "transform",
      processGroup: "domain",
      renderPriority: 9,
    }),

    n("ec05-panel-top-left", "box", { x: -2.55, y: 1.18, z: -3.95 }, {
      processRole: "input",
      processGroup: "panel",
      params: { width: 1.8, height: 0.44, depth: 1.05, bevel: 0.12, panelInset: 0.14, showPanelDetail: true },
      renderPriority: 3,
    }),
    n("ec05-panel-top-right", "box", { x: 2.62, y: 1.2, z: -3.88 }, {
      processRole: "input",
      processGroup: "panel",
      params: { width: 1.9, height: 0.44, depth: 1.05, bevel: 0.12, panelInset: 0.14, showPanelDetail: true },
      renderPriority: 3,
    }),
    n("ec05-panel-right", "box", { x: 5.32, y: 2.06, z: -0.02 }, {
      processRole: "input",
      processGroup: "panel",
      params: { width: 1.66, height: 0.46, depth: 1.08, bevel: 0.12, panelInset: 0.12, showPanelDetail: true },
      renderPriority: 3,
    }),
    n("ec05-panel-bottom-right", "box", { x: 2.7, y: 2.86, z: 3.56 }, {
      processRole: "input",
      processGroup: "panel",
      params: { width: 1.92, height: 0.46, depth: 1.08, bevel: 0.12, panelInset: 0.12, showPanelDetail: true },
      renderPriority: 3,
    }),
    n("ec05-panel-bottom-left", "box", { x: -2.76, y: 2.86, z: 3.56 }, {
      processRole: "input",
      processGroup: "panel",
      params: { width: 1.92, height: 0.46, depth: 1.08, bevel: 0.12, panelInset: 0.12, showPanelDetail: true },
      renderPriority: 3,
    }),
    n("ec05-panel-left", "box", { x: -5.18, y: 2.03, z: 0.08 }, {
      processRole: "input",
      processGroup: "panel",
      params: { width: 1.66, height: 0.46, depth: 1.08, bevel: 0.12, panelInset: 0.12, showPanelDetail: true },
      renderPriority: 3,
    }),

    n("ec05-link-core-plasmonics", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "core-links",
      params: { points: [{ x: 0, y: 1.98, z: 0 }, { x: -1.2, y: 2.01, z: -1.82 }], crossSection: 0.1, routeLayer: 1 },
      renderPriority: 6,
    }),
    n("ec05-link-core-imaging", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "core-links",
      params: { points: [{ x: 0, y: 1.98, z: 0 }, { x: 1.25, y: 2.0, z: -1.8 }], crossSection: 0.1, routeLayer: 1 },
      renderPriority: 6,
    }),
    n("ec05-link-core-nanofab", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "core-links",
      params: { points: [{ x: 0, y: 1.98, z: 0 }, { x: 2.68, y: 2.02, z: -0.15 }], crossSection: 0.1, routeLayer: 1 },
      renderPriority: 6,
    }),
    n("ec05-link-core-microfluidics", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "core-links",
      params: { points: [{ x: 0, y: 1.98, z: 0 }, { x: 1.34, y: 2.02, z: 1.68 }], crossSection: 0.1, routeLayer: 1 },
      renderPriority: 6,
    }),
    n("ec05-link-core-sensors", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "core-links",
      params: { points: [{ x: 0, y: 1.98, z: 0 }, { x: -1.24, y: 2.04, z: 1.7 }], crossSection: 0.1, routeLayer: 1 },
      renderPriority: 6,
    }),
    n("ec05-link-core-spectroscopy", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "core-links",
      params: { points: [{ x: 0, y: 1.98, z: 0 }, { x: -2.64, y: 2.02, z: 0.04 }], crossSection: 0.1, routeLayer: 1 },
      renderPriority: 6,
    }),

    n("ec05-link-plasmonics-panel", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "panel-links",
      params: { points: [{ x: -1.2, y: 2.02, z: -1.82 }, { x: -1.95, y: 1.82, z: -2.96 }, { x: -2.55, y: 1.28, z: -3.88 }], crossSection: 0.07, width: 1.5, routeLayer: 2 },
      renderPriority: 5,
    }),
    n("ec05-link-imaging-panel", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "panel-links",
      params: { points: [{ x: 1.25, y: 2.0, z: -1.8 }, { x: 1.9, y: 1.84, z: -2.9 }, { x: 2.62, y: 1.28, z: -3.84 }], crossSection: 0.07, width: 1.5, routeLayer: 2 },
      renderPriority: 5,
    }),
    n("ec05-link-nanofab-panel", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "panel-links",
      params: { points: [{ x: 2.68, y: 2.02, z: -0.14 }, { x: 4.0, y: 2.02, z: -0.1 }, { x: 5.22, y: 2.06, z: -0.02 }], crossSection: 0.07, width: 1.5, routeLayer: 2 },
      renderPriority: 5,
    }),
    n("ec05-link-microfluidics-panel", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "panel-links",
      params: { points: [{ x: 1.34, y: 2.03, z: 1.68 }, { x: 2.0, y: 2.38, z: 2.56 }, { x: 2.66, y: 2.8, z: 3.45 }], crossSection: 0.07, width: 1.5, routeLayer: 2 },
      renderPriority: 5,
    }),
    n("ec05-link-sensors-panel", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "panel-links",
      params: { points: [{ x: -1.24, y: 2.04, z: 1.7 }, { x: -1.95, y: 2.36, z: 2.58 }, { x: -2.72, y: 2.8, z: 3.45 }], crossSection: 0.07, width: 1.5, routeLayer: 2 },
      renderPriority: 5,
    }),
    n("ec05-link-spectroscopy-panel", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "connector",
      processGroup: "panel-links",
      params: { points: [{ x: -2.64, y: 2.02, z: 0.04 }, { x: -3.94, y: 2.02, z: 0.06 }, { x: -5.08, y: 2.04, z: 0.08 }], crossSection: 0.07, width: 1.5, routeLayer: 2 },
      renderPriority: 5,
    }),
  ],
  animations: [
    a("ec05-core-pulse", "network-pulse", ["ec05-core", "ec05-core-ring"], { durationMs: 2100 }),
    a("ec05-domain-flow", "energy-flow", [
      "ec05-link-core-plasmonics",
      "ec05-link-core-imaging",
      "ec05-link-core-nanofab",
      "ec05-link-core-microfluidics",
      "ec05-link-core-sensors",
      "ec05-link-core-spectroscopy",
    ], { durationMs: 2000 }),
    a("ec05-panel-links", "pulse", [
      "ec05-link-plasmonics-panel",
      "ec05-link-imaging-panel",
      "ec05-link-nanofab-panel",
      "ec05-link-microfluidics-panel",
      "ec05-link-sensors-panel",
      "ec05-link-spectroscopy-panel",
    ], { durationMs: 2400 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "ec05-l1", text: "Plasmonics", at: { x: -1.2, y: 2.02, z: -1.85 }, targetNodeId: "ec05-domain-plasmonics", anchorBias: "left", priority: 3 },
      { id: "ec05-l2", text: "Multimodal Imaging", at: { x: 1.25, y: 2.0, z: -1.8 }, targetNodeId: "ec05-domain-imaging", anchorBias: "right", priority: 3 },
      { id: "ec05-l3", text: "Nano + micro-fabrication", at: { x: 2.7, y: 2.02, z: -0.15 }, targetNodeId: "ec05-domain-nanofab", anchorBias: "right", priority: 2 },
      { id: "ec05-l4", text: "Microfluidics", at: { x: 1.35, y: 2.03, z: 1.7 }, targetNodeId: "ec05-domain-microfluidics", anchorBias: "right", priority: 2 },
      { id: "ec05-l5", text: "Sensors", at: { x: -1.25, y: 2.05, z: 1.72 }, targetNodeId: "ec05-domain-sensors", anchorBias: "left", priority: 2 },
      { id: "ec05-l6", text: "Spectroscopy", at: { x: -2.68, y: 2.02, z: 0.04 }, targetNodeId: "ec05-domain-spectroscopy", anchorBias: "left", priority: 2 },
      { id: "ec05-l7", text: "Plasmonic central coupling node", at: { x: 0, y: 1.95, z: 0 }, targetNodeId: "ec05-core", anchorBias: "right", priority: 3 },
    ],
    leaders: [],
    equations: [],
    legend: ["Domain coupling map is conceptual", "Connectors depict multimodal process links"],
  },
});

const ds01 = makeScene({
  id: "ds-01-microgrid-energy-data-stack",
  title: "Microgrid Energy and Data Stack",
  concept: "energy-data-storage",
  description: "Hub-and-spoke data and energy topology over shared board infrastructure.",
  scientificNotes: "Power and telemetry routing is represented as converging bus layers.",
  laneTemplate: "board-radial",
  laneGap: 1.44,
  nodes: [
    ...boardBase("ds01", 12.2, 8.6, "storage"),
    n("ds01-core", "chip", { x: 0, y: 2.02, z: 0 }, { processRole: "transform", params: { width: 1.7, depth: 1.4, pins: 12 } }),
    n("ds01-edge-a", "rack", { x: -4.0, y: 2.16, z: 1.6 }, { processRole: "input", params: { width: 1.2, height: 2.0, depth: 0.9, slots: 5 } }),
    n("ds01-edge-b", "rack", { x: -3.4, y: 2.1, z: -1.5 }, { processRole: "input", params: { width: 1.1, height: 1.9, depth: 0.9, slots: 5 } }),
    n("ds01-storage-a", "tank-horizontal", { x: 3.6, y: 2.15, z: 1.35 }, { processRole: "storage", params: { radius: 0.34, height: 2.2 }, rotation: { x: 0, y: 0, z: 90 } }),
    n("ds01-storage-b", "tank-horizontal", { x: 3.8, y: 2.05, z: -1.32 }, { processRole: "storage", params: { radius: 0.34, height: 2.2 }, rotation: { x: 0, y: 0, z: 90 } }),
    n("ds01-output", "chip", { x: 5.2, y: 2.1, z: 0.05 }, { processRole: "output", params: { width: 1.26, depth: 0.95, pins: 8 } }),
    n("ds01-telemetry", "chiplet", { x: 4.8, y: 2.3, z: -1.95 }, { processRole: "telemetry", params: { width: 0.88, depth: 0.68, pins: 6 } }),
    n("ds01-ring", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.08,
        routePlaneY: 2.08,
        routeLayer: 2,
        axisPreference: "z-first",
        points: [
          { x: -3.8, y: 2.12, z: 1.5 },
          { x: -1.6, y: 2.06, z: 1.9 },
          { x: 0.6, y: 2.02, z: 1.4 },
          { x: 3.1, y: 2.08, z: 1.25 },
          { x: 5.0, y: 2.08, z: 0.05 },
          { x: 3.3, y: 2.08, z: -1.38 },
          { x: 0.6, y: 2.02, z: -1.55 },
          { x: -1.9, y: 2.05, z: -1.75 },
          { x: -3.4, y: 2.08, z: -1.5 },
        ],
        portRefs: [
          { nodeId: "ds01-edge-a", portId: "right" },
          { nodeId: "ds01-edge-b", portId: "right" },
        ],
      },
    }),
    n("ds01-spoke-a", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.6,
        routePlaneY: 2.06,
        routeLayer: 1,
        axisPreference: "x-first",
        points: [{ x: -0.1, y: 2.02, z: 0.05 }, { x: -3.85, y: 2.12, z: 1.53 }],
        portRefs: [
          { nodeId: "ds01-core", portId: "left" },
          { nodeId: "ds01-edge-a", portId: "right" },
        ],
      },
    }),
    n("ds01-spoke-b", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.6,
        routePlaneY: 2.06,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [{ x: -0.1, y: 2.02, z: -0.05 }, { x: -3.4, y: 2.08, z: -1.5 }],
        portRefs: [
          { nodeId: "ds01-core", portId: "left" },
          { nodeId: "ds01-edge-b", portId: "right" },
        ],
      },
    }),
    n("ds01-spoke-c", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.6,
        routePlaneY: 2.08,
        routeLayer: 3,
        axisPreference: "x-first",
        points: [{ x: 0.2, y: 2.02, z: 0.05 }, { x: 3.6, y: 2.14, z: 1.33 }],
        portRefs: [
          { nodeId: "ds01-core", portId: "right" },
          { nodeId: "ds01-storage-a", portId: "left" },
        ],
      },
    }),
    n("ds01-spoke-d", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.6,
        routePlaneY: 2.08,
        routeLayer: 4,
        axisPreference: "x-first",
        points: [{ x: 0.2, y: 2.02, z: -0.05 }, { x: 3.84, y: 2.04, z: -1.33 }],
        portRefs: [
          { nodeId: "ds01-core", portId: "right" },
          { nodeId: "ds01-storage-b", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("ds01-network", "network-pulse", ["ds01-ring", "ds01-spoke-a", "ds01-spoke-b", "ds01-spoke-c", "ds01-spoke-d"], { durationMs: 2000 }),
    a("ds01-charge", "charge-cycle", ["ds01-storage-a", "ds01-storage-b"], { durationMs: 2800 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "ds01-l1", text: "Microgrid edge inputs", at: { x: -3.7, y: 2.1, z: 0 }, targetNodeId: "ds01-edge-a", targetPortId: "right", anchorBias: "left", priority: 2 },
      { id: "ds01-l2", text: "Energy + data orchestration core", at: { x: 0, y: 2.0, z: 0 }, targetNodeId: "ds01-core", targetPortId: "top", anchorBias: "left", priority: 3 },
      { id: "ds01-l3", text: "Dual storage buffers", at: { x: 3.7, y: 2.1, z: 0.2 }, targetNodeId: "ds01-storage-a", targetPortId: "left", anchorBias: "right", priority: 2 },
      { id: "ds01-l4", text: "Output and telemetry handoff", at: { x: 5.0, y: 2.13, z: -0.4 }, targetNodeId: "ds01-output", targetPortId: "left", anchorBias: "right", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Hub-and-spoke board topology", "Pulse paths represent active routes"],
  },
});

const ds02 = makeScene({
  id: "ds-02-redundant-storage-cluster",
  title: "Redundant Storage Cluster",
  concept: "energy-data-storage",
  description: "Quorum cluster layout with redundant stores and independent failover buses.",
  scientificNotes: "Highlights resilience via independent ring and diagonal failover routes.",
  laneTemplate: "board-radial",
  laneGap: 1.46,
  nodes: [
    ...boardBase("ds02", 11.8, 8.4, "storage"),
    n("ds02-core", "chip", { x: 0, y: 2.04, z: 0 }, { processRole: "transform", params: { width: 1.55, depth: 1.2, pins: 12 } }),
    n("ds02-cluster-a", "rack", { x: -3.6, y: 2.15, z: -1.45 }, { processRole: "input", params: { width: 1.0, height: 1.8, depth: 0.85, slots: 4 } }),
    n("ds02-cluster-b", "rack", { x: -2.0, y: 2.1, z: 1.95 }, { processRole: "input", params: { width: 1.0, height: 1.8, depth: 0.85, slots: 4 } }),
    n("ds02-cluster-c", "rack", { x: 2.3, y: 2.12, z: 1.88 }, { processRole: "storage", params: { width: 1.0, height: 1.8, depth: 0.85, slots: 4 } }),
    n("ds02-cluster-d", "rack", { x: 3.8, y: 2.08, z: -1.35 }, { processRole: "storage", params: { width: 1.0, height: 1.8, depth: 0.85, slots: 4 } }),
    n("ds02-quorum", "chiplet", { x: 5.1, y: 2.2, z: 0.05 }, { processRole: "output", params: { width: 1.0, depth: 0.72, pins: 6 } }),
    n("ds02-ring-main", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.08,
        routePlaneY: 2.09,
        routeLayer: 2,
        axisPreference: "z-first",
        points: [
          { x: -3.55, y: 2.12, z: -1.42 },
          { x: -2.08, y: 2.08, z: 1.91 },
          { x: 2.24, y: 2.1, z: 1.84 },
          { x: 3.75, y: 2.08, z: -1.3 },
          { x: -3.55, y: 2.12, z: -1.42 },
        ],
        portRefs: [
          { nodeId: "ds02-cluster-a", portId: "right" },
          { nodeId: "ds02-cluster-d", portId: "left" },
        ],
      },
    }),
    n("ds02-failover-a", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.55,
        routePlaneY: 2.1,
        routeLayer: 3,
        axisPreference: "x-first",
        points: [{ x: -3.55, y: 2.12, z: -1.42 }, { x: 2.24, y: 2.1, z: 1.84 }],
        portRefs: [
          { nodeId: "ds02-cluster-a", portId: "right" },
          { nodeId: "ds02-cluster-c", portId: "left" },
        ],
      },
    }),
    n("ds02-failover-b", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.55,
        routePlaneY: 2.1,
        routeLayer: 4,
        axisPreference: "x-first",
        points: [{ x: -2.08, y: 2.08, z: 1.91 }, { x: 3.75, y: 2.08, z: -1.3 }],
        portRefs: [
          { nodeId: "ds02-cluster-b", portId: "right" },
          { nodeId: "ds02-cluster-d", portId: "left" },
        ],
      },
    }),
    n("ds02-core-out", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.8,
        routePlaneY: 2.12,
        routeLayer: 1,
        axisPreference: "x-first",
        points: [{ x: 0, y: 2.04, z: 0 }, { x: 5.0, y: 2.18, z: 0.05 }],
        portRefs: [
          { nodeId: "ds02-core", portId: "right" },
          { nodeId: "ds02-quorum", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("ds02-main-ring", "network-pulse", ["ds02-ring-main"], { durationMs: 2000 }),
    a("ds02-failover", "energy-flow", ["ds02-failover-a", "ds02-failover-b"], { durationMs: 2400 }),
    a("ds02-core", "charge-cycle", ["ds02-core", "ds02-quorum"], { durationMs: 2800 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "ds02-l1", text: "Primary redundant cluster ring", at: { x: 0.5, y: 2.08, z: 0.9 }, targetNodeId: "ds02-ring-main", targetPortId: "out", anchorBias: "left", priority: 3 },
      { id: "ds02-l2", text: "Diagonal failover rails", at: { x: -0.8, y: 2.1, z: 0.3 }, targetNodeId: "ds02-failover-a", targetPortId: "out", anchorBias: "left", priority: 2 },
      { id: "ds02-l3", text: "Quorum decision node", at: { x: 5.05, y: 2.2, z: 0.05 }, targetNodeId: "ds02-quorum", targetPortId: "left", anchorBias: "right", priority: 2 },
    ],
    leaders: [],
    equations: [],
    legend: ["Ring + diagonal redundancy", "Independent rails reduce single-point failure"],
  },
});

const ds03 = makeScene({
  id: "ds-03-containerized-storage-system",
  title: "Containerized Storage System",
  concept: "energy-data-storage",
  description: "Container modules with shared manifold and backplane traces for rapid deployment.",
  scientificNotes: "Container internals simplified while preserving module-to-backplane logic.",
  laneTemplate: "board-3lane",
  laneGap: 1.42,
  nodes: [
    ...boardBase("ds03", 12.4, 8.8, "storage"),
    n("ds03-input", "chip", { x: -3.8, y: 2.1, z: 0.7 }, { processRole: "input", params: { width: 1.45, depth: 1.0, pins: 8 } }),
    n("ds03-container-a", "box", { x: -0.9, y: 2.14, z: 1.35 }, { processRole: "transform", params: { width: 2.4, height: 1.25, depth: 1.45, panelInset: 0.14 } }),
    n("ds03-container-b", "box", { x: -0.7, y: 2.1, z: -1.32 }, { processRole: "transform", params: { width: 2.4, height: 1.25, depth: 1.45, panelInset: 0.14 } }),
    n("ds03-container-c", "box", { x: 1.9, y: 2.1, z: 0 }, { processRole: "storage", params: { width: 2.5, height: 1.3, depth: 1.55, panelInset: 0.14 } }),
    n("ds03-manifold", "manifold", { x: 2.8, y: 2.16, z: -1.2 }, { processRole: "storage", params: { width: 1.25, height: 0.75, depth: 1.0 } }),
    n("ds03-output", "chip", { x: 4.9, y: 2.1, z: -0.2 }, { processRole: "output", params: { width: 1.4, depth: 1.0, pins: 8 } }),
    n("ds03-telemetry", "chiplet", { x: 5.35, y: 2.35, z: 1.3 }, { processRole: "telemetry", params: { width: 0.92, depth: 0.72, pins: 6 } }),
    n("ds03-backplane", "bus", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        radius: 0.09,
        routePlaneY: 2.1,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [
          { x: -3.72, y: 2.1, z: 0.68 },
          { x: -1.4, y: 2.12, z: 0.92 },
          { x: -1.15, y: 2.11, z: -0.95 },
          { x: 1.8, y: 2.1, z: -0.2 },
          { x: 2.7, y: 2.14, z: -1.1 },
          { x: 4.85, y: 2.08, z: -0.2 },
        ],
        portRefs: [
          { nodeId: "ds03-input", portId: "right" },
          { nodeId: "ds03-output", portId: "left" },
        ],
      },
    }),
    n("ds03-telemetry-trace", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.4,
        routePlaneY: 2.24,
        routeLayer: 4,
        axisPreference: "x-first",
        points: [
          { x: 2.0, y: 2.06, z: 0.5 },
          { x: 3.45, y: 2.2, z: 0.9 },
          { x: 5.28, y: 2.32, z: 1.25 },
        ],
        portRefs: [
          { nodeId: "ds03-manifold", portId: "right" },
          { nodeId: "ds03-telemetry", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("ds03-backplane", "energy-flow", ["ds03-backplane"], { durationMs: 2000 }),
    a("ds03-containers", "charge-cycle", ["ds03-container-a", "ds03-container-b", "ds03-container-c"], { durationMs: 3200 }),
    a("ds03-telemetry", "network-pulse", ["ds03-telemetry-trace", "ds03-telemetry"], { durationMs: 2200 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "ds03-l1", text: "Container module bays", at: { x: -0.8, y: 2.1, z: 0.1 }, targetNodeId: "ds03-container-a", targetPortId: "front", anchorBias: "left", priority: 3 },
      { id: "ds03-l2", text: "Shared manifold + storage", at: { x: 2.6, y: 2.13, z: -0.8 }, targetNodeId: "ds03-manifold", targetPortId: "right", anchorBias: "right", priority: 2 },
      { id: "ds03-l3", text: "Backplane routes power and data", at: { x: 0.8, y: 2.12, z: -0.2 }, targetNodeId: "ds03-backplane", targetPortId: "out", anchorBias: "left", priority: 2 },
      { id: "ds03-l4", text: "Output + telemetry handoff", at: { x: 5.0, y: 2.2, z: 0.3 }, targetNodeId: "ds03-output", targetPortId: "left", anchorBias: "right", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Containerized module logic", "Backplane traces shown explicitly"],
  },
});

const sf01 = makeScene({
  id: "sf-01-seedling-root-initiation",
  title: "Saffron Seedling Root Initiation",
  concept: "saffron-growth",
  description: "Cross-section style seedling with corm, first petiole and root initiation lines.",
  scientificNotes:
    "Organic silhouette is intentionally expressive. Internal lines depict conceptual growth vectors, not literal microscopy.",
  laneTemplate: "organic-cross-section",
  laneGap: 1.3,
  minOccupancy: 0.86,
  subjectNodeIds: ["sf01-corm", "sf01-petiole", "sf01-leaf", "sf01-root-main", "sf01-root-secondary", "sf01-meristem-cells", "sf01-sensor-chip"],
  nodes: [
    ...boardBase("sf01", 9.5, 7.3, "organic"),
    n("sf01-corm", "cylinder", { x: 0, y: 2.15, z: 0.1 }, { processRole: "organic", params: { radius: 0.62, height: 0.88 } }),
    n("sf01-meristem-cells", "cell-cluster", { x: 1.22, y: 2.05, z: -0.62 }, {
      processRole: "organic",
      params: { rows: 2, cols: 3, spacing: 0.55, cellWidth: 0.46, cellHeight: 0.62, cellDepth: 0.34 },
      rotation: { x: 0, y: 0, z: -6 },
      scale: 0.96,
    }),
    n("sf01-petiole", "petiole", { x: -0.15, y: 1.55, z: 0.05 }, {
      processRole: "organic",
      params: {
        radius: 0.05,
        points: [
          { x: -0.05, y: 0.82, z: 0.1 },
          { x: -0.12, y: 0.3, z: 0.05 },
          { x: -0.18, y: -0.35, z: -0.06 },
          { x: -0.26, y: -1.2, z: -0.18 },
        ],
      },
    }),
    n("sf01-leaf", "leaf", { x: -0.22, y: 1.05, z: -0.16 }, {
      processRole: "organic",
      params: { width: 0.36, height: 1.58, curl: 0.31, asymmetry: 0.2, veins: 6 },
      rotation: { x: 0, y: 0, z: -14 },
    }),
    n("sf01-root-main", "root", { x: 0.1, y: 2.55, z: 0.1 }, {
      processRole: "organic",
      params: {
        width: 1.12,
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 0.26, y: 0.52, z: 0.1 },
          { x: 0.44, y: 1.18, z: 0.24 },
        ],
        branch1: [
          { x: 0.1, y: 0.36, z: 0.08 },
          { x: -0.25, y: 0.8, z: -0.08 },
        ],
      },
    }),
    n("sf01-root-secondary", "root", { x: -0.2, y: 2.52, z: -0.05 }, {
      processRole: "organic",
      params: {
        width: 0.95,
        points: [
          { x: 0, y: 0, z: 0 },
          { x: -0.2, y: 0.48, z: -0.1 },
          { x: -0.58, y: 1.02, z: -0.22 },
        ],
      },
    }),
    n("sf01-sensor-chip", "chiplet", { x: 2.9, y: 2.2, z: 0.8 }, { processRole: "telemetry", params: { width: 0.86, depth: 0.68, pins: 5 } }),
    n("sf01-sense-trace", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.25,
        routePlaneY: 2.28,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [{ x: 0.7, y: 2.35, z: 0.2 }, { x: 1.9, y: 2.3, z: 0.46 }, { x: 2.82, y: 2.2, z: 0.76 }],
        portRefs: [
          { nodeId: "sf01-root-main", portId: "tip" },
          { nodeId: "sf01-sensor-chip", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("sf01-growth", "growth-wave", ["sf01-petiole", "sf01-leaf", "sf01-root-main", "sf01-root-secondary"], {
      durationMs: 4200,
      timeline: "growth-wave",
    }),
    a("sf01-signal", "network-pulse", ["sf01-sense-trace", "sf01-sensor-chip"], { durationMs: 2500 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "sf01-l1", text: "Corm body", at: { x: 0, y: 2.14, z: 0.1 }, targetNodeId: "sf01-corm", targetPortId: "top", anchorBias: "left", priority: 2 },
      { id: "sf01-l2", text: "Early petiole emergence", at: { x: -0.2, y: 1.35, z: -0.03 }, targetNodeId: "sf01-petiole", targetPortId: "tip", anchorBias: "left", priority: 3 },
      { id: "sf01-l3", text: "Primary and secondary roots", at: { x: -0.05, y: 2.7, z: 0.05 }, targetNodeId: "sf01-root-main", targetPortId: "tip", anchorBias: "right", priority: 2 },
      { id: "sf01-l4", text: "Meristem-like cell packet", at: { x: 1.2, y: 2.04, z: -0.62 }, targetNodeId: "sf01-meristem-cells", anchorBias: "right", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Stage 1: initiation", "Organic contours are conceptual abstractions"],
  },
});

const sf02 = makeScene({
  id: "sf-02-vegetative-structure",
  title: "Saffron Vegetative Structure",
  concept: "saffron-growth",
  description: "Vegetative stage with multi-leaf fan and expanding fibrous root architecture.",
  scientificNotes: "Leaf fan is stylized from botanical silhouette references and converted to parametric wireframe forms.",
  laneTemplate: "organic-cross-section",
  laneGap: 1.36,
  minOccupancy: 0.86,
  subjectNodeIds: ["sf02-corm", "sf02-leaf-a", "sf02-leaf-b", "sf02-leaf-c", "sf02-leaf-d", "sf02-root-fan-a", "sf02-tissue-band"],
  nodes: [
    ...boardBase("sf02", 10.2, 7.6, "organic"),
    n("sf02-corm", "cylinder", { x: 0.08, y: 2.2, z: 0.05 }, { processRole: "organic", params: { radius: 0.58, height: 0.82 } }),
    n("sf02-tissue-band", "cell-cluster", { x: -1.9, y: 2.08, z: -0.74 }, {
      processRole: "organic",
      params: { rows: 3, cols: 4, spacing: 0.48, cellWidth: 0.4, cellHeight: 0.58, cellDepth: 0.28 },
      rotation: { x: 0, y: 0, z: -8 },
      scale: 0.94,
    }),
    n("sf02-leaf-a", "leaf", { x: -1.1, y: 1.1, z: 0.35 }, { processRole: "organic", params: { width: 0.38, height: 2.05, curl: 0.28, asymmetry: 0.16, veins: 7 }, rotation: { x: 0, y: 0, z: -18 } }),
    n("sf02-leaf-b", "leaf", { x: -0.45, y: 0.9, z: 0.15 }, { processRole: "organic", params: { width: 0.35, height: 2.22, curl: 0.22, asymmetry: 0.12, veins: 7 }, rotation: { x: 0, y: 0, z: -7 } }),
    n("sf02-leaf-c", "leaf", { x: 0.35, y: 0.92, z: -0.12 }, { processRole: "organic", params: { width: 0.35, height: 2.18, curl: 0.2, asymmetry: -0.12, veins: 7 }, rotation: { x: 0, y: 0, z: 6 } }),
    n("sf02-leaf-d", "leaf", { x: 1.0, y: 1.08, z: -0.36 }, { processRole: "organic", params: { width: 0.38, height: 2.0, curl: 0.27, asymmetry: -0.17, veins: 7 }, rotation: { x: 0, y: 0, z: 17 } }),
    n("sf02-root-fan-a", "root", { x: -0.04, y: 2.58, z: 0.04 }, {
      processRole: "organic",
      params: {
        width: 1.2,
        points: [{ x: 0, y: 0, z: 0 }, { x: -0.36, y: 0.5, z: 0.14 }, { x: -1.0, y: 1.14, z: 0.24 }],
      },
    }),
    n("sf02-root-fan-b", "root", { x: 0.05, y: 2.55, z: -0.02 }, {
      processRole: "organic",
      params: {
        width: 1.16,
        points: [{ x: 0, y: 0, z: 0 }, { x: 0.33, y: 0.5, z: -0.11 }, { x: 0.95, y: 1.2, z: -0.28 }],
      },
    }),
    n("sf02-growth-chip", "chiplet", { x: 3.25, y: 2.24, z: -0.8 }, { processRole: "telemetry", params: { width: 0.88, depth: 0.65, pins: 5 } }),
    n("sf02-growth-trace", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.2,
        routePlaneY: 2.23,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [{ x: 0.45, y: 2.22, z: -0.16 }, { x: 1.72, y: 2.22, z: -0.45 }, { x: 3.15, y: 2.24, z: -0.8 }],
        portRefs: [
          { nodeId: "sf02-corm", portId: "right" },
          { nodeId: "sf02-growth-chip", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("sf02-growth-wave", "growth-wave", ["sf02-leaf-a", "sf02-leaf-b", "sf02-leaf-c", "sf02-leaf-d"], { durationMs: 5200 }),
    a("sf02-roots", "growth", ["sf02-root-fan-a", "sf02-root-fan-b"], { durationMs: 4200 }),
    a("sf02-signal", "network-pulse", ["sf02-growth-trace"], { durationMs: 2600 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "sf02-l1", text: "Leaf fan expansion", at: { x: 0.0, y: 1.0, z: 0.0 }, targetNodeId: "sf02-leaf-b", targetPortId: "tip", anchorBias: "left", priority: 3 },
      { id: "sf02-l2", text: "Fibrous root spread", at: { x: -0.02, y: 2.6, z: 0.0 }, targetNodeId: "sf02-root-fan-a", targetPortId: "tip", anchorBias: "right", priority: 2 },
      { id: "sf02-l3", text: "Growth telemetry trace", at: { x: 2.2, y: 2.2, z: -0.5 }, targetNodeId: "sf02-growth-trace", targetPortId: "out", anchorBias: "right", priority: 1 },
      { id: "sf02-l4", text: "Parenchyma-style tissue band", at: { x: -1.9, y: 2.07, z: -0.74 }, targetNodeId: "sf02-tissue-band", anchorBias: "left", priority: 1 },
    ],
    leaders: [],
    equations: [],
    legend: ["Stage 2: vegetative structure", "Hybrid traced contour + parametric internals"],
  },
});

const sf03 = makeScene({
  id: "sf-03-bloom-anatomy-harvest-view",
  title: "Saffron Bloom Anatomy and Harvest View",
  concept: "saffron-growth",
  description: "Bloom-stage anatomy with petals, filaments, stigmas and harvest-oriented focus points.",
  scientificNotes: "Stigma and filament geometry is stylized for legibility while preserving relative botanical logic.",
  laneTemplate: "organic-cross-section",
  laneGap: 1.36,
  minOccupancy: 0.86,
  subjectNodeIds: ["sf03-stem", "sf03-petal-a", "sf03-petal-b", "sf03-petal-c", "sf03-petal-d", "sf03-ovary-cell"],
  nodes: [
    ...boardBase("sf03", 10.4, 7.8, "organic"),
    n("sf03-stem", "petiole", { x: 0, y: 2.32, z: 0 }, {
      processRole: "organic",
      params: {
        radius: 0.075,
        points: [
          { x: 0, y: 1.2, z: 0 },
          { x: 0, y: 0.5, z: 0 },
          { x: 0, y: -0.2, z: 0 },
        ],
      },
    }),
    n("sf03-ovary-cell", "plant-cell", { x: -0.15, y: 2.15, z: 0.22 }, {
      processRole: "organic",
      params: { width: 0.86, height: 1.02, depth: 0.46, wallInset: 0.1, vacuoleScale: 0.52, nucleusScale: 0.2 },
      rotation: { x: 0, y: 0, z: -3 },
      scale: 0.92,
    }),
    n("sf03-petal-a", "petal", { x: -1.05, y: 1.2, z: 0.28 }, { processRole: "organic", params: { width: 0.63, height: 1.18, flare: 0.24 }, rotation: { x: 0, y: 0, z: -15 } }),
    n("sf03-petal-b", "petal", { x: -0.28, y: 0.9, z: 0.36 }, { processRole: "organic", params: { width: 0.6, height: 1.28, flare: 0.2 }, rotation: { x: 0, y: 0, z: -4 } }),
    n("sf03-petal-c", "petal", { x: 0.55, y: 0.9, z: -0.24 }, { processRole: "organic", params: { width: 0.6, height: 1.28, flare: 0.2 }, rotation: { x: 0, y: 0, z: 6 } }),
    n("sf03-petal-d", "petal", { x: 1.2, y: 1.2, z: -0.36 }, { processRole: "organic", params: { width: 0.63, height: 1.18, flare: 0.24 }, rotation: { x: 0, y: 0, z: 14 } }),
    n("sf03-filament-a", "filament", { x: -0.12, y: 1.58, z: 0.08 }, {
      processRole: "organic",
      params: { width: 0.9, points: [{ x: 0, y: 0, z: 0 }, { x: -0.18, y: 0.27, z: 0.05 }, { x: -0.42, y: 0.62, z: 0.16 }] },
    }),
    n("sf03-filament-b", "filament", { x: 0.1, y: 1.56, z: -0.06 }, {
      processRole: "organic",
      params: { width: 0.9, points: [{ x: 0, y: 0, z: 0 }, { x: 0.16, y: 0.24, z: -0.04 }, { x: 0.4, y: 0.58, z: -0.2 }] },
    }),
    n("sf03-harvest-chip", "chiplet", { x: 3.55, y: 2.22, z: 0.95 }, { processRole: "telemetry", params: { width: 0.94, depth: 0.72, pins: 6 } }),
    n("sf03-harvest-link", "pcb-trace", { x: 0, y: 0, z: 0 }, {
      processRole: "telemetry",
      params: {
        width: 1.35,
        routePlaneY: 1.96,
        routeLayer: 2,
        axisPreference: "x-first",
        points: [{ x: 0.28, y: 1.58, z: -0.04 }, { x: 1.55, y: 1.9, z: 0.44 }, { x: 3.48, y: 2.2, z: 0.92 }],
        portRefs: [
          { nodeId: "sf03-filament-a", portId: "tip" },
          { nodeId: "sf03-harvest-chip", portId: "left" },
        ],
      },
    }),
  ],
  animations: [
    a("sf03-bloom", "growth-wave", ["sf03-petal-a", "sf03-petal-b", "sf03-petal-c", "sf03-petal-d"], { durationMs: 5200 }),
    a("sf03-stigma", "pulse", ["sf03-filament-a", "sf03-filament-b"], { durationMs: 2200 }),
    a("sf03-harvest", "network-pulse", ["sf03-harvest-link", "sf03-harvest-chip"], { durationMs: 2400 }),
  ],
  annotations: {
    visible: true,
    labels: [
      { id: "sf03-l1", text: "Bloom petal envelope", at: { x: 0, y: 1.02, z: 0 }, targetNodeId: "sf03-petal-b", targetPortId: "tip", anchorBias: "left", priority: 2 },
      { id: "sf03-l2", text: "Filaments / stigma harvest target", at: { x: 0.0, y: 1.58, z: 0.02 }, targetNodeId: "sf03-filament-a", targetPortId: "tip", anchorBias: "right", priority: 3 },
      { id: "sf03-l3", text: "Harvest telemetry route", at: { x: 2.2, y: 1.95, z: 0.55 }, targetNodeId: "sf03-harvest-link", targetPortId: "out", anchorBias: "right", priority: 1 },
      { id: "sf03-l4", text: "Ovary cell section", at: { x: -0.15, y: 2.15, z: 0.22 }, targetNodeId: "sf03-ovary-cell", anchorBias: "left", priority: 2 },
    ],
    leaders: [],
    equations: [],
    legend: ["Stage 3: bloom anatomy", "Harvest line highlights stigma-centric flow"],
  },
});

const scenes = [ec01, ec02, ec03, ec04, ec05, ds01, ds02, ds03, sf01, sf02, sf03];

export const presetScenes: Record<string, SceneDocument> = Object.fromEntries(
  scenes.map((scene) => [scene.id, scene])
) as Record<string, SceneDocument>;

export const presetManifest: PresetManifest[] = [
  {
    presetId: "ec-01-plasmonic-array-field-focus",
    concept: "energy-creation",
    title: "Plasmonic Array Field Focus",
    sceneRef: "ec-01-plasmonic-array-field-focus",
    tags: ["plasmonic", "nanodisk", "field-focus"],
    scientificNotes: "Input wavefront focuses on catalyst array before routed output.",
  },
  {
    presetId: "ec-02-water-splitting-reaction",
    concept: "energy-creation",
    title: "Water Splitting Reaction",
    sceneRef: "ec-02-water-splitting-reaction",
    tags: ["electrode", "reaction", "h2-o2"],
    scientificNotes: "Electrode and manifold structure maps to 2H2O -> 2H2 + O2.",
  },
  {
    presetId: "ec-03-h2-storage-to-power-loop",
    concept: "energy-creation",
    title: "H2 Storage to Power Loop",
    sceneRef: "ec-03-h2-storage-to-power-loop",
    tags: ["storage", "fuel-cell", "loop"],
    scientificNotes: "Closed loop from generation through conversion and return branch.",
  },
  {
    presetId: "ec-04-plasmonic-orb-resonance-field",
    concept: "energy-creation",
    title: "Plasmonic Orb Resonance Field",
    sceneRef: "ec-04-plasmonic-orb-resonance-field",
    tags: ["orbs", "lattice", "plasmonic"],
    scientificNotes: "Orb lattice models field concentration and downstream hydrogen-ready flow.",
  },
  {
    presetId: "ec-05-multimodal-orb-constellation",
    concept: "energy-creation",
    title: "Multimodal Orb Constellation",
    sceneRef: "ec-05-multimodal-orb-constellation",
    tags: ["hex", "multimodal", "plasmonics"],
    scientificNotes: "Hex-linked domain map around a central plasmonic coupling core.",
  },
  {
    presetId: "ds-01-microgrid-energy-data-stack",
    concept: "energy-data-storage",
    title: "Microgrid Energy and Data Stack",
    sceneRef: "ds-01-microgrid-energy-data-stack",
    tags: ["microgrid", "hub-spoke", "data-energy"],
    scientificNotes: "Radial topology with shared orchestration core.",
  },
  {
    presetId: "ds-02-redundant-storage-cluster",
    concept: "energy-data-storage",
    title: "Redundant Storage Cluster",
    sceneRef: "ds-02-redundant-storage-cluster",
    tags: ["redundancy", "failover", "cluster"],
    scientificNotes: "Independent ring and diagonal failover routes.",
  },
  {
    presetId: "ds-03-containerized-storage-system",
    concept: "energy-data-storage",
    title: "Containerized Storage System",
    sceneRef: "ds-03-containerized-storage-system",
    tags: ["container", "backplane", "modular"],
    scientificNotes: "Container modules with explicit backplane connectivity.",
  },
  {
    presetId: "sf-01-seedling-root-initiation",
    concept: "saffron-growth",
    title: "Saffron Seedling Root Initiation",
    sceneRef: "sf-01-seedling-root-initiation",
    tags: ["saffron", "seedling", "roots"],
    scientificNotes: "Stage 1 with corm, petiole, and first root emergence.",
  },
  {
    presetId: "sf-02-vegetative-structure",
    concept: "saffron-growth",
    title: "Saffron Vegetative Structure",
    sceneRef: "sf-02-vegetative-structure",
    tags: ["saffron", "vegetative", "leaf-fan"],
    scientificNotes: "Stage 2 leaf fan and fibrous root expansion.",
  },
  {
    presetId: "sf-03-bloom-anatomy-harvest-view",
    concept: "saffron-growth",
    title: "Saffron Bloom Anatomy and Harvest View",
    sceneRef: "sf-03-bloom-anatomy-harvest-view",
    tags: ["saffron", "bloom", "harvest"],
    scientificNotes: "Stage 3 bloom anatomy with stigma-focused callouts.",
  },
];

export function getSceneByPresetId(presetId: string): SceneDocument {
  const scene = presetScenes[presetId];
  if (!scene) {
    return ensureSceneV12(structuredClone(ec01));
  }
  return ensureSceneV12(structuredClone(scene));
}
