import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { storage, type LeaderboardEntry } from "../storage";

export default function ResultPage() {
  const { id, submissionId } = useParams();
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (id) storage.getLeaderboard(id).then(setBoard);
  }, [id]);

  const me = board?.find((e) => e.submission.id === submissionId);

  if (!board) return <main className="page muted">Laddar…</main>;
  if (!me)
    return (
      <main className="page">
        <h1 className="display-xl">Resultat saknas</h1>
        <Link to={`/walk/${id}/leaderboard`} className="btn">
          Till topplistan
        </Link>
      </main>
    );

  const { score, total, participantName } = me.submission;

  return (
    <main className="page play-wrap" style={{ textAlign: "center" }}>
      <p className="eyebrow" style={{ justifyContent: "center" }}>
        Inlämnat · {participantName}
      </p>
      <div className="score-big" style={{ marginTop: "1rem" }}>
        {score}
        <span className="slash"> / </span>
        {total}
      </div>
      <p className="lede" style={{ margin: "0.8rem auto 0" }}>
        Du hamnade på plats <strong>#{me.rank}</strong> av {board.length} just
        nu.
      </p>

      <div className="row" style={{ justifyContent: "center", gap: "0.7rem", marginTop: "1.6rem" }}>
        <Link to={`/walk/${id}/leaderboard`} className="btn">
          Se topplistan
        </Link>
        <Link to="/" className="btn ghost">
          Till start
        </Link>
      </div>
    </main>
  );
}
