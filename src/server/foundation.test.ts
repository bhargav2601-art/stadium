import { describe, expect, it } from "vitest";
import { AppError, AuthError, ForbiddenError, publicError } from "./errors";
import { hashPassword, verifyPassword } from "./passwords";
import { rateLimit, resetRateLimits } from "./rate-limit";

describe("server foundation utilities", () => {
  it("hashes and verifies passwords with scrypt", async () => {
    const hash = await hashPassword("StadiumPass#2026");
    expect(hash).toContain(":");
    expect(await verifyPassword("StadiumPass#2026", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
    expect(await verifyPassword("anything", "malformed")).toBe(false);
  });

  it("enforces fixed-window rate limiting and resets after window", () => {
    resetRateLimits();
    const t0 = 1_000_000;
    expect(rateLimit("k1", 2, 10_000, t0).ok).toBe(true);
    expect(rateLimit("k1", 2, 10_000, t0 + 100).ok).toBe(true);
    const blocked = rateLimit("k1", 2, 10_000, t0 + 200);
    expect(blocked.ok).toBe(false);
    expect(rateLimit("k1", 2, 10_000, t0 + 10_001).ok).toBe(true);
  });

  it("formats public error messages safely", () => {
    expect(publicError(new AppError("Bad input", 400))).toBe("Bad input");
    expect(publicError(new AuthError())).toBe("Please sign in to continue.");
    expect(publicError(new ForbiddenError())).toBe("You do not have permission to do that.");
    expect(publicError(new Error("internal sql trace"))).toBe("Something went wrong. Please try again.");
  });
});
