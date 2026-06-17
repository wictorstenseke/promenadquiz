import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { storage } from "../storage";
import { PrintSheets } from "../components/PrintSheets";
import { TalongSheets } from "../components/TalongSheets";
import { PrintMenu } from "../components/PrintMenu";
import { OPTION_KEYS, type Walk } from "../types";

export default function PreviewPage() {
  const { id } = useParams();
  const [walk, setWalk] = useState<Walk | null>(null);

  useEffect(() => {
    if (id) storage.getWalk(id).then(setWalk);
  }, [id]);

  if (!walk) return <main className="page muted">Laddar…</main>;

  const questions = [...walk.questions].sort(
    (a, b) => a.stationNumber - b.stationNumber,
  );

  return (
    <>
    <main className="page no-print">
      <div className="row between">
        <Link to={`/walk/${walk.id}/edit`} className="linkbtn">
          ← Tillbaka till redigering
        </Link>
        {walk.settings.printable && <PrintMenu />}
      </div>

      <p className="eyebrow" style={{ marginTop: "1.4rem" }}>
        Förhandsgranskning
      </p>
      <h1 className="display-xl" style={{ fontSize: "clamp(2rem,6vw,3.4rem)" }}>
        {walk.title || "Namnlös promenad"}
      </h1>
      <p className="lede">Så här ser frågorna ut. Rätt svar är markerat.</p>

      <div className="stack" style={{ gap: "1.1rem", marginTop: "1.6rem" }}>
        {questions.map((q, i) => (
          <article key={q.id} className="card preview-q">
            <div className="row between" style={{ marginBottom: "0.9rem" }}>
              <span className="station-chip">Fråga {i + 1}</span>
            </div>
            <h2 className="preview-q-text">{q.text || "—"}</h2>
            <div className="options" style={{ marginTop: "1rem" }}>
              {OPTION_KEYS.map((k) => (
                <div
                  key={k}
                  className="opt preview-opt"
                  data-correct={q.correct === k}
                >
                  <div className="row" style={{ gap: "0.7rem", alignItems: "center" }}>
                    <span className="key-inline">{k}</span>
                    <span className="preview-opt-val">{q.options[k]}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}

        {walk.settings.includeTiebreaker && walk.tiebreaker?.question && (
          <article className="card preview-q">
            <div className="row between" style={{ marginBottom: "0.9rem" }}>
              <span className="pill">Utslagsfråga</span>
            </div>
            <h2 className="preview-q-text">{walk.tiebreaker.question}</h2>
          </article>
        )}
      </div>

      <div className="row" style={{ marginTop: "1.6rem" }}>
        <Link to={`/walk/${walk.id}/edit`} className="btn ghost sm">
          ← Tillbaka till redigera
        </Link>
      </div>
    </main>
    {walk.settings.printable && <PrintSheets walk={walk} />}
    {walk.settings.printable && <TalongSheets walk={walk} />}
    </>
  );
}
