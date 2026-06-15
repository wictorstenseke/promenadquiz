import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { storage } from "../storage";
import { newQuestion } from "../lib/factory";
import { Toggle } from "../components/Switch";
import { OPTION_KEYS, type OptionKey, type Question, type Walk } from "../types";

type SaveState = "idle" | "saving" | "saved";

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [missing, setMissing] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const timer = useRef<number>();

  useEffect(() => {
    if (!id) return;
    storage.getWalk(id).then((w) => (w ? setWalk(w) : setMissing(true)));
  }, [id]);

  // Debounced autosave whenever the draft changes.
  function update(mutate: (w: Walk) => Walk) {
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

  async function publish() {
    update((w) => ({
      ...w,
      status: "published",
      publishedAt: w.publishedAt ?? Date.now(),
    }));
    navigate(`/walk/${walk!.id}/share`);
  }

  const canPublish =
    walk.title.trim().length > 0 &&
    walk.questions.length > 0 &&
    walk.questions.every(
      (q) => OPTION_KEYS.every((k) => q.options[k].trim().length > 0),
    );

  return (
    <main className="page">
      <div className="row between no-print">
        <Link to="/" className="linkbtn">
          ← Mina promenader
        </Link>
        <span className="pill" data-savestate={save}>
          {save === "saving"
            ? "Sparar…"
            : save === "saved"
              ? "✓ Sparat"
              : "Autospar på"}
        </span>
      </div>

      <p className="eyebrow" style={{ marginTop: "1.2rem" }}>
        <span className={`pill ${walk.status}`}>
          {walk.status === "published" ? "Publicerad" : "Utkast"}
        </span>
      </p>

      <input
        type="text"
        value={walk.title}
        placeholder="Namnge promenaden…"
        onChange={(e) => update((w) => ({ ...w, title: e.target.value }))}
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(1.8rem, 6vw, 3rem)",
          fontWeight: 600,
          border: "none",
          background: "transparent",
          padding: "0.6rem 0",
          letterSpacing: "-0.02em",
        }}
      />

      <div className="card" style={{ marginTop: "0.6rem" }}>
        <Toggle
          on={walk.settings.showQuestionText}
          onChange={(v) =>
            update((w) => ({
              ...w,
              settings: { ...w.settings, showQuestionText: v },
            }))
          }
          title="Visa frågetext i appen"
          hint="Av = deltagaren ser bara svarsknapparna och läser frågan på skylten ute."
        />
        <div style={{ height: "0.7rem" }} />
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
      </div>

      <hr className="divider" />

      <div className="row between">
        <h2 style={{ fontSize: "1.5rem" }}>Frågor</h2>
        <span className="pill">{walk.questions.length} st</span>
      </div>

      <div className="stack" style={{ gap: "1.1rem", marginTop: "1.2rem" }}>
        {walk.questions.map((q, i) => (
          <div key={q.id} className="card">
            <div className="row between" style={{ marginBottom: "0.8rem" }}>
              <div className="row">
                <span className="station-chip">Station {q.stationNumber}</span>
                <input
                  type="number"
                  min={1}
                  value={q.stationNumber}
                  onChange={(e) =>
                    setQ(q.id, {
                      stationNumber: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  style={{ width: "5rem" }}
                  aria-label="Stationsnummer"
                />
              </div>
              <button
                className="linkbtn"
                onClick={() => removeQuestion(q.id)}
                disabled={walk.questions.length === 1}
              >
                Ta bort
              </button>
            </div>

            <div className="field">
              <label>Fråga {i + 1}</label>
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
                  <div className="row between">
                    <span className="key">{k}</span>
                    <button
                      className="linkbtn"
                      onClick={() => setQ(q.id, { correct: k })}
                      style={{
                        color:
                          q.correct === k
                            ? "var(--forest)"
                            : "var(--ink-soft)",
                      }}
                    >
                      {q.correct === k ? "✓ Rätt" : "Sätt rätt"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={q.options[k]}
                    placeholder={`Svar ${k}`}
                    onChange={(e) => setOpt(q.id, k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn ghost"
        onClick={addQuestion}
        style={{ marginTop: "1.1rem" }}
      >
        + Lägg till fråga
      </button>

      <hr className="divider" />

      <h2 style={{ fontSize: "1.5rem" }}>Utslagsfråga</h2>
      <p className="muted" style={{ margin: "0.4rem 0 1rem" }}>
        Valfri fritextfråga som avgör vid lika poäng. (Avgörandet sker i en
        senare fas — i v1 sparas bara svaret.)
      </p>
      <div className="field">
        <textarea
          value={walk.tiebreaker?.question ?? ""}
          placeholder="T.ex. Hur många kottar finns i korgen?"
          onChange={(e) =>
            update((w) => ({
              ...w,
              tiebreaker: e.target.value.trim()
                ? { question: e.target.value }
                : undefined,
            }))
          }
        />
      </div>

      <hr className="divider" />

      <div className="row" style={{ gap: "0.7rem" }}>
        <button className="btn blaze" onClick={publish} disabled={!canPublish}>
          ✦ Publicera & dela
        </button>
        {walk.status === "published" && (
          <Link to={`/walk/${walk.id}/share`} className="btn ghost">
            Delningslänk & QR
          </Link>
        )}
        {walk.settings.printable && (
          <Link to={`/walk/${walk.id}/print`} className="btn ghost">
            Förhandsgranska utskrift
          </Link>
        )}
      </div>
      {!canPublish && (
        <p className="muted" style={{ marginTop: "0.7rem", fontSize: "0.9rem" }}>
          För att publicera: ange titel och fyll i alla tre alternativ för varje
          fråga.
        </p>
      )}
    </main>
  );
}
