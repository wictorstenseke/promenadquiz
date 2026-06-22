import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import PreviewPage from "./PreviewPage";
import { newQuestion } from "../lib/factory";
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
  const q1 = {
    ...newQuestion(1),
    text: "Vilket år byggdes bron?",
    options: { "1": "1920", X: "1955", "2": "1980" },
    correct: "X" as const,
  };
  const q2 = {
    ...newQuestion(2),
    text: "Hur högt är tornet?",
    options: { "1": "30 m", X: "60 m", "2": "90 m" },
    correct: "2" as const,
  };
  return {
    id: "abc123",
    title: "Stadsvandringen",
    status: "draft",
    createdAt: 0,
    settings: {
      showQuestionText: true,
      printable: true,
      includeTiebreaker: true,
      showResults: true,
    },
    questions: [q2, q1],
    ...overrides,
  };
}

function renderAt(walkId = "abc123") {
  return render(
    <MemoryRouter initialEntries={[`/walk/${walkId}/preview`]}>
      <Routes>
        <Route path="/walk/:id/preview" element={<PreviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The on-screen page region. The QR poster renders the title/code too, but
 *  lives in a sibling outside <main>, so scoping queries here disambiguates. */
async function screenMain() {
  // .no-print is the visible page; .qr-only (the poster) is the other region.
  await waitFor(() => expect(document.querySelector("main.no-print")).toBeTruthy());
  return within(document.querySelector("main.no-print") as HTMLElement);
}

describe("PreviewPage", () => {
  beforeEach(() => {
    vi.mocked(storage.getWalk).mockResolvedValue(makeWalk());
  });

  test("shows a loading state before the walk resolves", () => {
    vi.mocked(storage.getWalk).mockReturnValue(new Promise(() => {}));
    renderAt();
    expect(screen.getByText("Laddar…")).toBeInTheDocument();
  });

  test("renders the title and the preview eyebrow", async () => {
    renderAt();
    const main = await screenMain();
    expect(await main.findByText("Stadsvandringen")).toBeInTheDocument();
    expect(main.getByText("Förhandsgranskning")).toBeInTheDocument();
    expect(
      main.getByText("Så här ser frågorna ut. Rätt svar är markerat."),
    ).toBeInTheDocument();
  });

  test("renders question text and options, sorted by station number", async () => {
    renderAt();
    const main = await screenMain();

    // q1 (station 1) appears before q2 (station 2) despite array order.
    const q1 = await main.findByText("Vilket år byggdes bron?");
    const q2 = main.getByText("Hur högt är tornet?");
    expect(q1).toBeInTheDocument();
    expect(q2).toBeInTheDocument();

    const cards = document.querySelectorAll("main.no-print .preview-q");
    // 2 question cards (tiebreaker also uses .preview-q -> 3 total below).
    expect(cards[0].textContent).toContain("Vilket år byggdes bron?");
    expect(cards[1].textContent).toContain("Hur högt är tornet?");

    // Numbered "Fråga 1" / "Fråga 2" chips.
    expect(main.getByText("Fråga 1")).toBeInTheDocument();
    expect(main.getByText("Fråga 2")).toBeInTheDocument();

    // Options are rendered.
    expect(main.getByText("1955")).toBeInTheDocument();
    expect(main.getByText("90 m")).toBeInTheDocument();
  });

  test("marks the correct option via data-correct", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Vilket år byggdes bron?");
    const correctOpts = document.querySelectorAll(
      'main.no-print .preview-opt[data-correct="true"]',
    );
    // One correct option per question.
    expect(correctOpts.length).toBe(2);
  });

  test("question text is shown even when showQuestionText is false (preview ignores the setting)", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({
        settings: {
          showQuestionText: false,
          printable: true,
          includeTiebreaker: false,
          showResults: true,
        },
      }),
    );
    renderAt();
    const main = await screenMain();
    // PreviewPage renders q.text regardless of showQuestionText.
    expect(await main.findByText("Vilket år byggdes bron?")).toBeInTheDocument();
  });

  test("renders the tiebreaker card when included", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({ tiebreaker: { question: "Hur många trappsteg finns det?" } }),
    );
    renderAt();
    expect(await screen.findByText("Utslagsfråga")).toBeInTheDocument();
    expect(
      screen.getByText("Hur många trappsteg finns det?"),
    ).toBeInTheDocument();
  });

  test("hides the tiebreaker card when includeTiebreaker is false", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({
        settings: {
          showQuestionText: true,
          printable: true,
          includeTiebreaker: false,
          showResults: true,
        },
        tiebreaker: { question: "Hur många trappsteg finns det?" },
      }),
    );
    renderAt();
    const main = await screenMain();
    await main.findByText("Vilket år byggdes bron?");
    expect(
      main.queryByText("Hur många trappsteg finns det?"),
    ).not.toBeInTheDocument();
  });

  test("renders the print menu, with the QR poster item available", async () => {
    renderAt();
    const main = await screenMain();
    await main.findByText("Stadsvandringen");
    const printBtn = main.getByRole("button", { name: /Skriv ut/ });
    expect(printBtn).toBeInTheDocument();

    await userEvent.click(printBtn);
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut QR-affisch" }),
    ).toBeInTheDocument();
    // printable => question + talong items also present.
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut frågor" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut talonger" }),
    ).toBeInTheDocument();
  });

  test("renders the QR poster containing the walk title and join code", async () => {
    renderAt();
    await screen.findAllByText("Stadsvandringen");
    // QrPoster renders an SVG QR and repeats the join code "abc123".
    expect(document.querySelector(".qr-only svg")).toBeTruthy();
    const poster = document.querySelector(".qr-only") as HTMLElement;
    expect(within(poster).getByText("Stadsvandringen")).toBeInTheDocument();
    expect(within(poster).getByText("abc123")).toBeInTheDocument();
  });
});
