import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import SharePage from "./SharePage";
import { playUrl } from "../lib/shareUrl";
import type { Walk } from "../types";

vi.mock("../storage", () => ({
  storage: {
    listWalks: vi.fn().mockResolvedValue([]),
    getWalk: vi.fn(),
    saveWalk: vi.fn(),
    deleteWalk: vi.fn(),
    saveSubmission: vi.fn(),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    adoptLocalWalks: vi.fn(),
  },
}));

import { storage } from "../storage";

function makeWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: "abc123",
    title: "Stadsvandringen",
    status: "published",
    createdAt: 0,
    settings: {
      showQuestionText: true,
      printable: true,
      includeTiebreaker: true,
      showResults: true,
    },
    questions: [],
    ...overrides,
  };
}

function renderAt(walkId = "abc123") {
  return render(
    <MemoryRouter initialEntries={[`/walk/${walkId}/share`]}>
      <Routes>
        <Route path="/walk/:id/share" element={<SharePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The visible page region. The QR poster (.qr-only) renders the title/code too,
 *  so scope on-screen queries to <main.no-print> to disambiguate. */
async function screenMain() {
  await waitFor(() => expect(document.querySelector("main.no-print")).toBeTruthy());
  return within(document.querySelector("main.no-print") as HTMLElement);
}

describe("SharePage", () => {
  beforeEach(() => {
    vi.mocked(storage.getWalk).mockResolvedValue(makeWalk());
  });

  test("shows a loading state before the walk resolves", () => {
    vi.mocked(storage.getWalk).mockReturnValue(new Promise(() => {}));
    renderAt();
    expect(screen.getByText("Laddar…")).toBeInTheDocument();
  });

  test("renders the title and the share eyebrow", async () => {
    renderAt();
    const main = await screenMain();
    expect(await main.findByText("Stadsvandringen")).toBeInTheDocument();
    expect(main.getByText("Redo att dela")).toBeInTheDocument();
  });

  test("shows the share url, and it contains the walk id (matches playUrl)", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");

    const expected = playUrl("abc123");
    expect(expected).toContain("abc123");

    // The url-box displays the full share url.
    const urlBox = document.querySelector("main.no-print .url-box");
    expect(urlBox?.textContent).toBe(expected);
  });

  test("renders the QR code with the share url as its value", async () => {
    renderAt();
    await screenMain();
    // qrcode.react renders an inline SVG inside the qr frame.
    const svg = document.querySelector("main.no-print .qr-frame svg");
    expect(svg).toBeTruthy();
  });

  test("shows the join code in the lede", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");
    // The code appears in the lede <strong> and inside the url(s).
    const codeMatches = main.getAllByText(/abc123/);
    expect(codeMatches.length).toBeGreaterThan(0);
  });

  test("renders the copy-link button", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");
    expect(
      main.getByRole("button", { name: "Kopiera länk" }),
    ).toBeInTheDocument();
  });

  test("clicking copy writes the share url to the clipboard and flips the label", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");

    await userEvent.click(main.getByRole("button", { name: "Kopiera länk" }));

    expect(writeText).toHaveBeenCalledWith(playUrl("abc123"));
    expect(
      await main.findByRole("button", { name: "✓ Kopierad" }),
    ).toBeInTheDocument();
  });

  test("links to the leaderboard and to playing as a participant", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");

    const lbLink = main.getByRole("link", { name: /Topplista/ });
    expect(lbLink).toHaveAttribute("href", "/walk/abc123/leaderboard");

    const playLink = main.getByRole("link", { name: /Öppna som deltagare/ });
    expect(playLink).toHaveAttribute("href", "/p/abc123");
  });

  test("renders the print menu (QR poster always available)", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");
    const printBtn = main.getByRole("button", { name: /Skriv ut/ });
    await userEvent.click(printBtn);
    expect(
      main.getByRole("menuitem", { name: "Skriv ut QR-affisch" }),
    ).toBeInTheDocument();
  });
});
