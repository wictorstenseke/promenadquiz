import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { storage } from "../storage";
import { PrintSheets } from "../components/PrintSheets";
import { TrophyIcon, PrinterIcon } from "../components/Icons";
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
    <>
    <main className="page no-print">
      <Link to={`/walk/${walk.id}/edit`} className="btn ghost sm">
        ← Tillbaka till redigeringsläge
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

      <div
        className="card ticket"
        style={{ marginTop: "1.6rem", position: "relative" }}
      >
        <div
          className="row"
          style={{
            gap: "0.7rem",
            position: "absolute",
            top: "1rem",
            right: "1rem",
          }}
        >
          <Link to={`/walk/${walk.id}/leaderboard`} className="btn ghost sm">
            <TrophyIcon size={16} /> Topplista
          </Link>
          {walk.settings.printable && (
            <button className="btn ghost sm" onClick={() => window.print()}>
              <PrinterIcon size={16} /> Skriv ut frågor
            </button>
          )}
        </div>
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

      <p className="muted" style={{ marginTop: "1.6rem", fontSize: "0.9rem" }}>
        Obs: i v1 lagras allt lokalt i den här webbläsaren. Äkta delning mellan
        enheter och gemensam topplista kommer när Firebase kopplas in.
      </p>
    </main>
    {walk.settings.printable && <PrintSheets walk={walk} />}
    </>
  );
}
