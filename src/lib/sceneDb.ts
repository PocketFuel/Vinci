import { ensureSceneV12 } from "../engine/migrations";
import type { SceneDocument } from "../engine/types";

const DB_NAME = "vinci-scene-db";
const STORE_NAME = "scenes";
const DB_VERSION = 1;

type StoredSceneRecord = {
  id: string;
  updatedAt: string;
  sceneJson: string;
};

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function localStorageKey(id: string): string {
  return `vinci-scene:${id}`;
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveSceneToDb(scene: SceneDocument): Promise<void> {
  const payload = JSON.stringify(scene);

  if (!hasIndexedDb()) {
    window.localStorage.setItem(localStorageKey(scene.id), payload);
    return;
  }

  const database = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to write scene"));
    const store = tx.objectStore(STORE_NAME);
    const record: StoredSceneRecord = {
      id: scene.id,
      updatedAt: new Date().toISOString(),
      sceneJson: payload,
    };
    store.put(record);
  });
  database.close();
}

export async function loadSceneFromDb(sceneId: string): Promise<SceneDocument | null> {
  if (!hasIndexedDb()) {
    const raw = window.localStorage.getItem(localStorageKey(sceneId));
    if (!raw) {
      return null;
    }
    return ensureSceneV12(JSON.parse(raw));
  }

  const database = await openDb();
  const record = await new Promise<StoredSceneRecord | null>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error ?? new Error("Failed to read scene"));
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(sceneId);
    request.onerror = () => reject(request.error ?? new Error("Failed to read scene"));
    request.onsuccess = () => resolve((request.result as StoredSceneRecord | undefined) ?? null);
  });
  database.close();

  if (!record) {
    return null;
  }
  return ensureSceneV12(JSON.parse(record.sceneJson));
}
