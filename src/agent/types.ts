import type { ValidationReport } from "../engine/types";

export type OrganicConcept = "saffron-anatomy" | "plant-cell" | "plant-tissues" | "plasmonic-reaction";

export type OrganicStyleProfile = "watercolor-botanical" | "technical-plate" | "hybrid";

export type OrganicGenerationRequest = {
  concept: OrganicConcept;
  styleProfile: OrganicStyleProfile;
  requiredParts: string[];
  compositionHints: {
    orientation: "portrait" | "landscape" | "square";
    focalHierarchy: string[];
    background: "paper" | "clean-white" | "dark-plate";
  };
  referencePackId: string;
  strictnessMode: "source-locked" | "guided-creative" | "fast-draft";
  lockStructure?: boolean;
  variationSeed?: number;
};

export type LabelAnchorHint = {
  partId: string;
  x: number;
  y: number;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
};

export type GeneratedImageAsset = {
  id: string;
  mime: "image/png";
  url: string;
  width: number;
  height: number;
  createdAt: string;
  provider: "google";
};

export type OrganicGenerationResponse = {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  imageAsset?: GeneratedImageAsset;
  anchorHints: LabelAnchorHint[];
  validationPrecheck: ValidationReport;
  error?: string;
};

export type AutoAnchorRequest = {
  referencePackId: string;
  hints: LabelAnchorHint[];
  labels: Array<{ id: string; text: string }>;
};

export type AutoAnchorResponse = {
  anchors: LabelAnchorHint[];
};
