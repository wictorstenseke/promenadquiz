import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { QrPoster } from "./QrPoster";
import { newQuestion } from "../lib/factory";
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
    questions: [newQuestion(1), newQuestion(2)],
    ...overrides,
  };
}

describe("QrPoster", () => {
  test("renders the walk title and the join code", () => {
    const html = renderToStaticMarkup(<QrPoster walk={makeWalk()} />);
    expect(html).toContain("Hösttipset");
    expect(html).toContain("k4m9px");
  });

  test("falls back to a placeholder title when untitled", () => {
    const html = renderToStaticMarkup(
      <QrPoster walk={makeWalk({ title: "" })} />,
    );
    expect(html).toContain("Namnlös promenad");
  });

  test("renders a QR svg and the scan prompt", () => {
    const html = renderToStaticMarkup(<QrPoster walk={makeWalk()} />);
    expect(html).toContain("<svg");
    expect(html).toContain("Skanna QR-koden för att starta");
  });

  test("shows both fallback section labels", () => {
    const html = renderToStaticMarkup(<QrPoster walk={makeWalk()} />);
    expect(html).toContain("Gå till:");
    expect(html).toContain("och ange kod:");
  });

  test("uses the published snapshot title when present", () => {
    const walk = makeWalk({
      title: "Utkast",
      publishedSnapshot: {
        title: "Publicerad titel",
        settings: {
          showQuestionText: true,
          printable: true,
          includeTiebreaker: false,
          showResults: true,
        },
        questions: [newQuestion(1)],
      },
    });
    const html = renderToStaticMarkup(<QrPoster walk={walk} />);
    expect(html).toContain("Publicerad titel");
  });
});
