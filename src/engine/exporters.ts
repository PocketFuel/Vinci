import { ensureSceneV14 } from "./migrations";
import type { SceneDocument } from "./types";

export function sceneToJson(scene: SceneDocument): string {
  const normalized = ensureSceneV14(scene);
  return JSON.stringify(normalized, null, 2);
}

export function jsonToScene(json: string): SceneDocument {
  const parsed = JSON.parse(json) as unknown;
  return ensureSceneV14(parsed);
}

export function saveFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
