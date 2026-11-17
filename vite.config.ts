import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const site = loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL?.replace(/\/$/, '') ?? '';
  return {
    plugins: [
      react(),
      {
        // one-page site: the sitemap only needs the root URL, generated from the same env value as the meta tags
        name: 'sitemap',
        apply: 'build',
        closeBundle() {
          if (!site) return;
          const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><changefreq>monthly</changefreq></url>\n</urlset>\n`;
          writeFileSync(resolve('dist/sitemap.xml'), xml);
          writeFileSync(resolve('dist/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
        },
      },
    ],
    build: {
      target: 'es2020',
      // three.js is one ~550 kB module (WebGLRenderer pulls in most of it); it is lazy-loaded after first paint
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // three.js and gsap change rarely: separate chunks stay cached across content updates
          manualChunks: (id: string) =>
            id.includes('node_modules/three') ? 'three' : id.includes('node_modules/gsap') ? 'gsap' : undefined,
        },
      },
    },
  };
});
