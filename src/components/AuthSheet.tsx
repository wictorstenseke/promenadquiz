import { useEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { mapAuthError, sendReset, signIn, signUp } from "../auth";

export type AuthMode = "signin" | "signup" | "reset";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Starting mode. Defaults to sign-in; also used to render modes in tests. */
  initialMode?: AuthMode;
}

const TITLES: Record<AuthMode, string> = {
  signin: "Logga in",
  signup: "Skapa konto",
  reset: "Återställ lösenord",
};

/** Bottom sheet for optional accounts: sign in, create, or reset password. */
export function AuthSheet({ open, onClose, initialMode = "signin" }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setShowPw(false);
    setError(null);
    setNotice(null);
    setPending(false);
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open, initialMode]);

  function go(next: AuthMode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        onClose();
      } else if (mode === "signup") {
        await signUp(email.trim(), password);
        onClose(); // AuthProvider runs adoption when the user becomes non-null
      } else {
        await sendReset(email.trim());
        setNotice("Kolla din inkorg för en återställningslänk.");
      }
    } catch (err) {
      const code =
        (err as { code?: string }).code ?? (err as Error).message ?? "";
      setError(mapAuthError(code));
    } finally {
      setPending(false);
    }
  }

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit =
    !pending && emailOk && (mode === "reset" || password.length >= 6);

  return (
    <Sheet open={open} onClose={onClose}>
      <h3 className="sheet-title">{TITLES[mode]}</h3>
      <p className="sheet-body muted">
        {mode === "reset"
          ? "Vi skickar en länk för att återställa ditt lösenord."
          : "Logga in för att spara dina promenader på alla dina enheter. Frivilligt — appen fungerar lika bra utan konto."}
      </p>

      <form className="stack" style={{ gap: "0.9rem", marginTop: "1rem" }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="auth-email">E-post</label>
          <input
            ref={emailRef}
            id="auth-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="namn@exempel.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="auth-pw">Lösenord</label>
            <div className="pw-field">
              <input
                id="auth-pw"
                type={showPw ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "Minst 6 tecken" : "Ditt lösenord"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Dölj lösenord" : "Visa lösenord"}
              >
                {showPw ? "Dölj" : "Visa"}
              </button>
            </div>
            {mode === "signup" && (
              <span className="muted" style={{ fontSize: "0.82rem" }}>
                Lösenordet måste vara minst 6 tecken.
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="field-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-notice" aria-live="polite">
            {notice}
          </p>
        )}

        <button className="btn blaze" type="submit" disabled={!canSubmit}>
          {pending ? "Vänta…" : TITLES[mode]}
        </button>
      </form>

      <div className="auth-alt">
        {mode === "signin" && (
          <>
            <button type="button" className="auth-link" onClick={() => go("reset")}>
              Glömt lösenord?
            </button>
            <button type="button" className="auth-link" onClick={() => go("signup")}>
              Skapa konto
            </button>
          </>
        )}
        {mode === "signup" && (
          <button type="button" className="auth-link" onClick={() => go("signin")}>
            Har du redan ett konto? Logga in
          </button>
        )}
        {mode === "reset" && (
          <button type="button" className="auth-link" onClick={() => go("signin")}>
            Tillbaka till inloggning
          </button>
        )}
      </div>
    </Sheet>
  );
}
