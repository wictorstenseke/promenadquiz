import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  test("renders children when open", () => {
    render(
      <Sheet open onClose={() => {}}>
        <p>Hello sheet</p>
      </Sheet>,
    );
    expect(screen.getByText("Hello sheet")).toBeInTheDocument();
  });

  test("renders nothing when closed", () => {
    const { container } = render(
      <Sheet open={false} onClose={() => {}}>
        <p>Hello sheet</p>
      </Sheet>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("clicking the close button fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose}>
        <p>Hello sheet</p>
      </Sheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Stäng" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("pressing Escape fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose}>
        <p>Hello sheet</p>
      </Sheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
