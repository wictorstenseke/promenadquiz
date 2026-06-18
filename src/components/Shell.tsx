import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { HomeIcon } from "./Icons";

export function Shell() {
  // Router keeps scroll position across navigations; reset to top on each route
  // change so a new page renders from the top, not wherever the last one sat.
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
