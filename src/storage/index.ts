import { HybridStorage } from "./HybridStorage";
import { currentUser } from "../auth";

/**
 * The one place the backend is chosen. HybridStorage keeps drafts on-device and
 * syncs the signed-in user's walks to Firestore; it degrades to pure
 * localStorage when no Firebase config is present.
 */
// getUid reads the live auth user on every call. Firebase restores the session
// asynchronously, so the very first listWalks() on a cold load may see null and
// return local-only — HomePage re-fetches on the [user] change once auth
// resolves, so cloud walks appear a moment later.
export const storage = new HybridStorage({
  getUid: () => currentUser()?.uid ?? null,
});

export type { Storage, LeaderboardEntry } from "./Storage";
