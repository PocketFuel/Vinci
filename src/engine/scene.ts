import { applyNodeTransform, projectDepth, projectPoint, WORLD_UNIT_PX } from "./projection";
import { sampleNodeWorldPoints } from "./primitives";
import type { Bounds2D, CameraSpec, Node, SceneDocument } from "./types";

export function getVisibleNodes(scene: SceneDocument): Node[] {
  const visibility = new Map(scene.layers.map((layer) => [layer.id, layer.visible]));
  return scene.nodes.filter((node) => visibility.get(node.layerId) !== false);
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
  sourceCamera: CameraSpec
): CameraSpec {
  if (scene.composition.fitMode !== "auto") {
    return sourceCamera;
  }

  const padding = scene.composition.framePadding;
  const target = scene.composition.minOccupancy;
  const bounds = projectSceneBounds(nodes, sourceCamera, viewport);

  const currentOccupancy = computeOccupancy(bounds, viewport, padding);
  if (!Number.isFinite(currentOccupancy) || currentOccupancy <= 0) {
    return sourceCamera;
  }

  const scaleFactor = target / currentOccupancy;
  const nextScale = clamp(sourceCamera.scale * scaleFactor, 0.25, 6);

  const scaledCamera: CameraSpec = {
    ...sourceCamera,
    scale: nextScale,
    origin: { ...sourceCamera.origin },
  };

  const scaledBounds = projectSceneBounds(nodes, scaledCamera, viewport);
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

export function nearestNodeIdByWorldPoint(nodes: Node[], worldPoint: { x: number; y: number; z: number }): string | undefined {
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

export function worldUnitsFromPixels(px: number): number {
  return px / WORLD_UNIT_PX;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function cloneScene(scene: SceneDocument): SceneDocument {
  return JSON.parse(JSON.stringify(scene)) as SceneDocument;
}
