import { Link, Outlet } from "react-router-dom";
import { HomeIcon } from "./Icons";

export function Shell() {
  return (
    <div className="shell">
      <header className="topbar no-print">
        <Link to="/" className="brand">
          <span>
            Promenadquiz
            <small>Tipspromenad</small>
          </span>
        </Link>
        <Link to="/" className="btn ghost sm nav-home" aria-label="Mina promenader">
          <HomeIcon />
          <span className="nav-home-label">Mina promenader</span>
        </Link>
      </header>
      <Outlet />
      <footer className="footer no-print">
        <span className="footer-meta">
          <a href="https://wictorstenseke.se">WictorStenseke.se</a> · 2026
        </span>
      </footer>
    </div>
  );
}
