import { describe, expect, it } from "vitest";
import { parseGoogleImageEnv } from "../agent/serverEnv";

describe("server env validation", () => {
  it("fails without required Google env vars", () => {
    expect(() => parseGoogleImageEnv({})).toThrow(/GOOGLE_API_KEY/);
  });

  it("parses when required vars exist", () => {
    const env = parseGoogleImageEnv({
      GOOGLE_API_KEY: "abc123",
      GOOGLE_IMAGE_MODEL: "models/nano-banana-v1",
    });

    expect(env.GOOGLE_API_KEY).toBe("abc123");
    expect(env.GOOGLE_IMAGE_MODEL).toContain("nano-banana");
  });
});
