import { describe, expect, it } from "vitest";
import { mapAuthError } from "./auth";

describe("mapAuthError", () => {
  it("maps wrong credentials to a generic sign-in error", () => {
    expect(mapAuthError("auth/wrong-password")).toBe("Fel e-post eller lösenord.");
    expect(mapAuthError("auth/user-not-found")).toBe("Fel e-post eller lösenord.");
    expect(mapAuthError("auth/invalid-credential")).toBe("Fel e-post eller lösenord.");
  });

  it("maps email-already-in-use", () => {
    expect(mapAuthError("auth/email-already-in-use")).toBe(
      "Det finns redan ett konto med den e-posten.",
    );
  });

  it("maps weak password", () => {
    expect(mapAuthError("auth/weak-password")).toBe(
      "Lösenordet måste vara minst 6 tecken.",
    );
  });

  it("falls back for unknown codes", () => {
    expect(mapAuthError("auth/something-new")).toBe("Något gick fel. Försök igen.");
  });
});
