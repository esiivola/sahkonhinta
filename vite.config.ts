import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project is served from GitHub project Pages at /sahkonhinta/.
// Override with VITE_BASE if the repo name differs.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/sahkonhinta/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
