import { getReferencePackById } from "../data/referencePacks";
import type { OrganicGenerationRequest } from "./types";

type PromptBuildResult = {
  systemPrompt: string;
  userPrompt: string;
  bannedDriftTerms: string[];
};

const GLOBAL_BANNED_DRIFT_TERMS = [
  "extra limbs",
  "random icons",
  "fictional organelles",
  "floating unlabeled symbols",
  "unrelated branding",
  "text artifacts",
];

export function buildOrganicGenerationPrompt(input: OrganicGenerationRequest): PromptBuildResult {
  const pack = getReferencePackById(input.referencePackId);
  const requiredParts = input.requiredParts.length > 0 ? input.requiredParts : pack?.requiredParts.map((part) => part.id) ?? [];
  const requiredPartText = requiredParts.join(", ");

  const styleDirective = resolveStyleDirective(input.styleProfile);
  const orientationDirective =
    input.compositionHints.orientation === "portrait"
      ? "portrait composition with central vertical hierarchy"
      : input.compositionHints.orientation === "landscape"
      ? "landscape composition with left-to-right process flow"
      : "square composition with balanced center-weighted structure";

  const backgroundDirective =
    input.compositionHints.background === "paper"
      ? "warm paper background with subtle texture"
      : input.compositionHints.background === "dark-plate"
      ? "dark scientific plate background with high-contrast callout room"
      : "clean white background";

  const strictnessDirective =
    input.strictnessMode === "source-locked"
      ? "Do not invent structures not listed in required parts."
      : input.strictnessMode === "guided-creative"
      ? "Keep structure grounded while allowing minor stylistic flourishes."
      : "Fast-draft allowed, but keep labels and major forms coherent.";

  const sourceNotes = pack?.sources.map((source) => `${source.id}: ${source.title} (${source.publisher}, ${source.year})`).join("; ") ?? "";

  return {
    systemPrompt: [
      "You are a scientific illustrator producing process-accurate visuals.",
      "Output must be a single high-quality PNG frame with clean composition and clear subject hierarchy.",
      strictnessDirective,
      `Reference evidence: ${sourceNotes || "No sources supplied."}`,
    ].join("\n"),
    userPrompt: [
      `Concept: ${input.concept}`,
      `Required parts: ${requiredPartText || "none provided"}`,
      `Focal hierarchy: ${input.compositionHints.focalHierarchy.join(" -> ") || "not provided"}`,
      `Style: ${styleDirective}`,
      `Composition: ${orientationDirective}`,
      `Background: ${backgroundDirective}`,
      input.lockStructure
        ? "Structure must remain fixed; only vary rendering treatment and materials."
        : "Regeneration can adjust composition while preserving required parts.",
      "Leave enough negative space for external callout labels and leaders.",
      "No logos or unrelated decorative motifs.",
    ].join("\n"),
    bannedDriftTerms: GLOBAL_BANNED_DRIFT_TERMS,
  };
}

function resolveStyleDirective(style: OrganicGenerationRequest["styleProfile"]): string {
  if (style === "watercolor-botanical") {
    return "botanical watercolor plate style with scientific restraint and realistic plant anatomy";
  }
  if (style === "technical-plate") {
    return "technical ink scientific plate style with clean line hierarchy and measured shading";
  }
  return "hybrid scientific illustration mixing watercolor volume cues with technical line overlays";
}
