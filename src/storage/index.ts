import { LocalStorageStorage } from "./LocalStorageStorage";
import type { Storage } from "./Storage";

/**
 * The one place the backend is chosen. Swap this line for a FirebaseStorage
 * instance later — nothing in the UI changes.
 */
export const storage: Storage = new LocalStorageStorage();

export type { Storage, LeaderboardEntry } from "./Storage";
