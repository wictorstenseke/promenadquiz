import { useEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { CopyIcon, TrashIcon, TrophyIcon } from "./Icons";
import type { Walk } from "../types";

interface Props {
  /** Target walk; null closes the sheet. */
  walk: Walk | null;
  onClose: () => void;
  onDuplicate: (w: Walk) => void;
  onLeaderboard: (w: Walk) => void;
  onDelete: (w: Walk) => void;
  /** Submission count for `walk`; gates the leaderboard action. */
  submissions: number;
}

type View = "menu" | "confirm";

/** Single sheet for a walk's actions. The overlay stays mounted while the
 *  content swaps menu <-> delete-confirm, so there's no blink between them. */
export function WalkActionsSheet({
  walk,
  onClose,
  onDuplicate,
  onLeaderboard,
  onDelete,
  submissions,
}: Props) {
  const [view, setView] = useState<View>("menu");
  // Retain the last walk so content still renders during the close animation,
  // after `walk` has already gone null.
  const last = useRef<Walk | null>(null);
  if (walk) last.current = walk;
  const w = walk ?? last.current;

  // Always reopen on the menu view.
  useEffect(() => {
    if (walk) setView("menu");
  }, [walk]);

  return (
    <Sheet open={walk !== null} onClose={onClose}>
      <div key={view} className="sheet-view">
        {view === "menu" ? (
          <>
            <h3 className="sheet-title">{w?.title || "Namnlös promenad"}</h3>
            <div className="sheet-actions">
              <button
                className="menu-item"
                onClick={() => w && onDuplicate(w)}
              >
                <CopyIcon />
                Duplicera
              </button>
              {w?.status === "published" && (
                <button
                  className="menu-item"
                  disabled={submissions === 0}
                  onClick={() => w && onLeaderboard(w)}
                >
                  <TrophyIcon />
                  Visa topplista
                </button>
              )}
              <button
                className="menu-item danger"
                onClick={() => setView("confirm")}
              >
                <TrashIcon />
                Ta bort
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="sheet-title">Ta bort promenaden?</h3>
            <p className="sheet-body muted">
              Promenaden och alla dess frågor tas bort permanent och kan inte
              återställas.
            </p>
            <div
              className="row"
              style={{
                gap: "0.7rem",
                marginTop: "1.2rem",
                justifyContent: "flex-end",
              }}
            >
              <button className="btn ghost" onClick={() => setView("menu")}>
                Avbryt
              </button>
              <button className="btn blaze" onClick={() => w && onDelete(w)}>
                Ta bort
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
