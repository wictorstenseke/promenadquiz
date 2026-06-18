import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { storage } from "../storage";
import { newQuestion } from "../lib/factory";
import { hasPendingChanges, walkContent } from "../lib/walk";
import { Toggle } from "../components/Switch";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { EyeIcon, PlusIcon, ShareIcon, UploadIcon, InfoIcon } from "../components/Icons";
import { OPTION_KEYS, type OptionKey, type Question, type Walk } from "../types";

type SaveState = "idle" | "saving" | "saved";

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [missing, setMissing] = useState(false);
  const [, setSave] = useState<SaveState>("idle");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // How many participants have already submitted. >0 => editing is guarded.
  const [submissionCount, setSubmissionCount] = useState(0);
  // Set once the organiser confirms they want to edit a walk that has results.
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tieTipOpen, setTieTipOpen] = useState(false);
  const [answerOn, setAnswerOn] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (!id) return;
    storage.getWalk(id).then((w) => {
      if (w) {
        // Backfill: walks published before snapshots existed get one now so the
        // draft-vs-live model has a baseline. Treated as up-to-date (clean).
        if (w.status === "published" && !w.publishedSnapshot) {
          const migrated: Walk = { ...w, publishedSnapshot: walkContent(w) };
          setWalk(migrated);
          storage.saveWalk(migrated);
          return;
        }
        setWalk(w);
        return;
      }
      // Not yet persisted — a brand-new walk arrives as a draft in nav state and
      // is only written on the first edit.
      const draft = (location.state as { draft?: Walk } | null)?.draft;
      if (draft && draft.id === id) setWalk(draft);
      else setMissing(true);
    });
    storage.getLeaderboard(id).then((b) => setSubmissionCount(b.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const locked = submissionCount > 0;
  const canEdit = !locked || editUnlocked;

  // Debounced autosave whenever the draft changes.
  function update(mutate: (w: Walk) => Walk) {
    // Editing a walk with results is gated behind a single explicit confirm.
    if (!canEdit) {
      setConfirmEdit(true);
      return;
    }
    setWalk((prev) => {
      if (!prev) return prev;
      const next = mutate(structuredClone(prev));
      setSave("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        await storage.saveWalk(next);
        setSave("saved");
        window.setTimeout(() => setSave("idle"), 1400);
      }, 500);
      return next;
    });
  }

  if (missing) {
    return (
      <main className="page">
        <h1 className="display-xl">Hittades inte</h1>
        <p className="lede">Den här promenaden finns inte längre.</p>
        <Link to="/" className="btn">
          ← Till mina promenader
        </Link>
      </main>
    );
  }
  if (!walk) return <main className="page muted">Laddar…</main>;

  const setQ = (qid: string, patch: Partial<Question>) =>
    update((w) => ({
      ...w,
      questions: w.questions.map((q) =>
        q.id === qid ? { ...q, ...patch } : q,
      ),
    }));

  const setOpt = (qid: string, key: OptionKey, value: string) =>
    update((w) => ({
      ...w,
      questions: w.questions.map((q) =>
        q.id === qid ? { ...q, options: { ...q.options, [key]: value } } : q,
      ),
    }));

  const addQuestion = () =>
    update((w) => ({
      ...w,
      questions: [...w.questions, newQuestion(w.questions.length + 1)],
    }));

  const removeQuestion = (qid: string) =>
    update((w) => ({
      ...w,
      questions: w.questions
        .filter((q) => q.id !== qid)
        .map((q, i) => ({ ...q, stationNumber: i + 1 })),
    }));

  // Publish (first time) or Update (re-publish edits). Both copy the current
  // draft into the live snapshot so participants see the new version. Same id,
  // so the share code and QR never change. Persist synchronously — a debounced
  // save would race the navigation and the participant page would read a stale
  // walk.
  async function publish() {
    const firstPublish = walk!.status !== "published";
    window.clearTimeout(timer.current);
    const now = Date.now();
    const next: Walk = {
      ...walk!,
      status: "published",
      publishedAt: walk!.publishedAt ?? now,
      lastPublishedAt: now,
      publishedSnapshot: walkContent(walk!),
    };
    setWalk(next);
    await storage.saveWalk(next);
    // First publish → take them to the share screen. A re-publish (update) keeps
    // them in the editor; the "pending changes" banner simply clears.
    if (firstPublish) navigate(`/walk/${walk!.id}/share`);
  }

  const canPublish =
    walk.title.trim().length > 0 &&
    walk.questions.length > 0 &&
    walk.questions.every(
      (q) =>
        q.correct !== null &&
        OPTION_KEYS.every((k) => q.options[k].trim().length > 0),
    );

  // Published walk whose draft no longer matches the live snapshot.
  const dirty = hasPendingChanges(walk);

  return (
    <main className="page">
      {locked && !editUnlocked && (
        <div className="banner danger">
          <div>
            <strong>🔒 {submissionCount} inlämningar finns redan</strong>
            <p>
              Ändringar kan göra topplistan ogiltig. Rätta gärna stavfel — men ta
              inte bort frågor och ändra inte rätt svar.
            </p>
          </div>
          <button className="btn sm" onClick={() => setConfirmEdit(true)}>
            Redigera ändå
          </button>
        </div>
      )}
      {locked && editUnlocked && (
        <div className="banner warn">
          <div>
            <strong>⚠️ Redigeringsläge</strong>
            <p>
              {submissionCount} inlämningar finns. Var försiktig: ändra inte
              innebörd eller rätt svar, annars blir topplistan ogiltig.
            </p>
          </div>
        </div>
      )}
      {dirty && (
        <div className="banner info">
          <div>
            <strong>Ändringar är inte publicerade</strong>
            <p>
              Deltagare ser fortfarande den tidigare versionen tills du
              uppdaterar. Samma länk och QR-kod.
            </p>
          </div>
          <button className="btn sm blaze" onClick={publish} disabled={!canPublish}>
            <UploadIcon size={15} /> Uppdatera
          </button>
        </div>
      )}

      <div className="editor-sections">
      <section className="editor-section">
      <h2 style={{ fontSize: "1.5rem" }}>Inställningar</h2>

      <div className="card" style={{ marginTop: "1.2rem" }}>
        <div className="field">
          <label>Promenadens namn</label>
          <input
            className="title-input"
            type="text"
            value={walk.title}
            placeholder="Döp din promenad"
            onChange={(e) => update((w) => ({ ...w, title: e.target.value }))}
          />
        </div>

        <div className="stack" style={{ gap: "0.9rem", marginTop: "0.9rem" }}>
        <Toggle
          on={walk.settings.showQuestionText}
          onChange={(v) =>
            update((w) => ({
              ...w,
              settings: { ...w.settings, showQuestionText: v },
            }))
          }
          title="Visa frågetext i appen"
          hint="Deltagaren ser frågans text i appen, inte bara svarsknapparna."
        />
        <Toggle
          on={walk.settings.printable}
          onChange={(v) =>
            update((w) => ({
              ...w,
              settings: { ...w.settings, printable: v },
            }))
          }
          title="Kan skrivas ut"
          hint="Aktiverar utskriftsvy med en fråga per A4."
        />
        <Toggle
          on={walk.settings.includeTiebreaker}
          onChange={(v) =>
            update((w) => ({
              ...w,
              settings: { ...w.settings, includeTiebreaker: v },
            }))
          }
          title="Inkludera utslagsfråga"
          hint="En fritextfråga som avgör vid lika poäng."
        />
        <Toggle
          on={walk.settings.showResults}
          onChange={(v) =>
            update((w) => ({
              ...w,
              settings: { ...w.settings, showResults: v },
            }))
          }
          title="Visa resultat för deltagare"
          hint="Deltagaren ser sina poäng och topplistan direkt efter inlämning."
        />
        </div>
      </div>
      </section>

      <section className="editor-section">
      <div className="row between">
        <h2 style={{ fontSize: "1.5rem" }}>Frågor</h2>
        <span className="pill">{walk.questions.length} st</span>
      </div>

      <div className="stack" style={{ gap: "1.1rem", marginTop: "1.2rem" }}>
        {walk.questions.map((q, i) => (
          <div key={q.id} className="card">
            <div className="row between" style={{ marginBottom: "0.8rem" }}>
              <div className="row">
                <span className="station-chip">Fråga {i + 1}</span>
              </div>
              <button
                className="linkbtn"
                onClick={() => setPendingDelete(q.id)}
                disabled={walk.questions.length === 1}
              >
                Ta bort
              </button>
            </div>

            <div className="field">
              <label>Fråga</label>
              <textarea
                value={q.text}
                placeholder="Skriv frågan…"
                onChange={(e) => setQ(q.id, { text: e.target.value })}
              />
            </div>

            <label className="field" style={{ marginBottom: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--ink-soft)",
                }}
              >
                Alternativ — markera rätt svar
              </span>
            </label>
            <div className="options">
              {OPTION_KEYS.map((k) => (
                <div
                  key={k}
                  className="opt"
                  data-correct={q.correct === k}
                  style={{ cursor: "default" }}
                >
                  <div
                    className="row"
                    style={{ gap: "0.7rem", alignItems: "center" }}
                  >
                    <span className="key-inline">{k}</span>
                    <input
                      type="text"
                      value={q.options[k]}
                      placeholder={`Svar ${k}`}
                      onChange={(e) => setOpt(q.id, k, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="correct-toggle"
                      data-on={q.correct === k}
                      onClick={() => setQ(q.id, { correct: k })}
                    >
                      {q.correct === k ? "Rätt svar" : "Sätt rätt"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "2rem",
        }}
      >
        <button className="btn" onClick={addQuestion}>
          <PlusIcon /> Lägg till fråga
        </button>
      </div>
      </section>

      {walk.settings.includeTiebreaker && (
        <>
        <hr className="divider editor-divider" />
        <section className="editor-section">
          <div className="row tie-head" style={{ gap: "0.5rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.5rem" }}>Utslagsfråga</h2>
            <span
              className="tip tip-info"
              data-open={tieTipOpen}
              onMouseLeave={() => setTieTipOpen(false)}
            >
              <button
                type="button"
                className="info-btn"
                aria-label="Om utslagsfrågan"
                onClick={() => setTieTipOpen((o) => !o)}
              >
                <InfoIcon size={18} />
              </button>
              <span className="tip-bubble" role="tooltip">
                Valfri fritextfråga som avgör vid lika poäng. (Avgörandet sker i
                en senare fas — i v1 sparas bara svaret.)
              </span>
            </span>
          </div>
          <div className="card">
            <div className="field">
              <label>Fråga</label>
              <textarea
                value={walk.tiebreaker?.question ?? ""}
                placeholder="T.ex. Hur många kottar finns i korgen?"
                onChange={(e) =>
                  update((w) => ({
                    ...w,
                    tiebreaker: e.target.value.trim()
                      ? { ...w.tiebreaker, question: e.target.value }
                      : undefined,
                  }))
                }
              />
            </div>
            <Toggle
              on={answerOn || !!walk.tiebreaker?.answer}
              onChange={(v) => {
                setAnswerOn(v);
                if (!v)
                  update((w) =>
                    w.tiebreaker
                      ? { ...w, tiebreaker: { question: w.tiebreaker.question } }
                      : w,
                  );
              }}
              title="Ange rätt svar"
              hint="Visas på topplistan så du ser vem som är närmast."
            />
            {(answerOn || !!walk.tiebreaker?.answer) && (
              <div className="field" style={{ marginTop: "0.8rem", marginBottom: 0 }}>
                <label>Rätt svar</label>
                <input
                  type="text"
                  value={walk.tiebreaker?.answer ?? ""}
                  placeholder="T.ex. 47"
                  disabled={!walk.tiebreaker?.question}
                  onChange={(e) =>
                    update((w) => ({
                      ...w,
                      tiebreaker: {
                        question: w.tiebreaker?.question ?? "",
                        answer: e.target.value.trim() || undefined,
                      },
                    }))
                  }
                />
              </div>
            )}
          </div>
        </section>
        </>
      )}
      </div>

      <hr className="divider editor-divider" />

      <div className="stack" style={{ gap: "0.7rem" }}>
        <div className="editor-actions">
          <Link to={`/walk/${walk.id}/preview`} className="linkbtn">
            <EyeIcon /> Förhandsgranska
          </Link>
          {walk.status === "published" && (
            <Link to={`/walk/${walk.id}/share`} className="btn ghost">
              <ShareIcon /> {walk.settings.printable ? "Dela & skriv ut" : "Delningslänk & QR"}
            </Link>
          )}
          <span
            className="tip"
            data-open={tipOpen}
            onClick={() => !canPublish && setTipOpen((o) => !o)}
          >
            <button
              className="btn blaze"
              onClick={publish}
              disabled={!canPublish || (walk.status === "published" && !dirty)}
            >
              <UploadIcon />{" "}
              {walk.status !== "published"
                ? "Publicera"
                : dirty
                  ? "Uppdatera"
                  : "Publicerad"}
            </button>
            {!canPublish && (
              <span className="tip-bubble" role="tooltip">
                Ange titel, fyll i alla tre alternativ och markera rätt svar för
                varje fråga för att kunna publicera.
              </span>
            )}
          </span>
          {walk.status === "published" &&
            (walk.lastPublishedAt ?? walk.publishedAt) && (
              <p className="muted actions-meta">
                {walk.lastPublishedAt &&
                walk.lastPublishedAt !== walk.publishedAt
                  ? "Uppdaterad "
                  : "Publicerad "}
                {new Date(
                  walk.lastPublishedAt ?? walk.publishedAt!,
                ).toLocaleString("sv-SE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
        </div>
      </div>

      <ConfirmSheet
        open={confirmEdit}
        title="Redigera en promenad med resultat?"
        body={`${submissionCount} deltagare har redan lämnat in. Ändrar du frågorna kan den nuvarande topplistan bli ogiltig. Rätta gärna stavfel — men ta inte bort frågor och ändra inte innebörd eller rätt svar.`}
        confirmLabel="Redigera ändå"
        onConfirm={() => {
          setEditUnlocked(true);
          setConfirmEdit(false);
        }}
        onClose={() => setConfirmEdit(false)}
      />

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Ta bort frågan?"
        body="Frågan tas bort permanent och kan inte återställas."
        confirmLabel="Ta bort"
        onConfirm={() => {
          if (pendingDelete) removeQuestion(pendingDelete);
          setPendingDelete(null);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </main>
  );
}
