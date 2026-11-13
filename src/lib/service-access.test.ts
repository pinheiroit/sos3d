import { describe, expect, it } from "vitest";
import { canManageService } from "./service-access";

describe("service management access", () => {
  it("allows administrators", () => expect(canManageService(["admin"])).toBe(true));
  it("allows sellers without relying on an additional admin role", () => expect(canManageService(["seller"])).toBe(true));
  it("does not grant clients or members staff access", () => {
    expect(canManageService([])).toBe(false);
    expect(canManageService(["member"])).toBe(false);
  });
});