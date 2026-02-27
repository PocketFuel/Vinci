import { Link } from "react-router-dom";
import { compileSceneToSvg } from "../engine/compiler";
import { getSceneByPresetId, presetManifest } from "../data/presets";

export function PresetsPage() {
  return (
    <main className="page">
      <section className="panel">
        <h2>Preset Library</h2>
        <p className="muted">
          Nine scene templates grouped by concept family: Energy Creation, Energy & Data Storage, and Saffron Growth.
        </p>

        <div className="preset-grid">
          {presetManifest.map((preset) => {
            const scene = getSceneByPresetId(preset.presetId);
            const previewSvg = compileSceneToSvg(scene, {
              width: 420,
              height: 250,
              includeAnnotations: false,
              fitToFrame: true,
            });

            return (
              <article key={preset.presetId} className="preset-card">
                <div className="preset-preview" dangerouslySetInnerHTML={{ __html: previewSvg }} />
                <div className="preset-body">
                  <h3>{preset.title}</h3>
                  <p>{preset.scientificNotes}</p>
                  <div className="tag-row">
                    {preset.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="card-actions">
                    <span className="muted">{preset.concept}</span>
                    <Link to={`/?preset=${preset.presetId}`} className="text-button">
                      Open in Builder
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
