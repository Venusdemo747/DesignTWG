import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("environment configuration", () => {
  it("uses development defaults", () => {
    expect(loadEnv({}).NODE_ENV).toBe("development");
  });

  it("rejects an invalid environment", () => {
    expect(() =>
      loadEnv({ NODE_ENV: "invalid" }),
    ).toThrow("Invalid environment configuration");
  });
});
