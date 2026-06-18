import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { storage } from "../storage";
import {
  clearProgress,
  loadProgress,
  saveProgress,
} from "../storage/progress";
import { scoreWalk } from "../lib/scoring";
import { liveWalk } from "../lib/walk";
import { uid } from "../lib/id";
import { OPTION_KEYS, type OptionKey, type Walk } from "../types";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { Sheet } from "../components/Sheet";
import { MoreIcon } from "../components/Icons";

export default function PlayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [tiebreak, setTiebreak] = useState("");
  const [index, setIndex] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    if (!id) return;
    storage.getWalk(id).then((w) => {
      if (!w) return setError("Promenaden hittades inte.");
      if (w.status !== "published" || !w.publishedSnapshot)
        return setError("Den här promenaden är inte publicerad än.");
      // Participants always see the frozen published version, never the draft.
      setWalk(liveWalk(w));
      const p = loadProgress(w.id);
      if (p) {
        setName(p.participantName);
        setAnswers(p.answers);
        setTiebreak(p.tiebreakerAnswer ?? "");
        setIndex(p.currentIndex);
        if (p.participantName) setStarted(true);
      }
    });
  }, [id]);

  const hasTiebreak = !!walk?.tiebreaker?.question;
  const steps = (walk?.questions.length ?? 0) + (hasTiebreak ? 1 : 0);
  const onTiebreak = hasTiebreak && walk ? index === walk.questions.length : false;
  const isLast = index === steps - 1;

  // Autosave progress on every change (survives tab close, any backend).
  useEffect(() => {
    if (!walk || !started) return;
    saveProgress({
      walkId: walk.id,
      participantName: name,
      answers,
      tiebreakerAnswer: tiebreak,
      currentIndex: index,
      updatedAt: Date.now(),
    });
  }, [walk, started, name, answers, tiebreak, index]);

  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers],
  );

  if (error)
    return (
      <main className="page">
        <h1 className="display-xl" style={{ fontSize: "clamp(2rem,7vw,3rem)" }}>
          Hoppsan
        </h1>
        <p className="lede">{error}</p>
        <Link to="/" className="btn">
          ← Till start
        </Link>
      </main>
    );
  if (!walk) return <main className="page muted">Laddar…</main>;

  // Reject a name already used on this walk so the leaderboard stays readable.
  // Soft check: a race could still let two identical names through, acceptable
  // for the POC. If the check can't run (offline/no backend), don't block play.
  async function start() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setNameError(null);
    setCheckingName(true);
    try {
      const board = await storage.getLeaderboard(walk!.id);
      const taken = board.some(
        (e) =>
          e.submission.participantName.trim().toLowerCase() ===
          trimmed.toLowerCase(),
      );
      if (taken) {
        setNameError("Namnet är redan taget i promenaden. Välj ett annat.");
        return;
      }
      setStarted(true);
    } catch {
      setStarted(true);
    } finally {
      setCheckingName(false);
    }
  }

  // --- name gate ---
  if (!started) {
    return (
      <main className="page play-wrap">
        <div className="row between" style={{ marginBottom: "0.6rem" }}>
          <p className="eyebrow" style={{ margin: 0 }}>{walk.questions.length} stationer · 1 X 2</p>
          <button
            className="icon-btn"
            aria-label="Fler val"
            onClick={() => setMoreOpen(true)}
          >
            <MoreIcon />
          </button>
        </div>
        <h1 className="display-xl" style={{ fontSize: "clamp(2.2rem,8vw,3.6rem)" }}>
          {walk.title}
        </h1>
        <p className="lede">Ange ditt namn så syns du på topplistan.</p>
        <div className="card ticket" style={{ marginTop: "1.4rem" }}>
          <div className="field" style={{ marginBottom: "1rem" }}>
            <label>Ditt namn</label>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) start();
              }}
            />
            {nameError && (
              <p className="field-error" style={{ marginTop: "0.5rem" }}>
                {nameError}
              </p>
            )}
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn blaze"
              disabled={!name.trim() || checkingName}
              onClick={start}
            >
              {checkingName ? "Kontrollerar…" : "Starta promenaden →"}
            </button>
          </div>
        </div>

        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
          <div className="sheet-view">
            <h3 className="sheet-title">{walk.title}</h3>
            <div className="sheet-actions">
              {walk.settings.showResults ? (
                <button
                  className="menu-item"
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(`/walk/${id}/leaderboard`, { state: { from: `/p/${id}` } });
                  }}
                >
                  🏆 Visa topplistan
                </button>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Topplistan visas när arrangören avslöjar resultatet.
                </p>
              )}
            </div>
          </div>
        </Sheet>
      </main>
    );
  }

  // Gate submission: if any questions are unanswered, confirm first.
  function submit() {
    if (answeredCount < walk!.questions.length) {
      setConfirmSubmit(true);
      return;
    }
    finalize();
  }

  function finalize() {
    const result = scoreWalk(walk!, answers);
    const submissionId = uid();
    storage
      .saveSubmission({
        id: submissionId,
        walkId: walk!.id,
        participantName: name.trim(),
        answers,
        tiebreakerAnswer: hasTiebreak ? tiebreak : undefined,
        score: result.score,
        total: result.total,
        finishedAt: Date.now(),
      })
      .then(() => {
        clearProgress(walk!.id);
        navigate(`/p/${walk!.id}/result/${submissionId}`);
      });
  }

  const q = onTiebreak ? null : walk.questions[index];
  const pct = Math.round(((index + 1) / steps) * 100);

  return (
    <main className="page play-wrap">
      <div className="row between" style={{ marginBottom: "0.8rem" }}>
        <span className="station-chip">
          {onTiebreak ? "Utslagsfråga" : `Fråga ${q!.stationNumber}`}
        </span>
        <span className="muted" style={{ fontFamily: "var(--mono)", fontSize: "0.8rem" }}>
          {index + 1} / {steps}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="card ticket qcard" key={index} style={{ marginTop: "1.4rem" }}>
        {onTiebreak ? (
          <>
            <p className="eyebrow">Avgör vid lika poäng</p>
            <h2 style={{ fontSize: "1.6rem", margin: "0.6rem 0 1rem" }}>
              {walk.tiebreaker!.question}
            </h2>
            <input
              type="text"
              value={tiebreak}
              autoFocus
              placeholder="Ditt svar…"
              onChange={(e) => setTiebreak(e.target.value)}
            />
          </>
        ) : (
          <>
            {walk.settings.showQuestionText ? (
              <h2 style={{ fontSize: "1.55rem", margin: "0 0 1.2rem", lineHeight: 1.15 }}>
                {q!.text}
              </h2>
            ) : (
              <p className="eyebrow" style={{ marginBottom: "1rem" }}>
                Läs frågan på skylten · välj 1, X eller 2
              </p>
            )}
            <div className="options">
              {OPTION_KEYS.map((k) => (
                <button
                  key={k}
                  className="opt"
                  data-selected={answers[q!.id] === k}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [q!.id]: k }))
                  }
                >
                  <span className="key">{k}</span>
                  {q!.options[k] && <span className="val">{q!.options[k]}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="play-nav">
        <button
          className="btn ghost"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ← Bakåt
        </button>
        {isLast ? (
          <button className="btn blaze" onClick={submit}>
            Lämna in ({answeredCount}/{walk.questions.length})
          </button>
        ) : (
          <button
            className="btn"
            onClick={() => setIndex((i) => Math.min(steps - 1, i + 1))}
          >
            Nästa →
          </button>
        )}
      </div>

      <ConfirmSheet
        open={confirmSubmit}
        title="Lämna in ändå?"
        body={`Du har svarat på ${answeredCount} av ${walk.questions.length} frågor. Frågor utan svar räknas som fel.`}
        confirmLabel="Lämna in"
        onConfirm={() => {
          setConfirmSubmit(false);
          finalize();
        }}
        onClose={() => setConfirmSubmit(false)}
      />
    </main>
  );
}
