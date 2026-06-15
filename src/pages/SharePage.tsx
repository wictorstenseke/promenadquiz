import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { storage } from "../storage";
import type { Walk } from "../types";

export default function SharePage() {
  const { id } = useParams();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) storage.getWalk(id).then(setWalk);
  }, [id]);

  if (!walk) return <main className="page muted">Laddar…</main>;

  const url = `${window.location.origin}/p/${walk.id}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="page">
      <Link to={`/walk/${walk.id}/edit`} className="linkbtn">
        ← Tillbaka till redigering
      </Link>
      <p className="eyebrow" style={{ marginTop: "1.2rem" }}>
        Redo att dela
      </p>
      <h1 className="display-xl" style={{ fontSize: "clamp(2.2rem,7vw,3.6rem)" }}>
        {walk.title}
      </h1>
      <p className="lede">
        Deltagare öppnar promenaden via länken eller QR-koden. Koden är{" "}
        <strong>{walk.id}</strong>.
      </p>

      <div className="card ticket" style={{ marginTop: "1.6rem" }}>
        <div className="share-grid">
          <div className="qr-frame">
            <QRCodeSVG value={url} size={168} bgColor="#ffffff" fgColor="#1c1b17" />
          </div>
          <div className="stack" style={{ gap: "0.8rem" }}>
            <div className="url-box">{url}</div>
            <div className="row">
              <button className="btn sm" onClick={copy}>
                {copied ? "✓ Kopierad" : "Kopiera länk"}
              </button>
              <Link to={`/p/${walk.id}`} className="btn ghost sm">
                Öppna som deltagare →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: "0.7rem", marginTop: "1.4rem" }}>
        <Link to={`/walk/${walk.id}/leaderboard`} className="btn ghost">
          Topplista
        </Link>
        {walk.settings.printable && (
          <Link to={`/walk/${walk.id}/print`} className="btn ghost">
            Skriv ut frågor
          </Link>
        )}
      </div>

      <p className="muted" style={{ marginTop: "1.6rem", fontSize: "0.9rem" }}>
        Obs: i v1 lagras allt lokalt i den här webbläsaren. Äkta delning mellan
        enheter och gemensam topplista kommer när Firebase kopplas in.
      </p>
    </main>
  );
}
