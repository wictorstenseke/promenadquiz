import type { Submission, Walk } from "../types";
import type { LeaderboardEntry, Storage } from "./Storage";

const WALKS_KEY = "hosttipset.walks.v1";
const SUBS_KEY = "hosttipset.submissions.v1";

type WalkMap = Record<string, Walk>;
type SubMap = Record<string, Submission[]>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Device-local implementation of the Storage contract.
 *
 * Note (architectural reality): localStorage is bound to one browser on one
 * device. Real cross-device sharing and a shared leaderboard require a shared
 * backend — deliberately deferred to the Firebase phase. The contract above is
 * designed so that swap touches only ./index.ts.
 */
export class LocalStorageStorage implements Storage {
  async listWalks(): Promise<Walk[]> {
    const map = read<WalkMap>(WALKS_KEY, {});
    return Object.values(map).sort((a, b) => b.createdAt - a.createdAt);
  }

  async getWalk(id: string): Promise<Walk | null> {
    const map = read<WalkMap>(WALKS_KEY, {});
    return map[id] ?? null;
  }

  async saveWalk(walk: Walk): Promise<void> {
    const map = read<WalkMap>(WALKS_KEY, {});
    map[walk.id] = walk;
    write(WALKS_KEY, map);
  }

  async deleteWalk(id: string): Promise<void> {
    const map = read<WalkMap>(WALKS_KEY, {});
    delete map[id];
    write(WALKS_KEY, map);
    const subs = read<SubMap>(SUBS_KEY, {});
    delete subs[id];
    write(SUBS_KEY, subs);
  }

  async saveSubmission(submission: Submission): Promise<void> {
    const subs = read<SubMap>(SUBS_KEY, {});
    const list = subs[submission.walkId] ?? [];
    list.push(submission);
    subs[submission.walkId] = list;
    write(SUBS_KEY, subs);
  }

  async getLeaderboard(walkId: string): Promise<LeaderboardEntry[]> {
    const subs = read<SubMap>(SUBS_KEY, {});
    const list = [...(subs[walkId] ?? [])];
    list.sort((a, b) => b.score - a.score || a.finishedAt - b.finishedAt);
    return list.map((submission, i) => ({ submission, rank: i + 1 }));
  }
}
