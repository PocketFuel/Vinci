type KeyboardShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

const shortcuts = [
  { keys: "Space + Drag", action: "Pan canvas" },
  { keys: "Drag Node", action: "Move selected node" },
  { keys: "Shift + Drag", action: "Constrain drag to horizontal/vertical" },
  { keys: "+ / -", action: "Zoom in/out" },
  { keys: "0", action: "Reset zoom and pan" },
  { keys: "G", action: "Toggle isometric grid" },
  { keys: "A", action: "Toggle annotations" },
  { keys: "R", action: "Recompose scene" },
  { keys: "?", action: "Open/close shortcuts" },
  { keys: "Esc", action: "Close shortcuts dialog" },
];

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="shortcuts-overlay" role="presentation" onClick={onClose}>
      <section
        className="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button type="button" onClick={onClose} className="icon-close" aria-label="Close keyboard shortcuts">
            ✕
          </button>
        </header>

        <div className="shortcuts-grid">
          {shortcuts.map((item) => (
            <div key={item.keys + item.action} className="shortcut-row">
              <kbd>{item.keys}</kbd>
              <span>{item.action}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

