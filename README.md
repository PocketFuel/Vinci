# Vinci

Vinci is a greenfield React + TypeScript app for building isometric, tokenized scientific SVG illustrations.

## What is implemented

- App name and brand: **Vinci**
- Routes:
  - `/` Builder workspace
  - `/presets` 9-scene preset gallery
  - `/tokens` global token editor (`vinci-paper-wireframe`)
  - `/about-plasmonic` preserved legacy deck viewer + downloads
- Scene model + schema contracts:
  - `SceneDocument`, `TokenSet`, `Node`, `AnimationSpec`, `AnnotationLayer`, `PresetManifest`, `ReferenceAsset`
- Isometric engine modules:
  - Projection + camera presets
  - Primitive rendering
  - Scene depth sorting
  - SVG compiler and export pipeline
  - Annotation and equation layers
  - Subtle animation recipes (pulse/flow/orbit/growth)
- Export:
  - Editable SVG (stable node IDs + data attributes)
  - Re-importable scene JSON
- Preset pack (9 scenes):
  - Energy Creation (3)
  - Energy & Data Storage (3)
  - Saffron Growth (3)
- Non-destructive legacy integration:
  - Uses existing files in `slides/` as reference assets

## Pysometric-Inspired Rendering Architecture

Vinci v1.1 takes architectural inspiration from [`svoisen/pysometric`](https://github.com/svoisen/pysometric) and adapts it for an interactive TypeScript + SVG workflow:

- Scene-first mental model:
  - `SceneDocument` + camera + composition + rendering metadata drive the compiler.
- Polygon/face-first primitive compilation:
  - Primitives compile through sampled vertices/faces before SVG emission.
- Deterministic occlusion:
  - Render order key is `(renderPriority asc, depth asc, id asc)`.
- Isometric grid fidelity:
  - Grid paths are generated from projected X/Y/Z axis families (not a rotated hatch background).
- Immutable render geometry per compile pass:
  - Scene remains editable, compiler works from deterministic intermediate geometry.

## Scene Versioning + Migration

- Current save/export version: `1.1.0`
- Import support: `1.0.0` and `1.1.0`
- `1.0.0` scenes are auto-migrated by `migrateScene_1_0_to_1_1`:
  - injects defaults for `composition`, `rendering`, and `annotations.layout`
  - infers missing annotation `targetNodeId` from nearest node center

## Preset Authoring Guidelines (Callouts + Composition)

- Set `composition.fitMode` to `auto` for preset defaults that fill frame consistently.
- Keep `minOccupancy` between `0.68` and `0.88` to preserve readability and scale.
- Provide `targetNodeId` for every annotation label.
- Prefer `annotations.layout.mode = outside-rails` for scientific callouts.
- Use `renderPriority` only for intentional occlusion overrides; rely on depth sorting by default.

## Local development

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

Test coverage includes projection behavior, schema validation, SVG snapshot output, about-page fallback behavior, and JSON roundtrip.

## Notes

- Default visual profile uses paper background + monochrome wireframe tone.
- Existing `slides/` files are treated as read-only reference assets.
