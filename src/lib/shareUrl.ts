/** Full participant play link. HashRouter + GitHub Pages base path:
 *  origin + base + "#/p/:id" (same shape SharePage has always used). */
export function playUrl(walkId: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/p/${walkId}`;
}

/** Host + base path with the scheme dropped and any trailing slash removed —
 *  a short, typeable address for the print fallback. Pure for testability. */
export function cleanJoinUrl(host: string, base: string): string {
  return `${host}${base}`.replace(/\/+$/, "");
}

/** Clean join address for the current deployment, e.g.
 *  "wictorstenseke.github.io/promenadquiz". */
export function joinDisplayUrl(): string {
  return cleanJoinUrl(window.location.host, import.meta.env.BASE_URL);
}
