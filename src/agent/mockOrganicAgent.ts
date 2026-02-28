import { validateSceneScientificGrounding } from "../engine/scientificValidation";
import type { SceneDocument } from "../engine/types";
import type {
  AutoAnchorRequest,
  AutoAnchorResponse,
  LabelAnchorHint,
  OrganicGenerationRequest,
  OrganicGenerationResponse,
} from "./types";

const mockJobs = new Map<string, OrganicGenerationResponse>();

const MOCK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAEACAIAAABWVS3KAAAABmJLR0QA/wD/AP+gvaeTAAABFUlEQVR4nO3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwM8GAAEa1m6WAAAAAElFTkSuQmCC";

export async function mockCreateGenerationJob(
  request: OrganicGenerationRequest
): Promise<OrganicGenerationResponse> {
  const jobId = `mock_${Date.now().toString(36)}`;
  const hints = request.requiredParts.map((part, index) => ({
    partId: part,
    x: 0.18 + (index % 3) * 0.25,
    y: 0.2 + Math.floor(index / 3) * 0.18,
    confidence: 0.55,
  }));

  const report = {
    checklist: [
      {
        id: "required-parts-selected",
        name: "Required parts selected",
        required: true,
        passed: request.requiredParts.length > 0,
        notes: request.requiredParts.length > 0 ? "Selected." : "No required parts selected.",
      },
      {
        id: "reference-pack-provided",
        name: "Reference pack provided",
        required: true,
        passed: Boolean(request.referencePackId),
        notes: request.referencePackId ? "Provided." : "Missing reference pack id.",
      },
    ],
    score: request.requiredParts.length > 0 ? 100 : 50,
    ready: false,
    reviewedBy: "mock-agent",
    reviewedAt: new Date().toISOString(),
    notes: "Mock generation response (API unavailable).",
  };

  const response: OrganicGenerationResponse = {
    jobId,
    status: "succeeded",
    imageAsset: {
      id: `${jobId}-png`,
      mime: "image/png",
      url: MOCK_PNG,
      width: 1024,
      height: 512,
      createdAt: new Date().toISOString(),
      provider: "google",
    },
    anchorHints: hints,
    validationPrecheck: report,
  };

  mockJobs.set(jobId, response);
  return response;
}

export async function mockGetGenerationJob(jobId: string): Promise<OrganicGenerationResponse> {
  const existing = mockJobs.get(jobId);
  if (existing) {
    return existing;
  }
  throw new Error(`Unknown mock generation job '${jobId}'.`);
}

export async function mockAutoAnchorLabels(request: AutoAnchorRequest): Promise<AutoAnchorResponse> {
  const anchors: LabelAnchorHint[] = request.labels.map((label, index) => {
    const hint = request.hints[index];
    if (hint) {
      return hint;
    }
    return {
      partId: label.id,
      x: 0.2 + (index % 3) * 0.24,
      y: 0.22 + Math.floor(index / 3) * 0.18,
      confidence: 0.4,
    };
  });
  return { anchors };
}

export async function mockValidateScientificScene(scene: SceneDocument): Promise<SceneDocument["meta"]["validation"]> {
  return validateSceneScientificGrounding(scene, { reviewedBy: "mock-validator", scoreThreshold: 80 });
}
