import { describe, expect, test } from "vitest";
import { shortId, uid } from "./id";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

describe("shortId", () => {
  test("defaults to length 6", () => {
    expect(shortId()).toHaveLength(6);
  });

  test("honors the requested length", () => {
    expect(shortId(1)).toHaveLength(1);
    expect(shortId(20)).toHaveLength(20);
  });

  test("only uses unambiguous alphabet chars", () => {
    const id = shortId(1000);
    for (const ch of id) {
      expect(ALPHABET).toContain(ch);
    }
  });

  test("avoids ambiguous chars 0/1/i/l/o", () => {
    expect(shortId(1000)).not.toMatch(/[01ilo]/);
  });

  test("is reasonably unique across many calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(shortId());
    expect(ids.size).toBeGreaterThan(990);
  });
});

describe("uid", () => {
  test("returns a length-10 string", () => {
    expect(uid()).toHaveLength(10);
  });

  test("only uses alphabet chars", () => {
    for (const ch of uid()) {
      expect(ALPHABET).toContain(ch);
    }
  });
});
