import { defineConfig } from "vitest/config";

import { alias } from "./vite.config.ts";

export default defineConfig({
  resolve: { alias },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tooling/**/*.test.ts"],
  },
});
