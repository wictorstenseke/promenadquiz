import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ auth: null, db: null, firebaseEnabled: false }));

import { currentUser, onAuthChange } from "./auth";

describe("auth wrapper without Firebase config", () => {
  it("currentUser is null", () => {
    expect(currentUser()).toBeNull();
  });

  it("onAuthChange immediately reports null and returns an unsubscribe", () => {
    let seen: unknown = "unset";
    const unsub = onAuthChange((u) => {
      seen = u;
    });
    expect(seen).toBeNull();
    expect(typeof unsub).toBe("function");
    unsub();
  });
});
