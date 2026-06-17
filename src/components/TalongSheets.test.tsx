import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { TalongSheets } from "./TalongSheets";
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
    questions: [newQuestion(1), newQuestion(2), newQuestion(3)],
    ...overrides,
  };
}

describe("TalongSheets", () => {
  test("exposes the question count to the print stylesheet", () => {
    const walk = makeWalk({
      questions: Array.from({ length: 13 }, (_, i) => newQuestion(i + 1)),
    });
    const html = renderToStaticMarkup(<TalongSheets walk={walk} />);
    expect(html).toContain("--talong-count:13");
  });

  test("renders a single 1/X/2 column header per slip", () => {
    const html = renderToStaticMarkup(<TalongSheets walk={makeWalk()} />);
    // One header cell each for 1, X, 2 — on each of the 3 slips.
    expect(html.match(/class="talong-colhead"/g) ?? []).toHaveLength(9);
  });

  test("renders one numbered row per question on each slip", () => {
    const walk = makeWalk();
    const html = renderToStaticMarkup(<TalongSheets walk={walk} />);
    const rows = html.match(/class="talong-row"/g) ?? [];
    // 3 questions × 3 slips on the page.
    expect(rows).toHaveLength(9);
  });

  test("numbers cells by station number", () => {
    const walk = makeWalk({
      questions: [newQuestion(1), newQuestion(2)],
    });
    const html = renderToStaticMarkup(<TalongSheets walk={walk} />);
    // Each of the 3 slips shows stations 1 and 2.
    expect(html.match(/class="talong-num">1</g) ?? []).toHaveLength(3);
    expect(html.match(/class="talong-num">2</g) ?? []).toHaveLength(3);
  });

  test("renders tiebreaker line only when includeTiebreaker is true", () => {
    const withTie = renderToStaticMarkup(<TalongSheets walk={makeWalk()} />);
    expect(withTie).toContain("Utslagsfråga");

    const without = makeWalk({
      settings: {
        showQuestionText: true,
        printable: true,
        includeTiebreaker: false,
        showResults: true,
      },
    });
    const html = renderToStaticMarkup(<TalongSheets walk={without} />);
    expect(html).not.toContain("Utslagsfråga");
  });

  test("uses the published snapshot, not the draft", () => {
    const walk = makeWalk({
      questions: [newQuestion(1), newQuestion(2), newQuestion(3), newQuestion(4)],
      publishedSnapshot: {
        title: "Hösttipset",
        settings: {
          showQuestionText: true,
          printable: true,
          includeTiebreaker: false,
          showResults: true,
        },
        questions: [newQuestion(1), newQuestion(2)],
      },
    });
    const html = renderToStaticMarkup(<TalongSheets walk={walk} />);
    // Snapshot has 2 questions × 3 slips, and no tiebreaker.
    expect(html.match(/class="talong-row"/g) ?? []).toHaveLength(6);
    expect(html).not.toContain("Utslagsfråga");
  });
});
