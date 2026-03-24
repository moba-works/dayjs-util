import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Force UTC to make timezone-dependent tests deterministic
    env: {
      TZ: "UTC",
    },
  },
});
