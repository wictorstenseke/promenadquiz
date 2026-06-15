import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { storage } from "../storage";
import { OPTION_KEYS, type Walk } from "../types";

export default function PrintPage() {
  const { id } = useParams();
  const [walk, setWalk] = useState<Walk | null>(null);

  useEffect(() => {
    if (id) storage.getWalk(id).then(setWalk);
  }, [id]);

  if (!walk) return <main className="page muted">Laddar…</main>;

  const sheets = [...walk.questions].sort(
    (a, b) => a.stationNumber - b.stationNumber,
  );

  return (
    <div>
      <div className="no-print page">
        <div className="row between">
          <Link to={`/walk/${walk.id}/edit`} className="linkbtn">
            ← Tillbaka
          </Link>
          <button className="btn blaze" onClick={() => window.print()}>
            ⎙ Skriv ut / Spara som PDF
          </button>
        </div>
        <p className="eyebrow" style={{ marginTop: "1.4rem" }}>
          Utskriftsvy · en fråga per A4
        </p>
        <h1 className="display-xl" style={{ fontSize: "clamp(2rem,6vw,3rem)" }}>
          {walk.title}
        </h1>
        <p className="lede">
          Tryck på knappen ovan. Varje fråga hamnar på ett eget A4 — perfekt att
          sätta upp längs banan.
        </p>
      </div>

      <div className="print-only">
        {sheets.map((q) => (
          <section className="print-sheet" key={q.id}>
            <div className="print-station">
              Station {q.stationNumber} — {walk.title}
            </div>
            <div className="print-q">{q.text || "—"}</div>
            <div className="print-opts">
              {OPTION_KEYS.map((k) => (
                <div className="print-opt" key={k}>
                  <span className="pk">{k}</span>
                  <span>{q.options[k]}</span>
                </div>
              ))}
            </div>
            <div className="print-foot">Hösttipset · tipspromenad</div>
          </section>
        ))}
      </div>
    </div>
  );
}
