import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { WalkActionsSheet } from "./WalkActionsSheet";
import type { Walk } from "../types";

function makeWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: "k4m9px",
    title: "Hösttipset",
    status: "draft",
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

const noop = () => {};

describe("WalkActionsSheet", () => {
  test("renders nothing when walk is null", () => {
    const { container } = render(
      <WalkActionsSheet
        walk={null}
        onClose={noop}
        onDuplicate={noop}
        onLeaderboard={noop}
        onDelete={noop}
        submissions={0}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("renders the walk title and the duplicate / delete actions", () => {
    render(
      <WalkActionsSheet
        walk={makeWalk()}
        onClose={noop}
        onDuplicate={noop}
        onLeaderboard={noop}
        onDelete={noop}
        submissions={0}
      />,
    );
    expect(screen.getByText("Hösttipset")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Duplicera/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ta bort/ })).toBeInTheDocument();
  });

  test("Duplicera calls onDuplicate with the walk", async () => {
    const walk = makeWalk();
    const onDuplicate = vi.fn();
    render(
      <WalkActionsSheet
        walk={walk}
        onClose={noop}
        onDuplicate={onDuplicate}
        onLeaderboard={noop}
        onDelete={noop}
        submissions={0}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Duplicera/ }));
    expect(onDuplicate).toHaveBeenCalledWith(walk);
  });

  test("leaderboard action shows for published walks and fires onLeaderboard", async () => {
    const walk = makeWalk({ status: "published" });
    const onLeaderboard = vi.fn();
    render(
      <WalkActionsSheet
        walk={walk}
        onClose={noop}
        onDuplicate={noop}
        onLeaderboard={onLeaderboard}
        onDelete={noop}
        submissions={3}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Visa topplista/ }),
    );
    expect(onLeaderboard).toHaveBeenCalledWith(walk);
  });

  test("leaderboard action is disabled with zero submissions", () => {
    render(
      <WalkActionsSheet
        walk={makeWalk({ status: "published" })}
        onClose={noop}
        onDuplicate={noop}
        onLeaderboard={noop}
        onDelete={noop}
        submissions={0}
      />,
    );
    expect(screen.getByRole("button", { name: /Visa topplista/ })).toBeDisabled();
  });

  test("delete opens a confirm view; confirming fires onDelete with the walk", async () => {
    const walk = makeWalk();
    const onDelete = vi.fn();
    render(
      <WalkActionsSheet
        walk={walk}
        onClose={noop}
        onDuplicate={noop}
        onLeaderboard={noop}
        onDelete={onDelete}
        submissions={0}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Ta bort/ }));
    expect(screen.getByText("Ta bort promenaden?")).toBeInTheDocument();
    // Confirm view has its own "Ta bort" button.
    await userEvent.click(screen.getByRole("button", { name: "Ta bort" }));
    expect(onDelete).toHaveBeenCalledWith(walk);
  });
});
