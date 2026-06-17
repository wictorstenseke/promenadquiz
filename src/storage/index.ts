import { HybridStorage } from "./HybridStorage";
import type { Storage } from "./Storage";

/**
 * The one place the backend is chosen. HybridStorage keeps drafts on-device and
 * pushes published walks + submissions to Firestore; it degrades to pure
 * localStorage when no Firebase config is present.
 */
export const storage: Storage = new HybridStorage();

export type { Storage, LeaderboardEntry } from "./Storage";
