import type { OptionKey, Walk } from "../types";

export interface ScoreResult {
  score: number;
  total: number;
}

/**
 * Pure scoring. Counts how many answers match the correct option.
 * `total` is the number of questions in the walk (max achievable score).
 * Missing or invalid answers simply do not count.
 */
export function scoreWalk(
  walk: Pick<Walk, "questions">,
  answers: Record<string, OptionKey>,
): ScoreResult {
  const total = walk.questions.length;
  let score = 0;
  for (const q of walk.questions) {
    if (answers[q.id] === q.correct) score += 1;
  }
  return { score, total };
}
