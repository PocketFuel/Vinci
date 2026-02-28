import type { AutoAnchorRequest, AutoAnchorResponse, LabelAnchorHint } from "../../src/agent/types";
import { getReferencePackById } from "../../src/data/referencePacks";
import { json, methodNotAllowed } from "../_lib/http";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as AutoAnchorRequest;
    const response = autoAnchor(body);
    json(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to auto anchor labels";
    json(res, 400, { error: message });
  }
}

function autoAnchor(request: AutoAnchorRequest): AutoAnchorResponse {
  if (!request.referencePackId) {
    throw new Error("referencePackId is required");
  }

  const pack = getReferencePackById(request.referencePackId);
  const hintsByPart = new Map(request.hints.map((hint) => [hint.partId, hint]));
  const usedHintIds = new Set<string>();

  const anchors: LabelAnchorHint[] = request.labels.map((label, index) => {
    const normalized = normalize(label.text);
    const matchedPart = pack?.requiredParts.find((part) => {
      const terms = [part.label, ...part.synonyms].map(normalize);
      return terms.some((term) => normalized.includes(term));
    });

    const matchedHint =
      (matchedPart ? hintsByPart.get(matchedPart.id) : undefined) ??
      request.hints.find((hint) => !usedHintIds.has(hint.partId));

    if (matchedHint) {
      usedHintIds.add(matchedHint.partId);
      return {
        ...matchedHint,
        partId: matchedPart?.id ?? matchedHint.partId,
      };
    }

    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      partId: matchedPart?.id ?? `part-${index + 1}`,
      x: 0.2 + col * 0.25,
      y: 0.22 + row * 0.2,
      confidence: 0.38,
      bbox: {
        x: 0.16 + col * 0.25,
        y: 0.16 + row * 0.2,
        width: 0.12,
        height: 0.09,
      },
    };
  });

  return { anchors };
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9\s-]/g, " ").replaceAll(/\s+/g, " ").trim();
}
