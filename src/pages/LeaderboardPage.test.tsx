import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import LeaderboardPage from "./LeaderboardPage";
import type { LeaderboardEntry } from "../storage";
import type { Submission, Walk } from "../types";

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
    title: "Höstpromenaden",
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

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "s1",
    walkId: "abc123",
    participantName: "Anna",
    answers: {},
    score: 8,
    total: 10,
    finishedAt: 0,
    ...overrides,
  };
}

function renderAt(
  state?: { from?: string },
  walkId = "abc123",
) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: `/walk/${walkId}/leaderboard`, state }]}
    >
      <Routes>
        <Route path="/walk/:id/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.mocked(storage.getWalk).mockResolvedValue(makeWalk());
    vi.mocked(storage.getLeaderboard).mockResolvedValue([]);
  });

  test("renders ranked entries with names and scores in order", async () => {
    vi.mocked(storage.getLeaderboard).mockResolvedValue([
      { submission: makeSubmission({ id: "s1", participantName: "Anna", score: 9, total: 10 }), rank: 1 },
      { submission: makeSubmission({ id: "s2", participantName: "Bertil", score: 7, total: 10 }), rank: 2 },
      { submission: makeSubmission({ id: "s3", participantName: "Cecilia", score: 5, total: 10 }), rank: 3 },
    ] satisfies LeaderboardEntry[]);

    renderAt();

    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Bertil")).toBeInTheDocument();
    expect(screen.getByText("Cecilia")).toBeInTheDocument();

    // Rank 1 gets a medal; later ranks get "#n".
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();

    // DOM order matches leaderboard order.
    const rows = document.querySelectorAll(".lb-row");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("Anna");
    expect(rows[1].textContent).toContain("Bertil");
    expect(rows[2].textContent).toContain("Cecilia");

    // Score shown as score/total.
    expect(screen.getByText(/9\/10/)).toBeInTheDocument();
  });

  test("renders the walk title", async () => {
    renderAt();
    expect(await screen.findByText("Höstpromenaden")).toBeInTheDocument();
  });

  test("shows the empty-state message when the board is empty", async () => {
    vi.mocked(storage.getLeaderboard).mockResolvedValue([]);
    renderAt();
    expect(
      await screen.findByText(
        "Inga inlämningar än. Dela länken och låt promenaden börja!",
      ),
    ).toBeInTheDocument();
  });

  test("shows the tiebreaker banner and per-row tiebreaker answer when the walk has one", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({ tiebreaker: { question: "Hur många steg?", answer: "4200" } }),
    );
    vi.mocked(storage.getLeaderboard).mockResolvedValue([
      {
        submission: makeSubmission({ tiebreakerAnswer: "4180" }),
        rank: 1,
      },
    ]);

    renderAt();

    expect(await screen.findByText("Utslagsfråga")).toBeInTheDocument();
    expect(screen.getByText("Hur många steg?")).toBeInTheDocument();
    expect(screen.getByText("Rätt svar")).toBeInTheDocument();
    expect(screen.getByText("4200")).toBeInTheDocument();
    // The participant's tiebreaker guess shows on their row.
    expect(screen.getByText("4180")).toBeInTheDocument();
  });

  test("falls back to em-dash when a row has no tiebreaker answer", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({ tiebreaker: { question: "Hur många steg?" } }),
    );
    vi.mocked(storage.getLeaderboard).mockResolvedValue([
      { submission: makeSubmission({ tiebreakerAnswer: undefined }), rank: 1 },
    ]);

    renderAt();

    expect(await screen.findByText("Hur många steg?")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("default back link reads 'Mina promenader'", async () => {
    renderAt();
    expect(await screen.findByText("← Mina promenader")).toBeInTheDocument();
  });

  test("withholds the board for participants when showResults is false", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({
        settings: {
          showQuestionText: true,
          printable: true,
          includeTiebreaker: true,
          showResults: false,
        },
      }),
    );
    vi.mocked(storage.getLeaderboard).mockResolvedValue([
      { submission: makeSubmission(), rank: 1 },
    ]);

    renderAt({ from: "/p/abc123" });

    expect(
      await screen.findByText("Arrangören avslöjar topplistan när alla är klara."),
    ).toBeInTheDocument();
    // The participant entered via /p/, so the back label is the short variant.
    expect(screen.getByText("← Tillbaka")).toBeInTheDocument();
    // The actual board is not rendered.
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
  });

  test("creator route is never gated even when showResults is false", async () => {
    vi.mocked(storage.getWalk).mockResolvedValue(
      makeWalk({
        settings: {
          showQuestionText: true,
          printable: true,
          includeTiebreaker: true,
          showResults: false,
        },
      }),
    );
    vi.mocked(storage.getLeaderboard).mockResolvedValue([
      { submission: makeSubmission({ participantName: "Anna" }), rank: 1 },
    ]);

    // No "from: /p/" state => treated as a creator route.
    renderAt();

    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(
      screen.queryByText("Arrangören avslöjar topplistan när alla är klara."),
    ).not.toBeInTheDocument();
  });
});
