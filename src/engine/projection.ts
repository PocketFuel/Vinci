import type { CameraPresetId, CameraSpec, Vector3 } from "./types";

const DEG_TO_RAD = Math.PI / 180;
export const WORLD_UNIT_PX = 56;

export const cameraPresets: Record<CameraPresetId, CameraSpec> = {
  "classic-iso": {
    presetId: "classic-iso",
    yaw: 45,
    pitch: 35.264,
    scale: 1,
    origin: { x: 0, y: 0 },
  },
  "north-east": {
    presetId: "north-east",
    yaw: 35,
    pitch: 30,
    scale: 1,
    origin: { x: 0, y: 0 },
  },
  "north-west": {
    presetId: "north-west",
    yaw: -35,
    pitch: 30,
    scale: 1,
    origin: { x: 0, y: 0 },
  },
  "top-iso": {
    presetId: "top-iso",
    yaw: 45,
    pitch: 60,
    scale: 1,
    origin: { x: 0, y: 0 },
  },
  "section-cut": {
    presetId: "section-cut",
    yaw: 22,
    pitch: 24,
    scale: 1,
    origin: { x: 0, y: 0 },
  },
};

export function normalizeHex(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export function rotate(point: Vector3, yawDeg: number, pitchDeg: number): Vector3 {
  const yaw = yawDeg * DEG_TO_RAD;
  const pitch = pitchDeg * DEG_TO_RAD;

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  const x1 = point.x * cosY - point.z * sinY;
  const z1 = point.x * sinY + point.z * cosY;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  const y2 = point.y * cosP - z1 * sinP;
  const z2 = point.y * sinP + z1 * cosP;

  return { x: x1, y: y2, z: z2 };
}

export function projectPoint(
  point: Vector3,
  camera: CameraSpec,
  viewport = { width: 1200, height: 800 },
  unitPx = WORLD_UNIT_PX
) {
  const rotated = rotate(point, camera.yaw, camera.pitch);
  const zoom = camera.manualZoom ?? 1;
  const panX = camera.manualPan?.x ?? 0;
  const panY = camera.manualPan?.y ?? 0;

  return {
    x: viewport.width / 2 + (rotated.x * unitPx * camera.scale * zoom + camera.origin.x + panX),
    y: viewport.height / 2 + (rotated.y * unitPx * camera.scale * zoom + camera.origin.y + panY),
    depth: rotated.z,
  };
}

export function projectDepth(point: Vector3, camera: CameraSpec): number {
  return rotate(point, camera.yaw, camera.pitch).z;
}

export function screenDeltaToWorldXZ(
  delta: { x: number; y: number },
  camera: CameraSpec,
  viewport = { width: 1200, height: 800 },
  unitPx = WORLD_UNIT_PX
): { x: number; z: number } {
  const origin = projectPoint({ x: 0, y: 0, z: 0 }, camera, viewport, unitPx);
  const axisX = projectPoint({ x: 1, y: 0, z: 0 }, camera, viewport, unitPx);
  const axisZ = projectPoint({ x: 0, y: 0, z: 1 }, camera, viewport, unitPx);

  const vx = { x: axisX.x - origin.x, y: axisX.y - origin.y };
  const vz = { x: axisZ.x - origin.x, y: axisZ.y - origin.y };
  const det = vx.x * vz.y - vx.y * vz.x;

  if (Math.abs(det) < 0.000001) {
    const scalar = unitPx * camera.scale * (camera.manualZoom ?? 1);
    return {
      x: delta.x / Math.max(1, scalar),
      z: delta.y / Math.max(1, scalar),
    };
  }

  const x = (delta.x * vz.y - delta.y * vz.x) / det;
  const z = (vx.x * delta.y - vx.y * delta.x) / det;

  return { x, z };
}

export function applyNodeTransform(
  base: Vector3,
  transform: { position: Vector3; rotation: Vector3; scale: number }
): Vector3 {
  const scaled = {
    x: base.x * transform.scale,
    y: base.y * transform.scale,
    z: base.z * transform.scale,
  };

  const rotatedX = rotateX(scaled, transform.rotation.x);
  const rotatedY = rotateY(rotatedX, transform.rotation.y);
  const rotatedZ = rotateZ(rotatedY, transform.rotation.z);

  return {
    x: rotatedZ.x + transform.position.x,
    y: rotatedZ.y + transform.position.y,
    z: rotatedZ.z + transform.position.z,
  };
}

export function buildIsometricGridPaths(
  viewport: { width: number; height: number },
  camera: CameraSpec,
  pitch: number,
  opacity: number
) {
  const worldRange = Math.max(viewport.width, viewport.height) / (WORLD_UNIT_PX * camera.scale) + 8;
  const step = Math.max(0.3, pitch);

  const families = {
    x: [] as string[],
    y: [] as string[],
    z: [] as string[],
  };

  for (let i = -worldRange; i <= worldRange; i += step) {
    const xA = projectPoint({ x: -worldRange, y: 0, z: i }, camera, viewport);
    const xB = projectPoint({ x: worldRange, y: 0, z: i }, camera, viewport);
    families.x.push(`M ${xA.x.toFixed(2)} ${xA.y.toFixed(2)} L ${xB.x.toFixed(2)} ${xB.y.toFixed(2)}`);

    const zA = projectPoint({ x: i, y: 0, z: -worldRange }, camera, viewport);
    const zB = projectPoint({ x: i, y: 0, z: worldRange }, camera, viewport);
    families.z.push(`M ${zA.x.toFixed(2)} ${zA.y.toFixed(2)} L ${zB.x.toFixed(2)} ${zB.y.toFixed(2)}`);

    const yA = projectPoint({ x: i, y: -worldRange, z: 0 }, camera, viewport);
    const yB = projectPoint({ x: i, y: worldRange, z: 0 }, camera, viewport);
    families.y.push(`M ${yA.x.toFixed(2)} ${yA.y.toFixed(2)} L ${yB.x.toFixed(2)} ${yB.y.toFixed(2)}`);
  }

  return {
    xPath: families.x.join(" "),
    yPath: families.y.join(" "),
    zPath: families.z.join(" "),
    opacity: Math.max(0, Math.min(1, opacity)),
  };
}

function rotateX(point: Vector3, deg: number): Vector3 {
  const r = deg * DEG_TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {
    x: point.x,
    y: point.y * c - point.z * s,
    z: point.y * s + point.z * c,
  };
}

function rotateY(point: Vector3, deg: number): Vector3 {
  const r = deg * DEG_TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {
    x: point.x * c + point.z * s,
    y: point.y,
    z: -point.x * s + point.z * c,
  };
}

function rotateZ(point: Vector3, deg: number): Vector3 {
  const r = deg * DEG_TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {
    x: point.x * c - point.y * s,
    y: point.x * s + point.y * c,
    z: point.z,
  };
}
