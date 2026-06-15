/** Short, URL-friendly, human-shareable id (no ambiguous chars). */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function shortId(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function uid(): string {
  return shortId(10);
}
