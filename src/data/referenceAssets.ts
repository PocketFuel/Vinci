import type { ReferenceAsset } from "../engine/types";

export const referenceAssetManifest: ReferenceAsset[] = [
  {
    assetId: "plasmonic-html-deck",
    title: "Legacy HTML Deck",
    path: "/slides/plasmonic-hydrogen-6-slides.html",
    mime: "text/html",
    kind: "html",
    embedAllowed: true,
    downloadLabel: "Open HTML Deck",
    metadata: {
      dimensions: "1920 x 1080 slide format",
      generatedOn: "2026-02-26",
      note: "Legacy reference build preserved in place",
    },
  },
  {
    assetId: "plasmonic-pptx-6",
    title: "Canva PPTX (6 slides)",
    path: "/slides/plasmonic-hydrogen-6-slides-canva.pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "pptx",
    embedAllowed: false,
    downloadLabel: "Download 6-slide PPTX",
    metadata: {
      dimensions: "1920 x 1080 equivalent",
      generatedOn: "2026-02-26",
    },
  },
  {
    assetId: "plasmonic-pptx-7",
    title: "Canva PPTX (7 slides incl. pricing)",
    path: "/slides/plasmonic-hydrogen-7-slides-canva-1920x1080.pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "pptx",
    embedAllowed: false,
    downloadLabel: "Download 7-slide PPTX",
    metadata: {
      dimensions: "1920 x 1080",
      generatedOn: "2026-02-26",
      note: "Includes dedicated pricing slide",
    },
  },
];
