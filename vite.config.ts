import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export const alias = {
  "~": path.resolve(import.meta.dirname, "./src"),
  // The real apps import these as packages. Here they live in src, under
  // the same names, so code moves between the two unchanged.
  "@dcb/ui": path.resolve(import.meta.dirname, "./src/ui"),
  "@dcb/money": path.resolve(import.meta.dirname, "./src/money"),
  "@dcb/phone": path.resolve(import.meta.dirname, "./src/phone"),
};

export default defineConfig({
  plugins: [
    // Reads src/routes and writes src/routeTree.gen.ts. It has to run before
    // the React plugin, which compiles the files it rewrites.
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias },
  server: { port: 5180 },
});
