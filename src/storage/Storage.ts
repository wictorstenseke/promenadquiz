import type { Submission, Walk } from "../types";

export interface LeaderboardEntry {
  submission: Submission;
  rank: number;
}

/**
 * The single, stable persistence contract for the whole app.
 *
 * v1 ships a localStorage implementation. A Firebase implementation is added
 * later and swapped in at exactly one place (see ./index.ts) without the UI
 * being aware of which backend is active. Keep this surface small.
 */
export interface Storage {
  listWalks(): Promise<Walk[]>;
  getWalk(id: string): Promise<Walk | null>;
  /** Create-or-update. Used for draft autosave and ongoing edits. */
  saveWalk(walk: Walk): Promise<void>;
  deleteWalk(id: string): Promise<void>;

  saveSubmission(submission: Submission): Promise<void>;
  /** Sorted: highest score first, earliest finish breaks ties. */
  getLeaderboard(walkId: string): Promise<LeaderboardEntry[]>;
}

/** A backend that can list a single owner's walks (needs identity). */
export interface RemoteStorage extends Storage {
  listWalksByOwner(uid: string): Promise<Walk[]>;
}
