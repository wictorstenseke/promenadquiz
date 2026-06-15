import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { storage, type LeaderboardEntry } from "../storage";
import type { Walk } from "../types";

export default function LeaderboardPage() {
  const { id } = useParams();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (!id) return;
    storage.getWalk(id).then(setWalk);
    storage.getLeaderboard(id).then(setBoard);
  }, [id]);

  return (
    <main className="page">
      <Link to="/" className="linkbtn">
        ← Mina promenader
      </Link>
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
    </main>
  );
}
