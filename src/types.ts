export type OptionKey = "1" | "X" | "2";

export const OPTION_KEYS: OptionKey[] = ["1", "X", "2"];

export type WalkStatus = "draft" | "published";

export interface Question {
  id: string;
  stationNumber: number;
  text: string;
  options: Record<OptionKey, string>;
  /** null until the organiser marks a correct answer. */
  correct: OptionKey | null;
  /** Prepared for v2, not used in v1. */
  image?: string;
}

export interface WalkSettings {
  /** false => the question text is hidden; only the 1/X/2 options are shown. */
  showQuestionText: boolean;
  printable: boolean;
  /** false => the tiebreaker (utslagsfråga) section is hidden and unused. */
  includeTiebreaker: boolean;
  /**
   * false => after submitting, participants don't see their score or the
   * leaderboard. Lets the organiser reveal answers and results together once
   * everyone has finished.
   */
  showResults: boolean;
}

export interface Tiebreaker {
  question: string;
}

/** The editable, participant-visible content of a walk. */
export interface WalkContent {
  title: string;
  settings: WalkSettings;
  questions: Question[];
  tiebreaker?: Tiebreaker;
}

export interface Walk extends WalkContent {
  id: string;
  status: WalkStatus;
  createdAt: number;
  publishedAt?: number;
  /** Timestamp of the most recent publish/update; advances on every re-publish. */
  lastPublishedAt?: number;
  /**
   * Frozen copy of the content participants actually see. Set on publish and
   * on every "update". The top-level content fields are the editable draft;
   * edits stay invisible to players until copied into this snapshot.
   */
  publishedSnapshot?: WalkContent;
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
