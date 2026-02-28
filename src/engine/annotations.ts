import type { AnnotationLabel, AnnotationLayer, Bounds2D, CameraSpec, Node, TokenSet } from "./types";
import { applyNodeTransform, normalizeHex, projectPoint } from "./projection";
import { sampleNodeWorldPoints } from "./primitives";
import { getNodePortWorldPosition } from "./scene";

type LayoutMode = "manual" | "auto-outside";

type Placement = {
  id: string;
  targetX: number;
  targetY: number;
  breakX: number;
  breakY: number;
  x: number;
  top: number;
  side: "left" | "right";
  lines: string[];
  width: number;
  height: number;
  railX: number;
};

type AnnotationRenderInput = {
  annotations: AnnotationLayer;
  nodes: Node[];
  camera: CameraSpec;
  tokens: TokenSet;
  viewport: { width: number; height: number };
  mainBounds: Bounds2D;
  layoutMode: LayoutMode;
};

export function renderAnnotations(input: AnnotationRenderInput): string {
  const { annotations, camera, tokens, viewport, layoutMode, nodes, mainBounds } = input;

  if (!annotations.visible) {
    return "";
  }

  const ink = normalizeHex(tokens.inkSecondary);

  const manualLeaders = annotations.leaders
    .map((leader) => {
      const from = projectPoint(leader.from, camera, viewport);
      const to = projectPoint(leader.to, camera, viewport);
      return `<line id="leader-${leader.id}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${ink}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
    })
    .join("\n");

  if (layoutMode === "manual") {
    const labels = annotations.labels
      .map((label) => {
        const p = projectPoint(label.at, camera, viewport);
        return `<text id="annotation-${label.id}" x="${p.x + 8}" y="${p.y - 8}" font-size="14" fill="${ink}" font-family="DM Sans, Arial, sans-serif">${escapeXml(
          label.text
        )}</text>`;
      })
      .join("\n");

    const equations = renderEquations(annotations, camera, viewport, ink);
    const legendItems = renderLegend(annotations, viewport, ink);

    return `<g id="layer-annotations" data-layer="annotations">${labels}${manualLeaders}${equations}${legendItems}</g>`;
  }

  const placements = layoutOutsideRailLabels({
    labels: annotations.labels,
    nodes,
    camera,
    viewport,
    bounds: mainBounds,
    railPadding: annotations.layout.railPadding,
    minLabelGap: annotations.layout.minLabelGap,
    maxLabelWidth: annotations.layout.maxLabelWidth,
  });

  const dash = annotations.layout.leaderStyle === "dashed" ? " stroke-dasharray=\"4 4\"" : "";

  const leaders = placements
    .map((placement) => {
      const entryX = placement.side === "left" ? placement.x + placement.width + 6 : placement.x - 6;
      const entryY = placement.top + 12;
      const polylinePoints = routeLeaderPoints(placement, entryX, entryY);
      return `<polyline points="${polylinePoints}" fill="none" stroke="${ink}" stroke-width="1.2"${dash}/>`;
    })
    .join("\n");

  const labels = placements
    .map((placement) => {
      const isLeft = placement.side === "left";
      const textAnchor = isLeft ? "start" : "end";
      const textX = isLeft ? placement.x : placement.x + placement.width;
      const lineHeight = 14;
      const tspans = placement.lines
        .map(
          (line, index) =>
            `<tspan x="${textX}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
        )
        .join("");

      return `<text id="annotation-${placement.id}" x="${textX}" y="${placement.top + 12}" text-anchor="${textAnchor}" font-size="13" fill="${ink}" font-family="DM Sans, Arial, sans-serif">${tspans}</text>`;
    })
    .join("\n");

  const equations = renderEquationsOutside(annotations, viewport, ink);
  const legendItems = renderLegend(annotations, viewport, ink);

  return `<g id="layer-annotations" data-layer="annotations">${labels}${leaders}${equations}${legendItems}</g>`;
}

export function layoutOutsideRailLabels(args: {
  labels: AnnotationLabel[];
  nodes: Node[];
  camera: CameraSpec;
  viewport: { width: number; height: number };
  bounds: Bounds2D;
  railPadding: number;
  minLabelGap: number;
  maxLabelWidth: number;
}): Placement[] {
  const { labels, nodes, camera, viewport, bounds, railPadding, minLabelGap, maxLabelWidth } = args;

  if (labels.length === 0) {
    return [];
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeBounds = new Map(
    nodes.map((node) => [node.id, computeProjectedNodeBounds(node, camera, viewport)])
  );

  const centerX = viewport.width / 2;
  const safeGap = 8;

  const sorted = [...labels].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const items = sorted.map((label) => {
    const targetNode = nodeMap.get(label.targetNodeId);
    const anchorSource = targetNode?.transform3D.position ?? label.at;
    const p = projectPoint(anchorSource, camera, viewport);
    const boundsForTarget = targetNode ? nodeBounds.get(targetNode.id) : undefined;

    let side: "left" | "right" =
      label.anchorBias === "left" ? "left" : label.anchorBias === "right" ? "right" : p.x <= centerX ? "left" : "right";

    const lines = wrapText(label.text, Math.max(14, Math.floor(maxLabelWidth / 7.2)));
    const width = Math.min(
      maxLabelWidth,
      Math.max(96, Math.max(...lines.map((line) => line.length), 1) * 7.3 + 12)
    );
    const height = lines.length * 14 + 2;

    const leftRoom = bounds.minX - railPadding - 14;
    const rightRoom = viewport.width - (bounds.maxX + railPadding) - 14;
    if (side === "right" && rightRoom < width + safeGap) {
      side = leftRoom >= width + safeGap ? "left" : "right";
    } else if (side === "left" && leftRoom < width + safeGap) {
      side = rightRoom >= width + safeGap ? "right" : "left";
    }

    const portAnchorWorld = targetNode
      ? getNodePortWorldPosition(targetNode, label.targetPortId) ??
        getNodePortWorldPosition(targetNode, inferPortIdForSide(targetNode, side))
      : undefined;
    const portAnchor = portAnchorWorld ? projectPoint(portAnchorWorld, camera, viewport) : undefined;
    const desiredY = boundsForTarget
      ? clamp(portAnchor?.y ?? p.y, boundsForTarget.minY + 4, boundsForTarget.maxY - 4)
      : (portAnchor?.y ?? p.y);
    const targetAnchor = {
      x: portAnchor?.x ?? (side === "left" ? (boundsForTarget?.minX ?? p.x) : (boundsForTarget?.maxX ?? p.x)),
      y: portAnchor ? clamp(portAnchor.y, desiredY - 24, desiredY + 24) : desiredY,
    };

    const breakMargin = 12;
    const breakX =
      side === "left"
        ? Math.min(targetAnchor.x - 4, (boundsForTarget?.minX ?? targetAnchor.x) - breakMargin)
        : Math.max(targetAnchor.x + 4, (boundsForTarget?.maxX ?? targetAnchor.x) + breakMargin);
    const breakY = desiredY;
    const railX =
      side === "left"
        ? Math.min(bounds.minX - 8, bounds.minX - railPadding * 0.56)
        : Math.max(bounds.maxX + 8, bounds.maxX + railPadding * 0.56);

    return {
      id: label.id,
      targetX: targetAnchor.x,
      targetY: targetAnchor.y,
      breakX,
      breakY,
      side,
      lines,
      width,
      height,
      top: 0,
      railX,
      x:
        side === "left"
          ? Math.max(14, Math.min(bounds.minX - width - safeGap, bounds.minX - railPadding - width))
          : Math.min(viewport.width - width - 14, Math.max(bounds.maxX + safeGap, bounds.maxX + railPadding)),
    };
  });

  const left = placeOneSide(
    items.filter((item) => item.side === "left"),
    viewport.height,
    minLabelGap,
    20
  );
  const right = placeOneSide(
    items.filter((item) => item.side === "right"),
    viewport.height,
    minLabelGap,
    20
  );

  return [...left, ...right]
    .map((placement) => {
      if (placement.side === "left") {
        return {
          ...placement,
          x: Math.min(placement.x, bounds.minX - placement.width - 4),
        };
      }
      return {
        ...placement,
        x: Math.max(placement.x, bounds.maxX + 4),
      };
    })
    .sort((a, b) => {
      if (a.side !== b.side) {
        return a.side === "left" ? -1 : 1;
      }
      return a.top - b.top;
    });
}

function placeOneSide(
  placements: Placement[],
  viewportHeight: number,
  minLabelGap: number,
  topPadding: number
): Placement[] {
  const sorted = [...placements].sort((a, b) => a.targetY - b.targetY);

  let currentY = topPadding;
  sorted.forEach((placement) => {
    const desiredTop = placement.targetY - placement.height / 2;
    const top = Math.max(currentY, desiredTop);
    placement.top = top;
    currentY = top + placement.height + minLabelGap;
  });

  const bottomLimit = viewportHeight - topPadding;
  let overflow = sorted.length > 0 ? currentY - minLabelGap - bottomLimit : 0;

  for (let i = sorted.length - 1; i >= 0 && overflow > 0; i -= 1) {
    const move = Math.min(overflow, Math.max(0, sorted[i].top - topPadding));
    sorted[i].top -= move;
    overflow -= move;

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const maxTop = next.top - sorted[i].height - minLabelGap;
      sorted[i].top = Math.min(sorted[i].top, maxTop);
    }
  }

  return sorted;
}

function computeProjectedNodeBounds(
  node: Node,
  camera: CameraSpec,
  viewport: { width: number; height: number }
): Bounds2D {
  const points = computeProjectedNodeSamples(node, camera, viewport);

  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
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

function computeProjectedNodeSamples(
  node: Node,
  camera: CameraSpec,
  viewport: { width: number; height: number }
): Array<{ x: number; y: number }> {
  return sampleNodeWorldPoints(node).map((sample) => {
    const world = applyNodeTransform(sample, node.transform3D);
    return projectPoint(world, camera, viewport);
  });
}

function routeLeaderPoints(placement: Placement, entryX: number, entryY: number): string {
  const sideSign = placement.side === "left" ? -1 : 1;
  const railJoinX = placement.railX + sideSign * 2;
  const breakoutX = placement.breakX + sideSign * 4;
  const breakoutY = placement.breakY;

  const points: Array<{ x: number; y: number }> = [
    { x: placement.targetX, y: placement.targetY },
    { x: breakoutX, y: breakoutY },
    { x: railJoinX, y: breakoutY },
    { x: placement.railX, y: entryY },
    { x: entryX, y: entryY },
  ];

  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
}

function renderEquations(annotations: AnnotationLayer, camera: CameraSpec, viewport: { width: number; height: number }, ink: string) {
  return annotations.equations
    .map((eq) => {
      const p = projectPoint(eq.at, camera, viewport);
      return `<text id="equation-${eq.id}" x="${p.x}" y="${p.y}" font-size="16" fill="${ink}" font-family="DM Sans, Arial, sans-serif" font-weight="600">${escapeXml(
        eq.latexLike
      )}</text>`;
    })
    .join("\n");
}

function renderEquationsOutside(annotations: AnnotationLayer, viewport: { width: number; height: number }, ink: string) {
  return annotations.equations
    .map(
      (eq, index) =>
        `<text id="equation-${eq.id}" x="${viewport.width / 2}" y="${22 + index * 18}" font-size="14" text-anchor="middle" fill="${ink}" font-family="DM Sans, Arial, sans-serif" font-weight="600">${escapeXml(
          eq.latexLike
        )}</text>`
    )
    .join("\n");
}

function renderLegend(annotations: AnnotationLayer, viewport: { width: number; height: number }, ink: string) {
  return annotations.legend
    .map(
      (item, index) =>
        `<text x="16" y="${viewport.height - 16 - index * 16}" font-size="11" fill="${ink}" font-family="DM Sans, Arial, sans-serif">${escapeXml(
          item
        )}</text>`
    )
    .join("\n");
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function inferPortIdForSide(node: Node, side: "left" | "right"): string | undefined {
  if (!node.ports || node.ports.length === 0) {
    return undefined;
  }
  const preferred = side === "left" ? ["left", "in", "west", "back"] : ["right", "out", "east", "front"];
  for (const key of preferred) {
    const match = node.ports.find((port) => port.id.toLowerCase() === key);
    if (match) {
      return match.id;
    }
  }
  const fallback = side === "left" ? node.ports[0] : node.ports[node.ports.length - 1];
  return fallback?.id;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
