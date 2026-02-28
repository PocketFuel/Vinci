import type {
  AutoAnchorRequest,
  AutoAnchorResponse,
  OrganicGenerationRequest,
  OrganicGenerationResponse,
} from "../agent/types";
import {
  mockAutoAnchorLabels,
  mockCreateGenerationJob,
  mockGetGenerationJob,
  mockValidateScientificScene,
} from "../agent/mockOrganicAgent";
import type { SceneDocument } from "../engine/types";

type ScientificValidationRequest = {
  scene: SceneDocument;
  scoreThreshold?: number;
};

type ScientificValidationResponse = {
  validation: SceneDocument["meta"]["validation"];
};

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function createOrganicGenerationJob(
  request: OrganicGenerationRequest
): Promise<OrganicGenerationResponse> {
  try {
    return await requestJson<OrganicGenerationResponse>("/api/generate/organic", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    return mockCreateGenerationJob(request);
  }
}

export async function getOrganicGenerationJob(jobId: string): Promise<OrganicGenerationResponse> {
  try {
    return await requestJson<OrganicGenerationResponse>(`/api/generate/organic/${encodeURIComponent(jobId)}`, {
      method: "GET",
    });
  } catch {
    return mockGetGenerationJob(jobId);
  }
}

export async function autoAnchorLabels(request: AutoAnchorRequest): Promise<AutoAnchorResponse> {
  try {
    return await requestJson<AutoAnchorResponse>("/api/labels/auto-anchor", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    return mockAutoAnchorLabels(request);
  }
}

export async function validateScientificScene(
  request: ScientificValidationRequest
): Promise<ScientificValidationResponse> {
  try {
    return await requestJson<ScientificValidationResponse>("/api/validate/scientific", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    const validation = await mockValidateScientificScene(request.scene);
    return { validation };
  }
}
