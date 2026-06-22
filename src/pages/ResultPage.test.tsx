import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResultPage from "./ResultPage";
import { storage } from "../storage";
import type { LeaderboardEntry } from "../storage";
import type { Walk } from "../types";

vi.mock("../storage", () => ({
  storage: {
    listWalks: vi.fn(),
    getWalk: vi.fn(),
    saveWalk: vi.fn(),
    deleteWalk: vi.fn(),
    saveSubmission: vi.fn().mockResolvedValue(undefined),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    adoptLocalWalks: vi.fn(),
  },
}));

const mockStorage = vi.mocked(storage);

function walkWith(showResults: boolean): Walk {
  return {
    id: "abc",
    status: "published",
    createdAt: 1,
    title: "Höstpromenaden",
    settings: {
      showQuestionText: true,
      printable: true,
      includeTiebreaker: false,
      showResults,
    },
    questions: [],
  };
}

const board: LeaderboardEntry[] = [
  {
    rank: 1,
    submission: {
      id: "win",
      walkId: "abc",
      participantName: "Cesar",
      answers: {},
      score: 5,
      total: 5,
      finishedAt: 10,
    },
  },
  {
    rank: 2,
    submission: {
      id: "sub-1",
      walkId: "abc",
      participantName: "Anna",
      answers: {},
      score: 3,
      total: 5,
      finishedAt: 20,
    },
  },
];

function renderResult(submissionId = "sub-1") {
  return render(
    <MemoryRouter initialEntries={[`/p/abc/result/${submissionId}`]}>
      <Routes>
        <Route
          path="/p/:id/result/:submissionId"
          element={<ResultPage />}
        />
        <Route path="*" element={<div>nav-other</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResultPage", () => {
  test("shows a loading state until both walk and leaderboard resolve", async () => {
    mockStorage.getLeaderboard.mockResolvedValue(board);
    mockStorage.getWalk.mockResolvedValue(walkWith(true));
    renderResult();
    expect(screen.getByText("Laddar…")).toBeInTheDocument();
    await screen.findByText("Anna", { exact: false });
  });

  test("renders the participant's score, total and rank", async () => {
    mockStorage.getLeaderboard.mockResolvedValue(board);
    mockStorage.getWalk.mockResolvedValue(walkWith(true));
    const { container } = renderResult("sub-1");

    expect(
      await screen.findByText(/Inlämnat · Anna/),
    ).toBeInTheDocument();
    // Score is rendered as 3 / 5, split across child nodes.
    const scoreBig = container.querySelector(".score-big");
    expect(scoreBig?.textContent?.replace(/\s+/g, "")).toBe("3/5");
    // Rank #2 of 2 entries.
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText(/av 2 just/)).toBeInTheDocument();
  });

  test("hides the score when the organiser withholds results (showResults=false)", async () => {
    mockStorage.getLeaderboard.mockResolvedValue(board);
    mockStorage.getWalk.mockResolvedValue(walkWith(false));
    renderResult("sub-1");

    expect(
      await screen.findByText("Tack, dina svar är inskickade!"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Inlämnat · Anna/)).toBeInTheDocument();
    // Score must not be revealed.
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Se topplistan/ }),
    ).not.toBeInTheDocument();
  });

  test("shows a 'result missing' fallback when the submission is not on the board", async () => {
    mockStorage.getLeaderboard.mockResolvedValue(board);
    mockStorage.getWalk.mockResolvedValue(walkWith(true));
    renderResult("does-not-exist");

    expect(await screen.findByText("Resultat saknas")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Till topplistan/ }),
    ).toBeInTheDocument();
  });

  test("links to the leaderboard and start", async () => {
    mockStorage.getLeaderboard.mockResolvedValue(board);
    mockStorage.getWalk.mockResolvedValue(walkWith(true));
    const { container } = renderResult("win");

    expect(await screen.findByText("#1")).toBeInTheDocument();
    const scoreBig = container.querySelector(".score-big");
    expect(scoreBig?.textContent?.replace(/\s+/g, "")).toBe("5/5");
    const leaderboardLink = screen.getByRole("link", {
      name: /Se topplistan/,
    });
    // Under MemoryRouter the href is a plain path (the app itself uses a hash
    // router, but route resolution here is path-based).
    expect(leaderboardLink).toHaveAttribute("href", "/walk/abc/leaderboard");
  });
});
