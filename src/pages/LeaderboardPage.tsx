import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { storage, type LeaderboardEntry } from "../storage";
import type { Walk } from "../types";

export default function LeaderboardPage() {
  const { id } = useParams();
  const location = useLocation();
  const backTo: string = (location.state as { from?: string })?.from ?? "/";
  const backLabel = backTo.startsWith("/p/") ? "← Tillbaka" : "← Mina promenader";
  const [walk, setWalk] = useState<Walk | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (!id) return;
    storage.getWalk(id).then(setWalk);
    storage.getLeaderboard(id).then(setBoard);
  }, [id]);

  // Participants (entered via /p/) only see the board once the organiser
  // enables results. Creator routes (from "/") are never gated.
  const withheld =
    backTo.startsWith("/p/") && walk?.settings.showResults === false;

  return (
    <main className="page">
      <Link to={backTo} className="btn ghost sm">
        {backLabel}
      </Link>
      {withheld ? (
        <>
          <p className="eyebrow" style={{ marginTop: "1.2rem" }}>
            Topplista
          </p>
          <h1
            className="display-xl"
            style={{ fontSize: "clamp(2.2rem,7vw,3.6rem)" }}
          >
            {walk?.title ?? "Promenad"}
          </h1>
          <div className="empty" style={{ marginTop: "1.6rem" }}>
            Arrangören avslöjar topplistan när alla är klara.
          </div>
        </>
      ) : (
        <LeaderboardBody walk={walk} board={board} />
      )}
    </main>
  );
}

function LeaderboardBody({
  walk,
  board,
}: {
  walk: Walk | null;
  board: LeaderboardEntry[] | null;
}) {
  return (
    <>
      <p className="eyebrow" style={{ marginTop: "1.2rem" }}>
        Topplista
      </p>
      <h1 className="display-xl" style={{ fontSize: "clamp(2.2rem,7vw,3.6rem)" }}>
        {walk?.title ?? "Promenad"}
      </h1>

      {!board ? (
        <p className="muted">Laddar…</p>
      ) : board.length === 0 ? (
        <div className="empty" style={{ marginTop: "1.6rem" }}>
          Inga inlämningar än. Dela länken och låt promenaden börja!
        </div>
      ) : (
        <div className="lb">
          {board.map((e) => (
            <div className="lb-row" key={e.submission.id} data-top={e.rank}>
              <span className="rank">
                {e.rank === 1 ? "🥇" : `#${e.rank}`}
              </span>
              <span style={{ fontWeight: 600 }}>
                {e.submission.participantName}
              </span>
              <span className="pts">
                {e.submission.score}/{e.submission.total}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: "1.6rem", fontSize: "0.9rem" }}>
        Topplistan visar inlämningar från den här webbläsaren. Gemensam topplista
        mellan enheter kommer med Firebase.
      </p>
    </>
  );
}
