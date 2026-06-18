import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

function toUser(u: User | null): AuthUser | null {
  return u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null;
}

export function currentUser(): AuthUser | null {
  return auth ? toUser(auth.currentUser) : null;
}

/** Subscribe to auth changes. Calls back with null and no-ops when auth is off. */
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(toUser(u)));
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!auth) throw { code: "auth-unavailable" };
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Fire-and-forget: don't block the sign-up flow on the verification email.
  void sendEmailVerification(cred.user).catch(() => {});
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!auth) throw { code: "auth-unavailable" };
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await fbSignOut(auth);
}

export async function sendReset(email: string): Promise<void> {
  if (!auth) throw { code: "auth-unavailable" };
  await sendPasswordResetEmail(auth, email);
}

/** Maps a Firebase Auth error code to a plain Swedish message. */
export function mapAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Ogiltig e-postadress.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Fel e-post eller lösenord.";
    case "auth/email-already-in-use":
      return "Det finns redan ett konto med den e-posten.";
    case "auth/weak-password":
      return "Lösenordet måste vara minst 6 tecken.";
    case "auth/too-many-requests":
      return "För många försök. Försök igen senare.";
    case "auth/network-request-failed":
      return "Nätverksfel. Kontrollera din anslutning.";
    case "auth-unavailable":
      return "Inloggning är inte tillgänglig just nu.";
    default:
      return "Något gick fel. Försök igen.";
  }
}
