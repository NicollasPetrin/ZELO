import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// O projeto importa por "@/...", entao o alias do tsconfig precisa existir
// tambem no vitest para que os modulos sob teste resolvam suas dependencias.
const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/[\/]$/, "");

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
