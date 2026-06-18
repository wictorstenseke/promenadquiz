import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { HomeIcon } from "./Icons";
import { useAuth } from "../hooks/useAuth";
import { AuthSheet } from "./AuthSheet";

export function Shell() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  // Router keeps scroll position across navigations; reset to top on each route
  // change so a new page renders from the top, not wherever the last one sat.
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
        <div className="topbar-actions">
          {user ? (
            <>
              <span className="topbar-email" title={user.email ?? undefined}>
                {user.email}
              </span>
              <button className="btn ghost sm" onClick={() => void signOut()}>
                Logga ut
              </button>
            </>
          ) : (
            <button className="btn ghost sm" onClick={() => setAuthOpen(true)}>
              Logga in
            </button>
          )}
          <Link to="/" className="btn ghost sm nav-home" aria-label="Mina promenader">
            <HomeIcon />
            <span className="nav-home-label">Mina promenader</span>
          </Link>
        </div>
      </header>
      <Outlet />
      <footer className="footer no-print">
        <span className="footer-meta">
          <a href="https://wictorstenseke.se">WictorStenseke.se</a> · 2026
        </span>
      </footer>
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
