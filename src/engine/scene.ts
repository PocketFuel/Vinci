import { applyNodeTransform, projectDepth, projectPoint, WORLD_UNIT_PX } from "./projection";
import { sampleNodeWorldPoints } from "./primitives";
import type { Bounds2D, CameraSpec, Node, SceneDocument, Vector3 } from "./types";

const BASE_ROLES = new Set(["base", "substrate", "ground"]);

type AutoFitOptions = {
  fitTarget?: "scene" | "subject";
  fitNodeIds?: string[];
  subjectPadding?: number;
};

export function getVisibleNodes(scene: SceneDocument): Node[] {
  const visibility = new Map(scene.layers.map((layer) => [layer.id, layer.visible]));
  return scene.nodes.filter((node) => visibility.get(node.layerId) !== false);
}

export function composeNodes(scene: SceneDocument, nodes: Node[]): Node[] {
  if (scene.composition.fitMode !== "auto") {
    return nodes;
  }
  if (hasAuthoredLayout(nodes)) {
    return centerNodes(nodes);
  }

  const baseRoleSet =
    scene.composition.baseNodeRoleFilter.length > 0
      ? new Set(scene.composition.baseNodeRoleFilter.map((role) => role.toLowerCase()))
      : BASE_ROLES;

  const fixed: Node[] = [];
  const movable: Node[] = [];

  nodes.forEach((node) => {
    if (isBaseNode(node, baseRoleSet)) {
      fixed.push(node);
    } else {
      movable.push(node);
    }
  });

  const arranged = applyLaneTemplate(scene, movable);
  const resolved = scene.composition.overlapPolicy === "avoid" ? resolveNodeOverlap(arranged, scene.composition.laneGap) : arranged;
  const centered = centerNodes([...fixed, ...resolved]);

  return centered;
}

export function sortNodesByDepth(nodes: Node[], camera: CameraSpec): Node[] {
  return [...nodes].sort((a, b) => {
    const priorityA = a.renderPriority ?? 0;
    const priorityB = b.renderPriority ?? 0;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const depthA = projectDepth(a.transform3D.position, camera);
    const depthB = projectDepth(b.transform3D.position, camera);

    if (depthA === depthB) {
      return a.id.localeCompare(b.id);
    }
    return depthA - depthB;
  });
}

export function projectSceneBounds(
  nodes: Node[],
  camera: CameraSpec,
  viewport: { width: number; height: number }
): Bounds2D {
  const points: { x: number; y: number }[] = [];

  nodes.forEach((node) => {
    const samples = sampleNodeWorldPoints(node);
    samples.forEach((sample) => {
      const world = applyNodeTransform(sample, node.transform3D);
      const projected = projectPoint(world, camera, viewport);
      points.push({ x: projected.x, y: projected.y });
    });
  });

  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function computeOccupancy(bounds: Bounds2D, viewport: { width: number; height: number }, padding: number): number {
  const usableWidth = Math.max(1, viewport.width - padding * 2);
  const usableHeight = Math.max(1, viewport.height - padding * 2);
  const occW = bounds.width / usableWidth;
  const occH = bounds.height / usableHeight;
  return Math.max(occW, occH);
}

export function autoFitCamera(
  scene: SceneDocument,
  nodes: Node[],
  viewport: { width: number; height: number },
  sourceCamera: CameraSpec,
  options: AutoFitOptions = {}
): CameraSpec {
  if (scene.composition.fitMode !== "auto") {
    return sourceCamera;
  }

  const fitTarget = options.fitTarget ?? "scene";
  const subjectPadding = Math.max(0, options.subjectPadding ?? 36);
  const padding = fitTarget === "subject" ? Math.max(12, subjectPadding * 0.35) : scene.composition.framePadding;
  const target = scene.composition.minOccupancy;
  const bounds = computeFitBounds(scene, nodes, sourceCamera, viewport, fitTarget, options.fitNodeIds, subjectPadding);

  const currentOccupancy = computeOccupancy(bounds, viewport, padding);
  if (!Number.isFinite(currentOccupancy) || currentOccupancy <= 0) {
    return sourceCamera;
  }

  const scaleFactor = target / currentOccupancy;
  const maxScale = fitTarget === "subject" ? 24 : 6;
  const nextScale = clamp(sourceCamera.scale * scaleFactor, 0.25, maxScale);

  const scaledCamera: CameraSpec = {
    ...sourceCamera,
    scale: nextScale,
    origin: { ...sourceCamera.origin },
  };

  const scaledBounds = computeFitBounds(scene, nodes, scaledCamera, viewport, fitTarget, options.fitNodeIds, subjectPadding);
  const centerX = (scaledBounds.minX + scaledBounds.maxX) / 2;
  const centerY = (scaledBounds.minY + scaledBounds.maxY) / 2;

  const dx = viewport.width / 2 - centerX;
  const dy = viewport.height / 2 - centerY;

  return {
    ...scaledCamera,
    origin: {
      x: scaledCamera.origin.x + dx,
      y: scaledCamera.origin.y + dy,
    },
  };
}

export function nearestNodeIdByWorldPoint(nodes: Node[], worldPoint: Vector3): string | undefined {
  if (nodes.length === 0) {
    return undefined;
  }

  let winner = nodes[0].id;
  let bestDistance = Number.POSITIVE_INFINITY;

  nodes.forEach((node) => {
    const p = node.transform3D.position;
    const distance = Math.sqrt((p.x - worldPoint.x) ** 2 + (p.y - worldPoint.y) ** 2 + (p.z - worldPoint.z) ** 2);
    if (distance < bestDistance) {
      winner = node.id;
      bestDistance = distance;
    }
  });

  return winner;
}

export function getNodePortWorldPosition(node: Node, portId?: string): Vector3 | undefined {
  if (!portId || !node.ports || node.ports.length === 0) {
    return undefined;
  }
  const port = node.ports.find((entry) => entry.id === portId);
  if (!port) {
    return undefined;
  }
  return applyNodeTransform(port.local, node.transform3D);
}

export function worldUnitsFromPixels(px: number): number {
  return px / WORLD_UNIT_PX;
}

export function cloneScene(scene: SceneDocument): SceneDocument {
  return JSON.parse(JSON.stringify(scene)) as SceneDocument;
}

function applyLaneTemplate(scene: SceneDocument, nodes: Node[]): Node[] {
  if (nodes.length === 0) {
    return [];
  }

  if (scene.composition.laneTemplate === "board-radial") {
    return applyRadialTemplate(scene, nodes);
  }

  if (scene.composition.laneTemplate === "organic-cross-section") {
    return applyOrganicTemplate(scene, nodes);
  }

  return applyBoardTemplate(scene, nodes);
}

function applyBoardTemplate(scene: SceneDocument, nodes: Node[]): Node[] {
  const laneGap = Math.max(0.5, scene.composition.laneGap);
  const laneX = new Map<string, number>([
    ["input", -laneGap * 2.15],
    ["transform", -laneGap * 0.6],
    ["storage", laneGap * 0.95],
    ["output", laneGap * 2.2],
    ["telemetry", laneGap * 2.9],
  ]);

  const groups = groupByRole(nodes);
  const next: Node[] = [];

  groups.forEach((groupNodes, role) => {
    const xBase = laneX.get(role) ?? 0;
    groupNodes.forEach((node, index) => {
      const spread = laneGap * 1.25;
      const z = (index - (groupNodes.length - 1) / 2) * spread;
      const jitter = hashJitter(node.id, laneGap * 0.14);
      next.push(withPosition(node, { x: xBase + jitter.x, y: node.transform3D.position.y, z: z + jitter.z }));
    });
  });

  return next;
}

function applyRadialTemplate(scene: SceneDocument, nodes: Node[]): Node[] {
  const radius = Math.max(2, scene.composition.laneGap * 2.2);
  const roleAngle = new Map<string, number>([
    ["input", Math.PI],
    ["transform", Math.PI * 1.3],
    ["storage", Math.PI * 0.05],
    ["output", 0],
    ["telemetry", Math.PI * 0.72],
  ]);

  const groups = groupByRole(nodes);
  const next: Node[] = [];

  groups.forEach((groupNodes, role) => {
    if (role === "transform" && groupNodes.length > 0) {
      const centerNode = groupNodes[0];
      next.push(withPosition(centerNode, { x: 0, y: centerNode.transform3D.position.y, z: 0 }));
      groupNodes.slice(1).forEach((node, index) => {
        const angle = (index / Math.max(1, groupNodes.length - 1)) * Math.PI * 2;
        next.push(
          withPosition(node, {
            x: Math.cos(angle) * (radius * 0.55),
            y: node.transform3D.position.y,
            z: Math.sin(angle) * (radius * 0.55),
          })
        );
      });
      return;
    }

    const baseAngle = roleAngle.get(role) ?? (Math.PI * 2 * Math.random());
    groupNodes.forEach((node, index) => {
      const orbit = radius + index * scene.composition.laneGap * 0.42;
      const wobble = hashJitter(node.id, 0.12);
      next.push(
        withPosition(node, {
          x: Math.cos(baseAngle) * orbit + wobble.x,
          y: node.transform3D.position.y,
          z: Math.sin(baseAngle) * orbit + wobble.z,
        })
      );
    });
  });

  return next;
}

function applyOrganicTemplate(scene: SceneDocument, nodes: Node[]): Node[] {
  const laneGap = Math.max(0.45, scene.composition.laneGap);
  const next: Node[] = [];
  const groups = groupByRole(nodes);

  groups.forEach((groupNodes, role) => {
    groupNodes.forEach((node, index) => {
      const t = groupNodes.length <= 1 ? 0 : index / (groupNodes.length - 1);
      const arch = Math.sin((t - 0.5) * Math.PI);
      let x = (t - 0.5) * laneGap * 3.6;
      let z = arch * laneGap * 1.4;

      if (role === "organic") {
        x *= 0.72;
        z *= 1.65;
      } else if (role === "input") {
        x -= laneGap * 1.6;
      } else if (role === "output") {
        x += laneGap * 1.8;
      } else if (role === "storage") {
        z += laneGap * 1.15;
      }

      const jitter = hashJitter(node.id, laneGap * 0.2);
      next.push(withPosition(node, { x: x + jitter.x, y: node.transform3D.position.y, z: z + jitter.z }));
    });
  });

  return next;
}

function resolveNodeOverlap(nodes: Node[], laneGap: number): Node[] {
  const minDistance = Math.max(0.9, laneGap * 0.74);
  const next = nodes.map((node) => ({ ...node, transform3D: { ...node.transform3D, position: { ...node.transform3D.position } } }));

  for (let pass = 0; pass < 6; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        const dx = b.transform3D.position.x - a.transform3D.position.x;
        const dz = b.transform3D.position.z - a.transform3D.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= minDistance || dist <= 0.0001) {
          continue;
        }
        const push = (minDistance - dist) * 0.5;
        const nx = dx / dist;
        const nz = dz / dist;
        a.transform3D.position.x -= nx * push;
        a.transform3D.position.z -= nz * push;
        b.transform3D.position.x += nx * push;
        b.transform3D.position.z += nz * push;
      }
    }
  }

  return next;
}

function centerNodes(nodes: Node[]): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const minX = Math.min(...nodes.map((node) => node.transform3D.position.x));
  const maxX = Math.max(...nodes.map((node) => node.transform3D.position.x));
  const minZ = Math.min(...nodes.map((node) => node.transform3D.position.z));
  const maxZ = Math.max(...nodes.map((node) => node.transform3D.position.z));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  return nodes.map((node) =>
    withPosition(node, {
      x: node.transform3D.position.x - cx,
      y: node.transform3D.position.y,
      z: node.transform3D.position.z - cz,
    })
  );
}

function withPosition(node: Node, position: Vector3): Node {
  return {
    ...node,
    transform3D: {
      ...node.transform3D,
      position,
    },
  };
}

function isBaseNode(node: Node, baseRoleSet: Set<string>): boolean {
  if (node.type === "plate") {
    return true;
  }
  if (!node.processRole) {
    return false;
  }
  return baseRoleSet.has(node.processRole.toLowerCase());
}

function computeFitBounds(
  scene: SceneDocument,
  nodes: Node[],
  camera: CameraSpec,
  viewport: { width: number; height: number },
  fitTarget: "scene" | "subject",
  fitNodeIds?: string[],
  subjectPadding = 36
): Bounds2D {
  if (fitTarget !== "subject") {
    return projectSceneBounds(nodes, camera, viewport);
  }

  const fallbackRoles = scene.composition.baseNodeRoleFilter.length > 0 ? scene.composition.baseNodeRoleFilter : ["base", "substrate", "ground"];
  const roleFilter = new Set(fallbackRoles);
  const selectedIds =
    fitNodeIds && fitNodeIds.length > 0
      ? fitNodeIds
      : scene.composition.subjectNodeIds.length > 0
      ? scene.composition.subjectNodeIds
      : scene.composition.focalNodeIds;

  const selectedIdSet = new Set(selectedIds);
  let subjectNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (subjectNodes.length === 0) {
    subjectNodes = nodes.filter((node) => !roleFilter.has(node.processRole ?? ""));
  }
  if (subjectNodes.length === 0) {
    subjectNodes = nodes;
  }

  const subjectBounds = projectSceneBounds(subjectNodes, camera, viewport);
  const marginX = Math.max(12, subjectPadding);
  const marginY = Math.max(10, subjectPadding * 0.9);

  const minX = subjectBounds.minX - marginX;
  const maxX = subjectBounds.maxX + marginX;
  const minY = subjectBounds.minY - marginY;
  const maxY = subjectBounds.maxY + marginY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function groupByRole(nodes: Node[]): Map<string, Node[]> {
  const map = new Map<string, Node[]>();
  nodes.forEach((node) => {
    const role = node.processRole ?? "transform";
    const list = map.get(role) ?? [];
    list.push(node);
    map.set(role, list);
  });
  return map;
}

function hasAuthoredLayout(nodes: Node[]): boolean {
  return nodes.some((node) => {
    if (node.type !== "bus" && node.type !== "pcb-trace" && node.type !== "tube" && node.type !== "arrow") {
      return false;
    }
    const points = node.params.points;
    const refs = node.params.portRefs;
    return Array.isArray(points) && points.length > 0 && Array.isArray(refs) && refs.length > 0;
  });
}

function hashJitter(value: string, amount: number): { x: number; z: number } {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const x = ((hash & 255) / 255 - 0.5) * amount;
  const z = (((hash >> 8) & 255) / 255 - 0.5) * amount;
  return { x, z };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
