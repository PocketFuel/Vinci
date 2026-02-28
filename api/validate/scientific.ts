import { ensureSceneV14 } from "../../src/engine/migrations";
import { validateSceneScientificGrounding } from "../../src/engine/scientificValidation";
import { json, methodNotAllowed } from "../_lib/http";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const scoreThreshold = typeof body?.scoreThreshold === "number" ? body.scoreThreshold : 80;
    const scene = ensureSceneV14(body?.scene);
    const validation = validateSceneScientificGrounding(scene, {
      scoreThreshold,
      reviewedBy: "api-validate-scientific",
    });

    json(res, 200, { validation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate scientific scene";
    json(res, 400, { error: message });
  }
}
