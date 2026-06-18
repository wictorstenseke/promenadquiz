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
