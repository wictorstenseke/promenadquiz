import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { storage } from "../storage";
import { newWalk } from "../lib/factory";
import type { Walk } from "../types";

export default function HomePage() {
  const [walks, setWalks] = useState<Walk[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    storage.listWalks().then(setWalks);
  }, []);

  async function create() {
    const walk = newWalk();
    await storage.saveWalk(walk);
    navigate(`/walk/${walk.id}/edit`);
  }

  return (
    <main className="page">
      <p className="eyebrow">Bygg · skriv ut · dela</p>
      <h1 className="display-xl">
        Tipspromenaden,
        <br />
        <em>digitalt.</em>
      </h1>
      <p className="lede">
        Sätt ihop frågor i klassiskt 1 · X · 2-format, kör digitalt eller skriv
        ut en fråga per A4, och dela med en länk. Allt sparas automatiskt.
      </p>

      <div className="row" style={{ marginTop: "1.6rem" }}>
        <button className="btn blaze" onClick={create}>
          ✦ Ny promenad
        </button>
      </div>

      <hr className="divider" />

      <div className="row between">
        <h2 style={{ fontSize: "1.5rem" }}>Mina promenader</h2>
        {walks && <span className="pill">{walks.length} st</span>}
      </div>

      {walks === null ? (
        <p className="muted" style={{ marginTop: "1.4rem" }}>
          Laddar…
        </p>
      ) : walks.length === 0 ? (
        <div className="empty" style={{ marginTop: "1.4rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Inga promenader än.</p>
          <p style={{ margin: "0.4rem 0 0" }}>
            Skapa din första med knappen ovan.
          </p>
        </div>
      ) : (
        <div className="walk-list">
          {walks.map((w) => (
            <Link
              key={w.id}
              to={`/walk/${w.id}/edit`}
              className="card ticket walk-row"
            >
              <div className="meta">
                <div className="row">
                  <span className={`pill ${w.status}`}>
                    {w.status === "published" ? "Publicerad" : "Utkast"}
                  </span>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {w.questions.length} frågor
                  </span>
                </div>
                <h3>{w.title || "Namnlös promenad"}</h3>
              </div>
              <span className="btn ghost sm" aria-hidden>
                Öppna →
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
