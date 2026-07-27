import { describe, expect, it } from "vitest";
import { validateCredentials } from "@/lib/auth";

describe("validateCredentials", () => {
  it("returns true for the correct credentials", () => {
    expect(validateCredentials("user", "password")).toBe(true);
  });

  it("returns false for an incorrect password", () => {
    expect(validateCredentials("user", "wrong")).toBe(false);
  });

  it("returns false for an incorrect username", () => {
    expect(validateCredentials("wrong", "password")).toBe(false);
  });
});
