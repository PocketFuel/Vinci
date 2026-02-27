import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SceneViewport } from "../components/SceneViewport";
import { compileSceneToSvg } from "../engine/compiler";
import { jsonToScene, saveFile, sceneToJson } from "../engine/exporters";
import { cameraPresets, screenDeltaToWorldXZ } from "../engine/projection";
import type { CameraPresetId, SceneDocument } from "../engine/types";
import { getSceneByPresetId, presetManifest } from "../data/presets";

export function BuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const presetFromUrl = searchParams.get("preset") ?? presetManifest[0].presetId;

  const [selectedPresetId, setSelectedPresetId] = useState(presetFromUrl);
  const [scene, setScene] = useState<SceneDocument>(() => getSceneByPresetId(presetFromUrl));
  const [status, setStatus] = useState<string>("Ready");
  const [annotationLayoutMode, setAnnotationLayoutMode] = useState<"manual" | "auto-outside">("auto-outside");
  const viewport = useMemo(() => ({ width: 1920, height: 1080 }), []);

  const currentPreset = useMemo(
    () => presetManifest.find((item) => item.presetId === selectedPresetId) ?? presetManifest[0],
    [selectedPresetId]
  );

  function onPresetChange(event: ChangeEvent<HTMLSelectElement>) {
    const presetId = event.target.value;
    const nextScene = getSceneByPresetId(presetId);
    setSelectedPresetId(presetId);
    setScene(nextScene);
    setAnnotationLayoutMode("auto-outside");
    setSearchParams({ preset: presetId });
    setStatus(`Loaded preset: ${presetId}`);
  }

  function onCameraChange(event: ChangeEvent<HTMLSelectElement>) {
    const presetId = event.target.value as CameraPresetId;
    const camera = cameraPresets[presetId];
    setScene((prev) => ({
      ...prev,
      camera: { ...camera, origin: { ...prev.camera.origin }, scale: prev.camera.scale },
    }));
    setStatus(`Camera preset: ${presetId}`);
  }

  function onTokenNumberChange(key: "lineWidth" | "hatchDensity", value: number) {
    setScene((prev) => ({
      ...prev,
      tokens: {
        ...prev.tokens,
        [key]: value,
      },
    }));
  }

  function onRenderingChange(key: "gridOpacity" | "gridPitch", value: number) {
    setScene((prev) => ({
      ...prev,
      rendering: {
        ...prev.rendering,
        [key]: value,
      },
    }));
  }

  function toggleAnnotations() {
    setScene((prev) => ({
      ...prev,
      annotations: {
        ...prev.annotations,
        visible: !prev.annotations.visible,
      },
    }));
  }

  function toggleAutoFit() {
    setScene((prev) => ({
      ...prev,
      composition: {
        ...prev.composition,
        fitMode: prev.composition.fitMode === "auto" ? "manual" : "auto",
      },
    }));
    setStatus("Recomposition mode updated");
  }

  function toggleGrid() {
    setScene((prev) => ({
      ...prev,
      rendering: {
        ...prev.rendering,
        showGridByDefault: !prev.rendering.showGridByDefault,
      },
    }));
  }

  function recomposeScene() {
    setScene((prev) => ({
      ...prev,
      composition: {
        ...prev.composition,
        fitMode: "auto",
      },
      camera: {
        ...prev.camera,
        origin: { ...prev.camera.origin },
        manualPan: { x: 0, y: 0 },
        manualZoom: 1,
      },
    }));
    setStatus("Recomposition pass triggered");
  }

  function onPanCanvas(dx: number, dy: number) {
    setScene((prev) => ({
      ...prev,
      composition: {
        ...prev.composition,
        fitMode: "manual",
      },
      camera: {
        ...prev.camera,
        manualPan: {
          x: (prev.camera.manualPan?.x ?? 0) + dx,
          y: (prev.camera.manualPan?.y ?? 0) + dy,
        },
      },
    }));
  }

  function onDragNode(payload: { nodeId: string; dx: number; dy: number; constrain: boolean }) {
    setScene((prev) => {
      const worldDelta = screenDeltaToWorldXZ({ x: payload.dx, y: payload.dy }, prev.camera, viewport);
      const constrainedWorldDelta = payload.constrain
        ? Math.abs(worldDelta.x) >= Math.abs(worldDelta.z)
          ? { x: worldDelta.x, z: 0 }
          : { x: 0, z: worldDelta.z }
        : worldDelta;

      return {
        ...prev,
        nodes: prev.nodes.map((entry) => {
          if (entry.id !== payload.nodeId) {
            return entry;
          }
          return {
            ...entry,
            transform3D: {
              ...entry.transform3D,
              position: {
                ...entry.transform3D.position,
                x: entry.transform3D.position.x + constrainedWorldDelta.x,
                z: entry.transform3D.position.z + constrainedWorldDelta.z,
              },
            },
          };
        }),
      };
    });
  }

  function updateZoom(delta: number) {
    setScene((prev) => ({
      ...prev,
      composition: {
        ...prev.composition,
        fitMode: "manual",
      },
      camera: {
        ...prev.camera,
        manualZoom: clamp((prev.camera.manualZoom ?? 1) + delta, 0.45, 2.6),
      },
    }));
  }

  function resetView() {
    setScene((prev) => ({
      ...prev,
      camera: {
        ...prev.camera,
        manualZoom: 1,
        manualPan: { x: 0, y: 0 },
      },
    }));
    setStatus("View reset");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if (event.key === "g" || event.key === "G") {
        event.preventDefault();
        toggleGrid();
      }
      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        toggleAnnotations();
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        recomposeScene();
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateZoom(0.08);
      }
      if (event.key === "-") {
        event.preventDefault();
        updateZoom(-0.08);
      }
      if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function exportSvg() {
    const svg = compileSceneToSvg(scene, {
      width: 1920,
      height: 1080,
      includeAnnotations: true,
      showGrid: false,
      fitToFrame: true,
      annotationLayoutMode: "auto-outside",
    });
    saveFile(`${scene.id}.svg`, svg, "image/svg+xml");
    setStatus("Exported SVG (grid off, annotations on)");
  }

  function exportJson() {
    const json = sceneToJson(scene);
    saveFile(`${scene.id}.json`, json, "application/json");
    setStatus("Exported Scene JSON (v1.1)");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = jsonToScene(text);
      setScene(parsed);
      setSelectedPresetId(parsed.id);
      setStatus(`Imported scene: ${parsed.id}`);
    } catch (error) {
      setStatus(`Import failed: ${(error as Error).message}`);
    }
  }

  return (
    <main className="page builder-grid">
      <section className="panel controls-panel">
        <h2>Builder Workspace</h2>
        <p className="muted">Pysometric-inspired compiler with CAD depth, distinct scene compositions, and outside-rail callouts.</p>

        <label className="sh-field">
          <span className="sh-label">Preset</span>
          <select className="sh-input" value={selectedPresetId} onChange={onPresetChange}>
            {presetManifest.map((preset) => (
              <option key={preset.presetId} value={preset.presetId}>
                {preset.title}
              </option>
            ))}
          </select>
        </label>

        <label className="sh-field">
          <span className="sh-label">Camera</span>
          <select className="sh-input" value={scene.camera.presetId} onChange={onCameraChange}>
            {(Object.keys(cameraPresets) as CameraPresetId[]).map((cameraId) => (
              <option key={cameraId} value={cameraId}>
                {cameraId}
              </option>
            ))}
          </select>
        </label>

        <label className="sh-field">
          <span className="sh-label">Callout Layout</span>
          <select className="sh-input" value={annotationLayoutMode} onChange={(e) => setAnnotationLayoutMode(e.target.value as "manual" | "auto-outside") }>
            <option value="auto-outside">auto-outside</option>
            <option value="manual">manual</option>
          </select>
        </label>

        <label className="sh-field sh-inline">
          <span className="inline-toggle">
            <input type="checkbox" checked={scene.composition.fitMode === "auto"} onChange={toggleAutoFit} />
            Auto-fit composition
          </span>
        </label>

        <label className="sh-field sh-inline">
          <span className="inline-toggle">
            <input type="checkbox" checked={scene.rendering.showGridByDefault} onChange={toggleGrid} />
            Show Isometric Grid
          </span>
        </label>

        <label className="sh-field">
          <span className="sh-label">Grid Opacity: {scene.rendering.gridOpacity.toFixed(2)}</span>
          <input
            className="sh-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={scene.rendering.gridOpacity}
            onChange={(event) => onRenderingChange("gridOpacity", Number(event.target.value))}
          />
        </label>

        <label className="sh-field">
          <span className="sh-label">Grid Pitch: {scene.rendering.gridPitch.toFixed(2)}</span>
          <input
            className="sh-range"
            type="range"
            min="0.3"
            max="1.8"
            step="0.01"
            value={scene.rendering.gridPitch}
            onChange={(event) => onRenderingChange("gridPitch", Number(event.target.value))}
          />
        </label>

        <label className="sh-field">
          <span className="sh-label">Line Width: {scene.tokens.lineWidth.toFixed(2)}</span>
          <input
            className="sh-range"
            type="range"
            min="0.8"
            max="3.2"
            step="0.05"
            value={scene.tokens.lineWidth}
            onChange={(event) => onTokenNumberChange("lineWidth", Number(event.target.value))}
          />
        </label>

        <label className="sh-field">
          <span className="sh-label">Face Hatch Density: {scene.tokens.hatchDensity.toFixed(2)}</span>
          <input
            className="sh-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={scene.tokens.hatchDensity}
            onChange={(event) => onTokenNumberChange("hatchDensity", Number(event.target.value))}
          />
        </label>

        <div className="button-row">
          <button className="sh-button" onClick={recomposeScene}>Recompose Scene</button>
          <button className="sh-button" onClick={toggleAnnotations}>{scene.annotations.visible ? "Hide Annotations" : "Show Annotations"}</button>
          <button className="sh-button" onClick={exportSvg}>Export SVG</button>
          <button className="sh-button" onClick={exportJson}>Export JSON</button>
        </div>

        <label className="sh-field import-control">
          <span className="sh-label">Import Scene JSON</span>
          <input className="sh-input sh-file" type="file" accept="application/json,.json" onChange={importJson} />
        </label>

        <div className="status-row" role="status" aria-live="polite">
          {status}
        </div>

        <article className="preset-note">
          <h3>{currentPreset.title}</h3>
          <p>{currentPreset.scientificNotes}</p>
          <p className="muted">Concept: {currentPreset.concept}</p>
        </article>
      </section>

      <section className="panel viewport-panel">
        <SceneViewport
          scene={scene}
          width={1920}
          height={1080}
          onPanCanvas={onPanCanvas}
          onDragNode={onDragNode}
          compileOptions={{
            includeAnnotations: scene.annotations.visible,
            showGrid: scene.rendering.showGridByDefault,
            fitToFrame: scene.composition.fitMode === "auto",
            annotationLayoutMode,
            gridPitchOverride: scene.rendering.gridPitch,
          }}
        />
      </section>
    </main>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
