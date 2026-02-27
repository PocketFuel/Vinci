import { useMemo, useState } from "react";
import { SceneViewport } from "../components/SceneViewport";
import { saveFile } from "../engine/exporters";
import { getSceneByPresetId } from "../data/presets";
import { vinciPaperWireframe } from "../data/tokens";

export function TokensPage() {
  const [tokens, setTokens] = useState(vinciPaperWireframe);

  const previewScene = useMemo(() => {
    const scene = getSceneByPresetId("ec-01-plasmonic-array-field-focus");
    scene.tokens = { ...tokens };
    return scene;
  }, [tokens]);

  function updateColor(key: keyof typeof tokens, value: string) {
    setTokens((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateNumber(key: keyof typeof tokens, value: number) {
    setTokens((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function exportTokenSet() {
    saveFile("vinci-token-set.json", JSON.stringify(tokens, null, 2), "application/json");
  }

  function colorValue(value: string) {
    return value.toUpperCase();
  }

  return (
    <main className="page tokens-page">
      <section className="panel token-panel">
        <h2>Token Editor</h2>
        <p className="muted">
          Global style profile: <strong>vinci-paper-wireframe</strong>. Update once, restyle every scene.
        </p>

        <div className="token-grid">
          <div className="sh-section">
            <h3 className="sh-section-title">Paper + Ink</h3>
            <label className="sh-field">
              <span className="sh-label">Background Paper</span>
              <div className="sh-color-row">
                <input className="sh-color" type="color" value={tokens.bgPaper} onChange={(e) => updateColor("bgPaper", e.target.value)} />
                <span className="sh-color-value">{colorValue(tokens.bgPaper)}</span>
              </div>
            </label>
            <label className="sh-field">
              <span className="sh-label">Ink Primary</span>
              <div className="sh-color-row">
                <input className="sh-color" type="color" value={tokens.inkPrimary} onChange={(e) => updateColor("inkPrimary", e.target.value)} />
                <span className="sh-color-value">{colorValue(tokens.inkPrimary)}</span>
              </div>
            </label>
            <label className="sh-field">
              <span className="sh-label">Ink Secondary</span>
              <div className="sh-color-row">
                <input className="sh-color" type="color" value={tokens.inkSecondary} onChange={(e) => updateColor("inkSecondary", e.target.value)} />
                <span className="sh-color-value">{colorValue(tokens.inkSecondary)}</span>
              </div>
            </label>
          </div>

          <div className="sh-section">
            <h3 className="sh-section-title">Face Fill System</h3>
            <label className="sh-field">
              <span className="sh-label">Fill Top</span>
              <div className="sh-color-row">
                <input className="sh-color" type="color" value={tokens.fillTop} onChange={(e) => updateColor("fillTop", e.target.value)} />
                <span className="sh-color-value">{colorValue(tokens.fillTop)}</span>
              </div>
            </label>
            <label className="sh-field">
              <span className="sh-label">Fill Left</span>
              <div className="sh-color-row">
                <input className="sh-color" type="color" value={tokens.fillLeft} onChange={(e) => updateColor("fillLeft", e.target.value)} />
                <span className="sh-color-value">{colorValue(tokens.fillLeft)}</span>
              </div>
            </label>
            <label className="sh-field">
              <span className="sh-label">Fill Right</span>
              <div className="sh-color-row">
                <input className="sh-color" type="color" value={tokens.fillRight} onChange={(e) => updateColor("fillRight", e.target.value)} />
                <span className="sh-color-value">{colorValue(tokens.fillRight)}</span>
              </div>
            </label>
          </div>

          <div className="sh-section">
            <h3 className="sh-section-title">Line + Hatch</h3>
            <label className="sh-field">
              <span className="sh-label">Line Width ({tokens.lineWidth.toFixed(2)})</span>
              <input
                className="sh-range"
                type="range"
                min="0.8"
                max="3.0"
                step="0.05"
                value={tokens.lineWidth}
                onChange={(e) => updateNumber("lineWidth", Number(e.target.value))}
              />
            </label>
            <label className="sh-field">
              <span className="sh-label">Hatch Density ({tokens.hatchDensity.toFixed(2)})</span>
              <input
                className="sh-range"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={tokens.hatchDensity}
                onChange={(e) => updateNumber("hatchDensity", Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <button className="sh-button" onClick={exportTokenSet}>
          Export Token Profile JSON
        </button>
      </section>

      <section className="panel token-preview-panel">
        <h3>Live Token Preview</h3>
        <SceneViewport
          scene={previewScene}
          width={1100}
          height={620}
          compileOptions={{
            includeAnnotations: false,
            fitToFrame: true,
            showGrid: false,
          }}
        />
      </section>
    </main>
  );
}
