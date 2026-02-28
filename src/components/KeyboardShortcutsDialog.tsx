import { Keyboard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";

type KeyboardShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

const navigationShortcuts = [
  { keys: "Space + Drag", action: "Pan canvas" },
  { keys: "+ / -", action: "Zoom in / out" },
  { keys: "0", action: "Reset view" },
  { keys: "Cmd/Ctrl + Z", action: "Undo" },
  { keys: "Cmd/Ctrl + Shift + Z", action: "Redo" },
  { keys: "Ctrl + Y", action: "Redo (Windows)" },
  { keys: "?", action: "Open / close shortcuts" },
  { keys: "Esc", action: "Close dialogs" },
];

const editingShortcuts = [
  { keys: "Drag node", action: "Move selected node" },
  { keys: "Shift + Drag", action: "Axis-constrained move" },
  { keys: "Delete / Backspace", action: "Delete selected node" },
  { keys: "[ / ]", action: "Rotate selected node (Z)" },
  { keys: "Shift + , / .", action: "Scale selected node down / up" },
  { keys: "G", action: "Toggle isometric grid" },
  { keys: "A", action: "Toggle annotations" },
  { keys: "R", action: "Recompose scene" },
];

function ShortcutList({ items }: { items: Array<{ keys: string; action: string }> }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.keys + item.action} className="grid grid-cols-[170px,1fr] items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
          <Badge className="w-fit border-primary/30 bg-primary/10 text-primary">{item.keys}</Badge>
          <span className="text-sm text-muted-foreground">{item.action}</span>
        </div>
      ))}
    </div>
  );
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>Vinci behaves like modern design tools: quick pan, constrained drag, and command-level toggles.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="navigation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="editing">Editing</TabsTrigger>
          </TabsList>
          <ScrollArea className="mt-3 h-[52vh] pr-3">
            <TabsContent value="navigation" className="mt-0">
              <ShortcutList items={navigationShortcuts} />
            </TabsContent>
            <TabsContent value="editing" className="mt-0">
              <ShortcutList items={editingShortcuts} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
