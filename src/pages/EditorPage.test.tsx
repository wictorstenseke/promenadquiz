import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Walk } from "../types";
import EditorPage from "./EditorPage";

// The page pulls in the storage singleton; mock every method it might touch.
vi.mock("../storage", () => ({
  storage: {
    listWalks: vi.fn().mockResolvedValue([]),
    getWalk: vi.fn(),
    saveWalk: vi.fn().mockResolvedValue(undefined),
    deleteWalk: vi.fn().mockResolvedValue(undefined),
    saveSubmission: vi.fn(),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    adoptLocalWalks: vi.fn(),
  },
}));

// Default: signed out. Individual tests can override via mockReturnValue.
const useAuthMock = vi.fn(() => ({ user: null, loading: false, signOut: vi.fn() }));
vi.mock("../hooks/useAuth", () => ({ useAuth: () => useAuthMock() }));

import { storage } from "../storage";

const getWalk = storage.getWalk as ReturnType<typeof vi.fn>;
const saveWalk = storage.saveWalk as ReturnType<typeof vi.fn>;
const getLeaderboard = storage.getLeaderboard as ReturnType<typeof vi.fn>;

function makeWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: "abc",
    title: "Skogspromenaden",
    status: "draft",
    createdAt: 1000,
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
        text: "Vilket träd är vanligast?",
        options: { "1": "Gran", X: "Tall", "2": "Björk" },
        correct: "1",
      },
    ],
    ...overrides,
  };
}

function renderEditor(opts: { id?: string; draft?: Walk } = {}) {
  const id = opts.id ?? "abc";
  const state = opts.draft ? { draft: opts.draft } : undefined;
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/walk/${id}/edit`, state }]}>
      <Routes>
        <Route path="/walk/:id/edit" element={<EditorPage />} />
        <Route path="/walk/:id/share" element={<div data-testid="share" />} />
        <Route path="*" element={<div data-testid="nav" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: null, loading: false, signOut: vi.fn() });
  getLeaderboard.mockResolvedValue([]);
  saveWalk.mockResolvedValue(undefined);
});

describe("EditorPage — loading", () => {
  test("renders an existing walk from storage.getWalk", async () => {
    getWalk.mockResolvedValue(makeWalk());
    renderEditor();

    expect(await screen.findByDisplayValue("Skogspromenaden")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Vilket träd är vanligast?")).toBeInTheDocument();
    expect(screen.getByText("1 st")).toBeInTheDocument();
  });

  test("falls back to the draft in nav state when storage has no walk", async () => {
    getWalk.mockResolvedValue(undefined);
    renderEditor({ draft: makeWalk({ title: "Ny opublicerad" }) });

    expect(await screen.findByDisplayValue("Ny opublicerad")).toBeInTheDocument();
  });

  test("shows the not-found view when no walk and no matching draft", async () => {
    getWalk.mockResolvedValue(undefined);
    renderEditor();

    expect(await screen.findByText("Hittades inte")).toBeInTheDocument();
  });

  test("blocks editing a walk owned by another account", async () => {
    getWalk.mockResolvedValue(makeWalk({ ownerId: "owner-1" }));
    useAuthMock.mockReturnValue({
      user: { uid: "someone-else" },
      loading: false,
      signOut: vi.fn(),
    } as never);
    renderEditor();

    expect(await screen.findByText("Inte din promenad")).toBeInTheDocument();
  });
});

describe("EditorPage — autosave", () => {
  test("editing the title triggers a debounced saveWalk with the new title", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk());
    renderEditor();

    const title = await screen.findByDisplayValue("Skogspromenaden");
    await user.type(title, "!");

    await waitFor(
      () => {
        const last = saveWalk.mock.calls[saveWalk.mock.calls.length - 1]?.[0] as Walk;
        expect(last?.title).toBe("Skogspromenaden!");
      },
      { timeout: 2000 },
    );
  });

  test("editing a question option persists the new value", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk());
    renderEditor();

    const opt = await screen.findByDisplayValue("Gran");
    await user.clear(opt);
    await user.type(opt, "Ek");

    await waitFor(
      () => {
        const last = saveWalk.mock.calls[saveWalk.mock.calls.length - 1]?.[0] as Walk;
        expect(last?.questions[0].options["1"]).toBe("Ek");
      },
      { timeout: 2000 },
    );
  });
});

describe("EditorPage — questions", () => {
  test("adding a question increases the count and saves", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk());
    renderEditor();

    expect(await screen.findByText("1 st")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Lägg till fråga/ }));

    expect(await screen.findByText("2 st")).toBeInTheDocument();
    await waitFor(
      () => {
        const last = saveWalk.mock.calls[saveWalk.mock.calls.length - 1]?.[0] as Walk;
        expect(last?.questions).toHaveLength(2);
      },
      { timeout: 2000 },
    );
  });

  test("marking a correct answer updates that question's `correct`", async () => {
    const user = userEvent.setup();
    // Start with a different correct answer so we can observe the change.
    getWalk.mockResolvedValue(
      makeWalk({
        questions: [
          {
            id: "q1",
            stationNumber: 1,
            text: "Q",
            options: { "1": "a", X: "b", "2": "c" },
            correct: "1",
          },
        ],
      }),
    );
    renderEditor();

    // The X option starts as "Sätt rätt"; click it to make X correct.
    const setButtons = await screen.findAllByText("Sätt rätt");
    // Order of options is 1, X, 2 -> the two "Sätt rätt" buttons are X and 2.
    await user.click(setButtons[0]);

    await waitFor(
      () => {
        const last = saveWalk.mock.calls[saveWalk.mock.calls.length - 1]?.[0] as Walk;
        expect(last?.questions[0].correct).toBe("X");
      },
      { timeout: 2000 },
    );
  });
});

describe("EditorPage — settings", () => {
  test("toggling a setting persists the change", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk()); // showQuestionText: true
    renderEditor();

    const toggle = await screen.findByRole("button", {
      name: "Visa frågetext i appen",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);

    await waitFor(
      () => {
        const last = saveWalk.mock.calls[saveWalk.mock.calls.length - 1]?.[0] as Walk;
        expect(last?.settings.showQuestionText).toBe(false);
      },
      { timeout: 2000 },
    );
  });

  test("enabling the tiebreaker reveals the utslagsfråga section", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk()); // includeTiebreaker: false
    renderEditor();

    const toggle = await screen.findByRole("button", {
      name: "Inkludera utslagsfråga",
    });
    await user.click(toggle);

    expect(
      await screen.findByRole("heading", { name: "Utslagsfråga" }),
    ).toBeInTheDocument();
  });
});

describe("EditorPage — publish", () => {
  test("publish writes status:published, a snapshot of current content, and navigates to share", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk()); // valid: title, 1 q, correct set, all options filled
    renderEditor();

    const publish = await screen.findByRole("button", { name: /Publicera/ });
    expect(publish).toBeEnabled();
    await user.click(publish);

    await waitFor(() => {
      const last = saveWalk.mock.calls[saveWalk.mock.calls.length - 1]?.[0] as Walk;
      expect(last?.status).toBe("published");
      // The snapshot is a frozen copy of the editable content.
      expect(last?.publishedSnapshot).toMatchObject({
        title: "Skogspromenaden",
        questions: last.questions,
        settings: last.settings,
      });
      expect(last?.publishedAt).toEqual(expect.any(Number));
      expect(last?.lastPublishedAt).toEqual(expect.any(Number));
    });

    // First publish navigates to the share screen.
    expect(await screen.findByTestId("share")).toBeInTheDocument();
  });

  test("publish is blocked (button disabled) when a question has no correct answer", async () => {
    getWalk.mockResolvedValue(
      makeWalk({
        questions: [
          {
            id: "q1",
            stationNumber: 1,
            text: "Q",
            options: { "1": "a", X: "b", "2": "c" },
            correct: null, // no correct answer -> cannot publish
          },
        ],
      }),
    );
    renderEditor();

    const publish = await screen.findByRole("button", { name: /Publicera/ });
    expect(publish).toBeDisabled();
  });

  test("publish is blocked when the title is empty", async () => {
    getWalk.mockResolvedValue(makeWalk({ title: "   " }));
    renderEditor();

    const publish = await screen.findByRole("button", { name: /Publicera/ });
    expect(publish).toBeDisabled();
  });
});

describe("EditorPage — edit guard with submissions", () => {
  test("a walk with submissions shows the lock banner and gates editing behind a confirm", async () => {
    const user = userEvent.setup();
    getWalk.mockResolvedValue(makeWalk({ status: "published", publishedSnapshot: undefined }));
    getLeaderboard.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    renderEditor();

    // Lock banner appears (2 submissions).
    expect(
      await screen.findByText(/2 inlämningar finns redan/),
    ).toBeInTheDocument();

    // Let the published-walk snapshot backfill (migration save) settle first.
    await waitFor(() => expect(saveWalk).toHaveBeenCalled());
    saveWalk.mockClear();

    // Trying to edit the title pops the confirm sheet instead of saving.
    const title = screen.getByDisplayValue("Skogspromenaden");
    await user.type(title, "X");

    expect(
      await screen.findByText("Redigera en promenad med resultat?"),
    ).toBeInTheDocument();
    // The blocked edit is neither applied to the field nor queued for save:
    // no save should ever carry the attempted "SkogspromenadenX" title.
    expect(title).toHaveValue("Skogspromenaden");
    await new Promise((r) => setTimeout(r, 700));
    const sawBlockedEdit = saveWalk.mock.calls.some(
      ([w]) => (w as Walk)?.title === "SkogspromenadenX",
    );
    expect(sawBlockedEdit).toBe(false);
  });
});
