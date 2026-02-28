import { describe, expect, it } from "vitest";
import { buildOrganicGenerationPrompt } from "../agent/promptBuilder";

describe("organic prompt builder", () => {
  it("includes required parts and style directives", () => {
    const prompt = buildOrganicGenerationPrompt({
      concept: "saffron-anatomy",
      styleProfile: "watercolor-botanical",
      requiredParts: ["stigma", "stamen", "petals"],
      compositionHints: {
        orientation: "portrait",
        focalHierarchy: ["stigma", "stamen", "petals"],
        background: "paper",
      },
      referencePackId: "saffron-anatomy",
      strictnessMode: "source-locked",
      lockStructure: false,
    });

    expect(prompt.userPrompt).toContain("stigma");
    expect(prompt.userPrompt).toContain("watercolor");
    expect(prompt.systemPrompt).toContain("Do not invent structures");
    expect(prompt.bannedDriftTerms.length).toBeGreaterThan(0);
  });
});
