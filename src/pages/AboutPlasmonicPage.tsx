import { useEffect, useMemo, useState } from "react";
import { referenceAssetManifest } from "../data/referenceAssets";

type AssetStatus = "checking" | "available" | "missing";

export function AboutPlasmonicPage() {
  const [statusMap, setStatusMap] = useState<Record<string, AssetStatus>>(() =>
    Object.fromEntries(referenceAssetManifest.map((asset) => [asset.assetId, "checking"]))
  );

  useEffect(() => {
    let mounted = true;

    async function checkAssets() {
      const results = await Promise.all(
        referenceAssetManifest.map(async (asset) => {
          try {
            const response = await fetch(asset.path, { method: "HEAD" });
            return [asset.assetId, response.ok ? "available" : "missing"] as const;
          } catch {
            return [asset.assetId, "missing"] as const;
          }
        })
      );

      if (!mounted) {
        return;
      }

      setStatusMap((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    }

    void checkAssets();

    return () => {
      mounted = false;
    };
  }, []);

  const htmlAsset = useMemo(
    () => referenceAssetManifest.find((asset) => asset.kind === "html" && asset.embedAllowed),
    []
  );

  const missingAssets = referenceAssetManifest.filter((asset) => statusMap[asset.assetId] === "missing");

  return (
    <main className="page about-grid">
      <section className="panel about-main">
        <h2>About Plasmonic…</h2>
        <p className="muted">
          Legacy reference materials are preserved non-destructively and surfaced here inside Vinci for continuity.
        </p>

        {missingAssets.length > 0 ? (
          <div className="warning-card" role="alert">
            <h3>Some reference assets are unavailable</h3>
            <ul>
              {missingAssets.map((asset) => (
                <li key={asset.assetId}>{asset.title}</li>
              ))}
            </ul>
            <p className="muted">Available files can still be opened or downloaded below.</p>
          </div>
        ) : null}

        {htmlAsset && statusMap[htmlAsset.assetId] === "available" ? (
          <div className="embedded-deck">
            <iframe
              src={htmlAsset.path}
              title="Plasmonic legacy deck"
              loading="lazy"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="warning-card">
            <h3>Embedded HTML deck not available</h3>
            <p className="muted">Use the file links on the right to open or download the preserved build artifacts.</p>
          </div>
        )}
      </section>

      <aside className="panel about-side">
        <h3>Reference Assets</h3>
        <div className="asset-list">
          {referenceAssetManifest.map((asset) => (
            <article key={asset.assetId} className="asset-card">
              <div className="asset-head">
                <strong>{asset.title}</strong>
                <span className={`status-chip ${statusMap[asset.assetId] ?? "checking"}`}>
                  {statusMap[asset.assetId] ?? "checking"}
                </span>
              </div>
              <p className="muted">{asset.path}</p>
              <a href={asset.path} className="text-button" download={asset.kind === "pptx" ? "" : undefined}>
                {asset.downloadLabel}
              </a>
              <dl className="asset-meta">
                <dt>Kind</dt>
                <dd>{asset.kind.toUpperCase()}</dd>
                <dt>Dimensions</dt>
                <dd>{asset.metadata?.dimensions ?? "n/a"}</dd>
                <dt>Generated</dt>
                <dd>{asset.metadata?.generatedOn ?? "n/a"}</dd>
                <dt>Note</dt>
                <dd>{asset.metadata?.note ?? "Legacy reference build"}</dd>
              </dl>
            </article>
          ))}
        </div>
      </aside>
    </main>
  );
}
