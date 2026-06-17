import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PrintSheets } from "./PrintSheets";
import { newQuestion } from "../lib/factory";
import type { Walk } from "../types";

function makeWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: "abc123",
    title: "Hösttipset",
    status: "draft",
    createdAt: 0,
    settings: {
      showQuestionText: true,
      printable: true,
      includeTiebreaker: true,
      showResults: true,
    },
    questions: [{ ...newQuestion(1), text: "Vad heter huvudstaden?" }],
    ...overrides,
  };
}

describe("PrintSheets", () => {
  test("shows the quiz name as a subtext above the station heading", () => {
    const html = renderToStaticMarkup(<PrintSheets walk={makeWalk()} />);
    expect(html).toContain('class="print-quizname">Hösttipset<');
  });

  test("station heading is just the big question number", () => {
    const html = renderToStaticMarkup(<PrintSheets walk={makeWalk()} />);
    expect(html).toContain('class="print-station">Fråga 1<');
    // Title no longer appended to the station line.
    expect(html).not.toContain("Fråga 1 —");
  });
});
