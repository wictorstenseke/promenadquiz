import { liveContent } from "../lib/walk";
import { OPTION_KEYS, type Walk } from "../types";

/** Print-only markup: one question per A4. Hidden on screen (see styles.css),
 *  shown only when the browser print dialog renders. Reused by the dedicated
 *  print page and the share page's direct print action. */
export function PrintSheets({ walk }: { walk: Walk }) {
  // Signs must match what the app scores → the published snapshot, not the draft.
  const live = liveContent(walk);
  const sheets = [...live.questions].sort(
    (a, b) => a.stationNumber - b.stationNumber,
  );

  return (
    <div className="print-only">
      {sheets.map((q) => (
        <section className="print-sheet" key={q.id}>
          <div className="print-head">
            <div className="print-quizname">{live.title}</div>
            <div className="print-station">Fråga {q.stationNumber}</div>
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
          <div className="print-foot">Promenadquiz · tipspromenad</div>
        </section>
      ))}
    </div>
  );
}
