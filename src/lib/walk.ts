import type { Walk, WalkContent } from "../types";

/** Pull the editable content (the draft) out of a walk. */
export function walkContent(walk: WalkContent): WalkContent {
  return {
    title: walk.title,
    settings: walk.settings,
    questions: walk.questions,
    tiebreaker: walk.tiebreaker,
  };
}

/**
 * The content participants should see: the frozen published snapshot when one
 * exists, otherwise the current draft (used for organiser previews of an
 * unpublished walk).
 */
export function liveContent(walk: Walk): WalkContent {
  return walk.publishedSnapshot ?? walkContent(walk);
}

/** A Walk whose content fields are the live (published) version. Same id/status. */
export function liveWalk(walk: Walk): Walk {
  return { ...walk, ...liveContent(walk) };
}

/** Draft differs from what was last published — there are unpublished edits. */
export function hasPendingChanges(walk: Walk): boolean {
  if (walk.status !== "published" || !walk.publishedSnapshot) return false;
  return (
    JSON.stringify(walkContent(walk)) !== JSON.stringify(walk.publishedSnapshot)
  );
}
