import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ConfirmSheet } from "./ConfirmSheet";

describe("ConfirmSheet", () => {
  test("renders title, body and labels when open", () => {
    render(
      <ConfirmSheet
        open
        title="Ta bort?"
        body="Detta kan inte ångras."
        confirmLabel="Ta bort"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Ta bort?")).toBeInTheDocument();
    expect(screen.getByText("Detta kan inte ångras.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ta bort" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeInTheDocument();
  });

  test("clicking confirm fires onConfirm", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmSheet
        open
        title="T"
        confirmLabel="Ja"
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("clicking Avbryt fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <ConfirmSheet
        open
        title="T"
        confirmLabel="Ja"
        onConfirm={() => {}}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmSheet
        open={false}
        title="T"
        confirmLabel="Ja"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
