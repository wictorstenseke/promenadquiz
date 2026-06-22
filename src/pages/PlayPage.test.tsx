import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlayPage from "./PlayPage";
import { storage } from "../storage";
import type { OptionKey, Walk, WalkContent } from "../types";

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

// Three questions; correct answers are 1, X, 2 respectively.
const content: WalkContent = {
  title: "Höstpromenaden",
  settings: {
    showQuestionText: true,
    printable: true,
    includeTiebreaker: false,
    showResults: true,
  },
  questions: [
    {
      id: "q1",
      stationNumber: 1,
      text: "Vad heter huvudstaden i Sverige?",
      options: { "1": "Stockholm", X: "Göteborg", "2": "Malmö" },
      correct: "1",
    },
    {
      id: "q2",
      stationNumber: 2,
      text: "Hur många ben har en spindel?",
      options: { "1": "6", X: "8", "2": "10" },
      correct: "X",
    },
    {
      id: "q3",
      stationNumber: 3,
      text: "Vilket år byggdes Eiffeltornet?",
      options: { "1": "1789", X: "1850", "2": "1889" },
      correct: "2",
    },
  ],
};

// Draft content differs from the snapshot, to prove participants see the snapshot.
const publishedWalk: Walk = {
  id: "abc",
  status: "published",
  createdAt: 1,
  title: "UTKAST-titel som inte ska visas",
  settings: {
    showQuestionText: true,
    printable: true,
    includeTiebreaker: false,
    showResults: true,
  },
  questions: [
    {
      id: "draft-q",
      stationNumber: 99,
      text: "Utkastfråga som inte ska visas",
      options: { "1": "a", X: "b", "2": "c" },
      correct: "1",
    },
  ],
  publishedSnapshot: content,
};

function renderPlay(walkId = "abc") {
  return render(
    <MemoryRouter initialEntries={[`/p/${walkId}`]}>
      <Routes>
        <Route path="/p/:id" element={<PlayPage />} />
        <Route
          path="/p/:id/result/:submissionId"
          element={<div>nav-result</div>}
        />
        <Route path="*" element={<div>nav-other</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Click the 1/X/2 option whose value label matches. The option button's
// accessible name is "1 Stockholm" with the key and value in separate spans,
// so we locate by the value text and click the enclosing button.
async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  valueText: string,
) {
  const valueEl = await screen.findByText(valueText);
  const btn = valueEl.closest("button");
  if (!btn) throw new Error(`No option button for "${valueText}"`);
  await user.click(btn);
}

// Helper to start a walk past the name gate.
async function startWalk(user: ReturnType<typeof userEvent.setup>) {
  // Label is associated via htmlFor, so query by its accessible name.
  const input = await screen.findByLabelText("Ditt namn");
  await user.type(input, "Anna");
  await user.click(screen.getByRole("button", { name: /Starta promenaden/ }));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockStorage.saveSubmission.mockResolvedValue(undefined);
  mockStorage.getLeaderboard.mockResolvedValue([]);
});

describe("PlayPage", () => {
  test("shows a loading state, then the name gate from the published snapshot", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    renderPlay();

    expect(screen.getByText("Laddar…")).toBeInTheDocument();

    // Snapshot title, not the draft title.
    expect(await screen.findByText("Höstpromenaden")).toBeInTheDocument();
    expect(
      screen.queryByText("UTKAST-titel som inte ska visas"),
    ).not.toBeInTheDocument();
    // 3 snapshot stations, not 1 draft station.
    expect(screen.getByText(/3 stationer/)).toBeInTheDocument();
  });

  test("renders the first snapshot question after entering a name", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    const user = userEvent.setup();
    renderPlay();
    await startWalk(user);

    expect(
      await screen.findByText("Vad heter huvudstaden i Sverige?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fråga 1")).toBeInTheDocument();
    expect(screen.getByText("Stockholm")).toBeInTheDocument();
    // Draft question text must not appear.
    expect(
      screen.queryByText("Utkastfråga som inte ska visas"),
    ).not.toBeInTheDocument();
  });

  test("next/prev navigation changes the visible question", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    const user = userEvent.setup();
    renderPlay();
    await startWalk(user);

    await screen.findByText("Vad heter huvudstaden i Sverige?");
    await user.click(screen.getByRole("button", { name: /Nästa/ }));
    expect(
      await screen.findByText("Hur många ben har en spindel?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fråga 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bakåt/ }));
    expect(
      await screen.findByText("Vad heter huvudstaden i Sverige?"),
    ).toBeInTheDocument();
  });

  test("back button is disabled on the first question", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    const user = userEvent.setup();
    renderPlay();
    await startWalk(user);
    await screen.findByText("Vad heter huvudstaden i Sverige?");

    expect(screen.getByRole("button", { name: /Bakåt/ })).toBeDisabled();
  });

  test("answering all questions correctly submits with full score and navigates", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    const user = userEvent.setup();
    renderPlay();
    await startWalk(user);

    // q1 -> correct "1"
    await screen.findByText("Vad heter huvudstaden i Sverige?");
    await pickOption(user, "Stockholm");
    await user.click(screen.getByRole("button", { name: /Nästa/ }));

    // q2 -> correct "X"
    await screen.findByText("Hur många ben har en spindel?");
    await pickOption(user, "8");
    await user.click(screen.getByRole("button", { name: /Nästa/ }));

    // q3 -> correct "2"
    await screen.findByText("Vilket år byggdes Eiffeltornet?");
    await pickOption(user, "1889");

    // Submit button shows answered count.
    const submit = screen.getByRole("button", { name: /Lämna in \(3\/3\)/ });
    await user.click(submit);

    await waitFor(() => expect(mockStorage.saveSubmission).toHaveBeenCalled());
    const arg = mockStorage.saveSubmission.mock.calls[0][0];
    expect(arg.score).toBe(3);
    expect(arg.total).toBe(3);
    expect(arg.participantName).toBe("Anna");
    expect(arg.answers).toEqual<Record<string, OptionKey>>({
      q1: "1",
      q2: "X",
      q3: "2",
    });
    expect(arg.walkId).toBe("abc");

    expect(await screen.findByText("nav-result")).toBeInTheDocument();
  });

  test("a partially-correct run computes the right score", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    const user = userEvent.setup();
    renderPlay();
    await startWalk(user);

    // q1 correct, q2 wrong, q3 wrong
    await screen.findByText("Vad heter huvudstaden i Sverige?");
    await pickOption(user, "Stockholm"); // correct (1)
    await user.click(screen.getByRole("button", { name: /Nästa/ }));

    await screen.findByText("Hur många ben har en spindel?");
    await pickOption(user, "6"); // wrong (1, correct is X)
    await user.click(screen.getByRole("button", { name: /Nästa/ }));

    await screen.findByText("Vilket år byggdes Eiffeltornet?");
    await pickOption(user, "1789"); // wrong (1, correct is 2)

    await user.click(screen.getByRole("button", { name: /Lämna in/ }));

    await waitFor(() => expect(mockStorage.saveSubmission).toHaveBeenCalled());
    const arg = mockStorage.saveSubmission.mock.calls[0][0];
    expect(arg.score).toBe(1);
    expect(arg.total).toBe(3);
  });

  test("submitting with unanswered questions confirms before finalizing", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    const user = userEvent.setup();
    renderPlay();
    await startWalk(user);

    // Skip straight to the last question without answering.
    await screen.findByText("Vad heter huvudstaden i Sverige?");
    await user.click(screen.getByRole("button", { name: /Nästa/ }));
    await user.click(screen.getByRole("button", { name: /Nästa/ }));
    await screen.findByText("Vilket år byggdes Eiffeltornet?");

    await user.click(screen.getByRole("button", { name: /Lämna in \(0\/3\)/ }));

    // Confirmation sheet appears; submission not yet saved.
    expect(
      await screen.findByText("Lämna in ändå?"),
    ).toBeInTheDocument();
    expect(mockStorage.saveSubmission).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Lämna in$/ }));

    await waitFor(() => expect(mockStorage.saveSubmission).toHaveBeenCalled());
    const arg = mockStorage.saveSubmission.mock.calls[0][0];
    expect(arg.score).toBe(0);
    expect(arg.total).toBe(3);
  });

  test("rejects a name already taken on the leaderboard", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    mockStorage.getLeaderboard.mockResolvedValue([
      {
        rank: 1,
        submission: {
          id: "s1",
          walkId: "abc",
          participantName: "Anna",
          answers: {},
          score: 0,
          total: 3,
          finishedAt: 1,
        },
      },
    ]);
    const user = userEvent.setup();
    renderPlay();

    const input = await screen.findByRole("textbox");
    await user.type(input, "anna"); // case-insensitive match
    await user.click(
      screen.getByRole("button", { name: /Starta promenaden/ }),
    );

    expect(
      await screen.findByText(
        "Namnet är redan taget i promenaden. Välj ett annat.",
      ),
    ).toBeInTheDocument();
    // Still on the name gate, no question shown.
    expect(
      screen.queryByText("Vad heter huvudstaden i Sverige?"),
    ).not.toBeInTheDocument();
  });

  test("shows a not-found error when the walk does not exist", async () => {
    mockStorage.getWalk.mockResolvedValue(null);
    renderPlay();
    expect(
      await screen.findByText("Promenaden hittades inte."),
    ).toBeInTheDocument();
    expect(screen.getByText("Hoppsan")).toBeInTheDocument();
  });

  test("shows an error when the walk is not published", async () => {
    mockStorage.getWalk.mockResolvedValue({
      ...publishedWalk,
      status: "draft",
      publishedSnapshot: undefined,
    });
    renderPlay();
    expect(
      await screen.findByText("Den här promenaden är inte publicerad än."),
    ).toBeInTheDocument();
  });

  test("restores autosaved progress from localStorage", async () => {
    mockStorage.getWalk.mockResolvedValue(publishedWalk);
    localStorage.setItem(
      "hosttipset.progress.v1.abc",
      JSON.stringify({
        walkId: "abc",
        participantName: "Bertil",
        answers: { q1: "1" },
        tiebreakerAnswer: "",
        currentIndex: 1,
        updatedAt: Date.now(),
      }),
    );
    renderPlay();

    // Resumes past the name gate straight onto question 2 (currentIndex 1).
    expect(
      await screen.findByText("Hur många ben har en spindel?"),
    ).toBeInTheDocument();
  });
});
