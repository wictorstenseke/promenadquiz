import { Link, Outlet } from "react-router-dom";

export function Shell() {
  return (
    <div className="shell">
      <header className="topbar no-print">
        <Link to="/" className="brand">
          <span className="mark" aria-hidden>
            ✦
          </span>
          <span>
            Promenadquiz
            <small>Tipspromenad</small>
          </span>
        </Link>
        <Link to="/" className="btn ghost sm">
          Mina promenader
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
