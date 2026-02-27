import { NavLink } from "react-router-dom";

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
    <header className="top-nav">
      <div className="brand">
        <span className="brand-mark">V</span>
        <div>
          <h1>Vinci</h1>
          <p>Scientific Isometric SVG Builder</p>
        </div>
      </div>

      <div className="top-nav-actions">
        <nav className="link-row" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "nav-chip active" : "nav-chip")}
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="nav-icon-button" onClick={onOpenShortcuts} aria-label="Open keyboard shortcuts">
          <span aria-hidden="true" className="kbd-icon">
            ⌨
          </span>
          <span>Keyboard Shortcuts</span>
        </button>
      </div>
    </header>
  );
}
