import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type { Submission, Walk } from "../types";
import type { LeaderboardEntry, Storage } from "./Storage";

const WALKS = "walks";
const SUBMISSIONS = "submissions";

/**
 * Firestore is schemaless-but-strict about `undefined`: optional fields left
 * undefined make setDoc throw. A JSON round-trip drops them cleanly, and our
 * Walk/Submission shapes are plain JSON data with no Dates or class instances.
 */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The shared backend for published walks and participant submissions.
 *
 * It deliberately does NOT back drafts or the admin's walk list — without
 * accounts there's no per-user query, so those stay device-local (see
 * HybridStorage). listWalks here returns nothing on purpose.
 */
export class FirestoreStorage implements Storage {
  constructor(private db: Firestore) {}

  async listWalks(): Promise<Walk[]> {
    // No identity => no "my walks" query. Admin listing is localStorage's job.
    return [];
  }

  async getWalk(id: string): Promise<Walk | null> {
    const snap = await getDoc(doc(this.db, WALKS, id));
    return snap.exists() ? (snap.data() as Walk) : null;
  }

  async saveWalk(walk: Walk): Promise<void> {
    await setDoc(doc(this.db, WALKS, walk.id), plain(walk));
  }

  async deleteWalk(id: string): Promise<void> {
    await deleteDoc(doc(this.db, WALKS, id));
  }

  async saveSubmission(submission: Submission): Promise<void> {
    await setDoc(doc(this.db, SUBMISSIONS, submission.id), plain(submission));
  }

  async getLeaderboard(walkId: string): Promise<LeaderboardEntry[]> {
    const q = query(
      collection(this.db, SUBMISSIONS),
      where("walkId", "==", walkId),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as Submission);
    list.sort((a, b) => b.score - a.score || a.finishedAt - b.finishedAt);
    return list.map((submission, i) => ({ submission, rank: i + 1 }));
  }
}
