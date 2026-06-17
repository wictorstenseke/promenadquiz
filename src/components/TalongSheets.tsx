import type { CSSProperties } from "react";
import { liveContent } from "../lib/walk";
import { OPTION_KEYS, type Walk } from "../types";

/** Print-only answer slips ("talonger") for pen-and-paper participants. One
 *  landscape A4 page holds two identical slips side by side. Hidden on screen;
 *  shown only when the body carries the `print-talonger` class (see styles.css
 *  and PrintMenu). Questions are listed in a single compact column as a table:
 *  one 1/X/2 header row, then a row per question with empty mark boxes. Cells
 *  are driven by the published snapshot so the numbering always matches what
 *  players actually answer. */
export function TalongSheets({ walk }: { walk: Walk }) {
  const live = liveContent(walk);
  const questions = [...live.questions].sort(
    (a, b) => a.stationNumber - b.stationNumber,
  );
  const includeTiebreaker = live.settings.includeTiebreaker;

  // Drives print-time row scaling so any count fits one landscape page.
  const slipStyle = { "--talong-count": questions.length } as CSSProperties;

  // Three identical slips on the page (compact enough to fit a third).
  const slips = [0, 1, 2];

  return (
    <div className="talong-only">
      <div className="talong-page">
        {slips.map((i) => (
          <section className="talong" key={i} style={slipStyle}>
            <div className="talong-head">
              <span className="talong-title">{live.title || "Tipspromenad"}</span>
              <span className="talong-name">Namn:</span>
            </div>
            <table className="talong-table">
              <thead>
                <tr>
                  <th className="talong-corner" />
                  {OPTION_KEYS.map((k) => (
                    <th className="talong-colhead" key={k}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr className="talong-row" key={q.id}>
                    <th className="talong-num">{q.stationNumber}</th>
                    {OPTION_KEYS.map((k) => (
                      <td className="talong-cell" key={k} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {includeTiebreaker && (
              <div className="talong-tie">Utslagsfråga:</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
