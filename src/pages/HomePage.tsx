import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { storage } from "../storage";
import { newWalk } from "../lib/factory";
import { shortId, uid } from "../lib/id";
import { PlusIcon, MoreIcon, EnterIcon, TrophyIcon } from "../components/Icons";
import { WalkActionsSheet } from "../components/WalkActionsSheet";
import { JoinSheet } from "../components/JoinSheet";
import type { Walk } from "../types";

export default function HomePage() {
  const [walks, setWalks] = useState<Walk[] | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, number>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    storage.listWalks().then(async (list) => {
      setWalks(list);
      const published = list.filter((w) => w.status === "published");
      const counts = await Promise.all(
        published.map((w) =>
          storage.getLeaderboard(w.id).then((b) => [w.id, b.length] as const),
        ),
      );
      setSubmissions(Object.fromEntries(counts));
    });
  }, []);

  function create() {
    // Don't persist yet — the walk is saved on the first edit (see EditorPage).
    // An untouched draft left behind never lands in "Mina promenader".
    const walk = newWalk();
    navigate(`/walk/${walk.id}/edit`, { state: { draft: walk } });
  }

  async function duplicate(w: Walk) {
    const copy = structuredClone(w);
    copy.id = shortId(6);
    copy.status = "draft";
    copy.createdAt = Date.now();
    delete copy.publishedAt;
    copy.title = copyTitle(w.title, walks ?? []);
    // Fresh question ids so the clone is fully independent of the original.
    copy.questions = copy.questions.map((q) => ({ ...q, id: uid() }));
    await storage.saveWalk(copy);
    setWalks(await storage.listWalks());
    setMenuFor(null);
  }

  async function remove(id: string) {
    await storage.deleteWalk(id);
    setWalks(await storage.listWalks());
  }

  const menuWalk = walks?.find((w) => w.id === menuFor) ?? null;

  return (
    <main className="page">
      <p className="eyebrow">Bygg · skriv ut · dela</p>
      <h1 className="display-xl">
        Tipspromenaden,
        <br />
        <em>digitalt.</em>
      </h1>
      <p className="lede">
        Bygg frågor, kör digitalt eller skriv ut, och dela med en länk. Allt
        sparas automatiskt.
      </p>

      <div className="row" style={{ marginTop: "1.6rem" }}>
        <button className="btn blaze" onClick={create}>
          <PlusIcon /> Ny tipspromenad
        </button>
        <button className="btn" onClick={() => setJoinOpen(true)}>
          <EnterIcon /> Gå med via kod
        </button>
      </div>

      <hr className="divider" />

      <div className="row between">
        <h2 style={{ fontSize: "1.5rem" }}>Mina promenader</h2>
        {walks && <span className="pill">{walks.length} st</span>}
      </div>

      {walks === null ? (
        <p className="muted" style={{ marginTop: "1.4rem" }}>
          Laddar…
        </p>
      ) : walks.length === 0 ? (
        <div className="empty" style={{ marginTop: "1.4rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Inga promenader än.</p>
          <p style={{ margin: "0.4rem 0 0" }}>
            Skapa din första med knappen ovan.
          </p>
        </div>
      ) : (
        <div className="walk-list">
          {walks.map((w) => (
            <Link
              key={w.id}
              to={`/walk/${w.id}/edit`}
              className="card walk-row"
            >
              <div className="meta">
                <div className="row">
                  <span className={`pill ${w.status}`}>
                    {w.status === "published" ? "Publicerad" : "Utkast"}
                  </span>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {w.questions.length} frågor
                  </span>
                </div>
                <h3>{w.title || "Namnlös promenad"}</h3>
              </div>
              <div className="walk-row-actions">
                {w.status === "published" && submissions[w.id] > 0 && (
                  <button
                    className="btn sm"
                    title="Visa topplistan"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/walk/${w.id}/leaderboard`);
                    }}
                  >
                    <TrophyIcon size={15} /> {submissions[w.id]} svar
                  </button>
                )}
                <button
                  className="icon-btn"
                  aria-label="Fler val"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuFor(w.id);
                  }}
                >
                  <MoreIcon />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      <WalkActionsSheet
        walk={menuWalk}
        submissions={menuWalk ? (submissions[menuWalk.id] ?? 0) : 0}
        onClose={() => setMenuFor(null)}
        onDuplicate={(w) => duplicate(w)}
        onLeaderboard={(w) => {
          setMenuFor(null);
          navigate(`/walk/${w.id}/leaderboard`);
        }}
        onDelete={(w) => {
          remove(w.id);
          setMenuFor(null);
        }}
      />

      <JoinSheet
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={(id) => navigate(`/p/${id}`)}
      />
    </main>
  );
}

/** "Höstrunda" -> "Höstrunda (kopia)", then "(kopia 2)", … avoiding clashes. */
function copyTitle(base: string, existing: Walk[]): string {
  const name = base.trim() || "Namnlös promenad";
  const taken = new Set(existing.map((w) => w.title));
  let title = `${name} (kopia)`;
  let n = 2;
  while (taken.has(title)) title = `${name} (kopia ${n++})`;
  return title;
}
