import { animationStyleBlock } from "./animations";
import { renderAnnotations } from "./annotations";
import { cameraPresets, buildIsometricGridPaths, normalizeHex } from "./projection";
import { renderNode } from "./primitives";
import { autoFitCamera, composeNodes, getVisibleNodes, projectSceneBounds, sortNodesByDepth } from "./scene";
import type { AnimationSpec, SceneDocument } from "./types";

export type CompileOptions = {
  width?: number;
  height?: number;
  includeAnnotations?: boolean;
  showGrid?: boolean;
  fitToFrame?: boolean;
  fitTarget?: "scene" | "subject";
  fitNodeIds?: string[];
  subjectPadding?: number;
  previewMode?: "card" | "builder";
  annotationLayoutMode?: "manual" | "auto-outside";
  gridPitchOverride?: number;
};

export function compileSceneToSvg(scene: SceneDocument, options: CompileOptions = {}): string {
  const width = options.width ?? 1280;
  const height = options.height ?? 800;

  const breakpoint = pickBreakpoint(scene, width);
  const baseCamera = breakpoint
    ? {
        ...cameraPresets[breakpoint.cameraPreset],
        scale: scene.camera.scale,
        origin: { ...scene.camera.origin },
        manualZoom: scene.camera.manualZoom,
        manualPan: scene.camera.manualPan,
        presetId: breakpoint.cameraPreset,
      }
    : scene.camera;

  const includeAnnotations = options.includeAnnotations ?? scene.annotations.visible;
  const showGrid = options.showGrid ?? scene.rendering.showGridByDefault;
  const fitToFrame = options.fitToFrame ?? scene.composition.fitMode === "auto";
  const previewMode = options.previewMode ?? "builder";
  const fitTarget = options.fitTarget ?? (previewMode === "card" ? "subject" : "scene");
  const fitNodeIds = options.fitNodeIds ?? (fitTarget === "subject" ? scene.composition.subjectNodeIds : undefined);
  const subjectPadding = options.subjectPadding ?? (previewMode === "card" ? 36 : scene.composition.framePadding);
  const annotationLayoutMode =
    options.annotationLayoutMode ?? (breakpoint?.annotationMode === "compact" ? "auto-outside" : "auto-outside");

  const viewport = { width, height };
  const visibleNodes = composeNodes(scene, getVisibleNodes(scene));

  const renderCamera = fitToFrame
    ? autoFitCamera(scene, visibleNodes, viewport, baseCamera, {
        fitTarget,
        fitNodeIds,
        subjectPadding,
      })
    : baseCamera;
  const sortedNodes = sortNodesByDepth(visibleNodes, renderCamera);
  const nodeLookup = new Map(sortedNodes.map((node) => [node.id, node]));
  const mainBounds = projectSceneBounds(sortedNodes, renderCamera, viewport);

  const animationsByNode = new Map<string, AnimationSpec[]>();
  scene.animations.forEach((animation) => {
    const targets = animation.targets?.map((entry) => entry.nodeId) ?? animation.targetNodeIds;
    targets.forEach((target) => {
      const list = animationsByNode.get(target) ?? [];
      list.push(animation);
      animationsByNode.set(target, list);
    });
  });

  const nodeMarkup = sortedNodes
    .map((node) =>
      renderNode(node, scene.tokens, {
        viewport,
        camera: renderCamera,
        animationsByNode,
        nodesById: nodeLookup,
      })
    )
    .join("\n");

  const grid = buildIsometricGridPaths(
    viewport,
    renderCamera,
    options.gridPitchOverride ?? scene.rendering.gridPitch,
    scene.rendering.gridOpacity
  );

  const gridMarkup = showGrid
    ? `<g id="layer-grid" data-layer="grid">
        <path d="${grid.xPath}" stroke="${normalizeHex(scene.tokens.inkSecondary)}" stroke-opacity="${(
        grid.opacity * 0.5
      ).toFixed(3)}" stroke-width="0.75" fill="none"/>
        <path d="${grid.zPath}" stroke="${normalizeHex(scene.tokens.inkSecondary)}" stroke-opacity="${(
        grid.opacity * 0.45
      ).toFixed(3)}" stroke-width="0.75" fill="none"/>
        <path d="${grid.yPath}" stroke="${normalizeHex(scene.tokens.inkSecondary)}" stroke-opacity="${(
        grid.opacity * 0.3
      ).toFixed(3)}" stroke-width="0.65" fill="none"/>
      </g>`
    : "";

  const annotations = breakpoint?.annotationMode === "compact" ? compactAnnotations(scene) : scene.annotations;

  const annotationMarkup = includeAnnotations
    ? renderAnnotations({
        annotations,
        nodes: sortedNodes,
        camera: renderCamera,
        tokens: scene.tokens,
        viewport,
        mainBounds,
        layoutMode: annotationLayoutMode,
      })
    : "";

  const topHatchOpacity = (0.06 + scene.tokens.hatchDensity * 0.28).toFixed(3);
  const leftHatchOpacity = (0.08 + scene.tokens.hatchDensity * 0.3).toFixed(3);
  const rightHatchOpacity = (0.07 + scene.tokens.hatchDensity * 0.26).toFixed(3);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    scene.meta.title
  )}">
  <defs>
    <pattern id="face-hatch-top" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(30)">
      <line x1="0" y1="0" x2="0" y2="10" stroke="${normalizeHex(scene.tokens.inkSecondary)}" stroke-opacity="${topHatchOpacity}" stroke-width="0.8"/>
    </pattern>
    <pattern id="face-hatch-left" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(65)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${normalizeHex(scene.tokens.inkSecondary)}" stroke-opacity="${leftHatchOpacity}" stroke-width="0.85"/>
    </pattern>
    <pattern id="face-hatch-right" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-25)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${normalizeHex(scene.tokens.inkSecondary)}" stroke-opacity="${rightHatchOpacity}" stroke-width="0.8"/>
    </pattern>
    <marker id="arrow-head" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto-start-reverse">
      <path d="M0,0 L12,6 L0,12 z" fill="${normalizeHex(scene.tokens.inkSecondary)}"/>
    </marker>
  </defs>
  <style>
    .scene-bg { fill: ${normalizeHex(scene.tokens.bgPaper)}; }
    ${animationStyleBlock()}
  </style>
  <rect class="scene-bg" width="100%" height="100%"></rect>
  ${gridMarkup}
  <g id="layer-main" data-layer="main">
    ${nodeMarkup}
  </g>
  ${annotationMarkup}
</svg>
`.trim();
}

function compactAnnotations(scene: SceneDocument): SceneDocument["annotations"] {
  const labels = [...scene.annotations.labels]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 4);

  return {
    ...scene.annotations,
    labels,
    equations: scene.annotations.equations.slice(0, 1),
    legend: scene.annotations.legend.slice(0, 2),
    layout: {
      ...scene.annotations.layout,
      maxLabelWidth: Math.min(scene.annotations.layout.maxLabelWidth, 180),
      railPadding: Math.min(scene.annotations.layout.railPadding, 72),
    },
  };
}

function pickBreakpoint(
  scene: SceneDocument,
  width: number
): SceneDocument["responsive"]["breakpoints"][number] | undefined {
  if (scene.responsive.mode !== "adaptive") {
    return undefined;
  }
  const sorted = [...scene.responsive.breakpoints].sort((a, b) => b.width - a.width);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (width <= sorted[i].width) {
      return sorted[i];
    }
  }
  return sorted[0];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
