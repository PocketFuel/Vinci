import { mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const assets = [
  "slides/plasmonic-hydrogen-6-slides.html",
  "slides/plasmonic-hydrogen-6-slides-canva.pptx",
  "slides/plasmonic-hydrogen-7-slides-canva-1920x1080.pptx",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(path.join(root, "public", "slides"), { recursive: true });

  for (const relPath of assets) {
    const source = path.join(root, relPath);
    const target = path.join(root, "public", relPath);

    if (!(await exists(source))) {
      console.warn(`[sync-assets] Missing source: ${relPath}`);
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    console.log(`[sync-assets] Copied ${relPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
