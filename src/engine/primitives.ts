import type { AnimationSpec, CameraSpec, Node, TokenSet, Vector3 } from "./types";
import { applyNodeTransform, normalizeHex, projectPoint, WORLD_UNIT_PX } from "./projection";
import { animationRecipes } from "./animations";

type RenderContext = {
  viewport: { width: number; height: number };
  camera: CameraSpec;
  animationsByNode: Map<string, AnimationSpec[]>;
};

export function renderNode(node: Node, tokens: TokenSet, ctx: RenderContext): string {
  const animatedClass = nodeAnimationClass(node.id, ctx.animationsByNode);
  const attrs = `id="node-${node.id}" data-node-type="${node.type}" data-layer="${node.layerId}" data-token-profile="${tokens.id}" class="${animatedClass}"`;

  switch (node.type) {
    case "atom":
      return renderAtom(node, tokens, ctx, attrs);
    case "bond":
      return renderBond(node, tokens, ctx, attrs);
    case "box":
      return renderBox(node, tokens, ctx, attrs);
    case "plate":
      return renderPlate(node, tokens, ctx, attrs);
    case "cylinder":
      return renderCylinder(node, tokens, ctx, attrs);
    case "disk-array":
      return renderDiskArray(node, tokens, ctx, attrs);
    case "arrow":
      return renderArrow(node, tokens, ctx, attrs);
    case "tube":
      return renderTube(node, tokens, ctx, attrs);
    case "leaf":
      return renderLeaf(node, tokens, ctx, attrs);
    case "petal":
      return renderPetal(node, tokens, ctx, attrs);
    case "root":
      return renderRoot(node, tokens, ctx, attrs);
    case "rack":
      return renderRack(node, tokens, ctx, attrs);
    case "label-anchor":
      return renderAnchor(node, tokens, ctx, attrs);
    default:
      return "";
  }
}

export function sampleNodeWorldPoints(node: Node): Vector3[] {
  switch (node.type) {
    case "atom": {
      const r = atomRadiusWorld(asNumber(node.params.radius, 0.22));
      return [
        { x: -r, y: 0, z: 0 },
        { x: r, y: 0, z: 0 },
        { x: 0, y: -r, z: 0 },
        { x: 0, y: r, z: 0 },
        { x: 0, y: 0, z: -r },
        { x: 0, y: 0, z: r },
      ];
    }
    case "bond":
    case "arrow":
    case "root":
    case "tube": {
      return asVectorArray(node.params.points, [
        { x: -0.3, y: 0, z: 0 },
        { x: 0.3, y: 0, z: 0 },
      ]);
    }
    case "box":
    case "plate":
    case "rack": {
      const w = asNumber(node.params.width, 1.3) / 2;
      const h = asNumber(node.params.height, 1.3) / 2;
      const d = asNumber(node.params.depth, 1.3) / 2;
      return [
        { x: -w, y: -h, z: -d },
        { x: w, y: -h, z: -d },
        { x: -w, y: h, z: -d },
        { x: w, y: h, z: -d },
        { x: -w, y: -h, z: d },
        { x: w, y: -h, z: d },
        { x: -w, y: h, z: d },
        { x: w, y: h, z: d },
      ];
    }
    case "cylinder": {
      const radius = asNumber(node.params.radius, 0.5);
      const height = asNumber(node.params.height, 1.4);
      const top = sampleCirclePoints(radius, -height / 2, 0, 12);
      const bottom = sampleCirclePoints(radius, height / 2, 0, 12);
      return [...top, ...bottom];
    }
    case "disk-array": {
      const rows = asNumber(node.params.rows, 4);
      const cols = asNumber(node.params.cols, 6);
      const spacing = asNumber(node.params.spacing, 0.5);
      const points: Vector3[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          points.push({
            x: (col - cols / 2) * spacing,
            y: 0,
            z: (row - rows / 2) * spacing,
          });
        }
      }
      return points;
    }
    case "leaf":
    case "petal": {
      const w = asNumber(node.params.width, 0.7);
      const h = asNumber(node.params.height, 1.2);
      return [
        { x: -w, y: 0, z: 0 },
        { x: w, y: 0, z: 0 },
        { x: 0, y: -h, z: 0 },
        { x: 0, y: h, z: 0 },
      ];
    }
    case "label-anchor":
    default:
      return [{ x: 0, y: 0, z: 0 }];
  }
}

function renderAtom(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radius = atomRadiusPx(asNumber(node.params.radius, 0.22), ctx.camera.scale);
  const center = projectNodePoint(node, { x: 0, y: 0, z: 0 }, ctx);
  const fill = normalizeHex(tokens.fillTop);
  const ink = normalizeHex(tokens.inkPrimary);

  return `<g ${attrs}><circle cx="${center.x}" cy="${center.y}" r="${radius}" fill="url(#atom-grad-${node.id})" stroke="${ink}" stroke-width="${tokens.lineWidth}"></circle><defs><radialGradient id="atom-grad-${node.id}" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.78"/><stop offset="100%" stop-color="${fill}"/></radialGradient></defs></g>`;
}

function renderBond(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const points = asVectorArray(node.params.points, [
    { x: -0.2, y: 0, z: 0 },
    { x: 0.2, y: 0, z: 0 },
  ]);

  const projected = points.map((point) => projectNodePoint(node, point, ctx));
  const d = projected.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return `<path ${attrs} d="${d}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
    1.2,
    tokens.lineWidth + 0.35
  )}" stroke-linecap="round"/>`;
}

function renderBox(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const w = asNumber(node.params.width, 1.2);
  const h = asNumber(node.params.height, 1.2);
  const d = asNumber(node.params.depth, 1.2);

  const corners: Record<string, Vector3> = {
    ftl: { x: -w / 2, y: -h / 2, z: d / 2 },
    ftr: { x: w / 2, y: -h / 2, z: d / 2 },
    fbl: { x: -w / 2, y: h / 2, z: d / 2 },
    fbr: { x: w / 2, y: h / 2, z: d / 2 },
    btl: { x: -w / 2, y: -h / 2, z: -d / 2 },
    btr: { x: w / 2, y: -h / 2, z: -d / 2 },
    bbl: { x: -w / 2, y: h / 2, z: -d / 2 },
    bbr: { x: w / 2, y: h / 2, z: -d / 2 },
  };

  const p = Object.fromEntries(
    Object.entries(corners).map(([k, v]) => [k, projectNodePoint(node, v, ctx)])
  ) as Record<keyof typeof corners, { x: number; y: number }>;

  const panelInset = asNumber(node.params.panelInset, 0);
  const panel = panelInset > 0 ? renderFrontPanel(node, ctx, w, h, d, panelInset, tokens) : "";

  return `<g ${attrs}>
    ${facePolygon(
      [p.btl, p.btr, p.ftr, p.ftl],
      normalizeHex(tokens.fillTop),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-top"
    )}
    ${facePolygon(
      [p.btl, p.ftl, p.fbl, p.bbl],
      normalizeHex(tokens.fillLeft),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-left"
    )}
    ${facePolygon(
      [p.btr, p.ftr, p.fbr, p.bbr],
      normalizeHex(tokens.fillRight),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-right"
    )}
    ${panel}
  </g>`;
}

function renderPlate(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 8.8);
  const depth = asNumber(node.params.depth, 6.6);
  const thickness = asNumber(node.params.thickness, 0.32);
  const rows = Math.max(3, Math.floor(asNumber(node.params.rows, 8)));
  const cols = Math.max(3, Math.floor(asNumber(node.params.cols, 12)));
  const holeRadius = asNumber(node.params.holeRadius, 0.04);
  const traceDensity = clamp(asNumber(node.params.traceDensity, 0.55), 0, 1);

  const topY = -thickness / 2;
  const bottomY = thickness / 2;
  const halfW = width / 2;
  const halfD = depth / 2;
  const inset = Math.max(0.2, Math.min(width, depth) * 0.06);

  const topCorners = {
    tl: projectNodePoint(node, { x: -halfW, y: topY, z: -halfD }, ctx),
    tr: projectNodePoint(node, { x: halfW, y: topY, z: -halfD }, ctx),
    br: projectNodePoint(node, { x: halfW, y: topY, z: halfD }, ctx),
    bl: projectNodePoint(node, { x: -halfW, y: topY, z: halfD }, ctx),
  };

  const bottomCorners = {
    tl: projectNodePoint(node, { x: -halfW, y: bottomY, z: -halfD }, ctx),
    tr: projectNodePoint(node, { x: halfW, y: bottomY, z: -halfD }, ctx),
    br: projectNodePoint(node, { x: halfW, y: bottomY, z: halfD }, ctx),
    bl: projectNodePoint(node, { x: -halfW, y: bottomY, z: halfD }, ctx),
  };

  const boardFaces = `
    ${facePolygon(
      [topCorners.tl, topCorners.tr, topCorners.br, topCorners.bl],
      normalizeHex(tokens.fillTop),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-top"
    )}
    ${facePolygon(
      [topCorners.tl, topCorners.bl, bottomCorners.bl, bottomCorners.tl],
      normalizeHex(tokens.fillLeft),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-left"
    )}
    ${facePolygon(
      [topCorners.tr, topCorners.br, bottomCorners.br, bottomCorners.tr],
      normalizeHex(tokens.fillRight),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-right"
    )}
  `;

  const holes: string[] = [];
  const traces: string[] = [];
  const stepX = (width - inset * 2) / (cols - 1);
  const stepZ = (depth - inset * 2) / (rows - 1);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = -halfW + inset + col * stepX;
      const z = -halfD + inset + row * stepZ;
      if ((row + col) % 2 === 0) {
        const ring = sampleCirclePoints(holeRadius, topY, 0, 12).map((point) =>
          projectNodePoint(node, { x: point.x + x, y: point.y, z: point.z + z }, ctx)
        );
        holes.push(
          `<path d="${linePath(ring, true)}" fill="${normalizeHex(tokens.bgPaper)}" stroke="${normalizeHex(
            tokens.inkSecondary
          )}" stroke-width="${Math.max(0.7, tokens.lineWidth - 0.45)}"/>`
        );
      }
    }
  }

  const traceRows = Math.max(2, Math.round(rows * traceDensity));
  for (let row = 1; row < traceRows; row += 2) {
    const z = -halfD + inset + row * stepZ;
    const x1 = -halfW + inset * 0.5;
    const x2 = halfW - inset * 0.5;
    const xMid = x1 + (x2 - x1) * (row % 3 === 0 ? 0.68 : 0.42);
    const z2 = z + stepZ * (row % 4 === 0 ? -0.9 : 0.9);
    const points = [
      projectNodePoint(node, { x: x1, y: topY - 0.001, z }, ctx),
      projectNodePoint(node, { x: xMid, y: topY - 0.001, z }, ctx),
      projectNodePoint(node, { x: xMid, y: topY - 0.001, z: clamp(z2, -halfD + inset, halfD - inset) }, ctx),
      projectNodePoint(node, { x: x2, y: topY - 0.001, z: clamp(z2, -halfD + inset, halfD - inset) }, ctx),
    ];

    traces.push(
      `<path d="${linePath(points, false)}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
        0.8,
        tokens.lineWidth - 0.4
      )}" stroke-linecap="round" stroke-dasharray="${row % 4 === 0 ? "3 4" : "none"}"/>`
    );
  }

  return `<g ${attrs}>${boardFaces}<g class="board-traces">${traces.join("")}</g><g class="board-holes">${holes.join("")}</g></g>`;
}

function renderCylinder(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radius = asNumber(node.params.radius, 0.5);
  const height = asNumber(node.params.height, 1.4);

  const topPoints = sampleCirclePoints(radius, -height / 2, 0, 24).map((point) => projectNodePoint(node, point, ctx));
  const bottomPoints = sampleCirclePoints(radius, height / 2, 0, 24).map((point) => projectNodePoint(node, point, ctx));

  const leftIndex = indexOfMin(topPoints, (p) => p.x);
  const rightIndex = indexOfMax(topPoints, (p) => p.x);

  const side = [topPoints[leftIndex], bottomPoints[leftIndex], bottomPoints[rightIndex], topPoints[rightIndex]];

  return `<g ${attrs}>
    ${facePolygon(side, normalizeHex(tokens.fillLeft), normalizeHex(tokens.inkPrimary), tokens.lineWidth, "face-hatch-left")}
    <path d="${linePath(topPoints, true)}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${tokens.lineWidth}"/>
    <path d="${linePath(bottomPoints, true)}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${tokens.lineWidth}" opacity="0.62"/>
  </g>`;
}

function renderDiskArray(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const rows = asNumber(node.params.rows, 4);
  const cols = asNumber(node.params.cols, 6);
  const spacing = asNumber(node.params.spacing, 0.5);
  const diskRadius = asNumber(node.params.diskRadius, 0.12);
  const diskThickness = Math.max(0.03, diskRadius * 0.36);

  const disks: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const center = {
        x: (col - cols / 2) * spacing,
        y: 0,
        z: (row - rows / 2) * spacing,
      };

      const top = sampleCirclePoints(diskRadius, -diskThickness / 2, 0, 16).map((point) =>
        projectNodePoint(node, { x: point.x + center.x, y: point.y + center.y, z: point.z + center.z }, ctx)
      );

      const bottom = sampleCirclePoints(diskRadius, diskThickness / 2, 0, 16).map((point) =>
        projectNodePoint(node, { x: point.x + center.x, y: point.y + center.y, z: point.z + center.z }, ctx)
      );

      const leftIndex = indexOfMin(top, (p) => p.x);
      const rightIndex = indexOfMax(top, (p) => p.x);

      const side = [top[leftIndex], bottom[leftIndex], bottom[rightIndex], top[rightIndex]];
      disks.push(facePolygon(side, normalizeHex(tokens.fillLeft), normalizeHex(tokens.inkPrimary), tokens.lineWidth, "face-hatch-left"));
      disks.push(`<path d="${linePath(top, true)}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(
        tokens.inkPrimary
      )}" stroke-width="${tokens.lineWidth}"/>`);
    }
  }

  return `<g ${attrs}>${disks.join("")}</g>`;
}

function renderArrow(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const points = asVectorArray(node.params.points, [
    { x: -0.4, y: 0, z: 0 },
    { x: 0.4, y: 0, z: 0 },
  ]);
  const projected = points.map((point) => projectNodePoint(node, point, ctx));
  const d = projected.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return `<path ${attrs} d="${d}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
    1.4,
    tokens.lineWidth
  )}" marker-end="url(#arrow-head)"/>`;
}

function renderTube(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const points = asVectorArray(node.params.points, [
    { x: -0.5, y: 0, z: 0 },
    { x: 0.5, y: 0, z: 0 },
  ]);
  const projected = points.map((point) => projectNodePoint(node, point, ctx));
  const width = Math.max(1.1, asNumber(node.params.radius, 0.08) * WORLD_UNIT_PX * ctx.camera.scale);
  const smooth = smoothLinePath(projected);

  return `<g ${attrs}>
    <path d="${smooth}" fill="none" stroke="${normalizeHex(tokens.fillLeft)}" stroke-opacity="0.8" stroke-width="${(width * 1.8).toFixed(
    2
  )}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${smooth}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${width.toFixed(
    2
  )}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function renderLeaf(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 0.7);
  const height = asNumber(node.params.height, 1.2);
  const curl = asNumber(node.params.curl, 0.22);
  const asym = asNumber(node.params.asymmetry, 0.16);
  const veins = Math.max(2, Math.floor(asNumber(node.params.veins, 4)));

  const tip = projectNodePoint(node, { x: width * 0.18 * asym, y: -height, z: 0 }, ctx);
  const base = projectNodePoint(node, { x: 0, y: height, z: 0 }, ctx);
  const leftTop = projectNodePoint(node, { x: -width * (0.84 + asym * 0.25), y: -height * 0.22, z: 0 }, ctx);
  const leftBottom = projectNodePoint(node, { x: -width * (0.92 + curl * 0.06), y: height * 0.35, z: 0 }, ctx);
  const rightTop = projectNodePoint(node, { x: width * (0.86 - asym * 0.18), y: -height * (0.2 + curl * 0.12), z: 0 }, ctx);
  const rightBottom = projectNodePoint(node, { x: width * (0.74 + curl * 0.24), y: height * 0.42, z: 0 }, ctx);
  const midTop = projectNodePoint(node, { x: width * 0.09, y: -height * 0.58, z: 0 }, ctx);
  const midBottom = projectNodePoint(node, { x: width * 0.02, y: height * 0.24, z: 0 }, ctx);

  const body = `M ${base.x} ${base.y}
    C ${rightBottom.x} ${rightBottom.y}, ${rightTop.x} ${rightTop.y}, ${tip.x} ${tip.y}
    C ${midTop.x} ${midTop.y}, ${leftTop.x} ${leftTop.y}, ${leftBottom.x} ${leftBottom.y}
    C ${leftBottom.x} ${leftBottom.y}, ${midBottom.x} ${midBottom.y}, ${base.x} ${base.y} Z`;

  const veinPath = `M ${base.x} ${base.y} C ${midBottom.x} ${midBottom.y}, ${midTop.x} ${midTop.y}, ${tip.x} ${tip.y}`;
  const sideVeins: string[] = [];
  const contourStrokes: string[] = [];

  for (let i = 1; i <= veins; i += 1) {
    const t = i / (veins + 1);
    const y = height * (0.62 - t * 1.28);
    const left = projectNodePoint(node, { x: -width * (0.24 + t * 0.48), y, z: 0 }, ctx);
    const right = projectNodePoint(node, { x: width * (0.22 + t * 0.43), y: y - curl * 0.12 * t, z: 0 }, ctx);
    const center = projectNodePoint(node, { x: width * 0.04 * (1 - t), y: y - 0.05, z: 0 }, ctx);
    sideVeins.push(
      `<path d="M ${center.x} ${center.y} L ${left.x} ${left.y}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
        0.55,
        tokens.lineWidth - 0.55
      )}" stroke-opacity="0.8"/>`
    );
    sideVeins.push(
      `<path d="M ${center.x} ${center.y} L ${right.x} ${right.y}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
        0.55,
        tokens.lineWidth - 0.55
      )}" stroke-opacity="0.8"/>`
    );

    const contourLeft = projectNodePoint(node, { x: -width * (0.15 + t * 0.28), y: y + height * 0.08, z: 0 }, ctx);
    const contourRight = projectNodePoint(node, { x: width * (0.14 + t * 0.25), y: y + height * 0.05, z: 0 }, ctx);
    contourStrokes.push(
      `<path d="M ${contourLeft.x} ${contourLeft.y} Q ${center.x} ${center.y - 4} ${contourRight.x} ${contourRight.y}" fill="none" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.45, tokens.lineWidth - 0.7)}" stroke-opacity="0.45"/>`
    );
  }

  return `<g ${attrs}>
    <path d="${body}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${tokens.lineWidth}"/>
    <path d="${veinPath}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.8, tokens.lineWidth - 0.35)}"/>
    ${sideVeins.join("")}
    ${contourStrokes.join("")}
  </g>`;
}

function renderPetal(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 0.8);
  const height = asNumber(node.params.height, 1.1);
  const flare = asNumber(node.params.flare, 0.16);
  const tip = projectNodePoint(node, { x: 0, y: -height, z: 0 }, ctx);
  const base = projectNodePoint(node, { x: 0, y: height * 0.72, z: 0 }, ctx);
  const leftOuter = projectNodePoint(node, { x: -width * (0.95 + flare), y: -height * 0.05, z: 0 }, ctx);
  const rightOuter = projectNodePoint(node, { x: width * (0.9 + flare * 0.6), y: -height * 0.08, z: 0 }, ctx);
  const leftInner = projectNodePoint(node, { x: -width * 0.34, y: height * 0.5, z: 0 }, ctx);
  const rightInner = projectNodePoint(node, { x: width * 0.36, y: height * 0.48, z: 0 }, ctx);
  const path = `M ${base.x} ${base.y}
    C ${rightInner.x} ${rightInner.y}, ${rightOuter.x} ${rightOuter.y}, ${tip.x} ${tip.y}
    C ${leftOuter.x} ${leftOuter.y}, ${leftInner.x} ${leftInner.y}, ${base.x} ${base.y} Z`;

  const innerA = projectNodePoint(node, { x: 0, y: -height * 0.6, z: 0 }, ctx);
  const innerB = projectNodePoint(node, { x: 0.08 * width, y: height * 0.42, z: 0 }, ctx);
  const veinA = projectNodePoint(node, { x: -width * 0.32, y: -height * 0.15, z: 0 }, ctx);
  const veinB = projectNodePoint(node, { x: -width * 0.1, y: height * 0.45, z: 0 }, ctx);
  const veinC = projectNodePoint(node, { x: width * 0.28, y: -height * 0.12, z: 0 }, ctx);
  const veinD = projectNodePoint(node, { x: width * 0.08, y: height * 0.45, z: 0 }, ctx);
  const contourRings: string[] = [];

  for (let i = 1; i <= 4; i += 1) {
    const t = i / 5;
    const cLeft = projectNodePoint(node, { x: -width * (0.42 + t * 0.24), y: -height * (0.12 + t * 0.2), z: 0 }, ctx);
    const cMid = projectNodePoint(node, { x: width * 0.04, y: -height * (0.24 + t * 0.14), z: 0 }, ctx);
    const cRight = projectNodePoint(node, { x: width * (0.36 + t * 0.22), y: -height * (0.1 + t * 0.2), z: 0 }, ctx);
    contourRings.push(
      `<path d="M ${cLeft.x} ${cLeft.y} Q ${cMid.x} ${cMid.y} ${cRight.x} ${cRight.y}" fill="none" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.45, tokens.lineWidth - 0.65)}" stroke-opacity="0.46"/>`
    );
  }

  return `<g ${attrs}>
    <path d="${path}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${tokens.lineWidth}"/>
    <path d="M ${innerB.x} ${innerB.y} C ${innerB.x} ${innerB.y - 18}, ${innerA.x} ${innerA.y + 18}, ${innerA.x} ${innerA.y}" fill="none" stroke="${normalizeHex(
    tokens.inkSecondary
  )}" stroke-width="${Math.max(0.7, tokens.lineWidth - 0.4)}"/>
    <line x1="${veinA.x}" y1="${veinA.y}" x2="${veinB.x}" y2="${veinB.y}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
    0.55,
    tokens.lineWidth - 0.55
  )}"/>
    <line x1="${veinC.x}" y1="${veinC.y}" x2="${veinD.x}" y2="${veinD.y}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
    0.55,
    tokens.lineWidth - 0.55
  )}"/>
    ${contourRings.join("")}
  </g>`;
}

function renderRoot(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const points = asVectorArray(node.params.points, [
    { x: 0, y: -0.2, z: 0 },
    { x: 0.1, y: 0.2, z: 0 },
    { x: 0.2, y: 0.6, z: 0 },
  ]);
  const projected = points.map((point) => projectNodePoint(node, point, ctx));
  const branch1 = asVectorArray(node.params.branch1, []);
  const branch2 = asVectorArray(node.params.branch2, []);
  const width = Math.max(1, asNumber(node.params.width, tokens.lineWidth + 0.1));
  const rootMain = smoothLinePath(projected);
  const hairlines: string[] = [];

  const renderBranch = (branch: Vector3[]) => {
    if (branch.length < 2) {
      return "";
    }
    const branchProjected = branch.map((point) => projectNodePoint(node, point, ctx));
    return `<path d="${smoothLinePath(branchProjected)}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.75,
      width - 0.5
    )}" stroke-linecap="round"/>`;
  };

  for (let i = 0; i < projected.length - 1; i += 1) {
    const start = projected[i];
    const end = projected[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) {
      continue;
    }
    const nx = -dy / len;
    const ny = dx / len;
    const mx = start.x + dx * 0.5;
    const my = start.y + dy * 0.5;
    const span = Math.max(4, width * 2.8);

    hairlines.push(
      `<line x1="${mx}" y1="${my}" x2="${mx + nx * span}" y2="${my + ny * span}" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.45, width - 0.8)}" stroke-opacity="0.55"/>`
    );
    hairlines.push(
      `<line x1="${mx}" y1="${my}" x2="${mx - nx * (span * 0.75)}" y2="${my - ny * (span * 0.75)}" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.42, width - 0.85)}" stroke-opacity="0.46"/>`
    );
  }

  return `<g ${attrs}>
    <path d="${rootMain}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${width}" stroke-linecap="round"/>
    <path d="${rootMain}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.45, width - 0.8)}" stroke-opacity="0.7" stroke-linecap="round"/>
    ${renderBranch(branch1)}
    ${renderBranch(branch2)}
    ${hairlines.join("")}
  </g>`;
}

function renderRack(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const body = renderBox(
    {
      ...node,
      type: "box",
      params: {
        width: asNumber(node.params.width, 1.6),
        height: asNumber(node.params.height, 2.2),
        depth: asNumber(node.params.depth, 1.2),
        panelInset: asNumber(node.params.panelInset, 0.14),
      },
    },
    tokens,
    ctx,
    attrs
  );

  const slotCount = asNumber(node.params.slots, 4);
  const lines: string[] = [];
  const vents: string[] = [];
  for (let i = 0; i < slotCount; i += 1) {
    const y = -0.75 + i * (1.5 / Math.max(1, slotCount - 1));
    const start = projectNodePoint(node, { x: -0.45, y, z: 0.62 }, ctx);
    const end = projectNodePoint(node, { x: 0.45, y, z: 0.62 }, ctx);
    const vent = projectNodePoint(node, { x: -0.58, y, z: 0.62 }, ctx);
    lines.push(
      `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.8, tokens.lineWidth - 0.45)}"/>`
    );
    vents.push(
      `<circle cx="${vent.x}" cy="${vent.y}" r="${Math.max(1.1, tokens.lineWidth - 0.25)}" fill="${normalizeHex(
        tokens.bgPaper
      )}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.6, tokens.lineWidth - 0.55)}"/>`
    );
  }

  return `${body}<g>${lines.join("")}${vents.join("")}</g>`;
}

function renderAnchor(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const p = projectNodePoint(node, { x: 0, y: 0, z: 0 }, ctx);
  return `<circle ${attrs} cx="${p.x}" cy="${p.y}" r="2" fill="${normalizeHex(tokens.inkPrimary)}"/>`;
}

function renderFrontPanel(
  node: Node,
  ctx: RenderContext,
  width: number,
  height: number,
  depth: number,
  inset: number,
  tokens: TokenSet
): string {
  const x = width / 2 - inset;
  const y = height / 2 - inset;
  const z = depth / 2 + 0.001;
  if (x <= 0 || y <= 0) {
    return "";
  }

  const tl = projectNodePoint(node, { x: -x, y: -y, z }, ctx);
  const tr = projectNodePoint(node, { x, y: -y, z }, ctx);
  const br = projectNodePoint(node, { x, y, z }, ctx);
  const bl = projectNodePoint(node, { x: -x, y, z }, ctx);

  const bolts = [
    projectNodePoint(node, { x: -x + inset * 0.3, y: -y + inset * 0.3, z }, ctx),
    projectNodePoint(node, { x: x - inset * 0.3, y: -y + inset * 0.3, z }, ctx),
    projectNodePoint(node, { x: x - inset * 0.3, y: y - inset * 0.3, z }, ctx),
    projectNodePoint(node, { x: -x + inset * 0.3, y: y - inset * 0.3, z }, ctx),
  ];

  return `<g class="panel-detail">
    <polygon points="${[tl, tr, br, bl].map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.8, tokens.lineWidth - 0.5)}" stroke-dasharray="4 4"/>
    ${bolts
      .map(
        (bolt) =>
          `<circle cx="${bolt.x}" cy="${bolt.y}" r="${Math.max(1.1, tokens.lineWidth)}" fill="${normalizeHex(tokens.bgPaper)}" stroke="${normalizeHex(
            tokens.inkSecondary
          )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.55)}"/>`
      )
      .join("")}
  </g>`;
}

function projectNodePoint(node: Node, local: Vector3, ctx: RenderContext) {
  const world = applyNodeTransform(local, node.transform3D);
  return projectPoint(world, ctx.camera, ctx.viewport);
}

function facePolygon(
  points: Array<{ x: number; y: number }>,
  fill: string,
  stroke: string,
  strokeWidth: number,
  hatchId: "face-hatch-top" | "face-hatch-left" | "face-hatch-right"
): string {
  const pointsText = points.map((point) => `${point.x},${point.y}`).join(" ");
  return `<g><polygon points="${pointsText}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/><polygon points="${pointsText}" fill="url(#${hatchId})" opacity="0.22"/></g>`;
}

function linePath(points: Array<{ x: number; y: number }>, closed: boolean): string {
  const base = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return closed ? `${base} Z` : base;
}

function smoothLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return "";
  }
  if (points.length < 3) {
    return linePath(points, false);
  }

  const tension = 1;
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1 = {
      x: p1.x + ((p2.x - p0.x) / 6) * tension,
      y: p1.y + ((p2.y - p0.y) / 6) * tension,
    };
    const cp2 = {
      x: p2.x - ((p3.x - p1.x) / 6) * tension,
      y: p2.y - ((p3.y - p1.y) / 6) * tension,
    };

    path += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function sampleCirclePoints(radius: number, y: number, phase = 0, segments = 24): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i < segments; i += 1) {
    const t = phase + (Math.PI * 2 * i) / segments;
    points.push({ x: Math.cos(t) * radius, y, z: Math.sin(t) * radius });
  }
  return points;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function asVectorArray(value: unknown, fallback: Vector3[]): Vector3[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const result = value
    .filter(
      (item): item is Vector3 =>
        typeof item === "object" && item !== null && "x" in item && "y" in item && "z" in item
    )
    .map((item) => ({ x: Number(item.x), y: Number(item.y), z: Number(item.z) }));

  return result.length > 0 ? result : fallback;
}

function nodeAnimationClass(nodeId: string, map: Map<string, AnimationSpec[]>): string {
  const list = map.get(nodeId);
  if (!list || list.length === 0) {
    return "";
  }

  return list
    .map((animation) => animationRecipes[animation.type].className)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" ");
}

function indexOfMin<T>(items: T[], fn: (item: T) => number): number {
  let winner = 0;
  let best = Number.POSITIVE_INFINITY;
  items.forEach((item, index) => {
    const value = fn(item);
    if (value < best) {
      best = value;
      winner = index;
    }
  });
  return winner;
}

function indexOfMax<T>(items: T[], fn: (item: T) => number): number {
  let winner = 0;
  let best = Number.NEGATIVE_INFINITY;
  items.forEach((item, index) => {
    const value = fn(item);
    if (value > best) {
      best = value;
      winner = index;
    }
  });
  return winner;
}

function atomRadiusWorld(value: number): number {
  if (value > 3) {
    return value / WORLD_UNIT_PX;
  }
  return value;
}

function atomRadiusPx(value: number, scale: number): number {
  if (value > 3) {
    return value * scale;
  }
  return value * WORLD_UNIT_PX * scale;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
