import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PrintMenu } from "./PrintMenu";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.classList.remove("print-talonger", "print-qr");
});

describe("PrintMenu", () => {
  test("the menu is collapsed until the trigger is clicked", async () => {
    render(<PrintMenu printable />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { expanded: false }),
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  test("when printable, shows all three print options", async () => {
    render(<PrintMenu printable />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut frågor" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut talonger" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut QR-affisch" }),
    ).toBeInTheDocument();
  });

  test("when not printable, only the QR poster option shows", async () => {
    render(<PrintMenu printable={false} />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(
      screen.queryByRole("menuitem", { name: "Skriv ut frågor" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Skriv ut QR-affisch" }),
    ).toBeInTheDocument();
  });

  test("clicking 'Skriv ut frågor' calls window.print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintMenu printable />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Skriv ut frågor" }),
    );
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("'Skriv ut talonger' toggles the print-talonger body class and prints", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintMenu printable />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Skriv ut talonger" }),
    );
    expect(document.body.classList.contains("print-talonger")).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("'Skriv ut QR-affisch' toggles the print-qr body class and prints", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintMenu printable={false} />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Skriv ut QR-affisch" }),
    );
    expect(document.body.classList.contains("print-qr")).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
