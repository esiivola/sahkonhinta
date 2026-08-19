import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const SITE_URL = "https://esiivola.github.io/sahkonhinta/";

/**
 * Emit a one-URL sitemap.xml at build time so <lastmod> is always the deploy
 * date (the CI job rebuilds on every data refresh). Kept out of public/ so no
 * stale date is ever committed.
 */
function sitemap(): Plugin {
  return {
    name: "emit-sitemap",
    generateBundle() {
      const lastmod = new Date().toISOString().slice(0, 10);
      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n` +
        `    <loc>${SITE_URL}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>hourly</changefreq>\n` +
        `    <priority>1.0</priority>\n` +
        `  </url>\n` +
        `</urlset>\n`;
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: xml });
    },
  };
}

// Project is served from GitHub project Pages at /sahkonhinta/.
// Override with VITE_BASE if the repo name differs.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/sahkonhinta/",
  plugins: [react(), sitemap()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
