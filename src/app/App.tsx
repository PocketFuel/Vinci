import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { KeyboardShortcutsDialog } from "../components/KeyboardShortcutsDialog";
import { TopNav } from "../components/TopNav";
import { AboutPlasmonicPage } from "../pages/AboutPlasmonicPage";
import { BuilderPage } from "../pages/BuilderPage";
import { PresetsPage } from "../pages/PresetsPage";
import { TokensPage } from "../pages/TokensPage";

export function App() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.key === "?" || (event.shiftKey && event.key === "/")) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShortcutsOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setShortcutsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <TopNav onOpenShortcuts={() => setShortcutsOpen(true)} />
      <div className="min-h-0 flex-1 px-5 pb-5 pt-3">
        <Routes>
          <Route path="/" element={<BuilderPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/tokens" element={<TokensPage />} />
          <Route path="/about-plasmonic" element={<AboutPlasmonicPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
