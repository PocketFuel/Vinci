import { Link } from "react-router-dom";
import { compileSceneToSvg } from "../engine/compiler";
import { getSceneByPresetId, presetManifest } from "../data/presets";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

export function PresetsPage() {
  return (
    <main className="h-full min-h-0 overflow-y-auto pr-1">
      <section className="grid gap-4">
        <div className="rounded-2xl border border-border bg-card/75 p-5">
          <h2 className="font-display text-4xl">Preset Library</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {presetManifest.length} process-specific scenes across Energy Creation, Energy &amp; Data Storage, and Saffron Growth.
            Each preset is lane-composed, port-connected, and export-ready as editable SVG.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {presetManifest.map((preset) => {
            const scene = getSceneByPresetId(preset.presetId);
            const previewSvg = compileSceneToSvg(scene, {
              width: 960,
              height: 540,
              includeAnnotations: false,
              fitToFrame: true,
              previewMode: "card",
              fitTarget: "subject",
              subjectPadding: 36,
            });

            return (
              <Card key={preset.presetId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-2xl leading-tight md:text-[2rem]">{preset.title}</CardTitle>
                    <Badge className="capitalize">
                      {preset.concept.replaceAll("-", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="text-base leading-relaxed">{preset.scientificNotes}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div
                    className="preset-preview aspect-[16/9] overflow-hidden rounded-xl border border-border bg-background/60"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {preset.tags.map((tag) => (
                      <Badge key={tag}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Link to={`/?preset=${preset.presetId}`} className="w-full">
                    <Button className="w-full">Open in Builder</Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
