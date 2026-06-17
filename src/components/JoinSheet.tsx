import { useEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Receives a validated 6-char walk code. */
  onJoin: (id: string) => void;
}

/**
 * Pull a 6-char walk code out of whatever the user pasted — a bare code or a
 * full share link like ".../p/k4m9px". Lowercased and stripped of characters
 * outside the id alphabet; returns null when it isn't a valid code.
 */
export function parseCode(raw: string): string | null {
  const last = raw.trim().split(/[/?#]/).filter(Boolean).pop() ?? "";
  const cleaned = last
    .toLowerCase()
    .replace(/[^23456789abcdefghjkmnpqrstuvwxyz]/g, "");
  return cleaned.length === 6 ? cleaned : null;
}

/** Bottom sheet that asks for a walk code and opens it as a participant. */
export function JoinSheet({ open, onClose, onJoin }: Props) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open and focus the field once the sheet has slid in.
  useEffect(() => {
    if (!open) return;
    setCode("");
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  const id = parseCode(code);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (id) onJoin(id);
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <h3 className="sheet-title">Gå med i en promenad</h3>
      <p className="sheet-body muted">
        Ange koden du fått av arrangören, eller klistra in hela länken.
      </p>
      <form className="stack" style={{ gap: "0.9rem", marginTop: "1rem" }} onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Ange kod, t.ex. k4m9px"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn blaze" type="submit" disabled={!id}>
          Gå med
        </button>
      </form>
    </Sheet>
  );
}
