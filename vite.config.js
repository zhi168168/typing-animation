import { defineConfig, loadEnv } from "vite";
import { siteURL, applySiteMetadata, robots, sitemap } from "./seo.mjs";
import { createRequire } from "node:module";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const origin = siteURL(process.env.SITE_URL || env.SITE_URL || "");
  const preview = process.env.VERCEL_ENV === "preview";
  return {
    define: {
      __BROWSER_VIDEO_EXPORT__: JSON.stringify(
        process.env.VERCEL === "1" ||
          process.env.BROWSER_VIDEO_EXPORT === "true",
      ),
    },
    build: {
      rollupOptions: {
        input: {
          main: "index.html",
          editor: "editor.html",
          account: "account.html",
        },
      },
    },
    plugins: [
      {
        name: "typeflow-browser-encoder",
        async writeBundle() {
          const core = createRequire(import.meta.url).resolve("@ffmpeg/core");
          await mkdir("dist/encoder", { recursive: true });
          for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
            await copyFile(
              path.join(path.dirname(core), "../esm", file),
              `dist/encoder/${file}`,
            );
          }
        },
      },
      {
        name: "typeflow-seo",
        transformIndexHtml: (html, context) => {
          const result = applySiteMetadata(
            html,
            origin,
            context.filename?.endsWith("editor.html")
              ? "/editor"
              : context.filename?.endsWith("account.html")
                ? "/account"
                : "/",
          );
          return preview
            ? result
                .replace(/<meta\s+name="robots"[^>]*>/g, "")
                .replace(
                  "</head>",
                  '<meta name="robots" content="noindex, nofollow"></head>',
                )
            : result;
        },
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "robots.txt",
            source: preview ? "User-agent: *\nDisallow: /\n" : robots(origin),
          });
          this.emitFile({
            type: "asset",
            fileName: "site-config.json",
            source: JSON.stringify({ siteURL: origin }),
          });
          if (origin && !preview)
            this.emitFile({
              type: "asset",
              fileName: "sitemap.xml",
              source: sitemap(origin),
            });
        },
      },
    ],
  };
});
