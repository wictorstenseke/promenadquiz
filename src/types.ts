export type OptionKey = "1" | "X" | "2";

export const OPTION_KEYS: OptionKey[] = ["1", "X", "2"];

export type WalkStatus = "draft" | "published";

export interface Question {
  id: string;
  stationNumber: number;
  text: string;
  options: Record<OptionKey, string>;
  correct: OptionKey;
  /** Prepared for v2, not used in v1. */
  image?: string;
}

export interface WalkSettings {
  /** false => only the answer buttons are shown to the participant. */
  showQuestionText: boolean;
  printable: boolean;
}

export interface Tiebreaker {
  question: string;
}

export interface Walk {
  id: string;
  title: string;
  status: WalkStatus;
  settings: WalkSettings;
  questions: Question[];
  tiebreaker?: Tiebreaker;
  createdAt: number;
  publishedAt?: number;
}

export interface Submission {
  id: string;
  walkId: string;
  participantName: string;
  answers: Record<string, OptionKey>;
  tiebreakerAnswer?: string;
  score: number;
  total: number;
  finishedAt: number;
}

/** In-progress participant answers, autosaved separately from submissions. */
export interface Progress {
  walkId: string;
  participantName: string;
  answers: Record<string, OptionKey>;
  tiebreakerAnswer?: string;
  currentIndex: number;
  updatedAt: number;
}
