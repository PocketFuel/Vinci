# Vinci

Vinci is a React + TypeScript scientific illustration builder for isometric SVG scenes, process diagrams, and source-grounded organic illustration workflows.

## v1.4 highlights

- **Scene model upgraded to `1.4.0`** with scientific provenance fields:
  - `meta.scientificMode`
  - `meta.referencePackId`
  - `meta.claims[]`
  - `meta.validation`
- **Scientific grounding layer**:
  - reference packs under `src/data/referencePacks/`
  - source-locked validation engine in `src/engine/scientificValidation.ts`
- **Secure generation architecture (server-side key only)**:
  - Edge-style API routes in `api/`
  - Google adapter path: `api/_lib/googleImageProvider.ts`
  - prompt guardrails: `src/agent/promptBuilder.ts`
- **Hybrid output model**:
  - generated image node support (`image-panel`) in scene graph
  - editable SVG labels/callouts remain native
- **Builder Generate tab**:
  - concept/style/strictness inputs
  - required-parts checklist
  - generation actions + auto-anchor + validation gate
- **SVG metadata export block**:
  - includes scientific mode, reference pack, validation summary, and claim metadata

## Routes

- `/` Builder
- `/presets` Preset gallery
- `/tokens` Token editor
- `/about-plasmonic` Legacy deck viewer/downloads (preserved, non-destructive)

## API routes (Edge/serverless style)

- `POST /api/generate/organic`
- `GET /api/generate/organic/:jobId`
- `POST /api/labels/auto-anchor`
- `POST /api/validate/scientific`

## Security: Google key handling

Do not expose keys in frontend variables.

1. Put secrets in server runtime env only:
   - `GOOGLE_API_KEY`
   - `GOOGLE_IMAGE_MODEL`
2. Never use `VITE_GOOGLE_*` for keys.
3. Keep `.env*` ignored (see `.gitignore`).
4. Use `.env.example` as placeholder template only.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

Current tests cover schema/migration, compiler snapshots, composition, scientific validation, env parsing, and about-page regression.
