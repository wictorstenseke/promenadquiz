import type { Submission, Walk } from "../types";
import type { LeaderboardEntry, Storage } from "./Storage";
import { LocalStorageStorage } from "./LocalStorageStorage";
import { FirestoreStorage } from "./FirestoreStorage";
import { db } from "../firebase";

/**
 * The POC persistence strategy: no accounts, accept that anyone with an id can
 * read/overwrite a published walk (revisit before real use — see the editor
 * auth-guard memory).
 *
 *   drafts (status "draft")     -> localStorage only (creator's device)
 *   published walks             -> Firestore, so other devices can fetch by id
 *   submissions / leaderboard   -> Firestore, so the leaderboard is shared
 *
 * With no Firebase config present, `remote` is null and every call degrades to
 * pure localStorage — the app still runs, just single-device.
 */
export class HybridStorage implements Storage {
  private local = new LocalStorageStorage();
  private remote = db ? new FirestoreStorage(db) : null;

  /** The admin's own walks live on their device (drafts + published). */
  async listWalks(): Promise<Walk[]> {
    return this.local.listWalks();
  }

  /** Creator's device has it locally; participants fall through to Firestore. */
  async getWalk(id: string): Promise<Walk | null> {
    const local = await this.local.getWalk(id);
    if (local) return local;
    return this.remote ? this.remote.getWalk(id) : null;
  }

  /** Always save the draft locally; mirror to Firestore once published. */
  async saveWalk(walk: Walk): Promise<void> {
    await this.local.saveWalk(walk);
    if (this.remote && walk.status === "published") {
      await this.remote.saveWalk(walk);
    }
  }

  async deleteWalk(id: string): Promise<void> {
    await this.local.deleteWalk(id);
    if (this.remote) {
      try {
        await this.remote.deleteWalk(id);
      } catch {
        // A draft never reached Firestore; a missing remote doc is fine.
      }
    }
  }

  /** Submissions are shared so the leaderboard works across devices. */
  async saveSubmission(submission: Submission): Promise<void> {
    if (this.remote) return this.remote.saveSubmission(submission);
    return this.local.saveSubmission(submission);
  }

  async getLeaderboard(walkId: string): Promise<LeaderboardEntry[]> {
    if (this.remote) return this.remote.getLeaderboard(walkId);
    return this.local.getLeaderboard(walkId);
  }
}
