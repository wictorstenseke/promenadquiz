import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Toggle } from "./Switch";

describe("Toggle", () => {
  test("renders title and hint, reflects on state via aria-pressed", () => {
    render(
      <Toggle on title="Visa frågetext" hint="Detaljer" onChange={() => {}} />,
    );
    expect(screen.getByText("Visa frågetext")).toBeInTheDocument();
    expect(screen.getByText("Detaljer")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Visa frågetext" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  test("reflects off state via aria-pressed", () => {
    render(<Toggle on={false} title="T" hint="H" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "T" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("clicking calls onChange with the toggled value", async () => {
    const onChange = vi.fn();
    render(<Toggle on={false} title="T" hint="H" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "T" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("clicking when on calls onChange with false", async () => {
    const onChange = vi.fn();
    render(<Toggle on title="T" hint="H" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "T" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
