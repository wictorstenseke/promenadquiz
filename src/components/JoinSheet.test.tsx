import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { JoinSheet, parseCode } from "./JoinSheet";

describe("parseCode", () => {
  test("returns a bare 6-char code lowercased", () => {
    expect(parseCode("K4M9PX")).toBe("k4m9px");
  });

  test("extracts the code from a full share link", () => {
    expect(parseCode("https://example.com/p/k4m9px")).toBe("k4m9px");
  });

  test("returns null for an invalid-length code", () => {
    expect(parseCode("abc")).toBeNull();
  });
});

describe("JoinSheet", () => {
  test("renders heading and input when open", () => {
    render(<JoinSheet open onClose={() => {}} onJoin={() => {}} />);
    expect(screen.getByText("Gå med i en promenad")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ange kod, t.ex. k4m9px"),
    ).toBeInTheDocument();
  });

  test("submit button is disabled until a valid code is entered", async () => {
    render(<JoinSheet open onClose={() => {}} onJoin={() => {}} />);
    const submit = screen.getByRole("button", { name: "Gå med" });
    expect(submit).toBeDisabled();
    await userEvent.type(
      screen.getByPlaceholderText("Ange kod, t.ex. k4m9px"),
      "k4m9px",
    );
    expect(submit).toBeEnabled();
  });

  test("submitting a valid code calls onJoin with the parsed code", async () => {
    const onJoin = vi.fn();
    render(<JoinSheet open onClose={() => {}} onJoin={onJoin} />);
    await userEvent.type(
      screen.getByPlaceholderText("Ange kod, t.ex. k4m9px"),
      "K4M9PX",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gå med" }));
    expect(onJoin).toHaveBeenCalledWith("k4m9px");
  });

  test("renders nothing when closed", () => {
    const { container } = render(
      <JoinSheet open={false} onClose={() => {}} onJoin={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
