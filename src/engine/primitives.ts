import type { AnimationSpec, CameraSpec, Node, TokenSet, Vector3 } from "./types";
import { applyNodeTransform, normalizeHex, projectPoint, WORLD_UNIT_PX } from "./projection";
import { animationRecipes } from "./animations";

type RenderContext = {
  viewport: { width: number; height: number };
  camera: CameraSpec;
  animationsByNode: Map<string, AnimationSpec[]>;
  nodesById: Map<string, Node>;
};

type RibbonSegment = {
  leftStart: { x: number; y: number };
  leftEnd: { x: number; y: number };
  rightEnd: { x: number; y: number };
  rightStart: { x: number; y: number };
  sideA: { x: number; y: number };
  sideB: { x: number; y: number };
  sideADepth: { x: number; y: number };
  sideBDepth: { x: number; y: number };
};

type RibbonCaps = {
  startCap?: { a: { x: number; y: number }; b: { x: number; y: number }; aDepth: { x: number; y: number }; bDepth: { x: number; y: number } };
  endCap?: { a: { x: number; y: number }; b: { x: number; y: number }; aDepth: { x: number; y: number }; bDepth: { x: number; y: number } };
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
    case "prism":
      return renderPrism(node, tokens, ctx, attrs);
    case "cone":
      return renderCone(node, tokens, ctx, attrs);
    case "capsule":
      return renderCapsule(node, tokens, ctx, attrs);
    case "ring":
      return renderRing(node, tokens, ctx, attrs);
    case "dome":
      return renderDome(node, tokens, ctx, attrs);
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
    case "chip":
      return renderChip(node, tokens, ctx, attrs);
    case "chiplet":
      return renderChiplet(node, tokens, ctx, attrs);
    case "pcb-trace":
      return renderPcbTrace(node, tokens, ctx, attrs);
    case "bus":
      return renderBus(node, tokens, ctx, attrs);
    case "manifold":
      return renderManifold(node, tokens, ctx, attrs);
    case "tank-horizontal":
      return renderTankHorizontal(node, tokens, ctx, attrs);
    case "electrode-stack":
      return renderElectrodeStack(node, tokens, ctx, attrs);
    case "wavefront":
      return renderWavefront(node, tokens, ctx, attrs);
    case "petiole":
      return renderPetiole(node, tokens, ctx, attrs);
    case "filament":
      return renderFilament(node, tokens, ctx, attrs);
    case "plant-cell":
      return renderPlantCell(node, tokens, ctx, attrs);
    case "cell-cluster":
      return renderCellCluster(node, tokens, ctx, attrs);
    case "image-panel":
      return renderImagePanel(node, tokens, ctx, attrs);
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
    case "tube":
    case "petiole":
    case "filament": {
      return asVectorArray(node.params.points, [
        { x: -0.3, y: 0, z: 0 },
        { x: 0.3, y: 0, z: 0 },
      ]);
    }
    case "pcb-trace":
    case "bus": {
      const points = asVectorArray(node.params.points, [
        { x: -0.4, y: 0, z: 0 },
        { x: 0.4, y: 0, z: 0 },
      ]);
      const legacyPx =
        node.type === "pcb-trace"
          ? Math.max(1.2, asNumber(node.params.width, 1.9))
          : Math.max(2, asNumber(node.params.radius, 0.09) * WORLD_UNIT_PX * 0.88);
      const crossSection = asNumberMaybe(node.params.crossSection) ?? clampNumber(legacyPx / (WORLD_UNIT_PX * 2.6), 0.02, 0.16);
      return sampleConnectorEnvelope(points, crossSection);
    }
    case "capsule": {
      const length = asNumber(node.params.length, 1.55);
      const radius = asNumber(node.params.radius, 0.2);
      return sampleConnectorEnvelope(
        [
          { x: -length / 2, y: 0, z: 0 },
          { x: length / 2, y: 0, z: 0 },
        ],
        radius
      );
    }
    case "cone": {
      const radius = asNumber(node.params.radius, 0.64);
      const height = asNumber(node.params.height, 1.2);
      return [
        { x: 0, y: -height / 2, z: 0 },
        { x: -radius, y: height / 2, z: 0 },
        { x: radius, y: height / 2, z: 0 },
        { x: 0, y: height / 2, z: -radius },
        { x: 0, y: height / 2, z: radius },
      ];
    }
    case "ring": {
      const radius = asNumber(node.params.radius, 0.58);
      const band = Math.max(0.08, asNumber(node.params.band, 0.18));
      const outer = radius;
      const inner = Math.max(0.1, radius - band);
      const y = asNumber(node.params.lift, 0.08) * 0.35;
      return [
        { x: -outer, y, z: 0 },
        { x: outer, y, z: 0 },
        { x: 0, y, z: -outer },
        { x: 0, y, z: outer },
        { x: -inner, y, z: 0 },
        { x: inner, y, z: 0 },
      ];
    }
    case "dome": {
      const radius = asNumber(node.params.radius, 0.66);
      const height = asNumber(node.params.height, 0.72);
      return [
        { x: -radius, y: height / 2, z: 0 },
        { x: radius, y: height / 2, z: 0 },
        { x: 0, y: -height / 2, z: 0 },
        { x: 0, y: height / 2, z: -radius },
        { x: 0, y: height / 2, z: radius },
      ];
    }
    case "box":
    case "prism":
    case "plate":
    case "rack":
    case "chip":
    case "chiplet":
    case "manifold":
    case "electrode-stack": {
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
    case "image-panel": {
      const w = asNumber(node.params.width, 3.2) / 2;
      const d = asNumber(node.params.depth, 2.1) / 2;
      const h = asNumber(node.params.thickness, 0.14) / 2;
      return [
        { x: -w, y: -h, z: -d },
        { x: w, y: -h, z: -d },
        { x: w, y: -h, z: d },
        { x: -w, y: -h, z: d },
        { x: -w, y: h, z: -d },
        { x: w, y: h, z: -d },
        { x: w, y: h, z: d },
        { x: -w, y: h, z: d },
      ];
    }
    case "cylinder":
    case "tank-horizontal": {
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
    case "petal":
    case "wavefront": {
      const w = asNumber(node.params.width, 0.7);
      const h = asNumber(node.params.height, 1.2);
      return [
        { x: -w, y: 0, z: 0 },
        { x: w, y: 0, z: 0 },
        { x: 0, y: -h, z: 0 },
        { x: 0, y: h, z: 0 },
      ];
    }
    case "plant-cell":
    case "cell-cluster": {
      const w = asNumber(node.params.width, 1.2);
      const h = asNumber(node.params.height, 1.3);
      const d = asNumber(node.params.depth, 0.9);
      return [
        { x: -w / 2, y: -h / 2, z: -d / 2 },
        { x: w / 2, y: -h / 2, z: -d / 2 },
        { x: -w / 2, y: h / 2, z: -d / 2 },
        { x: w / 2, y: h / 2, z: -d / 2 },
        { x: -w / 2, y: -h / 2, z: d / 2 },
        { x: w / 2, y: -h / 2, z: d / 2 },
        { x: -w / 2, y: h / 2, z: d / 2 },
        { x: w / 2, y: h / 2, z: d / 2 },
      ];
    }
    case "label-anchor":
    default:
      return [{ x: 0, y: 0, z: 0 }];
  }
}

function renderAtom(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radiusValue = asNumber(node.params.radius, 0.22);
  const radiusWorld = atomRadiusWorld(radiusValue);
  const center = projectNodePoint(node, { x: 0, y: 0, z: 0 }, ctx);
  const fill = normalizeHex(asString(node.params.color, tokens.fillTop));
  const ink = normalizeHex(asString(node.params.strokeColor, tokens.inkPrimary));
  const highlight = asBoolean(node.params.highlight, false);
  const ringColor = normalizeHex(asString(node.params.ringColor, "#2D7A56"));
  const pxX = projectNodePoint(node, { x: radiusWorld, y: 0, z: 0 }, ctx);
  const pxY = projectNodePoint(node, { x: 0, y: -radiusWorld, z: 0 }, ctx);
  const pxZ = projectNodePoint(node, { x: 0, y: 0, z: radiusWorld }, ctx);
  const projectedRadius = Math.max(distance2(center, pxX), distance2(center, pxY), distance2(center, pxZ) * 0.92);
  const safeId = sanitizeSvgId(node.id);
  const gradId = `atom-grad-${safeId}`;
  const shadowId = `atom-shadow-${safeId}`;
  const topSheen = mixHex(fill, "#FFFFFF", 0.34);
  const deepShade = mixHex(fill, "#000000", 0.36);
  const occlusion = mixHex(fill, "#000000", 0.52);
  const glint = {
    x: center.x - projectedRadius * 0.34,
    y: center.y - projectedRadius * 0.28,
  };
  const lowerShade = {
    x: center.x + projectedRadius * 0.24,
    y: center.y + projectedRadius * 0.34,
  };
  const ringRadius = projectedRadius + Math.max(2.4, projectedRadius * 0.12);
  const equator = sampleCirclePoints(radiusWorld * 0.82, 0, 0, 24).map((point) => projectNodePoint(node, point, ctx));

  return `<g ${attrs}>
    <defs>
      <radialGradient id="${gradId}" cx="34%" cy="30%" r="76%">
        <stop offset="0%" stop-color="${topSheen}" stop-opacity="0.98"/>
        <stop offset="54%" stop-color="${fill}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${deepShade}" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="${shadowId}" cx="50%" cy="48%" r="72%">
        <stop offset="0%" stop-color="${occlusion}" stop-opacity="0.34"/>
        <stop offset="100%" stop-color="${occlusion}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${center.x + projectedRadius * 0.08}" cy="${center.y + projectedRadius * 0.38}" r="${projectedRadius * 0.96}" fill="url(#${shadowId})" stroke="none"/>
    <circle cx="${center.x}" cy="${center.y}" r="${projectedRadius}" fill="url(#${gradId})" stroke="${ink}" stroke-width="${Math.max(0.9, tokens.lineWidth - 0.18)}" />
    <circle cx="${glint.x}" cy="${glint.y}" r="${Math.max(1.2, projectedRadius * 0.16)}" fill="${normalizeHex(tokens.bgPaper)}" fill-opacity="0.56" stroke="none" />
    <circle cx="${lowerShade.x}" cy="${lowerShade.y}" r="${Math.max(1.2, projectedRadius * 0.32)}" fill="${occlusion}" fill-opacity="0.18" stroke="none" />
    <path d="${linePath(equator, true)}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-opacity="0.34" stroke-width="${Math.max(
    0.55,
    tokens.lineWidth - 0.52
  )}"/>
    ${
      highlight
        ? `<circle cx="${center.x}" cy="${center.y}" r="${ringRadius}" fill="none" stroke="${ringColor}" stroke-opacity="0.72" stroke-width="${Math.max(
            1,
            tokens.lineWidth - 0.15
          )}" stroke-dasharray="4 5"/>`
        : ""
    }
  </g>`;
}

function renderBond(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const projected = connectorProjectedPoints(
    node,
    ctx,
    [
      { x: -0.2, y: 0, z: 0 },
      { x: 0.2, y: 0, z: 0 },
    ],
    true
  );
  const depth = projectedDepthOffset(node, ctx, { x: 0, y: 0, z: -0.1 });
  const back = offsetPoints(projected, depth.x, depth.y);
  const frontPath = linePath(projected, false);
  const backPath = linePath(back, false);
  const firstFront = projected[0];
  const firstBack = back[0] ?? firstFront;
  const lastFront = projected[projected.length - 1];
  const lastBack = back[back.length - 1] ?? lastFront;

  return `<g ${attrs}>
    <path d="${backPath}" fill="none" stroke="${normalizeHex(tokens.fillLeft)}" stroke-width="${Math.max(
    1.8,
    tokens.lineWidth + 0.95
  )}" stroke-linecap="round"/>
    <line x1="${firstBack?.x}" y1="${firstBack?.y}" x2="${firstFront?.x}" y2="${firstFront?.y}" stroke="${normalizeHex(
    tokens.inkSecondary
  )}" stroke-width="${Math.max(0.7, tokens.lineWidth - 0.45)}"/>
    <line x1="${lastBack?.x}" y1="${lastBack?.y}" x2="${lastFront?.x}" y2="${
    lastFront?.y
  }" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.7, tokens.lineWidth - 0.45)}"/>
    <path d="${frontPath}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
    1.2,
    tokens.lineWidth + 0.35
  )}" stroke-linecap="round"/>
  </g>`;
}

function renderBox(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const w = asNumber(node.params.width, 1.2);
  const h = asNumber(node.params.height, 1.2);
  const d = asNumber(node.params.depth, 1.2);
  const bevel = clamp(asNumber(node.params.bevel, 0.06), 0, 0.32);

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
  const showPanelDetail = asBoolean(node.params.showPanelDetail, false);
  const panel = panelInset > 0 && showPanelDetail ? renderFrontPanel(node, ctx, w, h, d, panelInset, tokens) : "";
  const openFront = asBoolean(node.params.openFront, false);
  const frontFace = openFront
    ? ""
    : facePolygon(
        [p.ftl, p.ftr, p.fbr, p.fbl],
        normalizeHex(tokens.fillTop),
        normalizeHex(tokens.inkPrimary),
        Math.max(tokens.lineWidth - 0.15, 0.75),
        "face-hatch-top"
      );

  const bevelInset = Math.max(0, Math.min(w, h, d) * bevel);
  const bevelOverlay =
    bevelInset > 0
      ? renderBoxBevelOverlay(node, ctx, w, h, d, bevelInset, tokens)
      : "";

  const silhouetteStroke = Math.max(tokens.lineWidth + 0.45, 1.5);
  const seamStroke = Math.max(tokens.lineWidth - 0.45, 0.7);
  const edgeStrokes = [
    { a: p.btl, b: p.btr, width: silhouetteStroke, opacity: 0.85 },
    { a: p.btr, b: p.bbr, width: seamStroke, opacity: 0.74 },
    { a: p.bbr, b: p.bbl, width: Math.max(seamStroke - 0.15, 0.62), opacity: 0.52 },
    { a: p.bbl, b: p.btl, width: Math.max(seamStroke - 0.15, 0.62), opacity: 0.58 },
    { a: p.ftl, b: p.ftr, width: Math.max(seamStroke - 0.18, 0.58), opacity: 0.72 },
    { a: p.ftr, b: p.fbr, width: Math.max(seamStroke - 0.18, 0.58), opacity: 0.68 },
    { a: p.fbr, b: p.fbl, width: Math.max(seamStroke - 0.2, 0.56), opacity: 0.62 },
    { a: p.fbl, b: p.ftl, width: Math.max(seamStroke - 0.2, 0.56), opacity: 0.62 },
    { a: p.btl, b: p.ftl, width: seamStroke, opacity: 0.8 },
    { a: p.btr, b: p.ftr, width: seamStroke, opacity: 0.78 },
    { a: p.bbr, b: p.fbr, width: Math.max(seamStroke - 0.1, 0.58), opacity: 0.56 },
    { a: p.bbl, b: p.fbl, width: Math.max(seamStroke - 0.1, 0.58), opacity: 0.56 },
  ]
    .map(
      (edge) =>
        `<line x1="${edge.a.x}" y1="${edge.a.y}" x2="${edge.b.x}" y2="${edge.b.y}" stroke="${normalizeHex(
          tokens.inkPrimary
        )}" stroke-width="${edge.width}" stroke-linecap="round" stroke-linejoin="round" opacity="${edge.opacity}"/>`
    )
    .join("");

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
    ${frontFace}
    ${edgeStrokes}
    ${bevelOverlay}
    ${panel}
  </g>`;
}

function renderPrism(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 1.4);
  const height = asNumber(node.params.height, 1.1);
  const depth = asNumber(node.params.depth, 1.2);
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  const p = {
    frontLeft: projectNodePoint(node, { x: -hw, y: hh, z: hd }, ctx),
    frontRight: projectNodePoint(node, { x: hw, y: hh, z: hd }, ctx),
    frontApex: projectNodePoint(node, { x: 0, y: -hh, z: hd }, ctx),
    backLeft: projectNodePoint(node, { x: -hw, y: hh, z: -hd }, ctx),
    backRight: projectNodePoint(node, { x: hw, y: hh, z: -hd }, ctx),
    backApex: projectNodePoint(node, { x: 0, y: -hh, z: -hd }, ctx),
  };

  return `<g ${attrs}>
    ${facePolygon(
      [p.frontApex, p.frontRight, p.backRight, p.backApex],
      normalizeHex(tokens.fillTop),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-top"
    )}
    ${facePolygon(
      [p.frontLeft, p.frontApex, p.backApex, p.backLeft],
      normalizeHex(tokens.fillLeft),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-left"
    )}
    ${facePolygon(
      [p.frontLeft, p.frontRight, p.backRight, p.backLeft],
      normalizeHex(tokens.fillRight),
      normalizeHex(tokens.inkPrimary),
      Math.max(0.85, tokens.lineWidth - 0.2),
      "face-hatch-right"
    )}
    <polygon points="${pointsText([p.frontLeft, p.frontApex, p.frontRight])}" fill="none" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.95, tokens.lineWidth)}"/>
    <polygon points="${pointsText([p.backLeft, p.backApex, p.backRight])}" fill="none" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.78, tokens.lineWidth - 0.28)}" opacity="0.72"/>
    <line x1="${p.frontLeft.x}" y1="${p.frontLeft.y}" x2="${p.backLeft.x}" y2="${p.backLeft.y}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.8, tokens.lineWidth - 0.15)}"/>
    <line x1="${p.frontRight.x}" y1="${p.frontRight.y}" x2="${p.backRight.x}" y2="${p.backRight.y}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.8, tokens.lineWidth - 0.15)}"/>
    <line x1="${p.frontApex.x}" y1="${p.frontApex.y}" x2="${p.backApex.x}" y2="${p.backApex.y}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.8, tokens.lineWidth - 0.15)}"/>
  </g>`;
}

function renderCone(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radius = asNumber(node.params.radius, 0.64);
  const height = asNumber(node.params.height, 1.2);
  const apex = projectNodePoint(node, { x: 0, y: -height / 2, z: 0 }, ctx);
  const rim = sampleCirclePoints(radius, height / 2, 0, 28).map((point) => projectNodePoint(node, point, ctx));
  const left = rim[indexOfMin(rim, (point) => point.x)];
  const right = rim[indexOfMax(rim, (point) => point.x)];
  const rear = rim[indexOfMin(rim, (point) => point.y)];

  return `<g ${attrs}>
    ${facePolygon(
      [left, apex, right],
      normalizeHex(tokens.fillTop),
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-top"
    )}
    <polygon points="${pointsText([left, apex, rear])}" fill="${normalizeHex(tokens.fillLeft)}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.85, tokens.lineWidth - 0.18)}" opacity="0.86"/>
    <path d="${linePath(rim, true)}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.95, tokens.lineWidth)}" opacity="0.76"/>
    <line x1="${apex.x}" y1="${apex.y}" x2="${left.x}" y2="${left.y}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.9,
      tokens.lineWidth - 0.1
    )}"/>
    <line x1="${apex.x}" y1="${apex.y}" x2="${right.x}" y2="${right.y}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.9,
      tokens.lineWidth - 0.1
    )}"/>
  </g>`;
}

function renderCapsule(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const length = asNumber(node.params.length, 1.55);
  const radius = asNumber(node.params.radius, 0.2);
  return renderTube(
    {
      ...node,
      type: "tube",
      params: {
        ...node.params,
        radius,
        points: [
          { x: -length / 2, y: 0, z: 0 },
          { x: length / 2, y: 0, z: 0 },
        ],
      },
    },
    tokens,
    ctx,
    attrs
  );
}

function renderRing(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radius = asNumber(node.params.radius, 0.58);
  const band = Math.max(0.08, asNumber(node.params.band, 0.18));
  const innerRadius = Math.max(0.1, radius - band);
  const lift = asNumber(node.params.lift, 0.08);
  const depthOffset = projectedDepthOffset(node, ctx, { x: 0.02, y: lift, z: -0.16 });

  const outer = sampleCirclePoints(radius, 0, 0, 30).map((point) => projectNodePoint(node, point, ctx));
  const inner = sampleCirclePoints(innerRadius, 0, 0, 30).map((point) => projectNodePoint(node, point, ctx));
  const outerBack = offsetPoints(outer, depthOffset.x, depthOffset.y);
  const innerBack = offsetPoints(inner, depthOffset.x, depthOffset.y);

  const leftIndex = indexOfMin(outer, (point) => point.x);
  const rightIndex = indexOfMax(outer, (point) => point.x);

  const donutFrontPath = `${linePath(outer, true)} ${linePath([...inner].reverse(), true)}`;
  const donutBackPath = `${linePath(outerBack, true)} ${linePath([...innerBack].reverse(), true)}`;

  return `<g ${attrs}>
    <path d="${donutBackPath}" fill="${normalizeHex(tokens.fillRight)}" fill-rule="evenodd" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.72, tokens.lineWidth - 0.5)}" opacity="0.82"/>
    ${facePolygon(
      [outer[leftIndex], outerBack[leftIndex], innerBack[leftIndex], inner[leftIndex]],
      normalizeHex(tokens.fillLeft),
      normalizeHex(tokens.inkPrimary),
      Math.max(0.7, tokens.lineWidth - 0.4),
      "face-hatch-left"
    )}
    ${facePolygon(
      [outer[rightIndex], outerBack[rightIndex], innerBack[rightIndex], inner[rightIndex]],
      normalizeHex(tokens.fillRight),
      normalizeHex(tokens.inkPrimary),
      Math.max(0.7, tokens.lineWidth - 0.4),
      "face-hatch-right"
    )}
    <path d="${donutFrontPath}" fill="${normalizeHex(tokens.fillTop)}" fill-rule="evenodd" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${Math.max(0.92, tokens.lineWidth - 0.06)}"/>
  </g>`;
}

function renderDome(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radius = asNumber(node.params.radius, 0.66);
  const height = asNumber(node.params.height, 0.72);
  const base = sampleCirclePoints(radius, height / 2, 0, 28).map((point) => projectNodePoint(node, point, ctx));

  const shellPoints: Array<{ x: number; y: number }> = [];
  const segments = 20;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const theta = Math.PI * t;
    const x = Math.cos(theta) * radius;
    const y = height / 2 - Math.sin(theta) * height;
    shellPoints.push(projectNodePoint(node, { x, y, z: 0 }, ctx));
  }

  const contourRibs: string[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const fraction = i / 4;
    const rib = sampleCirclePoints(radius * (1 - fraction * 0.12), height / 2 - height * fraction * 0.24, 0, 20).map((point) =>
      projectNodePoint(node, point, ctx)
    );
    contourRibs.push(
      `<path d="${linePath(rib, true)}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-opacity="0.46" stroke-width="${Math.max(
        0.52,
        tokens.lineWidth - 0.62
      )}"/>`
    );
  }

  return `<g ${attrs}>
    <path d="${linePath(base, true)}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
      0.72,
      tokens.lineWidth - 0.45
    )}" opacity="0.7"/>
    <path d="${linePath(shellPoints, false)}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      1.02,
      tokens.lineWidth + 0.05
    )}" stroke-linecap="round"/>
    <path d="${linePath(base, true)}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.9,
      tokens.lineWidth - 0.08
    )}"/>
    ${contourRibs.join("")}
  </g>`;
}

function renderPlate(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 8.8);
  const depth = asNumber(node.params.depth, 6.6);
  const thickness = asNumber(node.params.thickness, 0.32);
  const rows = Math.max(3, Math.floor(asNumber(node.params.rows, 8)));
  const cols = Math.max(3, Math.floor(asNumber(node.params.cols, 12)));
  const holeRadius = asNumber(node.params.holeRadius, 0.04) * 1.45;
  const traceDensity = clamp(asNumber(node.params.traceDensity, 0.55), 0, 1);
  const surfaceType = asString(node.params.surfaceType, "pcb");
  const traceStyle = asString(node.params.traceStyle, "orthogonal");
  const holePattern = asString(node.params.holePattern, surfaceType === "soil" ? "none" : "checker");
  const topFill = normalizeHex(asString(node.params.topFill, tokens.fillTop));
  const leftFill = normalizeHex(asString(node.params.leftFill, tokens.fillLeft));
  const rightFill = normalizeHex(asString(node.params.rightFill, tokens.fillRight));
  const soilFurrows = Math.max(4, Math.floor(asNumber(node.params.soilFurrows, 7)));
  const soilPebbleDensity = clamp(asNumber(node.params.soilPebbleDensity, 0.58), 0.22, 0.92);

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
      topFill,
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-top"
    )}
    ${facePolygon(
      [topCorners.tl, topCorners.bl, bottomCorners.bl, bottomCorners.tl],
      leftFill,
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-left"
    )}
    ${facePolygon(
      [topCorners.tr, topCorners.br, bottomCorners.br, bottomCorners.tr],
      rightFill,
      normalizeHex(tokens.inkPrimary),
      tokens.lineWidth,
      "face-hatch-right"
    )}
  `;
  const perimeter = `<polyline points="${pointsText([
    topCorners.tl,
    topCorners.tr,
    topCorners.br,
    topCorners.bl,
    topCorners.tl,
  ])}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
    tokens.lineWidth + 0.45,
    1.4
  )}" stroke-linejoin="round"/>`;
  const sideSeams = `
    <line x1="${topCorners.bl.x}" y1="${topCorners.bl.y}" x2="${bottomCorners.bl.x}" y2="${bottomCorners.bl.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.45)}" opacity="0.72"/>
    <line x1="${topCorners.br.x}" y1="${topCorners.br.y}" x2="${bottomCorners.br.x}" y2="${bottomCorners.br.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.45)}" opacity="0.72"/>
    <line x1="${bottomCorners.bl.x}" y1="${bottomCorners.bl.y}" x2="${bottomCorners.br.x}" y2="${bottomCorners.br.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.45)}" opacity="0.64"/>
  `;

  const holes: string[] = [];
  const traces: string[] = [];
  const stepX = (width - inset * 2) / (cols - 1);
  const stepZ = (depth - inset * 2) / (rows - 1);

  const addTrace = (worldPoints: Vector3[], strokeScale = 1, dash = "none", opacity = 1) => {
    if (worldPoints.length < 2) {
      return;
    }
    const projected = worldPoints.map((point) => projectNodePoint(node, point, ctx));
    const rounded = roundPolylinePoints2D(projected, 10, 4);
    traces.push(
      `<path d="${linePath(rounded, false)}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
        0.72,
        (tokens.lineWidth - 0.5) * strokeScale
      )}" stroke-linecap="round" stroke-linejoin="round" ${dash === "none" ? "" : `stroke-dasharray="${dash}"`} stroke-opacity="${opacity}"/>`
    );
  };

  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;

  if (surfaceType === "soil") {
    for (let furrow = 0; furrow < soilFurrows; furrow += 1) {
      const t = soilFurrows <= 1 ? 0.5 : furrow / (soilFurrows - 1);
      const zBase = -halfD + inset * 0.2 + t * (depth - inset * 0.4);
      const waveA = zBase + Math.sin((furrow + 1) * 0.68) * stepZ * 1.15;
      const waveB = zBase - Math.cos((furrow + 1) * 0.43) * stepZ * 0.92;
      addTrace(
        [
          { x: -halfW + inset * 0.03, y: topY - 0.001, z: clamp(zBase, -halfD + inset, halfD - inset) },
          { x: -halfW * 0.28, y: topY - 0.001, z: clamp(waveA, -halfD + inset, halfD - inset) },
          { x: halfW * 0.08, y: topY - 0.001, z: clamp(waveB, -halfD + inset, halfD - inset) },
          { x: halfW * 0.5, y: topY - 0.001, z: clamp(zBase + stepZ * 0.5, -halfD + inset, halfD - inset) },
          { x: halfW - inset * 0.03, y: topY - 0.001, z: clamp(waveA * 0.75 + waveB * 0.25, -halfD + inset, halfD - inset) },
        ],
        0.95,
        furrow % 2 === 0 ? "none" : "4 6",
        0.7
      );
    }

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const noise = seededUnit(`${node.id}-soil-${row}-${col}`);
        if (noise > soilPebbleDensity * 0.4) {
          continue;
        }
        const x =
          -halfW + inset * 0.45 + col * stepX + (seededUnit(`${node.id}-soil-jx-${row}-${col}`) - 0.5) * stepX * 0.56;
        const z =
          -halfD + inset * 0.45 + row * stepZ + (seededUnit(`${node.id}-soil-jz-${row}-${col}`) - 0.5) * stepZ * 0.56;
        const pebbleRadius = Math.max(0.014, holeRadius * (0.38 + noise * 0.9));
        const pebble = sampleCirclePoints(pebbleRadius, topY - 0.001, noise * Math.PI * 2, 10).map((point) =>
          projectNodePoint(node, { x: point.x + x, y: point.y, z: point.z + z }, ctx)
        );
        holes.push(
          `<path d="${linePath(pebble, true)}" fill="${normalizeHex(tokens.bgPaper)}" fill-opacity="${0.65 + noise * 0.2}" stroke="${normalizeHex(
            tokens.inkSecondary
          )}" stroke-opacity="0.62" stroke-width="${Math.max(0.45, tokens.lineWidth - 0.65)}"/>`
        );
      }
    }
  } else {
    const shouldPlaceHole = (row: number, col: number) => {
      switch (holePattern) {
        case "none":
          return false;
        case "bands":
          return row % 2 === 0 && col % 2 === 0;
        case "sparse":
          return (row + col) % 3 === 0;
        case "radial": {
          const distance = Math.hypot(row - centerRow, col - centerCol);
          return Math.round(distance) % 2 === 0 && (row + col) % 2 === 0;
        }
        case "checker":
        default:
          return (row + col) % 2 === 0;
      }
    };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!shouldPlaceHole(row, col)) {
          continue;
        }
        const x = -halfW + inset + col * stepX;
        const z = -halfD + inset + row * stepZ;
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

    if (traceStyle === "radial") {
      const ringCount = Math.max(3, Math.round(traceDensity * 7));
      for (let ring = 0; ring < ringCount; ring += 1) {
        const radius = Math.min(halfW, halfD) * (0.22 + ring * 0.12);
        const circle = sampleCirclePoints(radius, topY - 0.001, 0, 26).map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z * 0.62,
        }));
        addTrace(circle, 0.9, ring % 2 === 0 ? "none" : "3 5", 0.76);
      }
      for (let spoke = 0; spoke < 6; spoke += 1) {
        const angle = (Math.PI * 2 * spoke) / 6;
        addTrace(
          [
            { x: Math.cos(angle) * stepX * 0.4, y: topY - 0.001, z: Math.sin(angle) * stepZ * 0.4 },
            { x: Math.cos(angle) * (halfW - inset * 0.1), y: topY - 0.001, z: Math.sin(angle) * (halfD - inset * 0.1) },
          ],
          0.82,
          "none",
          0.72
        );
      }
    } else {
      const traceRows = Math.max(2, Math.round(rows * traceDensity));
      for (let row = 1; row < traceRows; row += 2) {
        const z = -halfD + inset + row * stepZ;
        const x1 = -halfW + inset * 0.02;
        const x2 = halfW - inset * 0.02;
        const xMid = x1 + (x2 - x1) * (row % 3 === 0 ? 0.74 : 0.36);
        const z2 = z + stepZ * (row % 4 === 0 ? -0.72 : 0.72);
        addTrace(
          [
            { x: x1, y: topY - 0.001, z },
            { x: xMid, y: topY - 0.001, z },
            { x: xMid, y: topY - 0.001, z: clamp(z2, -halfD + inset, halfD - inset) },
            { x: x2, y: topY - 0.001, z: clamp(z2, -halfD + inset, halfD - inset) },
          ],
          1,
          row % 4 === 0 ? "3 4" : "none",
          0.88
        );
      }

      if (traceStyle !== "parallel") {
        const traceCols = Math.max(2, Math.round(cols * traceDensity * 0.42));
        for (let col = 1; col < traceCols; col += 1) {
          if (col % 2 !== 0) {
            continue;
          }
          const t = col / (traceCols + 1);
          const x = -halfW + inset + (width - inset * 2) * t;
          const z1 = -halfD + inset * 0.04;
          const z2 = halfD - inset * 0.04;
          const zMid = z1 + (z2 - z1) * (col % 4 === 0 ? 0.6 : 0.38);
          const x2 = x + stepX * (col % 3 === 0 ? 0.65 : -0.5);
          addTrace(
            [
              { x, y: topY - 0.001, z: z1 },
              { x, y: topY - 0.001, z: zMid },
              { x: clamp(x2, -halfW + inset * 0.08, halfW - inset * 0.08), y: topY - 0.001, z: zMid },
              { x: clamp(x2, -halfW + inset * 0.08, halfW - inset * 0.08), y: topY - 0.001, z: z2 },
            ],
            0.88,
            "none",
            0.72
          );
        }
      }

      if (traceStyle === "diagonal") {
        const diagonalCount = Math.max(3, Math.round(traceDensity * 6));
        for (let i = 0; i < diagonalCount; i += 1) {
          const t = diagonalCount <= 1 ? 0.5 : i / (diagonalCount - 1);
          const zA = -halfD + inset + t * (depth - inset * 2);
          const zB = zA + stepZ * 2.8;
          addTrace(
            [
              { x: -halfW + inset * 0.05, y: topY - 0.001, z: clamp(zA, -halfD + inset, halfD - inset) },
              { x: -halfW * 0.15, y: topY - 0.001, z: clamp(zA + stepZ * 1.2, -halfD + inset, halfD - inset) },
              { x: halfW * 0.46, y: topY - 0.001, z: clamp(zB, -halfD + inset, halfD - inset) },
              { x: halfW - inset * 0.05, y: topY - 0.001, z: clamp(zB + stepZ * 0.72, -halfD + inset, halfD - inset) },
            ],
            0.84,
            i % 2 === 0 ? "none" : "4 5",
            0.72
          );
        }
      }
    }
  }

  return `<g ${attrs}>${boardFaces}${perimeter}${sideSeams}<g class="board-traces">${traces.join("")}</g><g class="board-holes">${holes.join("")}</g></g>`;
}

function renderCylinder(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const radius = asNumber(node.params.radius, 0.5);
  const height = asNumber(node.params.height, 1.4);

  const topPoints = sampleCirclePoints(radius, -height / 2, 0, 24).map((point) => projectNodePoint(node, point, ctx));
  const bottomPoints = sampleCirclePoints(radius, height / 2, 0, 24).map((point) => projectNodePoint(node, point, ctx));

  const leftIndex = indexOfMin(topPoints, (p) => p.x);
  const rightIndex = indexOfMax(topPoints, (p) => p.x);
  const midIndex = Math.floor(topPoints.length / 2);

  const side = [topPoints[leftIndex], bottomPoints[leftIndex], bottomPoints[rightIndex], topPoints[rightIndex]];
  const seamA = [topPoints[midIndex], bottomPoints[midIndex]];
  const seamB = [topPoints[(midIndex + Math.floor(topPoints.length / 3)) % topPoints.length], bottomPoints[(midIndex + Math.floor(topPoints.length / 3)) % topPoints.length]];

  return `<g ${attrs}>
    ${facePolygon(side, normalizeHex(tokens.fillLeft), normalizeHex(tokens.inkPrimary), tokens.lineWidth, "face-hatch-left")}
    <path d="${linePath(topPoints, true)}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${tokens.lineWidth}"/>
    <path d="${linePath(bottomPoints, true)}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(
      tokens.inkPrimary
    )}" stroke-width="${tokens.lineWidth}" opacity="0.62"/>
    <line x1="${seamA[0].x}" y1="${seamA[0].y}" x2="${seamA[1].x}" y2="${seamA[1].y}" stroke="${normalizeHex(
    tokens.inkSecondary
  )}" stroke-width="${Math.max(0.75, tokens.lineWidth - 0.45)}" opacity="0.75"/>
    <line x1="${seamB[0].x}" y1="${seamB[0].y}" x2="${seamB[1].x}" y2="${seamB[1].y}" stroke="${normalizeHex(
    tokens.inkSecondary
  )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.55)}" opacity="0.52"/>
  </g>`;
}

function renderDiskArray(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const rows = asNumber(node.params.rows, 4);
  const cols = asNumber(node.params.cols, 6);
  const spacing = asNumber(node.params.spacing, 0.5);
  const diskRadius = asNumber(node.params.diskRadius, 0.12);
  const diskThickness = Math.max(0.03, diskRadius * 0.36);
  const substrateHeight = Math.max(0.05, diskThickness * 0.86);
  const halfW = Math.max(diskRadius, ((cols - 1) * spacing) / 2 + diskRadius * 1.28);
  const halfD = Math.max(diskRadius, ((rows - 1) * spacing) / 2 + diskRadius * 1.28);
  const topY = diskThickness / 2 + 0.015;
  const bottomY = topY + substrateHeight;

  const disks: string[] = [];
  const substrateTop = {
    tl: projectNodePoint(node, { x: -halfW, y: topY, z: -halfD }, ctx),
    tr: projectNodePoint(node, { x: halfW, y: topY, z: -halfD }, ctx),
    br: projectNodePoint(node, { x: halfW, y: topY, z: halfD }, ctx),
    bl: projectNodePoint(node, { x: -halfW, y: topY, z: halfD }, ctx),
  };
  const substrateBottom = {
    tl: projectNodePoint(node, { x: -halfW, y: bottomY, z: -halfD }, ctx),
    tr: projectNodePoint(node, { x: halfW, y: bottomY, z: -halfD }, ctx),
    br: projectNodePoint(node, { x: halfW, y: bottomY, z: halfD }, ctx),
    bl: projectNodePoint(node, { x: -halfW, y: bottomY, z: halfD }, ctx),
  };
  const substrate = `
    ${facePolygon(
      [substrateTop.tl, substrateTop.tr, substrateTop.br, substrateTop.bl],
      normalizeHex(tokens.fillTop),
      normalizeHex(tokens.inkPrimary),
      Math.max(0.75, tokens.lineWidth - 0.25),
      "face-hatch-top"
    )}
    ${facePolygon(
      [substrateTop.tl, substrateTop.bl, substrateBottom.bl, substrateBottom.tl],
      normalizeHex(tokens.fillLeft),
      normalizeHex(tokens.inkPrimary),
      Math.max(0.72, tokens.lineWidth - 0.3),
      "face-hatch-left"
    )}
    ${facePolygon(
      [substrateTop.tr, substrateTop.br, substrateBottom.br, substrateBottom.tr],
      normalizeHex(tokens.fillRight),
      normalizeHex(tokens.inkPrimary),
      Math.max(0.72, tokens.lineWidth - 0.3),
      "face-hatch-right"
    )}
    <polyline points="${pointsText([substrateTop.tl, substrateTop.tr, substrateTop.br, substrateTop.bl, substrateTop.tl])}" fill="none" stroke="${normalizeHex(
    tokens.inkPrimary
  )}" stroke-width="${Math.max(1.05, tokens.lineWidth + 0.15)}" stroke-linejoin="round"/>
  `;

  const vias: string[] = [];
  const viaEvery = Math.max(2, Math.floor(cols / 4));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if ((row + col) % viaEvery !== 0) {
        continue;
      }
      const x = (col - cols / 2) * spacing;
      const z = (row - rows / 2) * spacing;
      const via = projectNodePoint(node, { x, y: topY - 0.004, z }, ctx);
      vias.push(
        `<circle cx="${via.x}" cy="${via.y}" r="${Math.max(0.82, tokens.lineWidth - 0.35)}" fill="${normalizeHex(
          tokens.bgPaper
        )}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.45, tokens.lineWidth - 0.6)}"/>`
      );
    }
  }

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

  return `<g ${attrs}>${substrate}<g class="disk-array-vias">${vias.join("")}</g><g class="disk-array-disks">${disks.join(
    ""
  )}</g></g>`;
}

function renderArrow(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const projected = connectorProjectedPoints(
    node,
    ctx,
    [
      { x: -0.4, y: 0, z: 0 },
      { x: 0.4, y: 0, z: 0 },
    ],
    true
  );
  if (projected.length < 2) {
    return "";
  }

  const depth = projectedDepthOffset(node, ctx, { x: 0, y: 0.03, z: -0.14 });
  const back = offsetPoints(projected, depth.x, depth.y);
  const frontPath = smoothLinePath(projected);
  const backPath = smoothLinePath(back);

  const frontStart = projected[0];
  const frontEnd = projected[projected.length - 1];
  const frontPrev = projected[Math.max(0, projected.length - 2)];
  const backStart = back[0];
  const backEnd = back[back.length - 1];
  const backPrev = back[Math.max(0, back.length - 2)];

  const frontDirection = normalizeDirection2D(frontEnd, frontPrev);
  const backDirection = normalizeDirection2D(backEnd, backPrev);
  const frontNormal = { x: -frontDirection.y, y: frontDirection.x };
  const backNormal = { x: -backDirection.y, y: backDirection.x };

  const shaftWidth = Math.max(1.8, tokens.lineWidth + 0.5);
  const headLength = Math.max(11, shaftWidth * 4.1);
  const headWidth = Math.max(8.5, shaftWidth * 3.2);

  const frontHeadBase = {
    x: frontEnd.x - frontDirection.x * headLength,
    y: frontEnd.y - frontDirection.y * headLength,
  };
  const backHeadBase = {
    x: backEnd.x - backDirection.x * headLength,
    y: backEnd.y - backDirection.y * headLength,
  };

  const frontHeadLeft = {
    x: frontHeadBase.x + frontNormal.x * headWidth * 0.5,
    y: frontHeadBase.y + frontNormal.y * headWidth * 0.5,
  };
  const frontHeadRight = {
    x: frontHeadBase.x - frontNormal.x * headWidth * 0.5,
    y: frontHeadBase.y - frontNormal.y * headWidth * 0.5,
  };
  const backHeadLeft = {
    x: backHeadBase.x + backNormal.x * headWidth * 0.5,
    y: backHeadBase.y + backNormal.y * headWidth * 0.5,
  };
  const backHeadRight = {
    x: backHeadBase.x - backNormal.x * headWidth * 0.5,
    y: backHeadBase.y - backNormal.y * headWidth * 0.5,
  };

  return `<g ${attrs}>
    <path d="${backPath}" fill="none" stroke="${normalizeHex(tokens.fillRight)}" stroke-width="${(shaftWidth * 1.65).toFixed(
      2
    )}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${backPath}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
      0.75,
      tokens.lineWidth - 0.5
    )}" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="${pointsText([backHeadLeft, backEnd, backHeadRight])}" fill="${normalizeHex(
      tokens.fillRight
    )}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.55)}"/>
    <line x1="${backStart.x}" y1="${backStart.y}" x2="${frontStart.x}" y2="${frontStart.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.6, tokens.lineWidth - 0.55)}"/>
    <line x1="${backHeadBase.x}" y1="${backHeadBase.y}" x2="${frontHeadBase.x}" y2="${frontHeadBase.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.6, tokens.lineWidth - 0.55)}"/>
    <polygon points="${pointsText([frontHeadLeft, frontEnd, backEnd, backHeadLeft])}" fill="${normalizeHex(
      tokens.fillLeft
    )}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(0.55, tokens.lineWidth - 0.65)}"/>
    <polygon points="${pointsText([frontHeadRight, frontEnd, backEnd, backHeadRight])}" fill="${normalizeHex(
      tokens.fillRight
    )}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(0.55, tokens.lineWidth - 0.65)}"/>
    <path d="${frontPath}" fill="none" stroke="${normalizeHex(tokens.fillLeft)}" stroke-width="${(shaftWidth * 1.65).toFixed(
      2
    )}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${frontPath}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      1.1,
      tokens.lineWidth + 0.15
    )}" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="${pointsText([frontHeadLeft, frontEnd, frontHeadRight])}" fill="${normalizeHex(
      tokens.fillTop
    )}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(0.7, tokens.lineWidth - 0.45)}"/>
  </g>`;
}

function renderTube(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const projected = connectorProjectedPoints(
    node,
    ctx,
    [
      { x: -0.5, y: 0, z: 0 },
      { x: 0.5, y: 0, z: 0 },
    ],
    true
  );
  const width = Math.max(1.1, asNumber(node.params.radius, 0.08) * WORLD_UNIT_PX * ctx.camera.scale);
  const depth = projectedDepthOffset(node, ctx, { x: 0, y: 0.04, z: -0.1 });
  const back = offsetPoints(projected, depth.x, depth.y);
  const frontPath = smoothLinePath(projected);
  const backPath = smoothLinePath(back);
  const start = projected[0];
  const end = projected[projected.length - 1];
  const backStart = back[0];
  const backEnd = back[back.length - 1];

  return `<g ${attrs}>
    <path d="${backPath}" fill="none" stroke="${normalizeHex(tokens.fillRight)}" stroke-width="${(width * 2.1).toFixed(
    2
  )}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${backPath}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
      0.8,
      width * 0.78
    ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${backStart.x}" y1="${backStart.y}" x2="${start.x}" y2="${start.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.7, width * 0.6).toFixed(2)}"/>
    <line x1="${backEnd.x}" y1="${backEnd.y}" x2="${end.x}" y2="${end.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.7, width * 0.6).toFixed(2)}"/>
    <path d="${frontPath}" fill="none" stroke="${normalizeHex(tokens.fillLeft)}" stroke-width="${(width * 2.1).toFixed(
    2
  )}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${frontPath}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${width.toFixed(
    2
  )}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${frontPath}" fill="none" stroke="${normalizeHex(tokens.bgPaper)}" stroke-opacity="0.56" stroke-width="${Math.max(
      0.45,
      width * 0.34
    ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
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
  const depth = projectedDepthOffset(node, ctx, { x: 0.02, y: 0.06, z: -0.12 });

  const bTip = offsetPoint(tip, depth.x, depth.y);
  const bBase = offsetPoint(base, depth.x, depth.y);
  const bLeftTop = offsetPoint(leftTop, depth.x, depth.y);
  const bLeftBottom = offsetPoint(leftBottom, depth.x, depth.y);
  const bRightTop = offsetPoint(rightTop, depth.x, depth.y);
  const bRightBottom = offsetPoint(rightBottom, depth.x, depth.y);
  const bMidTop = offsetPoint(midTop, depth.x, depth.y);
  const bMidBottom = offsetPoint(midBottom, depth.x, depth.y);

  const body = `M ${base.x} ${base.y}
    C ${rightBottom.x} ${rightBottom.y}, ${rightTop.x} ${rightTop.y}, ${tip.x} ${tip.y}
    C ${midTop.x} ${midTop.y}, ${leftTop.x} ${leftTop.y}, ${leftBottom.x} ${leftBottom.y}
    C ${leftBottom.x} ${leftBottom.y}, ${midBottom.x} ${midBottom.y}, ${base.x} ${base.y} Z`;
  const bodyBack = `M ${bBase.x} ${bBase.y}
    C ${bRightBottom.x} ${bRightBottom.y}, ${bRightTop.x} ${bRightTop.y}, ${bTip.x} ${bTip.y}
    C ${bMidTop.x} ${bMidTop.y}, ${bLeftTop.x} ${bLeftTop.y}, ${bLeftBottom.x} ${bLeftBottom.y}
    C ${bLeftBottom.x} ${bLeftBottom.y}, ${bMidBottom.x} ${bMidBottom.y}, ${bBase.x} ${bBase.y} Z`;

  const veinPath = `M ${base.x} ${base.y} C ${midBottom.x} ${midBottom.y}, ${midTop.x} ${midTop.y}, ${tip.x} ${tip.y}`;
  const veinBack = `M ${bBase.x} ${bBase.y} C ${bMidBottom.x} ${bMidBottom.y}, ${bMidTop.x} ${bMidTop.y}, ${bTip.x} ${bTip.y}`;
  const rightSkin = `M ${base.x} ${base.y}
    C ${rightBottom.x} ${rightBottom.y}, ${rightTop.x} ${rightTop.y}, ${tip.x} ${tip.y}
    L ${bTip.x} ${bTip.y}
    C ${bRightTop.x} ${bRightTop.y}, ${bRightBottom.x} ${bRightBottom.y}, ${bBase.x} ${bBase.y} Z`;
  const leftSkin = `M ${tip.x} ${tip.y}
    C ${midTop.x} ${midTop.y}, ${leftTop.x} ${leftTop.y}, ${leftBottom.x} ${leftBottom.y}
    L ${bLeftBottom.x} ${bLeftBottom.y}
    C ${bLeftTop.x} ${bLeftTop.y}, ${bMidTop.x} ${bMidTop.y}, ${bTip.x} ${bTip.y} Z`;
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
    <path d="${bodyBack}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.7,
      tokens.lineWidth - 0.45
    )}"/>
    <path d="${rightSkin}" fill="${normalizeHex(tokens.fillLeft)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.65,
      tokens.lineWidth - 0.5
    )}"/>
    <path d="${leftSkin}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.65,
      tokens.lineWidth - 0.5
    )}" opacity="0.92"/>
    <path d="${body}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${tokens.lineWidth}"/>
    <path d="${veinBack}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
      0.65,
      tokens.lineWidth - 0.45
    )}" stroke-opacity="0.48"/>
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
  const depth = projectedDepthOffset(node, ctx, { x: 0.02, y: 0.05, z: -0.1 });
  const bTip = offsetPoint(tip, depth.x, depth.y);
  const bBase = offsetPoint(base, depth.x, depth.y);
  const bLeftOuter = offsetPoint(leftOuter, depth.x, depth.y);
  const bRightOuter = offsetPoint(rightOuter, depth.x, depth.y);
  const bLeftInner = offsetPoint(leftInner, depth.x, depth.y);
  const bRightInner = offsetPoint(rightInner, depth.x, depth.y);
  const path = `M ${base.x} ${base.y}
    C ${rightInner.x} ${rightInner.y}, ${rightOuter.x} ${rightOuter.y}, ${tip.x} ${tip.y}
    C ${leftOuter.x} ${leftOuter.y}, ${leftInner.x} ${leftInner.y}, ${base.x} ${base.y} Z`;
  const pathBack = `M ${bBase.x} ${bBase.y}
    C ${bRightInner.x} ${bRightInner.y}, ${bRightOuter.x} ${bRightOuter.y}, ${bTip.x} ${bTip.y}
    C ${bLeftOuter.x} ${bLeftOuter.y}, ${bLeftInner.x} ${bLeftInner.y}, ${bBase.x} ${bBase.y} Z`;
  const rightSkin = `M ${base.x} ${base.y}
    C ${rightInner.x} ${rightInner.y}, ${rightOuter.x} ${rightOuter.y}, ${tip.x} ${tip.y}
    L ${bTip.x} ${bTip.y}
    C ${bRightOuter.x} ${bRightOuter.y}, ${bRightInner.x} ${bRightInner.y}, ${bBase.x} ${bBase.y} Z`;
  const leftSkin = `M ${tip.x} ${tip.y}
    C ${leftOuter.x} ${leftOuter.y}, ${leftInner.x} ${leftInner.y}, ${base.x} ${base.y}
    L ${bBase.x} ${bBase.y}
    C ${bLeftInner.x} ${bLeftInner.y}, ${bLeftOuter.x} ${bLeftOuter.y}, ${bTip.x} ${bTip.y} Z`;

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
    <path d="${pathBack}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.7,
      tokens.lineWidth - 0.45
    )}"/>
    <path d="${rightSkin}" fill="${normalizeHex(tokens.fillLeft)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.65,
      tokens.lineWidth - 0.5
    )}"/>
    <path d="${leftSkin}" fill="${normalizeHex(tokens.fillRight)}" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.65,
      tokens.lineWidth - 0.5
    )}" opacity="0.92"/>
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
  const depth = projectedDepthOffset(node, ctx, { x: 0.03, y: 0.05, z: -0.1 });
  const backProjected = offsetPoints(projected, depth.x, depth.y);
  const rootMainBack = smoothLinePath(backProjected);
  const firstFront = projected[0];
  const firstBack = backProjected[0] ?? firstFront;
  const lastFront = projected[projected.length - 1];
  const lastBack = backProjected[backProjected.length - 1] ?? lastFront;
  const hairlines: string[] = [];

  const renderBranch = (branch: Vector3[]) => {
    if (branch.length < 2) {
      return "";
    }
    const branchProjected = branch.map((point) => projectNodePoint(node, point, ctx));
    const backBranch = offsetPoints(branchProjected, depth.x, depth.y);
    return `<g>
      <path d="${smoothLinePath(backBranch)}" fill="none" stroke="${normalizeHex(tokens.fillRight)}" stroke-width="${Math.max(
      0.8,
      width - 0.35
    )}" stroke-linecap="round"/>
      <path d="${smoothLinePath(branchProjected)}" fill="none" stroke="${normalizeHex(tokens.inkPrimary)}" stroke-width="${Math.max(
      0.75,
      width - 0.5
    )}" stroke-linecap="round"/>
    </g>`;
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
    <path d="${rootMainBack}" fill="none" stroke="${normalizeHex(tokens.fillRight)}" stroke-width="${Math.max(
      1.1,
      width + 0.5
    )}" stroke-linecap="round"/>
    <line x1="${firstBack?.x}" y1="${firstBack?.y}" x2="${firstFront?.x}" y2="${firstFront?.y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.6, width - 0.65)}"/>
    <line x1="${lastBack?.x}" y1="${lastBack?.y}" x2="${lastFront?.x}" y2="${
    lastFront?.y
  }" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.6, width - 0.65)}"/>
    <path d="${rootMain}" fill="none" stroke="${normalizeHex(tokens.fillLeft)}" stroke-width="${Math.max(
      1.0,
      width + 0.32
    )}" stroke-linecap="round"/>
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
  const rails: string[] = [];
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

  const railA = [
    projectNodePoint(node, { x: -0.62, y: -0.85, z: 0.62 }, ctx),
    projectNodePoint(node, { x: -0.62, y: 0.85, z: 0.62 }, ctx),
  ];
  const railB = [
    projectNodePoint(node, { x: 0.62, y: -0.85, z: 0.62 }, ctx),
    projectNodePoint(node, { x: 0.62, y: 0.85, z: 0.62 }, ctx),
  ];
  rails.push(
    `<line x1="${railA[0].x}" y1="${railA[0].y}" x2="${railA[1].x}" y2="${railA[1].y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.75, tokens.lineWidth - 0.45)}"/>`
  );
  rails.push(
    `<line x1="${railB[0].x}" y1="${railB[0].y}" x2="${railB[1].x}" y2="${railB[1].y}" stroke="${normalizeHex(
      tokens.inkSecondary
    )}" stroke-width="${Math.max(0.75, tokens.lineWidth - 0.45)}"/>`
  );

  return `${body}<g>${lines.join("")}${vents.join("")}${rails.join("")}</g>`;
}

function renderChip(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 1.8);
  const depth = asNumber(node.params.depth, 1.4);
  const height = asNumber(node.params.height, 0.34);
  const pins = clampNumber(Math.floor(asNumber(node.params.pins, 8)), 2, 8);

  const body = renderBox(
    {
      ...node,
      type: "box",
      params: {
        width,
        height,
        depth,
        panelInset: asNumber(node.params.panelInset, 0.08),
      },
    },
    tokens,
    ctx,
    attrs
  );

  const pinLines: string[] = [];
  for (let i = 0; i < pins; i += 1) {
    const t = pins <= 1 ? 0.5 : i / (pins - 1);
    const z = -depth / 2 + t * depth;
    const leftA = projectNodePoint(node, { x: -width / 2, y: height / 2 - 0.02, z }, ctx);
    const leftB = projectNodePoint(node, { x: -width / 2 - 0.17, y: height / 2 + 0.07, z }, ctx);
    const rightA = projectNodePoint(node, { x: width / 2, y: height / 2 - 0.02, z }, ctx);
    const rightB = projectNodePoint(node, { x: width / 2 + 0.17, y: height / 2 + 0.07, z }, ctx);
    pinLines.push(
      `<line x1="${leftA.x}" y1="${leftA.y}" x2="${leftB.x}" y2="${leftB.y}" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.45)}"/>`
    );
    pinLines.push(
      `<line x1="${rightA.x}" y1="${rightA.y}" x2="${rightB.x}" y2="${rightB.y}" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.45)}"/>`
    );
  }

  const spreadInset = Math.min(width, depth) * 0.16;
  const spreadZ = depth / 2 + 0.001;
  const spread = {
    tl: projectNodePoint(node, { x: -width / 2 + spreadInset, y: -height / 2 + 0.002, z: spreadZ - spreadInset }, ctx),
    tr: projectNodePoint(node, { x: width / 2 - spreadInset, y: -height / 2 + 0.002, z: spreadZ - spreadInset }, ctx),
    br: projectNodePoint(node, { x: width / 2 - spreadInset, y: -height / 2 + 0.002, z: -spreadZ + spreadInset }, ctx),
    bl: projectNodePoint(node, { x: -width / 2 + spreadInset, y: -height / 2 + 0.002, z: -spreadZ + spreadInset }, ctx),
  };
  const notch = projectNodePoint(node, { x: -width / 2 + spreadInset * 0.62, y: -height / 2 - 0.001, z: 0 }, ctx);

  return `${body}
    <g class="chip-top-detail">
      <polygon points="${pointsText([spread.tl, spread.tr, spread.br, spread.bl])}" fill="none" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(tokens.lineWidth - 0.5, 0.65)}" stroke-dasharray="3 4"/>
      <circle cx="${notch.x}" cy="${notch.y}" r="${Math.max(1.2, tokens.lineWidth - 0.2)}" fill="${normalizeHex(
    tokens.bgPaper
  )}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.55, tokens.lineWidth - 0.65)}"/>
    </g>
    <g class="chip-pins">${pinLines.join("")}</g>`;
}

function renderChiplet(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  return renderChip(
    {
      ...node,
      params: {
        width: asNumber(node.params.width, 1.08),
        depth: asNumber(node.params.depth, 0.9),
        height: asNumber(node.params.height, 0.26),
        pins: asNumber(node.params.pins, 4),
        panelInset: asNumber(node.params.panelInset, 0.05),
      },
    },
    tokens,
    ctx,
    attrs
  );
}

function renderPcbTrace(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const points = connectorProjectedPoints(
    node,
    ctx,
    [
      { x: -0.8, y: 0, z: 0 },
      { x: 0.8, y: 0, z: 0 },
    ],
    false
  );
  if (points.length < 2) {
    return "";
  }
  const legacyWidth = Math.max(1.2, asNumber(node.params.width, 1.9));
  const crossSection = asNumberMaybe(node.params.crossSection);
  const width = crossSection
    ? Math.max(1.25, crossSection * WORLD_UNIT_PX * ctx.camera.scale * 2.9)
    : legacyWidth;
  const depthOffset = projectedDepthOffset(node, ctx, { x: 0, y: 0.08, z: -0.09 });
  const roundedPoints = roundPolylinePoints2D(points, Math.max(5, width * 1.1), 3);
  const routePoints = simplifyPolyline2D(roundedPoints, Math.max(1.4, width * 0.28), 0.02);
  const ribbon = buildConnectorRibbon(routePoints, width, depthOffset);
  if (ribbon.segments.length === 0) {
    return "";
  }

  const sideFaces = ribbon.segments
    .map((segment) =>
      facePolygon(
        [segment.sideA, segment.sideB, segment.sideBDepth, segment.sideADepth],
        normalizeHex(tokens.fillLeft),
        normalizeHex(tokens.inkSecondary),
        Math.max(0.5, tokens.lineWidth - 0.6),
        "face-hatch-left"
      )
    )
    .join("");

  const topFaces = ribbon.segments
    .map((segment) =>
      facePolygon(
        [segment.leftStart, segment.leftEnd, segment.rightEnd, segment.rightStart],
        normalizeHex(tokens.fillTop),
        normalizeHex(tokens.inkPrimary),
        Math.max(0.65, tokens.lineWidth - 0.45),
        "face-hatch-top"
      )
    )
    .join("");

  const startCap = ribbon.startCap
    ? facePolygon(
        [ribbon.startCap.a, ribbon.startCap.b, ribbon.startCap.bDepth, ribbon.startCap.aDepth],
        normalizeHex(tokens.fillRight),
        normalizeHex(tokens.inkSecondary),
        Math.max(0.55, tokens.lineWidth - 0.55),
        "face-hatch-right"
      )
    : "";

  const endCap = ribbon.endCap
    ? facePolygon(
        [ribbon.endCap.a, ribbon.endCap.b, ribbon.endCap.bDepth, ribbon.endCap.aDepth],
        normalizeHex(tokens.fillRight),
        normalizeHex(tokens.inkSecondary),
        Math.max(0.55, tokens.lineWidth - 0.55),
        "face-hatch-right"
      )
    : "";

  const pads = [routePoints[0], routePoints[routePoints.length - 1]];
  const centerline = linePath(routePoints, false);

  return `<g ${attrs}>
    ${sideFaces}
    ${startCap}
    ${endCap}
    ${topFaces}
    <path d="${centerline}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-opacity="0.52" stroke-width="${Math.max(
    0.6,
    width * 0.2
  ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
    ${pads
      .map(
        (pad) =>
          `<g>
            <circle cx="${pad.x}" cy="${pad.y}" r="${Math.max(2, width * 0.86)}" fill="${normalizeHex(tokens.fillTop)}" stroke="${normalizeHex(
            tokens.inkPrimary
          )}" stroke-width="${Math.max(0.65, tokens.lineWidth - 0.5)}"/>
            <circle cx="${pad.x}" cy="${pad.y}" r="${Math.max(0.9, width * 0.35)}" fill="${normalizeHex(tokens.bgPaper)}" stroke="${normalizeHex(
            tokens.inkSecondary
          )}" stroke-width="${Math.max(0.5, tokens.lineWidth - 0.65)}"/>
          </g>`
      )
      .join("")}
  </g>`;
}

function renderBus(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const points = connectorProjectedPoints(
    node,
    ctx,
    [
      { x: -0.7, y: 0, z: 0 },
      { x: 0.7, y: 0, z: 0 },
    ],
    false
  );
  if (points.length < 2) {
    return "";
  }

  const crossSection = asNumberMaybe(node.params.crossSection);
  const width = crossSection
    ? Math.max(2.1, crossSection * WORLD_UNIT_PX * ctx.camera.scale * 3.2)
    : Math.max(2.2, asNumber(node.params.radius, 0.13) * WORLD_UNIT_PX * ctx.camera.scale * 0.88);
  const depthOffset = projectedDepthOffset(node, ctx, { x: 0, y: 0.1, z: -0.12 });
  const roundedPoints = roundPolylinePoints2D(points, Math.max(6, width * 1.3), 3);
  const routePoints = simplifyPolyline2D(roundedPoints, Math.max(1.6, width * 0.26), 0.02);
  const ribbon = buildConnectorRibbon(routePoints, width, depthOffset);
  if (ribbon.segments.length === 0) {
    return "";
  }

  const sideFaces = ribbon.segments
    .map((segment) =>
      facePolygon(
        [segment.sideA, segment.sideB, segment.sideBDepth, segment.sideADepth],
        normalizeHex(tokens.fillRight),
        normalizeHex(tokens.inkSecondary),
        Math.max(0.55, tokens.lineWidth - 0.45),
        "face-hatch-right"
      )
    )
    .join("");

  const topFaces = ribbon.segments
    .map((segment) =>
      facePolygon(
        [segment.leftStart, segment.leftEnd, segment.rightEnd, segment.rightStart],
        normalizeHex(tokens.fillLeft),
        normalizeHex(tokens.inkPrimary),
        Math.max(0.7, tokens.lineWidth - 0.35),
        "face-hatch-top"
      )
    )
    .join("");
  const startCap = ribbon.startCap
    ? facePolygon(
        [ribbon.startCap.a, ribbon.startCap.b, ribbon.startCap.bDepth, ribbon.startCap.aDepth],
        normalizeHex(tokens.fillTop),
        normalizeHex(tokens.inkSecondary),
        Math.max(0.55, tokens.lineWidth - 0.55),
        "face-hatch-right"
      )
    : "";
  const endCap = ribbon.endCap
    ? facePolygon(
        [ribbon.endCap.a, ribbon.endCap.b, ribbon.endCap.bDepth, ribbon.endCap.aDepth],
        normalizeHex(tokens.fillTop),
        normalizeHex(tokens.inkSecondary),
        Math.max(0.55, tokens.lineWidth - 0.55),
        "face-hatch-right"
      )
    : "";

  const centerline = linePath(routePoints, false);

  return `<g ${attrs}>
    ${sideFaces}
    ${startCap}
    ${endCap}
    ${topFaces}
    <path d="${centerline}" fill="none" stroke="${normalizeHex(tokens.bgPaper)}" stroke-opacity="0.32" stroke-width="${Math.max(
    0.95,
    width * 0.24
  ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${centerline}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-opacity="0.58" stroke-width="${Math.max(
    0.7,
    width * 0.11
  ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function renderManifold(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const base = renderBox(
    {
      ...node,
      type: "box",
      params: {
        width: asNumber(node.params.width, 1.2),
        height: asNumber(node.params.height, 0.72),
        depth: asNumber(node.params.depth, 0.9),
        panelInset: 0.07,
      },
    },
    tokens,
    ctx,
    attrs
  );

  const portMarkup = (node.ports ?? [])
    .map((port) => {
      const p = projectNodePoint(node, port.local, ctx);
      return `<circle cx="${p.x}" cy="${p.y}" r="${Math.max(1.2, tokens.lineWidth + 0.2)}" fill="${normalizeHex(
        tokens.bgPaper
      )}" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(0.6, tokens.lineWidth - 0.5)}"/>`;
    })
    .join("");

  return `${base}<g class="manifold-ports">${portMarkup}</g>`;
}

function renderTankHorizontal(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const rotated: Node = {
    ...node,
    type: "cylinder",
    transform3D: {
      ...node.transform3D,
      rotation: {
        ...node.transform3D.rotation,
        z: node.transform3D.rotation.z + 90,
      },
    },
  };
  return renderCylinder(rotated, tokens, ctx, attrs);
}

function renderElectrodeStack(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const count = Math.max(3, Math.floor(asNumber(node.params.count, 6)));
  const width = asNumber(node.params.width, 1.8);
  const depth = asNumber(node.params.depth, 1.2);
  const thickness = asNumber(node.params.thickness, 0.08);
  const gap = asNumber(node.params.gap, 0.08);
  const plates: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const y = (i - (count - 1) / 2) * (thickness + gap);
    plates.push(
      renderBox(
        {
          ...node,
          type: "box",
          id: `${node.id}-plate-${i}`,
          params: {
            width,
            height: thickness,
            depth,
            panelInset: 0.02,
          },
          transform3D: {
            ...node.transform3D,
            position: {
              ...node.transform3D.position,
              y: node.transform3D.position.y + y,
            },
          },
        },
        tokens,
        ctx,
        `id="node-${node.id}-plate-${i}" data-node-type="electrode-plate" data-layer="${node.layerId}" data-token-profile="${tokens.id}"`
      )
    );
  }

  return `<g ${attrs}>${plates.join("")}</g>`;
}

function renderWavefront(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const center = projectNodePoint(node, { x: 0, y: 0, z: 0 }, ctx);
  const radius = Math.max(18, asNumber(node.params.radius, 0.85) * WORLD_UNIT_PX * ctx.camera.scale);
  const lines = Math.max(3, Math.floor(asNumber(node.params.lines, 4)));
  const arcMarks: string[] = [];

  for (let i = 0; i < lines; i += 1) {
    const r = radius + i * 14;
    arcMarks.push(
      `<path d="M ${center.x - r} ${center.y} A ${r} ${r * 0.5} 0 0 1 ${center.x + r} ${center.y}" fill="none" stroke="${normalizeHex(
        tokens.inkSecondary
      )}" stroke-width="${Math.max(0.7, tokens.lineWidth - 0.45)}" stroke-dasharray="${i % 2 === 0 ? "none" : "4 5"}"/>`
    );
  }

  return `<g ${attrs}>${arcMarks.join("")}</g>`;
}

function renderPetiole(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  return renderTube(
    {
      ...node,
      type: "tube",
      params: {
        ...node.params,
        radius: asNumber(node.params.radius, 0.05),
      },
    },
    tokens,
    ctx,
    attrs
  );
}

function renderFilament(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  return renderRoot(
    {
      ...node,
      type: "root",
      params: {
        ...node.params,
        width: asNumber(node.params.width, 0.85),
      },
    },
    tokens,
    ctx,
    attrs
  );
}

function renderPlantCell(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 1.2);
  const height = asNumber(node.params.height, 1.35);
  const depth = asNumber(node.params.depth, 0.9);
  const wallInset = Math.max(0.08, asNumber(node.params.wallInset, 0.14));
  const vacuoleScale = clamp(asNumber(node.params.vacuoleScale, 0.52), 0.3, 0.75);
  const nucleusScale = clamp(asNumber(node.params.nucleusScale, 0.2), 0.12, 0.36);

  const body = renderBox(
    {
      ...node,
      type: "box",
      params: {
        width,
        height,
        depth,
        panelInset: wallInset * 0.8,
      },
    },
    tokens,
    ctx,
    attrs
  );

  const cellZ = depth / 2 + 0.001;
  const inner = {
    tl: projectNodePoint(node, { x: -width / 2 + wallInset, y: -height / 2 + wallInset, z: cellZ }, ctx),
    tr: projectNodePoint(node, { x: width / 2 - wallInset, y: -height / 2 + wallInset, z: cellZ }, ctx),
    br: projectNodePoint(node, { x: width / 2 - wallInset, y: height / 2 - wallInset, z: cellZ }, ctx),
    bl: projectNodePoint(node, { x: -width / 2 + wallInset, y: height / 2 - wallInset, z: cellZ }, ctx),
  };

  const vacuoleRadius = Math.min(width, height) * vacuoleScale * 0.28;
  const vacuoleCenter = {
    x: width * 0.12,
    y: -height * 0.02,
    z: cellZ,
  };
  const vacuole = sampleCirclePoints(vacuoleRadius, vacuoleCenter.y, 0, 22).map((point) =>
    projectNodePoint(node, { x: point.x + vacuoleCenter.x, y: point.y, z: point.z + vacuoleCenter.z }, ctx)
  );

  const nucleusRadius = Math.min(width, height) * nucleusScale * 0.3;
  const nucleusCenter = {
    x: -width * 0.16,
    y: -height * 0.05,
    z: cellZ,
  };
  const nucleus = sampleCirclePoints(nucleusRadius, nucleusCenter.y, 0, 18).map((point) =>
    projectNodePoint(node, { x: point.x + nucleusCenter.x, y: point.y, z: point.z + nucleusCenter.z }, ctx)
  );

  const chloroplasts = [
    { x: -width * 0.22, y: height * 0.18, z: cellZ },
    { x: width * 0.16, y: height * 0.24, z: cellZ },
    { x: width * 0.25, y: -height * 0.22, z: cellZ },
  ];

  return `${body}
    <g class="plant-cell-detail">
      <polygon points="${pointsText([inner.tl, inner.tr, inner.br, inner.bl])}" fill="${normalizeHex(tokens.bgPaper)}" fill-opacity="0.3" stroke="${normalizeHex(
    tokens.inkSecondary
  )}" stroke-width="${Math.max(0.6, tokens.lineWidth - 0.52)}" />
      <path d="${linePath(vacuole, true)}" fill="${normalizeHex(tokens.fillTop)}" fill-opacity="0.56" stroke="${normalizeHex(
    tokens.inkSecondary
  )}" stroke-width="${Math.max(0.55, tokens.lineWidth - 0.6)}" />
      <path d="${linePath(nucleus, true)}" fill="${normalizeHex(tokens.fillLeft)}" fill-opacity="0.72" stroke="${normalizeHex(
    tokens.inkPrimary
  )}" stroke-width="${Math.max(0.55, tokens.lineWidth - 0.58)}" />
      ${chloroplasts
        .map((center) => {
          const ring = sampleCirclePoints(Math.max(0.03, nucleusRadius * 0.42), center.y, 0, 10).map((point) =>
            projectNodePoint(node, { x: point.x + center.x, y: point.y, z: point.z + center.z }, ctx)
          );
          return `<path d="${linePath(ring, true)}" fill="${normalizeHex(tokens.fillRight)}" fill-opacity="0.55" stroke="${normalizeHex(
            tokens.inkSecondary
          )}" stroke-width="${Math.max(0.45, tokens.lineWidth - 0.72)}"/>`;
        })
        .join("")}
    </g>`;
}

function renderCellCluster(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const cols = Math.max(2, Math.floor(asNumber(node.params.cols, 4)));
  const rows = Math.max(2, Math.floor(asNumber(node.params.rows, 3)));
  const spacing = asNumber(node.params.spacing, 0.74);
  const cellWidth = asNumber(node.params.cellWidth, 0.72);
  const cellHeight = asNumber(node.params.cellHeight, 0.84);
  const cellDepth = asNumber(node.params.cellDepth, 0.5);
  const nodes: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const localX = (col - (cols - 1) / 2) * spacing;
      const localZ = (row - (rows - 1) / 2) * spacing;
      nodes.push(
        renderPlantCell(
          {
            ...node,
            id: `${node.id}-cell-${row}-${col}`,
            type: "plant-cell",
            transform3D: {
              ...node.transform3D,
              position: {
                x: node.transform3D.position.x + localX,
                y: node.transform3D.position.y + Math.sin((row + col) * 0.9) * 0.05,
                z: node.transform3D.position.z + localZ,
              },
            },
            params: {
              width: cellWidth,
              height: cellHeight,
              depth: cellDepth,
              wallInset: 0.09,
              vacuoleScale: 0.5 + ((row + col) % 3) * 0.05,
              nucleusScale: 0.18,
            },
          },
          tokens,
          ctx,
          `id="node-${node.id}-cell-${row}-${col}" data-node-type="plant-cell" data-layer="${node.layerId}" data-token-profile="${tokens.id}"`
        )
      );
    }
  }

  return `<g ${attrs}>${nodes.join("")}</g>`;
}

function renderImagePanel(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const width = asNumber(node.params.width, 3.4);
  const depth = asNumber(node.params.depth, 2.2);
  const thickness = Math.max(0.06, asNumber(node.params.thickness, 0.14));
  const imageHref = asString(node.params.href, "");
  const imageOpacity = clamp(asNumber(node.params.imageOpacity, 0.92), 0, 1);

  const halfW = width / 2;
  const halfD = depth / 2;
  const topY = -thickness / 2;
  const bottomY = thickness / 2;

  const top = {
    tl: projectNodePoint(node, { x: -halfW, y: topY, z: -halfD }, ctx),
    tr: projectNodePoint(node, { x: halfW, y: topY, z: -halfD }, ctx),
    br: projectNodePoint(node, { x: halfW, y: topY, z: halfD }, ctx),
    bl: projectNodePoint(node, { x: -halfW, y: topY, z: halfD }, ctx),
  };
  const bottom = {
    tl: projectNodePoint(node, { x: -halfW, y: bottomY, z: -halfD }, ctx),
    tr: projectNodePoint(node, { x: halfW, y: bottomY, z: -halfD }, ctx),
    br: projectNodePoint(node, { x: halfW, y: bottomY, z: halfD }, ctx),
    bl: projectNodePoint(node, { x: -halfW, y: bottomY, z: halfD }, ctx),
  };

  const frame = `
    ${facePolygon(
      [top.tl, top.tr, top.br, top.bl],
      normalizeHex(tokens.fillTop),
      normalizeHex(tokens.inkPrimary),
      Math.max(tokens.lineWidth, 0.95),
      "face-hatch-top"
    )}
    ${facePolygon(
      [top.tl, top.bl, bottom.bl, bottom.tl],
      normalizeHex(tokens.fillLeft),
      normalizeHex(tokens.inkPrimary),
      Math.max(tokens.lineWidth - 0.2, 0.75),
      "face-hatch-left"
    )}
    ${facePolygon(
      [top.tr, top.br, bottom.br, bottom.tr],
      normalizeHex(tokens.fillRight),
      normalizeHex(tokens.inkPrimary),
      Math.max(tokens.lineWidth - 0.2, 0.75),
      "face-hatch-right"
    )}
  `;

  let imageMarkup = "";
  if (imageHref.trim().length > 0) {
    const safeNodeId = sanitizeSvgId(node.id);
    const clipId = `image-panel-clip-${safeNodeId}`;
    const minX = Math.min(top.tl.x, top.tr.x, top.br.x, top.bl.x);
    const maxX = Math.max(top.tl.x, top.tr.x, top.br.x, top.bl.x);
    const minY = Math.min(top.tl.y, top.tr.y, top.br.y, top.bl.y);
    const maxY = Math.max(top.tl.y, top.tr.y, top.br.y, top.bl.y);

    imageMarkup = `
      <clipPath id="${clipId}">
        <polygon points="${pointsText([top.tl, top.tr, top.br, top.bl])}"/>
      </clipPath>
      <image href="${escapeAttribute(imageHref)}" x="${minX}" y="${minY}" width="${Math.max(
        1,
        maxX - minX
      )}" height="${Math.max(1, maxY - minY)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" opacity="${imageOpacity}"/>
      <polyline points="${pointsText([top.tl, top.tr, top.br, top.bl, top.tl])}" fill="none" stroke="${normalizeHex(
        tokens.inkPrimary
      )}" stroke-width="${Math.max(tokens.lineWidth + 0.32, 1.12)}"/>
    `;
  }

  return `<g ${attrs}>${frame}${imageMarkup}</g>`;
}

function renderAnchor(node: Node, tokens: TokenSet, ctx: RenderContext, attrs: string): string {
  const p = projectNodePoint(node, { x: 0, y: 0, z: 0 }, ctx);
  return `<circle ${attrs} cx="${p.x}" cy="${p.y}" r="2" fill="${normalizeHex(tokens.inkPrimary)}"/>`;
}

function connectorProjectedPoints(
  node: Node,
  ctx: RenderContext,
  fallback: Vector3[],
  smooth = false
): Array<{ x: number; y: number }> {
  const worldPoints = resolveConnectorWorldPoints(node, ctx, fallback, smooth);
  return worldPoints.map((point) => projectPoint(point, ctx.camera, ctx.viewport));
}

function resolveConnectorWorldPoints(node: Node, ctx: RenderContext, fallback: Vector3[], smooth: boolean): Vector3[] {
  const points = asVectorArray(node.params.points, fallback);
  const waypointsWorld = points.map((point) => applyNodeTransform(point, node.transform3D));
  const portRefs = asPortRefs(node.params.portRefs);
  const routeStyle = asString(node.params.routeStyle, "direct");
  const orthogonal = routeStyle === "orthogonal";
  const routeLayer = asNumberMaybe(node.params.routeLayer) ?? 0;
  const routeLayerStep = asNumberMaybe(node.params.routeLayerStep) ?? 0.06;
  const routePlaneYRaw = asNumberMaybe(node.params.routePlaneY);
  const portStub = asNumberMaybe(node.params.portStub) ?? 0.26;
  const axisPreference = asString(node.params.axisPreference, "auto");
  const keepWaypoints = asBoolean(node.params.keepWaypoints, true);

  if (portRefs.length < 2) {
    const snapped = snapConnectorEndpointsToPorts(waypointsWorld, ctx, node.id);
    const fallbackPlane = routePlaneYRaw ?? (snapped[0] && snapped[snapped.length - 1] ? (snapped[0].y + snapped[snapped.length - 1].y) / 2 : undefined);
    const routePlaneY = fallbackPlane !== undefined ? fallbackPlane + routeLayer * routeLayerStep : undefined;
    const routed = orthogonal ? orthogonalizePoints(snapped, routePlaneY, axisPreference) : snapped;
    return sanitizeConnectorPath(routed, smooth);
  }

  const start = resolvePortRefPoint(portRefs[0], ctx);
  const end = resolvePortRefPoint(portRefs[portRefs.length - 1], ctx);
  if (!start || !end) {
    const fallbackPlane = routePlaneYRaw ?? (waypointsWorld[0] && waypointsWorld[waypointsWorld.length - 1] ? (waypointsWorld[0].y + waypointsWorld[waypointsWorld.length - 1].y) / 2 : undefined);
    const routePlaneY = fallbackPlane !== undefined ? fallbackPlane + routeLayer * routeLayerStep : undefined;
    const routed = orthogonal ? orthogonalizePoints(waypointsWorld, routePlaneY, axisPreference) : waypointsWorld;
    return sanitizeConnectorPath(routed, smooth);
  }

  const middle = keepWaypoints && waypointsWorld.length > 2 ? waypointsWorld.slice(1, -1) : [];
  const span = subtract3(end.point, start.point);
  const startOutward = chooseStubDirection(start.outward, span);
  const endOutward = chooseStubDirection(end.outward, scale3(span, -1));
  const startExit = add3(start.point, scale3(startOutward, portStub));
  const endEntry = add3(end.point, scale3(endOutward, portStub));
  const routePlaneY = (routePlaneYRaw ?? (startExit.y + endEntry.y) / 2) + routeLayer * routeLayerStep;
  const merged = [start.point, startExit, ...middle, endEntry, end.point];
  const routed = orthogonal ? orthogonalizePoints(merged, routePlaneY, axisPreference) : merged;
  return sanitizeConnectorPath(routed, smooth);
}

function resolvePortRefPoint(
  ref: { nodeId: string; portId?: string },
  ctx: RenderContext
): { point: Vector3; outward: Vector3 } | undefined {
  const target = ctx.nodesById.get(ref.nodeId);
  if (!target) {
    return undefined;
  }

  const port = resolveNodePort(target, ref.portId);
  if (port) {
    return {
      point: applyNodeTransform(port.local, target.transform3D),
      outward: inferPortOutwardVector(port.local, port.id),
    };
  }

  return {
    point: target.transform3D.position,
    outward: { x: 1, y: 0, z: 0 },
  };
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

function renderBoxBevelOverlay(
  node: Node,
  ctx: RenderContext,
  width: number,
  height: number,
  depth: number,
  inset: number,
  tokens: TokenSet
): string {
  const x = width / 2 - inset;
  const y = height / 2 - inset * 0.72;
  const z = depth / 2 - inset;
  if (x <= 0 || y <= 0 || z <= 0) {
    return "";
  }

  const tl = projectNodePoint(node, { x: -x, y: -y, z }, ctx);
  const tr = projectNodePoint(node, { x, y: -y, z }, ctx);
  const br = projectNodePoint(node, { x, y, z }, ctx);
  const bl = projectNodePoint(node, { x: -x, y, z }, ctx);

  return `<g class="box-bevel">
    <polygon points="${pointsText([tl, tr, br, bl])}" fill="none" stroke="${normalizeHex(tokens.inkSecondary)}" stroke-width="${Math.max(
    0.7,
    tokens.lineWidth - 0.45
  )}" stroke-opacity="0.62"/>
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

function pointsText(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
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

function roundPolylinePoints2D(
  points: Array<{ x: number; y: number }>,
  radius: number,
  segments = 3
): Array<{ x: number; y: number }> {
  if (points.length < 3 || radius <= 0.5) {
    return points;
  }

  const out: Array<{ x: number; y: number }> = [points[0]];

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const inDir = normalizeDirection2D(prev, curr);
    const outDir = normalizeDirection2D(next, curr);
    const turn = Math.abs(inDir.x * outDir.y - inDir.y * outDir.x);

    if (turn < 0.05) {
      out.push(curr);
      continue;
    }

    const inDist = Math.min(distance2(prev, curr) * 0.42, radius);
    const outDist = Math.min(distance2(next, curr) * 0.42, radius);

    const pA = { x: curr.x + inDir.x * inDist, y: curr.y + inDir.y * inDist };
    const pB = { x: curr.x + outDir.x * outDist, y: curr.y + outDir.y * outDist };

    out.push(pA);
    for (let s = 1; s < segments; s += 1) {
      const t = s / segments;
      out.push(quadPoint(pA, curr, pB, t));
    }
    out.push(pB);
  }

  out.push(points[points.length - 1]);
  return dedupePoints2D(out, 0.2);
}

function quadPoint(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, t: number): {
  x: number;
  y: number;
} {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * b.x + t * t * c.x,
    y: mt * mt * a.y + 2 * mt * t * b.y + t * t * c.y,
  };
}

function dedupePoints2D(points: Array<{ x: number; y: number }>, epsilon: number): Array<{ x: number; y: number }> {
  if (points.length < 2) {
    return points;
  }
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (distance2(points[i], out[out.length - 1]) > epsilon) {
      out.push(points[i]);
    }
  }
  return out;
}

function simplifyPolyline2D(
  points: Array<{ x: number; y: number }>,
  minDistance = 1.2,
  collinearThreshold = 0.018
): Array<{ x: number; y: number }> {
  if (points.length < 3) {
    return points;
  }

  const deduped: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (distance2(points[i], deduped[deduped.length - 1]) >= minDistance) {
      deduped.push(points[i]);
    }
  }
  if (distance2(deduped[deduped.length - 1], points[points.length - 1]) > 0.5) {
    deduped.push(points[points.length - 1]);
  }

  if (deduped.length < 3) {
    return deduped;
  }

  const out: Array<{ x: number; y: number }> = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i += 1) {
    const prev = out[out.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const a = { x: curr.x - prev.x, y: curr.y - prev.y };
    const b = { x: next.x - curr.x, y: next.y - curr.y };
    const aLen = Math.sqrt(a.x * a.x + a.y * a.y) || 1;
    const bLen = Math.sqrt(b.x * b.x + b.y * b.y) || 1;
    const cross = Math.abs(a.x * b.y - a.y * b.x) / (aLen * bLen);
    if (cross > collinearThreshold) {
      out.push(curr);
    }
  }
  out.push(deduped[deduped.length - 1]);
  return out;
}

function projectedDepthOffset(node: Node, ctx: RenderContext, localOffset: Vector3): { x: number; y: number } {
  const base = projectNodePoint(node, { x: 0, y: 0, z: 0 }, ctx);
  const offset = projectNodePoint(node, localOffset, ctx);
  return {
    x: offset.x - base.x,
    y: offset.y - base.y,
  };
}

function offsetPoint(point: { x: number; y: number }, dx: number, dy: number): { x: number; y: number } {
  return { x: point.x + dx, y: point.y + dy };
}

function offsetPoints(
  points: Array<{ x: number; y: number }>,
  dx: number,
  dy: number
): Array<{ x: number; y: number }> {
  return points.map((point) => offsetPoint(point, dx, dy));
}

function normalizeDirection2D(end: { x: number; y: number }, start: { x: number; y: number }): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: dx / length,
    y: dy / length,
  };
}

function buildConnectorRibbon(
  points: Array<{ x: number; y: number }>,
  width: number,
  depthOffset: { x: number; y: number }
): RibbonCaps & { segments: RibbonSegment[] } {
  const segments: RibbonSegment[] = [];
  if (points.length < 2) {
    return { segments };
  }

  const depthDirection = normalizeDirection2D(
    { x: depthOffset.x, y: depthOffset.y },
    { x: 0, y: 0 }
  );
  const depthX = Math.abs(depthOffset.x) < 0.1 && Math.abs(depthOffset.y) < 0.1 ? -2.2 : depthOffset.x;
  const depthY = Math.abs(depthOffset.x) < 0.1 && Math.abs(depthOffset.y) < 0.1 ? 1.8 : depthOffset.y;
  const half = width / 2;

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const dir = normalizeDirection2D(end, start);
    const normal = { x: -dir.y, y: dir.x };

    const leftStart = offsetPoint(start, normal.x * half, normal.y * half);
    const leftEnd = offsetPoint(end, normal.x * half, normal.y * half);
    const rightStart = offsetPoint(start, -normal.x * half, -normal.y * half);
    const rightEnd = offsetPoint(end, -normal.x * half, -normal.y * half);

    const sideBias = normal.x * depthDirection.x + normal.y * depthDirection.y >= 0;
    const sideA = sideBias ? leftStart : rightStart;
    const sideB = sideBias ? leftEnd : rightEnd;

    segments.push({
      leftStart,
      leftEnd,
      rightStart,
      rightEnd,
      sideA,
      sideB,
      sideADepth: offsetPoint(sideA, depthX, depthY),
      sideBDepth: offsetPoint(sideB, depthX, depthY),
    });
  }

  if (segments.length === 0) {
    return { segments };
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  const startCap = {
    a: first.leftStart,
    b: first.rightStart,
    aDepth: offsetPoint(first.leftStart, depthX, depthY),
    bDepth: offsetPoint(first.rightStart, depthX, depthY),
  };
  const endCap = {
    a: last.leftEnd,
    b: last.rightEnd,
    aDepth: offsetPoint(last.leftEnd, depthX, depthY),
    bDepth: offsetPoint(last.rightEnd, depthX, depthY),
  };

  return { segments, startCap, endCap };
}

function sampleConnectorEnvelope(points: Vector3[], halfWidth: number): Vector3[] {
  const normalizedHalf = Math.max(0.02, halfWidth);
  return points.flatMap((point) => [
    { x: point.x - normalizedHalf, y: point.y, z: point.z },
    { x: point.x + normalizedHalf, y: point.y, z: point.z },
    { x: point.x, y: point.y - normalizedHalf, z: point.z },
    { x: point.x, y: point.y + normalizedHalf, z: point.z },
    { x: point.x, y: point.y, z: point.z - normalizedHalf },
    { x: point.x, y: point.y, z: point.z + normalizedHalf },
  ]);
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

function asPortRefs(value: unknown): Array<{ nodeId: string; portId?: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const refs: Array<{ nodeId: string; portId?: string }> = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const maybeNodeId = (item as { nodeId?: unknown }).nodeId;
    const maybePortId = (item as { portId?: unknown }).portId;
    if (typeof maybeNodeId !== "string" || maybeNodeId.length === 0) {
      return;
    }
    refs.push({
      nodeId: maybeNodeId,
      portId: typeof maybePortId === "string" && maybePortId.length > 0 ? maybePortId : undefined,
    });
  });
  return refs;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumberMaybe(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveNodePort(
  node: Node,
  portId?: string
): { id: string; local: Vector3; direction: "in" | "out" | "bidirectional" } | undefined {
  const list =
    node.ports && node.ports.length > 0
      ? node.ports
      : implicitPortsForNode(node);
  if (!list || list.length === 0) {
    return undefined;
  }

  if (portId) {
    const exact = list.find((entry) => entry.id === portId);
    if (exact) {
      return exact;
    }
    const normalized = normalizePortId(portId);
    const soft = list.find((entry) => normalizePortId(entry.id) === normalized);
    if (soft) {
      return soft;
    }
    const synonyms = portSynonyms(normalized);
    const alias = list.find((entry) => synonyms.includes(normalizePortId(entry.id)));
    if (alias) {
      return alias;
    }
  }

  return list[0];
}

function normalizePortId(value: string): string {
  return value.trim().toLowerCase().replaceAll(/[\s_-]+/g, "");
}

function portSynonyms(id: string): string[] {
  if (id === "left" || id === "in" || id === "west" || id === "back") {
    return ["left", "in", "west", "back"];
  }
  if (id === "right" || id === "out" || id === "east" || id === "front") {
    return ["right", "out", "east", "front"];
  }
  if (id === "top" || id === "up") {
    return ["top", "up"];
  }
  if (id === "bottom" || id === "down") {
    return ["bottom", "down"];
  }
  return [id];
}

function implicitPortsForNode(
  node: Node
): Array<{ id: string; local: Vector3; direction: "in" | "out" | "bidirectional" }> {
  const width = asNumber(node.params.width, 1.1);
  const depth = asNumber(node.params.depth, 1.1);
  const height = asNumber(node.params.height, 1.1);

  if (node.type === "atom") {
    const r = atomRadiusWorld(asNumber(node.params.radius, 0.24));
    return [
      { id: "left", local: { x: -r, y: 0, z: 0 }, direction: "bidirectional" },
      { id: "right", local: { x: r, y: 0, z: 0 }, direction: "bidirectional" },
      { id: "top", local: { x: 0, y: -r, z: 0 }, direction: "out" },
      { id: "bottom", local: { x: 0, y: r, z: 0 }, direction: "in" },
    ];
  }

  if (node.type === "cylinder" || node.type === "tank-horizontal") {
    const radius = asNumber(node.params.radius, 0.34);
    const tubeLength = asNumber(node.params.height, 1.4) / 2;
    return [
      { id: "left", local: { x: -tubeLength, y: 0, z: 0 }, direction: "in" },
      { id: "right", local: { x: tubeLength, y: 0, z: 0 }, direction: "out" },
      { id: "top", local: { x: 0, y: -radius, z: 0 }, direction: "bidirectional" },
      { id: "front", local: { x: 0, y: 0, z: radius }, direction: "bidirectional" },
      { id: "back", local: { x: 0, y: 0, z: -radius }, direction: "bidirectional" },
    ];
  }

  if (node.type === "disk-array") {
    const rows = asNumber(node.params.rows, 6);
    const cols = asNumber(node.params.cols, 8);
    const spacing = asNumber(node.params.spacing, 0.45);
    const halfW = Math.max(0.2, ((cols - 1) * spacing) / 2);
    const halfD = Math.max(0.2, ((rows - 1) * spacing) / 2);
    return [
      { id: "left", local: { x: -halfW, y: 0, z: 0 }, direction: "in" },
      { id: "right", local: { x: halfW, y: 0, z: 0 }, direction: "out" },
      { id: "top", local: { x: 0, y: -0.05, z: 0 }, direction: "out" },
      { id: "front", local: { x: 0, y: 0, z: halfD }, direction: "bidirectional" },
      { id: "back", local: { x: 0, y: 0, z: -halfD }, direction: "bidirectional" },
    ];
  }

  if (node.type === "pcb-trace" || node.type === "bus" || node.type === "tube" || node.type === "arrow") {
    const points = asVectorArray(node.params.points, [
      { x: -0.5, y: 0, z: 0 },
      { x: 0.5, y: 0, z: 0 },
    ]);
    const first = points[0];
    const last = points[points.length - 1];
    return [
      { id: "in", local: first, direction: "in" },
      { id: "out", local: last, direction: "out" },
      { id: "left", local: first, direction: "bidirectional" },
      { id: "right", local: last, direction: "bidirectional" },
    ];
  }

  const halfW = Math.max(0.18, width / 2);
  const halfH = Math.max(0.12, height / 2);
  const halfD = Math.max(0.18, depth / 2);
  return [
    { id: "left", local: { x: -halfW, y: 0, z: 0 }, direction: "in" },
    { id: "right", local: { x: halfW, y: 0, z: 0 }, direction: "out" },
    { id: "top", local: { x: 0, y: -halfH, z: 0 }, direction: "out" },
    { id: "bottom", local: { x: 0, y: halfH, z: 0 }, direction: "in" },
    { id: "front", local: { x: 0, y: 0, z: halfD }, direction: "bidirectional" },
    { id: "back", local: { x: 0, y: 0, z: -halfD }, direction: "bidirectional" },
  ];
}

function inferPortOutwardVector(local: Vector3, portId?: string): Vector3 {
  const absX = Math.abs(local.x);
  const absY = Math.abs(local.y);
  const absZ = Math.abs(local.z);
  const eps = 0.0001;

  if (absX > absY && absX > absZ && absX > eps) {
    return { x: Math.sign(local.x), y: 0, z: 0 };
  }
  if (absZ > absX && absZ > absY && absZ > eps) {
    return { x: 0, y: 0, z: Math.sign(local.z) };
  }
  if (absY > eps) {
    return { x: 0, y: Math.sign(local.y), z: 0 };
  }

  const normalized = portId ? normalizePortId(portId) : "";
  if (["left", "in", "west", "back"].includes(normalized)) {
    return { x: -1, y: 0, z: 0 };
  }
  if (["right", "out", "east", "front"].includes(normalized)) {
    return { x: 1, y: 0, z: 0 };
  }
  if (["top", "up"].includes(normalized)) {
    return { x: 0, y: -1, z: 0 };
  }
  if (["bottom", "down"].includes(normalized)) {
    return { x: 0, y: 1, z: 0 };
  }
  return { x: 1, y: 0, z: 0 };
}

function snapConnectorEndpointsToPorts(
  points: Vector3[],
  ctx: RenderContext,
  sourceNodeId: string
): Vector3[] {
  if (points.length < 2) {
    return points;
  }
  const snapped = [...points];
  const maxSnapDistance = 1.35;

  const startSnap = findNearestPortWorldPoint(points[0], ctx, sourceNodeId, maxSnapDistance);
  const endSnap = findNearestPortWorldPoint(points[points.length - 1], ctx, sourceNodeId, maxSnapDistance);

  if (startSnap) {
    snapped[0] = startSnap;
  }
  if (endSnap) {
    snapped[snapped.length - 1] = endSnap;
  }
  return snapped;
}

function findNearestPortWorldPoint(
  point: Vector3,
  ctx: RenderContext,
  sourceNodeId: string,
  maxDistance: number
): Vector3 | undefined {
  let best: Vector3 | undefined;
  let bestDistance = maxDistance;

  ctx.nodesById.forEach((candidate, nodeId) => {
    if (nodeId === sourceNodeId || !candidate.ports || candidate.ports.length === 0) {
      return;
    }
    candidate.ports.forEach((port) => {
      const world = applyNodeTransform(port.local, candidate.transform3D);
      const dist = distance3(point, world);
      if (dist < bestDistance) {
        best = world;
        bestDistance = dist;
      }
    });
  });

  return best;
}

function orthogonalizePoints(points: Vector3[], routePlaneY?: number, axisPreference = "auto"): Vector3[] {
  if (points.length < 2) {
    return points;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const plane =
    routePlaneY !== undefined
      ? routePlaneY
      : points.length > 1
      ? (points[0].y + points[points.length - 1].y) / 2
      : points[0].y;

  const preprocessed: Vector3[] = [start];
  if (Math.abs(start.y - plane) > 0.0008) {
    preprocessed.push({ x: start.x, y: plane, z: start.z });
  }
  points.slice(1, -1).forEach((point) => {
    preprocessed.push({ ...point, y: plane });
  });
  if (Math.abs(end.y - plane) > 0.0008) {
    preprocessed.push({ x: end.x, y: plane, z: end.z });
  }
  preprocessed.push(end);

  const result: Vector3[] = [preprocessed[0]];

  for (let i = 1; i < preprocessed.length; i += 1) {
    const prev = result[result.length - 1];
    const current = preprocessed[i];

    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const dz = current.z - prev.z;

    if ((Math.abs(dx) <= 0.01 || Math.abs(dz) <= 0.01) && Math.abs(dy) <= 0.01) {
      result.push(current);
      continue;
    }

    if (Math.abs(dx) <= 0.01 && Math.abs(dz) <= 0.01 && Math.abs(dy) > 0.01) {
      result.push(current);
      continue;
    }

    const elbowFirstX = {
      x: current.x,
      y: prev.y,
      z: prev.z,
    };
    const elbowFirstZ = {
      x: prev.x,
      y: prev.y,
      z: current.z,
    };
    const elbowY = {
      x: current.x,
      y: current.y,
      z: current.z,
    };

    const chooseXFirst =
      axisPreference === "x-first"
        ? true
        : axisPreference === "z-first"
        ? false
        : Math.abs(dx) >= Math.abs(dz);
    const elbow = chooseXFirst ? elbowFirstX : elbowFirstZ;
    const last = result[result.length - 1];
    if (distance3(last, elbow) > 0.001) {
      result.push(elbow);
    }
    if (Math.abs(current.y - elbow.y) > 0.001 && distance3(result[result.length - 1], elbowY) > 0.001) {
      result.push({ x: elbow.x, y: current.y, z: elbow.z });
    }
    result.push(current);
  }

  const deduped: Vector3[] = [];
  result.forEach((point) => {
    const last = deduped[deduped.length - 1];
    if (!last || distance3(last, point) > 0.0008) {
      deduped.push(point);
    }
  });
  return deduped;
}

function distance3(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distance2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function subtract3(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot3(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize3(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function chooseStubDirection(preferred: Vector3, toward: Vector3): Vector3 {
  const preferredUnit = normalize3(preferred);
  const towardUnit = normalize3(toward);
  return dot3(preferredUnit, towardUnit) < 0.2 ? towardUnit : preferredUnit;
}

function sanitizeConnectorPath(points: Vector3[], smooth: boolean): Vector3[] {
  const deduped: Vector3[] = [];
  points.forEach((point) => {
    const last = deduped[deduped.length - 1];
    if (!last || distance3(last, point) > 0.0009) {
      deduped.push(point);
    }
  });

  if (deduped.length < 3) {
    return deduped;
  }

  const simplified: Vector3[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i += 1) {
    const prev = simplified[simplified.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const a = subtract3(curr, prev);
    const b = subtract3(next, curr);
    const aLen = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1;
    const bLen = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z) || 1;
    const cross = {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
    const crossMag = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    const collinear = crossMag / (aLen * bLen) < (smooth ? 0.018 : 0.012);
    if (!collinear) {
      simplified.push(curr);
    }
  }
  simplified.push(deduped[deduped.length - 1]);
  return simplified;
}

function add3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function scale3(v: Vector3, scalar: number): Vector3 {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  };
}

function nodeAnimationClass(nodeId: string, map: Map<string, AnimationSpec[]>): string {
  const list = map.get(nodeId);
  if (!list || list.length === 0) {
    return "";
  }

  return list
    .map((animation) => {
      const recipe = animation.fallback?.recipe ?? animation.type;
      return animationRecipes[recipe]?.className ?? "";
    })
    .filter((value) => value.length > 0)
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

function sanitizeSvgId(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9_-]+/g, "-");
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function mixHex(a: string, b: string, t: number): string {
  const mix = clamp(t, 0, 1);
  const ca = hexToRgb(normalizeHex(a));
  const cb = hexToRgb(normalizeHex(b));
  const r = Math.round(ca.r + (cb.r - ca.r) * mix);
  const g = Math.round(ca.g + (cb.g - ca.g) * mix);
  const bOut = Math.round(ca.b + (cb.b - ca.b) * mix);
  return `#${toHex(r)}${toHex(g)}${toHex(bOut)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const safe = cleaned.length === 3
    ? cleaned
        .split("")
        .map((ch) => `${ch}${ch}`)
        .join("")
    : cleaned.padEnd(6, "0").slice(0, 6);
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16),
  };
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967295;
  return clamp(normalized, 0, 1);
}
