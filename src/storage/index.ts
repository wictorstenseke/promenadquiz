import { HybridStorage } from "./HybridStorage";
import { currentUser } from "../auth";

/**
 * The one place the backend is chosen. HybridStorage keeps drafts on-device and
 * syncs the signed-in user's walks to Firestore; it degrades to pure
 * localStorage when no Firebase config is present.
 */
export const storage = new HybridStorage({
  getUid: () => currentUser()?.uid ?? null,
});

export type { Storage, LeaderboardEntry } from "./Storage";
