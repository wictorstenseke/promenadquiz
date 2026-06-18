import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AuthSheet } from "./AuthSheet";

function render(mode: "signin" | "signup" | "reset") {
  return renderToStaticMarkup(
    <AuthSheet open onClose={() => {}} initialMode={mode} />,
  );
}

describe("AuthSheet", () => {
  test("sign-in mode shows email + password and a forgot-password link", () => {
    const html = render("signin");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Glömt lösenord?");
    expect(html).toContain("Logga in");
  });

  test("create mode shows the password rule hint", () => {
    const html = render("signup");
    expect(html).toContain("minst 6 tecken");
    expect(html).toContain("Skapa konto");
  });

  test("reset mode shows only email (no password field)", () => {
    const html = render("reset");
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="password"');
  });
});
