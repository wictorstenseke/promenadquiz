import type { Progress } from "../types";

/**
 * Participant's in-progress answers are ALWAYS persisted to localStorage,
 * independent of which Storage backend is active. This module stays even after
 * Firebase is wired in — it protects against the tab being closed mid-walk.
 */
const key = (walkId: string) => `hosttipset.progress.v1.${walkId}`;

export function loadProgress(walkId: string): Progress | null {
  try {
    const raw = localStorage.getItem(key(walkId));
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(
    key(progress.walkId),
    JSON.stringify({ ...progress, updatedAt: Date.now() }),
  );
}

export function clearProgress(walkId: string): void {
  localStorage.removeItem(key(walkId));
}
