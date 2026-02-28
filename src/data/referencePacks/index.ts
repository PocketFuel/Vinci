import type { ReferenceSource, SceneDocument } from "../../engine/types";
import saffronAnatomy from "./saffron-anatomy.json";
import plantCell from "./plant-cell.json";
import plantTissues from "./plant-tissues.json";
import plasmonicEnergy from "./plasmonic-energy.json";

export type ReferencePart = {
  id: string;
  label: string;
  synonyms: string[];
};

export type ReferenceChecklistItem = {
  id: string;
  name: string;
  required: boolean;
};

export type ReferencePack = {
  id: string;
  title: string;
  domain: string;
  concept: SceneDocument["meta"]["concept"];
  requiredParts: ReferencePart[];
  claimTemplates: string[];
  sources: ReferenceSource[];
  validationChecklist: ReferenceChecklistItem[];
};

const rawPacks = [saffronAnatomy, plantCell, plantTissues, plasmonicEnergy] as const;

export const referencePacks: ReferencePack[] = rawPacks as unknown as ReferencePack[];

export const referencePackById = Object.fromEntries(
  referencePacks.map((pack) => [pack.id, pack])
) as Record<string, ReferencePack>;

export function getReferencePackById(id: string): ReferencePack | undefined {
  return referencePackById[id];
}
