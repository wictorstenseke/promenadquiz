import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { Shell } from "./Shell";

const signOut = vi.fn();
let mockUser: { email: string | null } | null = null;

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, loading: false, signOut }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<p>Page content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Shell", () => {
  test("renders the brand, nav and the routed outlet content", () => {
    mockUser = null;
    renderShell();
    expect(screen.getByText("Promenadquiz")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mina promenader" }),
    ).toBeInTheDocument();
  });

  test("shows a login button when signed out", () => {
    mockUser = null;
    renderShell();
    expect(
      screen.getByRole("button", { name: "Logga in" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Logga ut" }),
    ).not.toBeInTheDocument();
  });

  test("shows the email and a logout button when signed in", () => {
    mockUser = { email: "test@example.com" };
    renderShell();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Logga ut" }),
    ).toBeInTheDocument();
  });
});
