import type { Submission, Walk } from "../types";
import type { LeaderboardEntry, RemoteStorage, Storage } from "./Storage";
import { LocalStorageStorage } from "./LocalStorageStorage";
import { FirestoreStorage } from "./FirestoreStorage";
import { db } from "../firebase";

/** Dedupe two walk lists by id (newer `updatedAt` wins), newest `createdAt` first. */
export function mergeWalks(local: Walk[], cloud: Walk[]): Walk[] {
  const byId = new Map<string, Walk>();
  for (const w of [...local, ...cloud]) {
    const prev = byId.get(w.id);
    if (!prev || (w.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) byId.set(w.id, w);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export interface HybridDeps {
  local?: Storage;
  remote?: RemoteStorage | null;
  /** Returns the signed-in uid, or null when signed out / auth disabled. */
  getUid?: () => string | null;
}

/**
 * Auth-aware persistence.
 *
 *   signed out  -> drafts local-only; published walks mirrored to cloud by id
 *                  (today's behaviour; anonymous, no ownerId)
 *   signed in   -> every save stamped with ownerId + updatedAt and written to
 *                  both local and cloud (drafts included); listWalks merges the
 *                  owner's cloud walks in, so they appear on every device.
 *
 * With no Firebase config, `remote` is null and everything degrades to local.
 */
export class HybridStorage implements Storage {
  private local: Storage;
  private remote: RemoteStorage | null;
  private getUid: () => string | null;

  constructor(deps: HybridDeps = {}) {
    this.local = deps.local ?? new LocalStorageStorage();
    this.remote = deps.remote ?? (db ? new FirestoreStorage(db) : null);
    this.getUid = deps.getUid ?? (() => null);
  }

  async listWalks(): Promise<Walk[]> {
    const local = await this.local.listWalks();
    const uid = this.getUid();
    if (!this.remote || !uid) return local;
    try {
      const cloud = await this.remote.listWalksByOwner(uid);
      return mergeWalks(local, cloud);
    } catch {
      return local; // offline / query failure: don't blank the list
    }
  }

  async getWalk(id: string): Promise<Walk | null> {
    const local = await this.local.getWalk(id);
    if (local) return local;
    return this.remote ? this.remote.getWalk(id) : null;
  }

  async saveWalk(walk: Walk): Promise<void> {
    const uid = this.getUid();
    if (this.remote && uid) {
      const owned: Walk = { ...walk, ownerId: walk.ownerId ?? uid, updatedAt: Date.now() };
      await this.local.saveWalk(owned);
      await this.tryRemote(() => this.remote!.saveWalk(owned));
      return;
    }
    const stamped: Walk = { ...walk, updatedAt: Date.now() };
    await this.local.saveWalk(stamped);
    if (this.remote && stamped.status === "published") {
      await this.tryRemote(() => this.remote!.saveWalk(stamped));
    }
  }

  async deleteWalk(id: string): Promise<void> {
    await this.local.deleteWalk(id);
    if (this.remote) await this.tryRemote(() => this.remote!.deleteWalk(id));
  }

  async saveSubmission(submission: Submission): Promise<void> {
    if (this.remote) return this.remote.saveSubmission(submission);
    return this.local.saveSubmission(submission);
  }

  async getLeaderboard(walkId: string): Promise<LeaderboardEntry[]> {
    if (this.remote) return this.remote.getLeaderboard(walkId);
    return this.local.getLeaderboard(walkId);
  }

  /** Claim every unowned local walk for `uid` and push it to the cloud. Idempotent. */
  async adoptLocalWalks(uid: string): Promise<void> {
    if (!this.remote) return;
    const locals = await this.local.listWalks();
    for (const w of locals) {
      if (w.ownerId) continue;
      const owned: Walk = { ...w, ownerId: uid, updatedAt: Date.now() };
      await this.local.saveWalk(owned);
      await this.tryRemote(() => this.remote!.saveWalk(owned));
    }
  }

  /** Cloud writes must never lose the local save; a failure is logged, not thrown. */
  private async tryRemote(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      console.warn("[storage] cloud write failed; kept local copy", e);
    }
  }
}
