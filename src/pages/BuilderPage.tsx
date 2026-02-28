import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Boxes,
  Bot,
  Camera,
  CheckCircle2,
  Component,
  Download,
  Eye,
  FileJson,
  FlaskConical,
  Grid3X3,
  Import,
  Layers2,
  Leaf,
  Move3D,
  PackagePlus,
  PanelRightOpen,
  Plus,
  Redo2,
  Route,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  Wrench,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SceneViewport } from "../components/SceneViewport";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { compileSceneToSvg } from "../engine/compiler";
import { jsonToScene, saveFile, sceneToJson } from "../engine/exporters";
import { cameraPresets, screenDeltaToWorldXZ } from "../engine/projection";
import { validateSceneScientificGrounding } from "../engine/scientificValidation";
import type { CameraPresetId, Node, SceneDocument, Vector3 } from "../engine/types";
import { getSceneByPresetId, presetManifest } from "../data/presets";
import { getReferencePackById, referencePacks } from "../data/referencePacks";
import type { OrganicConcept, OrganicGenerationRequest, OrganicGenerationResponse, OrganicStyleProfile } from "../agent/types";
import { loadSceneFromDb, saveSceneToDb } from "../lib/sceneDb";
import { autoAnchorLabels, createOrganicGenerationJob, getOrganicGenerationJob, validateScientificScene } from "../lib/organicAgentClient";

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(next[0] ?? value)} />
    </div>
  );
}

type ShapeLibraryItem = {
  id: string;
  label: string;
  type: Node["type"];
  processRole: string;
  params: Node["params"];
  rotation?: Vector3;
  scale?: number;
};

const shapeLibrary: ShapeLibraryItem[] = [
  { id: "box-panel", label: "Panel Box", type: "box", processRole: "transform", params: { width: 1.6, height: 0.7, depth: 1.2, bevel: 0.1, panelInset: 0.08 } },
  { id: "box-tall", label: "Tall Cabinet", type: "box", processRole: "storage", params: { width: 1.1, height: 1.9, depth: 1.0, bevel: 0.08, panelInset: 0.1 } },
  { id: "prism-tri", label: "Tri Prism", type: "prism", processRole: "transform", params: { width: 1.5, height: 1.0, depth: 1.2 } },
  { id: "cone-nozzle", label: "Nozzle Cone", type: "cone", processRole: "transform", params: { radius: 0.56, height: 1.1 } },
  { id: "capsule-node", label: "Capsule Node", type: "capsule", processRole: "storage", params: { length: 1.8, radius: 0.18 } },
  { id: "ring-plate", label: "Ring Plate", type: "ring", processRole: "transform", params: { radius: 0.6, band: 0.18, lift: 0.08 } },
  { id: "dome-shell", label: "Dome Shell", type: "dome", processRole: "transform", params: { radius: 0.66, height: 0.74 } },
  { id: "plate-micro", label: "Micro Plate", type: "plate", processRole: "base", params: { width: 3.4, depth: 2.4, thickness: 0.22, rows: 6, cols: 8, holeRadius: 0.03, traceDensity: 0.5 } },
  { id: "cylinder-post", label: "Cylinder Post", type: "cylinder", processRole: "base", params: { radius: 0.3, height: 0.9 } },
  { id: "tank-horizontal", label: "Horizontal Tank", type: "tank-horizontal", processRole: "storage", params: { radius: 0.42, height: 1.8 } },
  { id: "manifold", label: "Manifold", type: "manifold", processRole: "transform", params: { width: 1.2, height: 0.8, depth: 1.0 } },
  { id: "electrode-stack", label: "Electrode Stack", type: "electrode-stack", processRole: "transform", params: { width: 1.8, depth: 1.2, count: 6, thickness: 0.08, gap: 0.06 } },
  { id: "disk-array", label: "Nanodisk Array", type: "disk-array", processRole: "transform", params: { rows: 6, cols: 8, spacing: 0.45, diskRadius: 0.1 } },
  { id: "rack", label: "Rack Tower", type: "rack", processRole: "storage", params: { width: 1.1, height: 1.9, depth: 0.95, slots: 5 } },
  { id: "chip", label: "Compute Chip", type: "chip", processRole: "transform", params: { width: 1.4, depth: 1.1, height: 0.3, pins: 8 } },
  { id: "chiplet", label: "Chiplet", type: "chiplet", processRole: "transform", params: { width: 0.92, depth: 0.72, height: 0.22, pins: 6 } },
  { id: "atom", label: "Atom Sphere", type: "atom", processRole: "input", params: { radius: 0.2 } },
  { id: "wavefront", label: "Wavefront", type: "wavefront", processRole: "input", params: { radius: 0.85, lines: 4 } },
  { id: "wire-trace", label: "PCB Trace (Wire)", type: "pcb-trace", processRole: "connector", params: { points: [{ x: -1.2, y: 0, z: 0 }, { x: -0.2, y: 0, z: 0.55 }, { x: 1.1, y: 0, z: 0.55 }], crossSection: 0.09 } },
  { id: "wire-bus", label: "Bus Line", type: "bus", processRole: "connector", params: { points: [{ x: -1.4, y: 0, z: -0.25 }, { x: 0, y: 0, z: -0.25 }, { x: 1.3, y: 0, z: 0.45 }], crossSection: 0.13 } },
  { id: "tube-run", label: "Tube Run", type: "tube", processRole: "connector", params: { points: [{ x: -1.1, y: 0, z: 0 }, { x: -0.1, y: 0, z: -0.5 }, { x: 1.1, y: 0, z: 0 }], radius: 0.1 } },
  { id: "arrow-flow", label: "Flow Arrow", type: "arrow", processRole: "connector", params: { points: [{ x: -1.0, y: 0, z: 0 }, { x: 1.2, y: 0, z: 0.2 }] } },
  { id: "leaf", label: "Leaf Blade", type: "leaf", processRole: "organic", params: { width: 0.38, height: 2.0, curl: 0.24, asymmetry: 0.08, veins: 6 }, rotation: { x: 0, y: 0, z: -6 } },
  { id: "petal", label: "Petal", type: "petal", processRole: "organic", params: { width: 0.62, height: 1.22, flare: 0.2 }, rotation: { x: 0, y: 0, z: -4 } },
  { id: "root", label: "Root Strand", type: "root", processRole: "organic", params: { points: [{ x: 0, y: -0.1, z: 0 }, { x: 0.22, y: 0.3, z: 0.16 }, { x: 0.35, y: 0.8, z: 0.36 }], width: 1.0 } },
  { id: "plant-cell", label: "Plant Cell", type: "plant-cell", processRole: "organic", params: { width: 1.24, height: 1.38, depth: 0.78, wallInset: 0.13, vacuoleScale: 0.52, nucleusScale: 0.2 } },
  { id: "cell-cluster", label: "Cell Cluster", type: "cell-cluster", processRole: "organic", params: { rows: 3, cols: 4, spacing: 0.78, cellWidth: 0.68, cellHeight: 0.84, cellDepth: 0.46 } },
];

const organicConceptOptions: Array<{ id: OrganicConcept; label: string; defaultPackId: string }> = [
  { id: "saffron-anatomy", label: "Saffron anatomy", defaultPackId: "saffron-anatomy" },
  { id: "plant-cell", label: "Plant cell structure", defaultPackId: "plant-cell" },
  { id: "plant-tissues", label: "Plant tissue comparison", defaultPackId: "plant-tissues" },
  { id: "plasmonic-reaction", label: "Plasmonic reaction diagram", defaultPackId: "plasmonic-energy" },
];

const organicStyleOptions: Array<{ id: OrganicStyleProfile; label: string }> = [
  { id: "watercolor-botanical", label: "Watercolor botanical" },
  { id: "technical-plate", label: "Technical plate" },
  { id: "hybrid", label: "Hybrid" },
];

export function BuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const presetFromUrl = searchParams.get("preset") ?? presetManifest[0].presetId;

  const [selectedPresetId, setSelectedPresetId] = useState(presetFromUrl);
  const [scene, setScene] = useState<SceneDocument>(() => getSceneByPresetId(presetFromUrl));
  const sceneRef = useRef(scene);
  const historyBypassRef = useRef(false);
  const [status, setStatus] = useState<string>("Ready");
  const [dbStatus, setDbStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [undoStack, setUndoStack] = useState<SceneDocument[]>([]);
  const [redoStack, setRedoStack] = useState<SceneDocument[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const [annotationLayoutMode, setAnnotationLayoutMode] = useState<"manual" | "auto-outside">("auto-outside");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [libraryShapeId, setLibraryShapeId] = useState(shapeLibrary[0]?.id ?? "box-panel");
  const [insertPosition, setInsertPosition] = useState<Vector3>({ x: 0, y: 2.1, z: 0 });
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toolTab, setToolTab] = useState<"presets" | "library" | "generate" | "design">("presets");
  const [presetSearch, setPresetSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [organicConcept, setOrganicConcept] = useState<OrganicConcept>("saffron-anatomy");
  const [organicStyleProfile, setOrganicStyleProfile] = useState<OrganicStyleProfile>("watercolor-botanical");
  const [organicReferencePackId, setOrganicReferencePackId] = useState("saffron-anatomy");
  const [organicRequiredParts, setOrganicRequiredParts] = useState<string[]>(() =>
    getReferencePackById("saffron-anatomy")?.requiredParts.map((part) => part.id) ?? []
  );
  const [organicOrientation, setOrganicOrientation] = useState<"portrait" | "landscape" | "square">("portrait");
  const [organicBackground, setOrganicBackground] = useState<"paper" | "clean-white" | "dark-plate">("paper");
  const [scientificMode, setScientificMode] = useState<OrganicGenerationRequest["strictnessMode"]>("source-locked");
  const [generationStatus, setGenerationStatus] = useState<"idle" | "running" | "error" | "success">("idle");
  const [generationMessage, setGenerationMessage] = useState("No generation request yet.");
  const [lastGenerationResponse, setLastGenerationResponse] = useState<OrganicGenerationResponse | null>(null);
  const [lastGenerationRequest, setLastGenerationRequest] = useState<OrganicGenerationRequest | null>(null);
  const [generationHistory, setGenerationHistory] = useState<
    Array<{ jobId: string; concept: OrganicConcept; style: OrganicStyleProfile; createdAt: string }>
  >([]);
  const [reviewNotesDraft, setReviewNotesDraft] = useState("");

  const viewport = useMemo(() => ({ width: 1920, height: 1080 }), []);

  const currentPreset = useMemo(
    () => presetManifest.find((item) => item.presetId === selectedPresetId) ?? presetManifest[0],
    [selectedPresetId]
  );
  const selectedNode = useMemo(
    () => (selectedNodeId ? scene.nodes.find((node) => node.id === selectedNodeId) ?? null : null),
    [scene.nodes, selectedNodeId]
  );
  const selectedLibraryShape = useMemo(
    () => shapeLibrary.find((entry) => entry.id === libraryShapeId) ?? shapeLibrary[0],
    [libraryShapeId]
  );
  const activeReferencePack = useMemo(
    () => getReferencePackById(organicReferencePackId) ?? referencePacks[0],
    [organicReferencePackId]
  );

  const filteredPresets = useMemo(() => {
    const term = presetSearch.trim().toLowerCase();
    if (!term) {
      return presetManifest;
    }
    return presetManifest.filter((preset) => {
      const title = preset.title.toLowerCase();
      const concept = preset.concept.toLowerCase();
      const tags = preset.tags.join(" ").toLowerCase();
      const notes = preset.scientificNotes.toLowerCase();
      return title.includes(term) || concept.includes(term) || tags.includes(term) || notes.includes(term);
    });
  }, [presetSearch]);

  const filteredLibrary = useMemo(() => {
    const term = librarySearch.trim().toLowerCase();
    if (!term) {
      return shapeLibrary;
    }
    return shapeLibrary.filter((shape) => {
      return (
        shape.label.toLowerCase().includes(term) ||
        shape.type.toLowerCase().includes(term) ||
        shape.processRole.toLowerCase().includes(term)
      );
    });
  }, [librarySearch]);

  useEffect(() => {
    const option = organicConceptOptions.find((entry) => entry.id === organicConcept);
    if (!option) {
      return;
    }
    const pack = getReferencePackById(option.defaultPackId);
    if (!pack) {
      return;
    }
    setOrganicReferencePackId(pack.id);
    setOrganicRequiredParts(pack.requiredParts.map((part) => part.id));
  }, [organicConcept]);

  useEffect(() => {
    setReviewNotesDraft(scene.meta.validation.notes ?? "");
  }, [scene.id, scene.meta.validation.notes]);

  const presetPreviewMap = useMemo(() => {
    return Object.fromEntries(
      presetManifest.map((preset) => {
        const previewSvg = compileSceneToSvg(getSceneByPresetId(preset.presetId), {
          width: 960,
          height: 540,
          includeAnnotations: false,
          fitToFrame: true,
          previewMode: "card",
          fitTarget: "subject",
          subjectPadding: 30,
        });
        return [preset.presetId, previewSvg];
      })
    ) as Record<string, string>;
  }, []);

  const libraryPreviewMap = useMemo(() => {
    const previewTemplate = getSceneByPresetId("ec-01-plasmonic-array-field-focus");
    return Object.fromEntries(
      shapeLibrary.map((shape) => {
        const previewSvg = compileSceneToSvg(buildLibraryPreviewScene(shape, previewTemplate), {
          width: 700,
          height: 420,
          includeAnnotations: false,
          fitToFrame: true,
          previewMode: "card",
          fitTarget: "subject",
          subjectPadding: 22,
        });
        return [shape.id, previewSvg];
      })
    ) as Record<string, string>;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fallbackScene = getSceneByPresetId(selectedPresetId);

    async function loadScene() {
      try {
        const persisted = await loadSceneFromDb(selectedPresetId);
        if (cancelled) {
          return;
        }
        const nextScene = persisted ?? fallbackScene;
        historyBypassRef.current = true;
        sceneRef.current = nextScene;
        setScene(nextScene);
        setUndoStack([]);
        setRedoStack([]);
        setSelectedNodeId(null);
        setAnnotationLayoutMode("auto-outside");
        setScientificMode(nextScene.meta.scientificMode);
        setOrganicReferencePackId(nextScene.meta.referencePackId);
        const pack = getReferencePackById(nextScene.meta.referencePackId);
        if (pack) {
          setOrganicRequiredParts(pack.requiredParts.map((part) => part.id));
        }
        setSceneReady(true);
        setStatus(persisted ? `Loaded saved scene: ${selectedPresetId}` : `Loaded preset: ${selectedPresetId}`);
      } catch {
        if (cancelled) {
          return;
        }
        historyBypassRef.current = true;
        sceneRef.current = fallbackScene;
        setScene(fallbackScene);
        setUndoStack([]);
        setRedoStack([]);
        setSelectedNodeId(null);
        setAnnotationLayoutMode("auto-outside");
        setScientificMode(fallbackScene.meta.scientificMode);
        setOrganicReferencePackId(fallbackScene.meta.referencePackId);
        const pack = getReferencePackById(fallbackScene.meta.referencePackId);
        if (pack) {
          setOrganicRequiredParts(pack.requiredParts.map((part) => part.id));
        }
        setSceneReady(true);
        setStatus(`Loaded preset (db unavailable): ${selectedPresetId}`);
        setDbStatus("error");
      }
    }

    void loadScene();

    return () => {
      cancelled = true;
    };
  }, [selectedPresetId]);

  useEffect(() => {
    const previous = sceneRef.current;
    if (previous === scene) {
      return;
    }
    if (historyBypassRef.current) {
      historyBypassRef.current = false;
    } else {
      setUndoStack((stack) => [...stack.slice(-79), previous]);
      setRedoStack([]);
    }
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    if (!sceneReady) {
      return;
    }
    setDbStatus("saving");
    const timeout = window.setTimeout(() => {
      void saveSceneToDb(scene)
        .then(() => setDbStatus("saved"))
        .catch(() => setDbStatus("error"));
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [scene, sceneReady]);

  function onPresetChange(presetId: string) {
    setSelectedPresetId(presetId);
    setSceneReady(false);
    setSelectedNodeId(null);
    setAnnotationLayoutMode("auto-outside");
    setSearchParams({ preset: presetId });
    setStatus(`Loading preset: ${presetId}`);
  }

  function onCameraChange(presetId: CameraPresetId) {
    const camera = cameraPresets[presetId];
    setScene((prev) => ({
      ...prev,
      camera: { ...camera, origin: { ...prev.camera.origin }, scale: prev.camera.scale },
    }));
    setStatus(`Camera preset: ${presetId}`);
  }

  function onTokenNumberChange(key: "lineWidth" | "hatchDensity", value: number) {
    setScene((prev) => ({ ...prev, tokens: { ...prev.tokens, [key]: value } }));
  }

  function onRenderingChange(key: "gridOpacity" | "gridPitch", value: number) {
    setScene((prev) => ({ ...prev, rendering: { ...prev.rendering, [key]: value } }));
  }

  function onCompositionChange(
    key: "laneTemplate" | "overlapPolicy",
    value: SceneDocument["composition"]["laneTemplate"] | SceneDocument["composition"]["overlapPolicy"]
  ) {
    setScene((prev) => ({
      ...prev,
      composition: {
        ...prev.composition,
        [key]: value,
      },
    }));
  }

  function toggleAnnotations(checked?: boolean) {
    setScene((prev) => ({
      ...prev,
      annotations: { ...prev.annotations, visible: checked ?? !prev.annotations.visible },
    }));
  }

  function toggleAutoFit(checked?: boolean) {
    setScene((prev) => ({
      ...prev,
      composition: { ...prev.composition, fitMode: (checked ?? prev.composition.fitMode !== "auto") ? "auto" : "manual" },
    }));
    setStatus("Recomposition mode updated");
  }

  function toggleGrid(checked?: boolean) {
    setScene((prev) => ({
      ...prev,
      rendering: { ...prev.rendering, showGridByDefault: checked ?? !prev.rendering.showGridByDefault },
    }));
  }

  function recomposeScene() {
    setScene((prev) => ({
      ...prev,
      composition: { ...prev.composition, fitMode: "auto" },
      camera: { ...prev.camera, origin: { ...prev.camera.origin }, manualPan: { x: 0, y: 0 }, manualZoom: 1 },
    }));
    setStatus("Recomposition pass triggered");
  }

  function onPanCanvas(dx: number, dy: number) {
    setScene((prev) => ({
      ...prev,
      composition: { ...prev.composition, fitMode: "manual" },
      camera: {
        ...prev.camera,
        manualPan: { x: (prev.camera.manualPan?.x ?? 0) + dx, y: (prev.camera.manualPan?.y ?? 0) + dy },
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
        nodes: prev.nodes.map((entry) =>
          entry.id !== payload.nodeId
            ? entry
            : {
                ...entry,
                transform3D: {
                  ...entry.transform3D,
                  position: {
                    ...entry.transform3D.position,
                    x: entry.transform3D.position.x + constrainedWorldDelta.x,
                    z: entry.transform3D.position.z + constrainedWorldDelta.z,
                  },
                },
              }
        ),
      };
    });
  }

  function onSelectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
  }

  function updateSelectedNode(mutator: (entry: Node) => Node) {
    if (!selectedNodeId) {
      return;
    }
    setScene((prev) => ({
      ...prev,
      nodes: prev.nodes.map((entry) => (entry.id === selectedNodeId ? mutator(entry) : entry)),
    }));
  }

  function updateSelectedPosition(axis: "x" | "y" | "z", value: number) {
    updateSelectedNode((entry) => ({
      ...entry,
      transform3D: {
        ...entry.transform3D,
        position: {
          ...entry.transform3D.position,
          [axis]: value,
        },
      },
    }));
  }

  function updateSelectedRotation(axis: "x" | "y" | "z", value: number) {
    updateSelectedNode((entry) => ({
      ...entry,
      transform3D: {
        ...entry.transform3D,
        rotation: {
          ...entry.transform3D.rotation,
          [axis]: value,
        },
      },
    }));
  }

  function updateSelectedScale(value: number) {
    updateSelectedNode((entry) => ({
      ...entry,
      transform3D: {
        ...entry.transform3D,
        scale: value,
      },
    }));
  }

  function updateSelectedParam(key: string, value: number | string | boolean) {
    updateSelectedNode((entry) => ({
      ...entry,
      params: {
        ...entry.params,
        [key]: value,
      },
    }));
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) {
      return;
    }
    setScene((prev) => {
      const nextAnimations = prev.animations
        .map((animation) => {
          const filteredTargets = (animation.targets ?? []).filter((target) => target.nodeId !== selectedNodeId);
          const filteredTargetIds = animation.targetNodeIds.filter((id) => id !== selectedNodeId);
          return {
            ...animation,
            targetNodeIds: filteredTargetIds,
            targets: filteredTargets,
          };
        })
        .filter((animation) => animation.targetNodeIds.length > 0);

      return {
        ...prev,
        nodes: prev.nodes.filter((entry) => entry.id !== selectedNodeId),
        animations: nextAnimations,
        annotations: {
          ...prev.annotations,
          labels: prev.annotations.labels.filter((label) => label.targetNodeId !== selectedNodeId),
        },
        composition: {
          ...prev.composition,
          focalNodeIds: prev.composition.focalNodeIds.filter((id) => id !== selectedNodeId),
          subjectNodeIds: prev.composition.subjectNodeIds.filter((id) => id !== selectedNodeId),
        },
      };
    });
    setStatus(`Deleted node: ${selectedNodeId}`);
    setSelectedNodeId(null);
  }

  function addShapeFromLibrary(shapeId: string = libraryShapeId) {
    const shape = shapeLibrary.find((entry) => entry.id === shapeId);
    if (!shape) {
      return;
    }
    const nextId = createUniqueNodeId(scene.nodes, `${shape.id}-${slugifyType(shape.type)}`);
    const node: Node = {
      id: nextId,
      type: shape.type,
      layerId: "main",
      transform3D: {
        position: { ...insertPosition },
        rotation: shape.rotation ?? { x: 0, y: 0, z: 0 },
        scale: shape.scale ?? 1,
      },
      styleRef: scene.tokens.id,
      params: structuredClone(shape.params),
      children: [],
      processRole: shape.processRole,
      processGroup: "library",
      renderPriority: 0,
    };

    setScene((prev) => {
      return {
        ...prev,
        nodes: [...prev.nodes, node],
      };
    });
    setSelectedNodeId(nextId);
    setStatus(`Added shape: ${shape.label}`);
  }

  function onInsertPositionChange(axis: "x" | "y" | "z", raw: string) {
    setInsertPosition((prev) => ({
      ...prev,
      [axis]: parseNumericInput(raw, prev[axis]),
    }));
  }

  const selectedConnectorWidth = useMemo(() => {
    if (!selectedNode || (selectedNode.type !== "pcb-trace" && selectedNode.type !== "bus")) {
      return null;
    }
    const crossSection = selectedNode.params.crossSection;
    if (typeof crossSection === "number" && Number.isFinite(crossSection)) {
      return crossSection;
    }
    if (selectedNode.type === "pcb-trace") {
      const legacyWidth = selectedNode.params.width;
      return typeof legacyWidth === "number" && Number.isFinite(legacyWidth) ? clamp(legacyWidth / 24, 0.03, 0.3) : 0.09;
    }
    const legacyRadius = selectedNode.params.radius;
    return typeof legacyRadius === "number" && Number.isFinite(legacyRadius) ? clamp(legacyRadius, 0.03, 0.3) : 0.13;
  }, [selectedNode]);

  const selectedTubeRadius = useMemo(() => {
    if (!selectedNode || selectedNode.type !== "tube") {
      return null;
    }
    const radius = selectedNode.params.radius;
    return typeof radius === "number" && Number.isFinite(radius) ? radius : 0.1;
  }, [selectedNode]);

  function updateSelectedConnectorWidth(value: number) {
    if (!selectedNode || (selectedNode.type !== "pcb-trace" && selectedNode.type !== "bus")) {
      return;
    }
    updateSelectedNode((entry) => ({
      ...entry,
      params: {
        ...entry.params,
        crossSection: value,
        ...(entry.type === "pcb-trace" ? { width: value * 24 } : { radius: value }),
      },
    }));
  }

  function undoScene() {
    setUndoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      const previous = stack[stack.length - 1];
      setRedoStack((redo) => [...redo.slice(-79), sceneRef.current]);
      historyBypassRef.current = true;
      sceneRef.current = previous;
      setScene(previous);
      setStatus("Undo");
      return stack.slice(0, -1);
    });
  }

  function redoScene() {
    setRedoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      const next = stack[stack.length - 1];
      setUndoStack((undo) => [...undo.slice(-79), sceneRef.current]);
      historyBypassRef.current = true;
      sceneRef.current = next;
      setScene(next);
      setStatus("Redo");
      return stack.slice(0, -1);
    });
  }

  function updateZoom(delta: number) {
    setScene((prev) => ({
      ...prev,
      composition: { ...prev.composition, fitMode: "manual" },
      camera: { ...prev.camera, manualZoom: clamp((prev.camera.manualZoom ?? 1) + delta, 0.45, 2.6) },
    }));
  }

  function resetView() {
    setScene((prev) => ({ ...prev, camera: { ...prev.camera, manualZoom: 1, manualPan: { x: 0, y: 0 } } }));
    setStatus("View reset");
  }

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }
    if (!scene.nodes.some((entry) => entry.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [scene.nodes, selectedNodeId]);

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

      const undoCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const redoCombo =
        ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
        (event.ctrlKey && event.key.toLowerCase() === "y");

      if (undoCombo) {
        event.preventDefault();
        undoScene();
        return;
      }
      if (redoCombo) {
        event.preventDefault();
        redoScene();
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
      if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId) {
        event.preventDefault();
        deleteSelectedNode();
      }
      if (event.key === "[" && selectedNodeId && selectedNode) {
        event.preventDefault();
        updateSelectedRotation("z", selectedNode.transform3D.rotation.z - 5);
      }
      if (event.key === "]" && selectedNodeId && selectedNode) {
        event.preventDefault();
        updateSelectedRotation("z", selectedNode.transform3D.rotation.z + 5);
      }
      if ((event.key === ">" || (event.shiftKey && event.key === ".")) && selectedNodeId && selectedNode) {
        event.preventDefault();
        updateSelectedScale(clamp(selectedNode.transform3D.scale + 0.06, 0.2, 3.2));
      }
      if (event.key === "<" || (event.shiftKey && event.key === ",")) {
        if (selectedNodeId && selectedNode) {
          event.preventDefault();
          updateSelectedScale(clamp(selectedNode.transform3D.scale - 0.06, 0.2, 3.2));
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNode, selectedNodeId, redoStack.length, undoStack.length]);

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
    setStatus("Exported Scene JSON (v1.4)");
  }

  async function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = jsonToScene(text);
      historyBypassRef.current = true;
      sceneRef.current = parsed;
      setScene(parsed);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedNodeId(null);
      setSceneReady(true);
      setStatus(`Imported scene: ${parsed.id}`);
    } catch (error) {
      setStatus(`Import failed: ${(error as Error).message}`);
    }
  }

  function toggleRequiredPart(partId: string, checked: boolean) {
    setOrganicRequiredParts((previous) => {
      if (checked) {
        if (previous.includes(partId)) {
          return previous;
        }
        return [...previous, partId];
      }
      return previous.filter((id) => id !== partId);
    });
  }

  function buildGenerationRequest(lockStructure: boolean): OrganicGenerationRequest {
    return {
      concept: organicConcept,
      styleProfile: organicStyleProfile,
      requiredParts: organicRequiredParts,
      compositionHints: {
        orientation: organicOrientation,
        focalHierarchy: organicRequiredParts.slice(0, 4),
        background: organicBackground,
      },
      referencePackId: organicReferencePackId,
      strictnessMode: scientificMode,
      lockStructure,
      variationSeed: Math.floor(Math.random() * 100000),
    };
  }

  async function generateOrganic(lockStructure: boolean) {
    const request = buildGenerationRequest(lockStructure);
    setGenerationStatus("running");
    setGenerationMessage("Generating organic scene draft...");
    setLastGenerationRequest(request);

    try {
      let response = await createOrganicGenerationJob(request);
      let attempts = 0;
      while ((response.status === "queued" || response.status === "running") && attempts < 12) {
        await new Promise((resolve) => window.setTimeout(resolve, 600));
        response = await getOrganicGenerationJob(response.jobId);
        attempts += 1;
      }
      if (response.status !== "succeeded") {
        throw new Error(response.error ?? "Generation did not complete successfully.");
      }
      setLastGenerationResponse(response);
      setGenerationHistory((previous) => [
        {
          jobId: response.jobId,
          concept: request.concept,
          style: request.styleProfile,
          createdAt: new Date().toISOString(),
        },
        ...previous,
      ].slice(0, 12));
      setGenerationStatus("success");
      setGenerationMessage("Generation complete. Apply image and labels when ready.");
      applyGeneratedImageLayer(response);
    } catch (error) {
      setGenerationStatus("error");
      setGenerationMessage((error as Error).message);
    }
  }

  function applyGeneratedImageLayer(response: OrganicGenerationResponse) {
    if (!response.imageAsset) {
      setStatus("Generated response had no image asset.");
      return;
    }

    const panelWidth = 5.2;
    const panelDepth = 3.2;
    const panelY = 2.18;
    const imageNodeId = createUniqueNodeId(scene.nodes, "organic-image-panel");
    const center = { x: 0, y: panelY, z: 0 };
    const hintLabels = response.anchorHints.slice(0, 10).map((hint, index) => {
      const worldX = center.x + (hint.x - 0.5) * panelWidth * 0.86;
      const worldZ = center.z + (hint.y - 0.5) * panelDepth * 0.86;
      return {
        id: `auto-${imageNodeId}-label-${index + 1}`,
        text: humanizePartId(hint.partId),
        at: { x: worldX, y: panelY - 0.12, z: worldZ },
        targetNodeId: imageNodeId,
        targetPortId: "center",
        anchorBias: worldX < center.x ? ("left" as const) : ("right" as const),
        priority: 2,
      };
    });

    setScene((previous) => {
      const keptNodes = previous.nodes.filter((node) => node.type !== "image-panel");
      const imageNode: Node = {
        id: imageNodeId,
        type: "image-panel",
        layerId: "main",
        transform3D: {
          position: center,
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
        },
        styleRef: previous.tokens.id,
        params: {
          width: panelWidth,
          depth: panelDepth,
          thickness: 0.16,
          href: response.imageAsset?.url ?? "",
          imageOpacity: 0.95,
        },
        children: [],
        processRole: "organic",
        processGroup: "generated",
        renderPriority: 5,
        ports: [
          { id: "left", local: { x: -panelWidth / 2, y: 0, z: 0 }, direction: "bidirectional" },
          { id: "right", local: { x: panelWidth / 2, y: 0, z: 0 }, direction: "bidirectional" },
          { id: "top", local: { x: 0, y: -0.05, z: -panelDepth / 2 }, direction: "out" },
          { id: "bottom", local: { x: 0, y: 0.05, z: panelDepth / 2 }, direction: "in" },
          { id: "center", local: { x: 0, y: 0, z: 0 }, direction: "bidirectional" },
        ],
      };

      return {
        ...previous,
        nodes: [...keptNodes, imageNode],
        composition: {
          ...previous.composition,
          subjectNodeIds: [imageNode.id, ...previous.composition.subjectNodeIds.filter((id) => id !== imageNode.id)],
          focalNodeIds: [imageNode.id, ...previous.composition.focalNodeIds.filter((id) => id !== imageNode.id)].slice(0, 5),
        },
        annotations: {
          ...previous.annotations,
          labels: [...previous.annotations.labels.filter((label) => !label.id.startsWith("auto-organic-image-panel")), ...hintLabels],
        },
        meta: {
          ...previous.meta,
          scientificMode: scientificMode,
          referencePackId: organicReferencePackId,
          validation: response.validationPrecheck,
        },
      };
    });
    setStatus("Applied generated image panel and seeded labels.");
  }

  async function applyAnchorsFromService() {
    if (!lastGenerationResponse) {
      setStatus("Generate an image first before auto-anchor.");
      return;
    }
    try {
      const labels = scene.annotations.labels.map((label) => ({ id: label.id, text: label.text }));
      const anchored = await autoAnchorLabels({
        referencePackId: organicReferencePackId,
        hints: lastGenerationResponse.anchorHints,
        labels,
      });

      const panelNode = scene.nodes.find((node) => node.type === "image-panel");
      if (!panelNode) {
        setStatus("No generated image panel found in scene.");
        return;
      }
      const panelWidth = typeof panelNode.params.width === "number" ? panelNode.params.width : 5.2;
      const panelDepth = typeof panelNode.params.depth === "number" ? panelNode.params.depth : 3.2;
      const center = panelNode.transform3D.position;

      setScene((previous) => ({
        ...previous,
        annotations: {
          ...previous.annotations,
          labels: previous.annotations.labels.map((label, index) => {
            const hint = anchored.anchors[index];
            if (!hint) {
              return label;
            }
            return {
              ...label,
              text: label.text,
              at: {
                x: center.x + (hint.x - 0.5) * panelWidth * 0.86,
                y: center.y - 0.12,
                z: center.z + (hint.y - 0.5) * panelDepth * 0.86,
              },
            };
          }),
        },
      }));
      setStatus("Applied auto-anchored callout positions.");
    } catch (error) {
      setStatus(`Auto-anchor failed: ${(error as Error).message}`);
    }
  }

  async function runScientificValidation() {
    try {
      const response = await validateScientificScene({ scene, scoreThreshold: 80 });
      setScene((previous) => ({
        ...previous,
        meta: {
          ...previous.meta,
          validation: response.validation,
        },
      }));
      setStatus(response.validation.ready ? "Source-Locked gate passed." : "Source-Locked gate failed.");
    } catch (error) {
      const localValidation = validateSceneScientificGrounding(scene, { scoreThreshold: 80, reviewedBy: "local-validator" });
      setScene((previous) => ({
        ...previous,
        meta: {
          ...previous.meta,
          validation: localValidation,
        },
      }));
      setStatus(`Validation API unavailable. Used local validator: ${(error as Error).message}`);
    }
  }

  function saveReviewNotes() {
    setScene((previous) => ({
      ...previous,
      meta: {
        ...previous.meta,
        validation: {
          ...previous.meta.validation,
          notes: reviewNotesDraft,
        },
      },
    }));
    setStatus("Saved scientific review notes.");
  }

  const controls = (
    <TooltipProvider>
      <Card className="h-full overflow-hidden border-border/90 bg-card/85 shadow-sm">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Design Studio
          </CardTitle>
          <CardDescription>Preset browsing, component insertion, and precision design tools.</CardDescription>
        </CardHeader>
        <CardContent className="h-[calc(100%-96px)] px-3 pb-3 pt-3">
          <div className="h-full overflow-hidden rounded-xl border border-border bg-background/70">
            <Tabs value={toolTab} onValueChange={(value) => setToolTab(value as "presets" | "library" | "generate" | "design")} className="flex h-full flex-col">
              <TabsList className="m-2 grid grid-cols-4 gap-1 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="presets" className="gap-1.5">
                  <Grid3X3 className="h-4 w-4" />
                  Presets
                </TabsTrigger>
                <TabsTrigger value="library" className="gap-1.5">
                  <Component className="h-4 w-4" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="generate" className="gap-1.5">
                  <Bot className="h-4 w-4" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="design" className="gap-1.5">
                  <Wrench className="h-4 w-4" />
                  Design
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
                <TabsContent value="presets" className="mt-0 grid gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={presetSearch}
                      onChange={(event) => setPresetSearch(event.target.value)}
                      placeholder="Search presets"
                      className="pl-9"
                    />
                  </div>

                  <div className="grid gap-3">
                    {filteredPresets.map((preset) => {
                      const selected = preset.presetId === selectedPresetId;
                      const previewSvg = presetPreviewMap[preset.presetId] ?? "";
                      return (
                        <button
                          key={preset.presetId}
                          type="button"
                          className={`w-full rounded-xl border p-2 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgba(32,95,62,0.28)]"
                              : "border-border bg-card/80 hover:border-primary/45 hover:bg-card"
                          }`}
                          onClick={() => onPresetChange(preset.presetId)}
                        >
                          <div className="preset-preview aspect-[16/9] overflow-hidden rounded-lg border border-border/70 bg-background/60" dangerouslySetInnerHTML={{ __html: previewSvg }} />
                          <div className="mt-2 flex items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-semibold leading-tight">{preset.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{preset.scientificNotes}</p>
                            </div>
                            <Badge className="capitalize">{preset.concept.replaceAll("-", " ")}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {filteredPresets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No presets match this search.</div>
                  ) : null}
                </TabsContent>

                <TabsContent value="library" className="mt-0 grid gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                      placeholder="Search components"
                      className="pl-9"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-card/80 p-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="insert-x">X</Label>
                      <Input id="insert-x" value={insertPosition.x} onChange={(event) => onInsertPositionChange("x", event.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="insert-y">Y</Label>
                      <Input id="insert-y" value={insertPosition.y} onChange={(event) => onInsertPositionChange("y", event.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="insert-z">Z</Label>
                      <Input id="insert-z" value={insertPosition.z} onChange={(event) => onInsertPositionChange("z", event.target.value)} />
                    </div>
                  </div>

                  <Button
                    className="gap-2"
                    onClick={() => {
                      if (selectedLibraryShape) {
                        addShapeFromLibrary(selectedLibraryShape.id);
                      }
                    }}
                  >
                    <PackagePlus className="h-4 w-4" />
                    Add Selected Component
                  </Button>

                  <div className="grid grid-cols-1 gap-3">
                    {filteredLibrary.map((shape) => {
                      const selected = shape.id === selectedLibraryShape?.id;
                      const ShapeIcon = iconForNodeType(shape.type);
                      const previewSvg = libraryPreviewMap[shape.id] ?? "";
                      return (
                        <div
                          key={shape.id}
                          className={`rounded-xl border p-2 transition-colors ${
                            selected
                              ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgba(32,95,62,0.28)]"
                              : "border-border bg-card/80"
                          }`}
                        >
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setLibraryShapeId(shape.id)}
                          >
                            <div
                              className="preset-preview aspect-[16/9] overflow-hidden rounded-lg border border-border/70 bg-background/60"
                              dangerouslySetInnerHTML={{ __html: previewSvg }}
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{shape.label}</p>
                                <p className="truncate text-xs text-muted-foreground">{shape.type}</p>
                              </div>
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/80">
                                <ShapeIcon className="h-4 w-4 text-primary" />
                              </span>
                            </div>
                          </button>
                          <Button
                            size="sm"
                            className="mt-2 w-full gap-1.5"
                            onClick={() => {
                              setLibraryShapeId(shape.id);
                              addShapeFromLibrary(shape.id);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {filteredLibrary.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No components match this search.</div>
                  ) : null}
                </TabsContent>

                <TabsContent value="generate" className="mt-0 grid gap-3">
                  <div className="rounded-xl border border-border bg-card/80 p-3">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Organic Image Agent</p>
                        <p className="text-xs text-muted-foreground">Server-side Google generation with Source-Locked controls.</p>
                      </div>
                      <Badge className="capitalize">{scientificMode.replaceAll("-", " ")}</Badge>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <Label>Concept template</Label>
                        <Select value={organicConcept} onValueChange={(value) => setOrganicConcept(value as OrganicConcept)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select concept" />
                          </SelectTrigger>
                          <SelectContent>
                            {organicConceptOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label>Style profile</Label>
                        <Select value={organicStyleProfile} onValueChange={(value) => setOrganicStyleProfile(value as OrganicStyleProfile)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent>
                            {organicStyleOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label>Scientific mode</Label>
                        <Select
                          value={scientificMode}
                          onValueChange={(value) => setScientificMode(value as OrganicGenerationRequest["strictnessMode"])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="source-locked">source-locked</SelectItem>
                            <SelectItem value="guided-creative">guided-creative</SelectItem>
                            <SelectItem value="fast-draft">fast-draft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1.5">
                          <Label>Orientation</Label>
                          <Select value={organicOrientation} onValueChange={(value) => setOrganicOrientation(value as "portrait" | "landscape" | "square")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portrait">portrait</SelectItem>
                              <SelectItem value="landscape">landscape</SelectItem>
                              <SelectItem value="square">square</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label>Background</Label>
                          <Select value={organicBackground} onValueChange={(value) => setOrganicBackground(value as "paper" | "clean-white" | "dark-plate")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paper">paper</SelectItem>
                              <SelectItem value="clean-white">clean-white</SelectItem>
                              <SelectItem value="dark-plate">dark-plate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Label className="text-sm font-semibold">Required parts checklist</Label>
                      <Badge>{organicRequiredParts.length}</Badge>
                    </div>
                    <div className="grid gap-2">
                      {activeReferencePack?.requiredParts.map((part) => {
                        const checked = organicRequiredParts.includes(part.id);
                        return (
                          <div key={part.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm">{part.label}</p>
                              <p className="truncate text-xs text-muted-foreground">{part.id}</p>
                            </div>
                            <Switch checked={checked} onCheckedChange={(value) => toggleRequiredPart(part.id, value)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button className="gap-2" onClick={() => void generateOrganic(false)} disabled={generationStatus === "running"}>
                      <Sparkles className="h-4 w-4" />
                      Generate Draft
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={() => void generateOrganic(false)} disabled={generationStatus === "running"}>
                      <Wand2 className="h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => void generateOrganic(true)} disabled={generationStatus === "running"}>
                      <Bot className="h-4 w-4" />
                      Lock Structure
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => void applyAnchorsFromService()} disabled={!lastGenerationResponse}>
                      <Route className="h-4 w-4" />
                      Apply Labels
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border bg-card/80 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {generationStatus === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : generationStatus === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-red-700" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                      <p className="text-sm font-semibold">Generation status</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{generationMessage}</p>
                    {lastGenerationResponse?.imageAsset ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Asset: {lastGenerationResponse.imageAsset.id} · {lastGenerationResponse.imageAsset.width}x
                        {lastGenerationResponse.imageAsset.height}
                      </p>
                    ) : null}
                    {lastGenerationRequest ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last request: {lastGenerationRequest.concept} · {lastGenerationRequest.styleProfile}
                      </p>
                    ) : null}
                    {generationHistory.length > 0 ? (
                      <div className="mt-2 rounded-md border border-border/70 bg-background/60 p-2">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Recent jobs</p>
                        <div className="grid gap-1">
                          {generationHistory.slice(0, 4).map((job) => (
                            <p key={job.jobId} className="text-[11px] text-muted-foreground">
                              {job.jobId} · {job.concept} · {job.style}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border bg-card/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">Source-Locked Gate</p>
                      <Badge className={scene.meta.validation.ready ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                        {scene.meta.validation.ready ? "ready" : "not ready"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Score {scene.meta.validation.score}/100 · reference pack {scene.meta.referencePackId}
                    </p>
                    <div className="mt-2 grid gap-1.5">
                      {scene.meta.validation.checklist.map((check) => (
                        <div key={check.id} className="flex items-start gap-2 rounded-md border border-border/70 bg-background/60 px-2 py-1.5">
                          {check.passed ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-700" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{check.name}</p>
                            <p className="text-[11px] text-muted-foreground">{check.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      <Label htmlFor="review-notes">Scientific review notes</Label>
                      <Input
                        id="review-notes"
                        value={reviewNotesDraft}
                        onChange={(event) => setReviewNotesDraft(event.target.value)}
                        placeholder="Add review findings or source notes"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" className="gap-2" onClick={() => void runScientificValidation()}>
                        <CheckCircle2 className="h-4 w-4" />
                        Run Validation
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={saveReviewNotes}>
                        <FileJson className="h-4 w-4" />
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="design" className="mt-0 grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="gap-1.5" onClick={undoScene} disabled={undoStack.length === 0}>
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </Button>
                    <Button variant="secondary" className="gap-1.5" onClick={redoScene} disabled={redoStack.length === 0}>
                      <Redo2 className="h-4 w-4" />
                      Redo
                    </Button>
                  </div>

                  <Button variant="outline" className="gap-2" onClick={recomposeScene}>
                    <Settings2 className="h-4 w-4" />
                    Recompose Scene
                  </Button>

                  <div className="grid gap-2 rounded-xl border border-border bg-card/80 p-3">
                    <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4 text-primary" />Camera Preset</Label>
                    <Select value={scene.camera.presetId} onValueChange={(value) => onCameraChange(value as CameraPresetId)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(cameraPresets) as CameraPresetId[]).map((cameraId) => (
                          <SelectItem key={cameraId} value={cameraId}>
                            {cameraId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Label className="mt-2 flex items-center gap-1.5"><Route className="h-4 w-4 text-primary" />Callout Layout</Label>
                    <Select value={annotationLayoutMode} onValueChange={(value) => setAnnotationLayoutMode(value as "manual" | "auto-outside")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Callout mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto-outside">auto-outside</SelectItem>
                        <SelectItem value="manual">manual</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label className="mt-2 flex items-center gap-1.5"><Boxes className="h-4 w-4 text-primary" />Lane Template</Label>
                    <Select
                      value={scene.composition.laneTemplate}
                      onValueChange={(value) =>
                        onCompositionChange("laneTemplate", value as SceneDocument["composition"]["laneTemplate"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Lane template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="board-3lane">board-3lane</SelectItem>
                        <SelectItem value="board-radial">board-radial</SelectItem>
                        <SelectItem value="organic-cross-section">organic-cross-section</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 rounded-xl border border-border bg-card/80 p-3">
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Auto-fit composition</p>
                          <p className="text-xs text-muted-foreground">Center and scale scene to occupancy target.</p>
                        </div>
                      </div>
                      <Switch checked={scene.composition.fitMode === "auto"} onCheckedChange={toggleAutoFit} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <Grid3X3 className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Show isometric grid</p>
                          <p className="text-xs text-muted-foreground">Tri-axis drafting grid.</p>
                        </div>
                      </div>
                      <Switch checked={scene.rendering.showGridByDefault} onCheckedChange={toggleGrid} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <Eye className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Annotations</p>
                          <p className="text-xs text-muted-foreground">Toggle outside-rail callouts.</p>
                        </div>
                      </div>
                      <Switch checked={scene.annotations.visible} onCheckedChange={toggleAnnotations} />
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border bg-card/80 p-3">
                    <Label className="flex items-center gap-1.5"><SlidersHorizontal className="h-4 w-4 text-primary" />Rendering</Label>
                    <SliderField
                      label={`Grid Opacity (${scene.rendering.gridOpacity.toFixed(2)})`}
                      value={scene.rendering.gridOpacity}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(value) => onRenderingChange("gridOpacity", value)}
                    />
                    <SliderField
                      label={`Grid Pitch (${scene.rendering.gridPitch.toFixed(2)})`}
                      value={scene.rendering.gridPitch}
                      min={0.3}
                      max={1.8}
                      step={0.01}
                      onChange={(value) => onRenderingChange("gridPitch", value)}
                    />
                    <SliderField
                      label={`Line Width (${scene.tokens.lineWidth.toFixed(2)})`}
                      value={scene.tokens.lineWidth}
                      min={0.8}
                      max={3.2}
                      step={0.05}
                      onChange={(value) => onTokenNumberChange("lineWidth", value)}
                    />
                    <SliderField
                      label={`Face Hatch Density (${scene.tokens.hatchDensity.toFixed(2)})`}
                      value={scene.tokens.hatchDensity}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(value) => onTokenNumberChange("hatchDensity", value)}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-3 rounded-xl border border-border bg-card/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Move3D className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Selection</p>
                          <p className="text-xs text-muted-foreground">Select and edit any node in-scene.</p>
                        </div>
                      </div>
                      {selectedNode ? <Badge className="bg-background">{selectedNode.type}</Badge> : null}
                    </div>

                    <div className="grid gap-2">
                      <Label>Selected Node</Label>
                      <Select value={selectedNodeId ?? "none"} onValueChange={(value) => onSelectNode(value === "none" ? null : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="No node selected" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No selection</SelectItem>
                          {scene.nodes.map((entry) => (
                            <SelectItem key={entry.id} value={entry.id}>
                              {entry.id} · {entry.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={!selectedNode}
                      onClick={deleteSelectedNode}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Selected Node
                    </Button>

                    {selectedNode ? (
                      <div className="grid gap-3 rounded-lg border border-border/70 bg-background/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Transform</p>
                        <SliderField
                          label={`Position X (${selectedNode.transform3D.position.x.toFixed(2)})`}
                          value={selectedNode.transform3D.position.x}
                          min={-8}
                          max={8}
                          step={0.02}
                          onChange={(value) => updateSelectedPosition("x", value)}
                        />
                        <SliderField
                          label={`Position Y (${selectedNode.transform3D.position.y.toFixed(2)})`}
                          value={selectedNode.transform3D.position.y}
                          min={-2}
                          max={8}
                          step={0.02}
                          onChange={(value) => updateSelectedPosition("y", value)}
                        />
                        <SliderField
                          label={`Position Z (${selectedNode.transform3D.position.z.toFixed(2)})`}
                          value={selectedNode.transform3D.position.z}
                          min={-8}
                          max={8}
                          step={0.02}
                          onChange={(value) => updateSelectedPosition("z", value)}
                        />
                        <SliderField
                          label={`Rotate X (${selectedNode.transform3D.rotation.x.toFixed(0)}°)`}
                          value={selectedNode.transform3D.rotation.x}
                          min={-180}
                          max={180}
                          step={1}
                          onChange={(value) => updateSelectedRotation("x", value)}
                        />
                        <SliderField
                          label={`Rotate Y (${selectedNode.transform3D.rotation.y.toFixed(0)}°)`}
                          value={selectedNode.transform3D.rotation.y}
                          min={-180}
                          max={180}
                          step={1}
                          onChange={(value) => updateSelectedRotation("y", value)}
                        />
                        <SliderField
                          label={`Rotate Z (${selectedNode.transform3D.rotation.z.toFixed(0)}°)`}
                          value={selectedNode.transform3D.rotation.z}
                          min={-180}
                          max={180}
                          step={1}
                          onChange={(value) => updateSelectedRotation("z", value)}
                        />
                        <SliderField
                          label={`Scale (${selectedNode.transform3D.scale.toFixed(2)})`}
                          value={selectedNode.transform3D.scale}
                          min={0.2}
                          max={3.2}
                          step={0.01}
                          onChange={updateSelectedScale}
                        />

                        {selectedConnectorWidth !== null ? (
                          <SliderField
                            label={`Conductor Width (${selectedConnectorWidth.toFixed(3)})`}
                            value={selectedConnectorWidth}
                            min={0.03}
                            max={0.3}
                            step={0.005}
                            onChange={updateSelectedConnectorWidth}
                          />
                        ) : null}

                        {selectedTubeRadius !== null ? (
                          <SliderField
                            label={`Tube Radius (${selectedTubeRadius.toFixed(3)})`}
                            value={selectedTubeRadius}
                            min={0.03}
                            max={0.32}
                            step={0.005}
                            onChange={(value) => updateSelectedParam("radius", value)}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground" role="status" aria-live="polite">
                    <p>{status}</p>
                    <p className="mt-1 text-xs">
                      DB autosave:{" "}
                      <span className="font-medium">
                        {dbStatus === "saving"
                          ? "saving"
                          : dbStatus === "saved"
                          ? "saved"
                          : dbStatus === "error"
                          ? "error"
                          : "idle"}
                      </span>
                    </p>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );

  return (
    <main className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="hidden min-h-0 lg:block">{controls}</div>
      <div className="lg:hidden">
        <Sheet open={mobileControlsOpen} onOpenChange={setMobileControlsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Open Controls
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[94vw] max-w-[94vw] p-3">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><Layers2 className="h-4 w-4 text-primary" />Scene Controls</SheetTitle>
            </SheetHeader>
            <div className="mt-3 h-[calc(100%-40px)]">{controls}</div>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="min-h-0 overflow-hidden border-border/90 bg-card/85">
        <CardContent className="flex h-full min-h-0 flex-col p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentPreset.title}</p>
              <p className="truncate text-xs text-muted-foreground">{currentPreset.scientificNotes}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="capitalize">{currentPreset.concept.replaceAll("-", " ")}</Badge>
              <Sheet open={exportOpen} onOpenChange={setExportOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <PanelRightOpen className="h-4 w-4" />
                    Export
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[440px] max-w-[96vw]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-primary" />
                      Export and File Tools
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-5 grid gap-3">
                    <Button className="gap-2" onClick={exportSvg}>
                      <Download className="h-4 w-4" />
                      Export SVG
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={exportJson}>
                      <FileJson className="h-4 w-4" />
                      Export JSON
                    </Button>
                    <div className="grid gap-2 rounded-lg border border-border bg-card/70 p-3">
                      <Label htmlFor="scene-json-file-sheet" className="flex items-center gap-2">
                        <Import className="h-4 w-4 text-primary" />
                        Import Scene JSON
                      </Label>
                      <Input id="scene-json-file-sheet" type="file" accept="application/json,.json" onChange={importJson} />
                    </div>
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground" role="status" aria-live="polite">
                      <p>{status}</p>
                      <p className="mt-1 text-xs">
                        DB autosave:{" "}
                        <span className="font-medium">
                          {dbStatus === "saving"
                            ? "saving"
                            : dbStatus === "saved"
                            ? "saved"
                            : dbStatus === "error"
                            ? "error"
                            : "idle"}
                        </span>
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <div className="h-full min-h-[420px]">
              <SceneViewport
                scene={scene}
                width={1920}
                height={1080}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseNumericInput(raw: string, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugifyType(type: Node["type"]): string {
  return String(type).replaceAll(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
}

function createUniqueNodeId(nodes: Node[], baseId: string): string {
  let counter = 1;
  let nextId = `${baseId}-${counter}`;
  while (nodes.some((entry) => entry.id === nextId)) {
    counter += 1;
    nextId = `${baseId}-${counter}`;
  }
  return nextId;
}

function humanizePartId(value: string): string {
  return value
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function iconForNodeType(type: Node["type"]): LucideIcon {
  switch (type) {
    case "chip":
    case "chiplet":
      return Component;
    case "plate":
    case "pcb-trace":
    case "bus":
      return Layers2;
    case "box":
    case "prism":
    case "rack":
      return Boxes;
    case "cylinder":
    case "tank-horizontal":
    case "capsule":
      return FlaskConical;
    case "atom":
    case "disk-array":
    case "wavefront":
      return Sparkles;
    case "tube":
    case "arrow":
    case "manifold":
      return Route;
    case "leaf":
    case "petal":
    case "root":
    case "petiole":
    case "filament":
    case "plant-cell":
    case "cell-cluster":
      return Leaf;
    default:
      return PackagePlus;
  }
}

function buildLibraryPreviewScene(shape: ShapeLibraryItem, template: SceneDocument): SceneDocument {
  const previewNodeId = `preview-${shape.id}`;
  const isOrganic = shape.processRole === "organic";
  const baseParams: Node["params"] = {
    width: 5.1,
    depth: 3.6,
    thickness: 0.18,
    rows: 7,
    cols: 9,
    holeRadius: 0.032,
    surfaceType: isOrganic ? "soil" : "pcb",
    holePattern: isOrganic ? "none" : "checker",
    traceDensity: isOrganic ? 0 : 0.45,
    ...(isOrganic ? { topFill: "#E6DDC9", leftFill: "#D8CCB5", rightFill: "#CABCA1" } : {}),
  };

  const plateNode: Node = {
    id: `${previewNodeId}-base`,
    type: "plate",
    layerId: "support",
    transform3D: {
      position: { x: 0, y: 3.36, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
    styleRef: template.tokens.id,
    params: baseParams,
    children: [],
    processRole: "base",
    processGroup: "preview",
    renderPriority: -40,
  };

  const node: Node = {
    id: previewNodeId,
    type: shape.type,
    layerId: "main",
    transform3D: {
      position: { x: 0, y: 2.08, z: 0 },
      rotation: shape.rotation ?? { x: 0, y: 0, z: 0 },
      scale: shape.scale ?? 1,
    },
    styleRef: template.tokens.id,
    params: structuredClone(shape.params),
    children: [],
    processRole: shape.processRole,
    processGroup: "preview",
    renderPriority: 3,
  };

  return {
    ...structuredClone(template),
    id: `preview-${shape.id}`,
    meta: {
      title: shape.label,
      concept: template.meta.concept,
      description: `Preview for ${shape.label}`,
      scientificNotes: "Component preview",
      scientificMode: template.meta.scientificMode,
      referencePackId: template.meta.referencePackId,
      claims: [],
      validation: {
        checklist: [],
        score: 0,
        ready: false,
        reviewedBy: "library-preview",
        reviewedAt: new Date("2026-02-28T00:00:00.000Z").toISOString(),
        notes: "Preview scene only.",
      },
    },
    camera: { ...cameraPresets["classic-iso"], origin: { x: 0, y: 0 }, manualPan: { x: 0, y: 0 }, manualZoom: 1 },
    nodes: [plateNode, node],
    animations: [],
    annotations: {
      ...template.annotations,
      visible: false,
      labels: [],
      leaders: [],
      equations: [],
      legend: [],
    },
    composition: {
      ...template.composition,
      fitMode: "auto",
      focalNodeIds: [previewNodeId],
      subjectNodeIds: [previewNodeId],
      minOccupancy: 0.72,
      framePadding: 34,
      laneTemplate: isOrganic ? "organic-cross-section" : "board-radial",
    },
  };
}
