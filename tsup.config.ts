import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    event: "src/EventDateHandler.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["dayjs"],
  treeshake: true,
});
