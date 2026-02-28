import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { compileSceneToSvg, type CompileOptions } from "../engine/compiler";
import { mountGsapRuntime } from "../engine/animations";
import type { SceneDocument } from "../engine/types";

type DragMode = "pan" | "node";

type NodeDragPayload = {
  nodeId: string;
  dx: number;
  dy: number;
  constrain: boolean;
};

type SceneViewportProps = {
  scene: SceneDocument;
  compileOptions?: Omit<CompileOptions, "width" | "height">;
  width?: number;
  height?: number;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onPanCanvas?: (dx: number, dy: number) => void;
  onDragNode?: (payload: NodeDragPayload) => void;
};

export function SceneViewport({
  scene,
  compileOptions,
  width = 1200,
  height = 760,
  selectedNodeId,
  onSelectNode,
  onPanCanvas,
  onDragNode,
}: SceneViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [renderSize, setRenderSize] = useState({ width, height });

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const ratio = width / height;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const availableWidth = entry.contentRect.width;
      const availableHeight = entry.contentRect.height;
      const fittedHeight = availableWidth / ratio;
      const fittedWidth = Math.min(availableWidth, availableHeight * ratio);
      const finalWidth = Math.max(480, Math.round(fittedWidth));
      const finalHeight = Math.max(270, Math.round(Math.min(fittedHeight, availableHeight)));
      setRenderSize({
        width: finalWidth,
        height: finalHeight,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  const svg = useMemo(
    () =>
      compileSceneToSvg(scene, {
        width: renderSize.width,
        height: renderSize.height,
        ...compileOptions,
      }),
    [scene, compileOptions, renderSize.width, renderSize.height]
  );

  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) {
      return;
    }
    const cleanup = mountGsapRuntime(scene, host);
    return cleanup;
  }, [scene, svg]);

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) {
      return;
    }
    host.querySelectorAll(".node-selected").forEach((element) => element.classList.remove("node-selected"));
    if (!selectedNodeId) {
      return;
    }
    const selected = host.querySelector(`#node-${selectedNodeId}`);
    selected?.classList.add("node-selected");
  }, [selectedNodeId, svg]);

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        const target = event.target as HTMLElement | null;
        const isTyping =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.tagName === "SELECT" ||
          target?.isContentEditable;

        if (!isTyping) {
          setSpacePressed(true);
          event.preventDefault();
        }
      }
    }

    function onWindowKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("keyup", onWindowKeyUp);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("keyup", onWindowKeyUp);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const nodeElement = target.closest("[id^='node-']") as HTMLElement | null;
    const nodeId = nodeElement?.id?.replace("node-", "") ?? null;
    const wantsPan = spacePressed || event.button === 1;

    if (wantsPan) {
      setDragMode("pan");
      setDragNodeId(null);
      onSelectNode?.(null);
    } else if (nodeId) {
      setDragMode("node");
      setDragNodeId(nodeId);
      onSelectNode?.(nodeId);
    } else {
      setDragMode(null);
      setDragNodeId(null);
      onSelectNode?.(null);
      return;
    }

    setLastPoint({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragMode || !lastPoint) {
      return;
    }

    let dx = event.clientX - lastPoint.x;
    let dy = event.clientY - lastPoint.y;

    if (dragMode === "node" && event.shiftKey) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        dy = 0;
      } else {
        dx = 0;
      }
    }

    if (dragMode === "pan") {
      onPanCanvas?.(dx, dy);
    } else if (dragMode === "node" && dragNodeId) {
      onDragNode?.({
        nodeId: dragNodeId,
        dx,
        dy,
        constrain: event.shiftKey,
      });
    }

    setLastPoint({ x: event.clientX, y: event.clientY });
  }

  function clearDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragMode) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragMode(null);
    setDragNodeId(null);
    setLastPoint(null);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.code === "Space") {
      setSpacePressed(true);
      event.preventDefault();
    }
  }

  function onKeyUp(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.code === "Space") {
      setSpacePressed(false);
      event.preventDefault();
    }
  }

  function onBlur() {
    setSpacePressed(false);
    setDragMode(null);
    setDragNodeId(null);
    setLastPoint(null);
  }

  return (
    <div
      ref={viewportRef}
      className={`viewport ${spacePressed ? "space-pan" : ""} ${dragMode === "node" ? "node-drag" : ""}`}
      aria-label="SVG scene preview"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clearDrag}
      onPointerCancel={clearDrag}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
    >
      <div className="viewport-center">
        <div className="viewport-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  );
}
