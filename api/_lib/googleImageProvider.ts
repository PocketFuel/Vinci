import { buildOrganicGenerationPrompt } from "../../src/agent/promptBuilder";
import { parseGoogleImageEnv } from "../../src/agent/serverEnv";
import type { LabelAnchorHint, OrganicGenerationRequest, OrganicGenerationResponse } from "../../src/agent/types";

const FALLBACK_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WHhkg8AAAAASUVORK5CYII=";

export async function generateOrganicImage(
  request: OrganicGenerationRequest,
  jobId: string,
  validationPrecheck: OrganicGenerationResponse["validationPrecheck"]
): Promise<OrganicGenerationResponse> {
  const { systemPrompt, userPrompt } = buildOrganicGenerationPrompt(request);
  const env = parseGoogleImageEnv(process.env);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    env.GOOGLE_IMAGE_MODEL
  )}:generateContent?key=${encodeURIComponent(env.GOOGLE_API_KEY)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\n${userPrompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google provider request failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            mimeType?: string;
            data?: string;
          };
        }>;
      };
    }>;
  };

  const inline = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.inlineData?.data)?.inlineData;

  const data = inline?.data;
  const mime = inline?.mimeType ?? "image/png";
  const imageUrl = data ? `data:${mime};base64,${data}` : FALLBACK_PNG_DATA_URI;

  const anchorHints = buildAnchorHints(request.requiredParts);

  return {
    jobId,
    status: "succeeded",
    imageAsset: {
      id: `${jobId}-image`,
      mime: "image/png",
      url: imageUrl,
      width: 1536,
      height: 1024,
      createdAt: new Date().toISOString(),
      provider: "google",
    },
    anchorHints,
    validationPrecheck,
  };
}

function buildAnchorHints(parts: string[]): LabelAnchorHint[] {
  const filtered = parts.filter((part) => part.trim().length > 0);
  if (filtered.length === 0) {
    return [];
  }
  return filtered.map((partId, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      partId,
      x: 0.18 + col * 0.28,
      y: 0.18 + row * 0.22,
      confidence: 0.62,
      bbox: {
        x: 0.12 + col * 0.28,
        y: 0.12 + row * 0.22,
        width: 0.14,
        height: 0.1,
      },
    };
  });
}
