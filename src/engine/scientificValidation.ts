import { getReferencePackById, type ReferencePack } from "../data/referencePacks";
import type { AnnotationLabel, SceneDocument, ScientificClaim, ValidationCheck, ValidationReport } from "./types";

type ScientificValidationOptions = {
  scoreThreshold?: number;
  reviewedBy?: string;
};

type PartCoverage = {
  matchedPartIds: string[];
  missingRequiredPartIds: string[];
};

export function validateSceneScientificGrounding(
  scene: SceneDocument,
  options: ScientificValidationOptions = {}
): ValidationReport {
  const pack = getReferencePackById(scene.meta.referencePackId);
  const threshold = options.scoreThreshold ?? 80;

  if (!pack) {
    const checklist: ValidationCheck[] = [
      {
        id: "reference-pack-exists",
        name: "Reference pack exists",
        required: true,
        passed: false,
        notes: `Reference pack '${scene.meta.referencePackId}' was not found.`,
      },
    ];
    return finalizeValidation(checklist, threshold, options.reviewedBy ?? "validator");
  }

  const partCoverage = computePartCoverage(pack, scene.annotations.labels);
  const claimsCoverage = computeClaimCoverage(scene.meta.claims, pack);

  const checklist: ValidationCheck[] = [
    {
      id: "required-parts-present",
      name: "Required parts present",
      required: true,
      passed: partCoverage.missingRequiredPartIds.length === 0,
      notes:
        partCoverage.missingRequiredPartIds.length === 0
          ? "All required parts are represented in labels."
          : `Missing: ${partCoverage.missingRequiredPartIds.join(", ")}`,
    },
    {
      id: "labels-map-to-required-parts",
      name: "Every label maps to required parts/synonyms",
      required: true,
      passed: partCoverage.matchedPartIds.length >= Math.min(scene.annotations.labels.length, pack.requiredParts.length),
      notes: `Matched ${partCoverage.matchedPartIds.length}/${scene.annotations.labels.length} labels to reference parts.`,
    },
    {
      id: "claims-backed-by-sources",
      name: "Claims backed by at least one source",
      required: true,
      passed: claimsCoverage.unsourcedClaimIds.length === 0,
      notes:
        claimsCoverage.unsourcedClaimIds.length === 0
          ? "All claims include source ids."
          : `Unsourced claim ids: ${claimsCoverage.unsourcedClaimIds.join(", ")}`,
    },
    {
      id: "claim-sources-in-reference-pack",
      name: "Claim source IDs exist in selected reference pack",
      required: true,
      passed: claimsCoverage.unknownSourceIds.length === 0,
      notes:
        claimsCoverage.unknownSourceIds.length === 0
          ? "All source ids are recognized by the selected pack."
          : `Unknown source ids: ${claimsCoverage.unknownSourceIds.join(", ")}`,
    },
  ];

  return finalizeValidation(checklist, threshold, options.reviewedBy ?? "validator");
}

export function applyValidationToScene(scene: SceneDocument, options: ScientificValidationOptions = {}): SceneDocument {
  const report = validateSceneScientificGrounding(scene, options);
  return {
    ...scene,
    meta: {
      ...scene.meta,
      validation: report,
    },
  };
}

function computePartCoverage(pack: ReferencePack, labels: AnnotationLabel[]): PartCoverage {
  const normalizedLabels = labels.map((label) => normalizeText(label.text));
  const matchedPartIds = new Set<string>();

  pack.requiredParts.forEach((part) => {
    const terms = [part.label, ...part.synonyms].map((term) => normalizeText(term));
    const matched = normalizedLabels.some((labelText) => terms.some((term) => labelText.includes(term)));
    if (matched) {
      matchedPartIds.add(part.id);
    }
  });

  const missingRequiredPartIds = pack.requiredParts.filter((part) => !matchedPartIds.has(part.id)).map((part) => part.id);

  return {
    matchedPartIds: Array.from(matchedPartIds),
    missingRequiredPartIds,
  };
}

function computeClaimCoverage(claims: ScientificClaim[], pack: ReferencePack): {
  unsourcedClaimIds: string[];
  unknownSourceIds: string[];
} {
  const availableSourceIds = new Set(pack.sources.map((source) => source.id));
  const unsourcedClaimIds: string[] = [];
  const unknownSourceIds = new Set<string>();

  claims.forEach((claim) => {
    if (!claim.sourceIds || claim.sourceIds.length === 0) {
      unsourcedClaimIds.push(claim.id);
      return;
    }
    claim.sourceIds.forEach((sourceId) => {
      if (!availableSourceIds.has(sourceId)) {
        unknownSourceIds.add(sourceId);
      }
    });
  });

  return {
    unsourcedClaimIds,
    unknownSourceIds: Array.from(unknownSourceIds),
  };
}

function finalizeValidation(checklist: ValidationCheck[], threshold: number, reviewedBy: string): ValidationReport {
  const requiredChecks = checklist.filter((check) => check.required);
  const passedRequiredChecks = requiredChecks.filter((check) => check.passed);
  const score = requiredChecks.length === 0 ? 100 : Math.round((passedRequiredChecks.length / requiredChecks.length) * 100);

  return {
    checklist,
    score,
    ready: score >= threshold && requiredChecks.every((check) => check.passed),
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    notes:
      score >= threshold
        ? "Validation passed source-locked threshold."
        : `Validation score ${score} is below required threshold ${threshold}.`,
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9\s-]/g, " ").replaceAll(/\s+/g, " ").trim();
}
