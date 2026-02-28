import { HelpCircle, Keyboard, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "../lib/utils";

const links = [
  { to: "/", label: "Builder" },
  { to: "/presets", label: "Presets" },
  { to: "/tokens", label: "Tokens" },
  { to: "/about-plasmonic", label: "About Plasmonic…" },
];

type TopNavProps = {
  onOpenShortcuts: () => void;
};

export function TopNav({ onOpenShortcuts }: TopNavProps) {
  return (
    <TooltipProvider delayDuration={180}>
      <header className="mx-5 mt-5 rounded-2xl border border-border/90 bg-card/85 px-4 py-3 shadow-panel backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-gradient-to-b from-secondary to-secondary/60 text-lg font-bold text-primary">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl leading-none">Vinci</h1>
                <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                  <Sparkles className="h-3 w-3" />
                  v1.2
                </Badge>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Scientific Isometric SVG Builder</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background/70 p-1" aria-label="Main">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline" className="gap-2" onClick={onOpenShortcuts} aria-label="Open keyboard shortcuts">
                  <Keyboard className="h-4 w-4" />
                  Keyboard
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open shortcuts (? / Shift+/)</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Quick help">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <h3 className="font-semibold">Builder interaction model</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>Space + drag pans the canvas</li>
                  <li>Shift + drag constrains node movement</li>
                  <li>Select nodes to rotate, scale, and adjust connector width</li>
                  <li>Cmd/Ctrl + Z/Y supports undo and redo</li>
                  <li>Callouts auto-route to prevent overlap</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
