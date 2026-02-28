import { useMemo, useState } from "react";
import { Palette, PenTool, SlidersHorizontal } from "lucide-react";
import { SceneViewport } from "../components/SceneViewport";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Slider } from "../components/ui/slider";
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

  return (
    <main className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Token Editor
          </CardTitle>
          <CardDescription>Global paper-wireframe profile. Update once and every preset restyles instantly.</CardDescription>
        </CardHeader>
        <CardContent className="h-[calc(100%-92px)] overflow-y-auto px-4 pb-4 pt-0">
          <div className="grid gap-6">
            <section className="grid gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <PenTool className="h-4 w-4 text-primary" />
                Paper + Ink
              </h3>
              <ColorField label="Background Paper" value={tokens.bgPaper} onChange={(value) => updateColor("bgPaper", value)} />
              <ColorField label="Ink Primary" value={tokens.inkPrimary} onChange={(value) => updateColor("inkPrimary", value)} />
              <ColorField label="Ink Secondary" value={tokens.inkSecondary} onChange={(value) => updateColor("inkSecondary", value)} />
            </section>

            <Separator />

            <section className="grid gap-3">
              <h3 className="text-sm font-semibold">Face Fill System</h3>
              <ColorField label="Fill Top" value={tokens.fillTop} onChange={(value) => updateColor("fillTop", value)} />
              <ColorField label="Fill Left" value={tokens.fillLeft} onChange={(value) => updateColor("fillLeft", value)} />
              <ColorField label="Fill Right" value={tokens.fillRight} onChange={(value) => updateColor("fillRight", value)} />
            </section>

            <Separator />

            <section className="grid gap-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Line + Hatch
              </h3>
              <div className="grid gap-2">
                <Label>Line Width ({tokens.lineWidth.toFixed(2)})</Label>
                <Slider
                  value={[tokens.lineWidth]}
                  min={0.8}
                  max={3}
                  step={0.05}
                  onValueChange={(value) => updateNumber("lineWidth", value[0] ?? tokens.lineWidth)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Hatch Density ({tokens.hatchDensity.toFixed(2)})</Label>
                <Slider
                  value={[tokens.hatchDensity]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => updateNumber("hatchDensity", value[0] ?? tokens.hatchDensity)}
                />
              </div>
            </section>

            <Button onClick={exportTokenSet}>Export Token Profile JSON</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Live Token Preview</CardTitle>
          <CardDescription>Responsive SVG preview with annotation rails and process composition.</CardDescription>
        </CardHeader>
        <CardContent className="h-[calc(100%-88px)] p-3">
          <SceneViewport
            scene={previewScene}
            width={1280}
            height={720}
            compileOptions={{
              includeAnnotations: false,
              fitToFrame: true,
              showGrid: false,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-2">
        <Input
          className="h-11 cursor-pointer rounded-xl p-1"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <Input
          className="h-11 rounded-xl font-mono text-sm uppercase tracking-wide"
          value={value.toUpperCase()}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
