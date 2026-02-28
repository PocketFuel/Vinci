import type { OrganicGenerationRequest, OrganicGenerationResponse } from "../../../src/agent/types";
import { getReferencePackById } from "../../../src/data/referencePacks";
import { generateOrganicImage } from "../../_lib/googleImageProvider";
import { createJobId, saveJob } from "../../_lib/jobs";
import { json, methodNotAllowed } from "../../_lib/http";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as OrganicGenerationRequest;
    const parsed = parseRequest(body);
    const jobId = createJobId();

    const precheck = buildValidationPrecheck(parsed);
    const running: OrganicGenerationResponse = {
      jobId,
      status: "running",
      anchorHints: [],
      validationPrecheck: precheck,
    };
    saveJob(running);

    const result = await generateOrganicImage(parsed, jobId, precheck);
    saveJob(result);
    json(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    json(res, 500, {
      error: message,
    });
  }
}

function parseRequest(input: OrganicGenerationRequest): OrganicGenerationRequest {
  if (!input?.concept) {
    throw new Error("concept is required");
  }
  if (!input?.styleProfile) {
    throw new Error("styleProfile is required");
  }
  if (!input?.referencePackId) {
    throw new Error("referencePackId is required");
  }
  return {
    ...input,
    requiredParts: input.requiredParts ?? [],
    compositionHints: input.compositionHints ?? {
      orientation: "portrait",
      focalHierarchy: [],
      background: "paper",
    },
    strictnessMode: input.strictnessMode ?? "source-locked",
  };
}

function buildValidationPrecheck(request: OrganicGenerationRequest): OrganicGenerationResponse["validationPrecheck"] {
  const pack = getReferencePackById(request.referencePackId);
  const hasRequiredParts = request.requiredParts.length > 0;
  const hasReferencePack = Boolean(pack);

  const checklist = [
    {
      id: "reference-pack-available",
      name: "Reference pack available",
      required: true,
      passed: hasReferencePack,
      notes: hasReferencePack ? "Reference pack loaded." : `Reference pack '${request.referencePackId}' not found.`,
    },
    {
      id: "required-parts-selected",
      name: "Required parts selected",
      required: true,
      passed: hasRequiredParts,
      notes: hasRequiredParts ? `${request.requiredParts.length} parts selected.` : "No required parts selected.",
    },
  ];

  const requiredCount = checklist.filter((check) => check.required).length;
  const passedCount = checklist.filter((check) => check.required && check.passed).length;
  const score = requiredCount === 0 ? 100 : Math.round((passedCount / requiredCount) * 100);

  return {
    checklist,
    score,
    ready: false,
    reviewedBy: "generation-precheck",
    reviewedAt: new Date().toISOString(),
    notes: "Precheck complete. Run scientific validation after labeling.",
  };
}
