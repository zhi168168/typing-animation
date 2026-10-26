import express from "express";
import { createServer as createViteServer, loadEnv } from "vite";
import { siteURL, applySiteMetadata, robots, sitemap } from "./seo.mjs";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { accountConfig } from "./accounts/config.mjs";
import { createAccounts } from "./accounts/auth.mjs";
import { mountAccounts } from "./accounts/http.mjs";
import { exportAccess } from "./accounts/export-access.mjs";
import { createBilling } from "./billing/service.mjs";
import { mountBilling } from "./billing/http.mjs";
const ffmpeg = createRequire(import.meta.url).resolve(
  "@ffmpeg-installer/win32-x64/ffmpeg.exe",
);
const app = express(),
  jobs = new Map(),
  root = process.cwd();
const production = process.argv.includes("--production");
const env = loadEnv(production ? "production" : "development", root, "");
const builtConfig = production
  ? JSON.parse(
      await readFile(path.join(root, "dist", "site-config.json"), "utf8").catch(
        () => "{}",
      ),
    )
  : {};
const origin = siteURL(
  process.env.SITE_URL || env.SITE_URL || builtConfig.siteURL || "",
);
const accountSettings = accountConfig({ ...env, ...process.env });
const accountService = accountSettings
  ? await createAccounts(accountSettings)
  : null;
mountAccounts(app, accountSettings, accountService);
const billing = createBilling(accountService, accountSettings, {
  ...env,
  ...process.env,
});
if (billing && accountSettings.local) await billing.store.migrate();
mountBilling(app, accountService, accountSettings, billing);
app.get("/robots.txt", (req, res) =>
  res.type("text/plain").send(robots(origin)),
);
app.get("/sitemap.xml", (req, res) => {
  if (!origin)
    return res
      .status(404)
      .type("text/plain")
      .send("Set SITE_URL to enable the sitemap.");
  res.type("application/xml").send(sitemap(origin));
});
app.get("/index.html", (req, res) => res.redirect(301, "/"));
app.get(/^\/account(?:\/|\.html)$/, (req, res) =>
  res.redirect(
    301,
    `/account${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`,
  ),
);
app.get(/^\/editor(?:\/|\.html)$/, (req, res) => {
  res.redirect(
    301,
    `/editor${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`,
  );
});
app.use("/api/exports", exportAccess(accountService, jobs, billing));
app.use(express.json({ limit: "1mb" }));
app.post("/api/exports", async (req, res) => {
  const { fps, format, width, height, frames, transparent } = req.body;
  if (
    ![24, 30, 60].includes(fps) ||
    !["webm", "mp4"].includes(format) ||
    ![width, height].every(
      (v) => Number.isInteger(v) && v >= 100 && v <= 3840,
    ) ||
    !Number.isInteger(frames) ||
    frames < 1 ||
    frames > 18000 ||
    (transparent && format !== "webm")
  )
    return res.status(400).json({ error: "Unsupported export settings" });
  const id = randomUUID(),
    dir = path.join(root, "work", "exports", id);
  await mkdir(dir, { recursive: true });
  jobs.set(id, {
    id,
    userId: req.exportUserId,
    dir,
    fps,
    format,
    width,
    height,
    frames,
    transparent,
    received: 0,
    status: "frames",
    created: Date.now(),
  });
  res.json({ id });
});
app.put(
  "/api/exports/:id/frames/:index",
  express.raw({ type: "image/png", limit: "16mb" }),
  async (req, res) => {
    const j = jobs.get(req.params.id),
      i = Number(req.params.index);
    if (
      !j ||
      j.status !== "frames" ||
      i !== j.received ||
      i >= j.frames ||
      !Buffer.isBuffer(req.body) ||
      req.body.length < 24 ||
      req.body.readUInt32BE(0) !== 0x89504e47 ||
      req.body.readUInt32BE(16) !== j.width ||
      req.body.readUInt32BE(20) !== j.height
    )
      return res.status(400).json({ error: "Invalid frame data" });
    await writeFile(
      path.join(j.dir, `${String(i).padStart(6, "0")}.png`),
      req.body,
    );
    j.received++;
    res.json({ ok: true });
  },
);
app.put(
  "/api/exports/:id/audio",
  express.raw({ type: "audio/wav", limit: "80mb" }),
  async (req, res) => {
    const j = jobs.get(req.params.id),
      wav = req.body;
    const expected = j ? Math.ceil(((j.frames * 1000) / j.fps) * 48) * 2 : 0;
    if (
      !j ||
      j.status !== "frames" ||
      !Buffer.isBuffer(wav) ||
      wav.length !== expected + 44 ||
      wav.toString("ascii", 0, 4) !== "RIFF" ||
      wav.toString("ascii", 8, 12) !== "WAVE" ||
      wav.readUInt16LE(20) !== 1 ||
      wav.readUInt16LE(22) !== 1 ||
      wav.readUInt32LE(24) !== 48000 ||
      wav.readUInt16LE(34) !== 16 ||
      wav.readUInt32LE(40) !== expected
    )
      return res.status(400).json({ error: "Invalid keyboard audio" });
    await writeFile(path.join(j.dir, "keyboard.wav"), wav);
    j.audio = true;
    res.json({ ok: true });
  },
);
app.post("/api/exports/:id/encode", (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j || j.received !== j.frames || j.status !== "frames")
    return res.status(400).json({ error: "Animation frames are not ready" });
  j.status = "encoding";
  j.progress = 0;
  const args = [
    "-y",
    "-framerate",
    String(j.fps),
    "-i",
    path.join(j.dir, "%06d.png"),
  ];
  if (j.audio)
    args.push(
      "-i",
      path.join(j.dir, "keyboard.wav"),
      "-c:a",
      j.format === "mp4" ? "aac" : "libopus",
      "-b:a",
      "128k",
    );
  if (j.format === "webm")
    args.push(
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      j.transparent ? "yuva420p" : "yuv420p",
      "-auto-alt-ref",
      "0",
      "-b:v",
      "0",
      "-crf",
      "28",
      "-deadline",
      "realtime",
      "-cpu-used",
      "6",
    );
  else
    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-preset",
      "fast",
      "-movflags",
      "+faststart",
    );
  args.push("-progress", "pipe:1", path.join(j.dir, `animation.${j.format}`));
  let child;
  try {
    child = spawn(ffmpeg, args, { windowsHide: true });
  } catch (e) {
    j.status = "error";
    j.error = e.message;
    return res
      .status(500)
      .json({ error: "Video encoder could not start. Please try again." });
  }
  j.child = child;
  let error = "";
  child.stdout.on("data", (b) => {
    let m = String(b).match(/frame=(\d+)/);
    if (m)
      j.progress = Math.min(99, Math.round((Number(m[1]) / j.frames) * 100));
  });
  child.stderr.on("data", (b) => {
    error = (error + String(b)).slice(-3000);
  });
  child.on("error", (e) => {
    j.status = "error";
    j.error = e.message;
  });
  child.on("exit", (code) => {
    if (j.status === "cancelled") return;
    j.status = code === 0 ? "done" : "error";
    j.error = code === 0 ? null : error;
    j.progress = code === 0 ? 100 : j.progress;
  });
  res.json({ ok: true });
});
app.get("/api/exports/:id", (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: "Export job not found" });
  res.json({
    status: j.status,
    progress: j.progress || 0,
    error:
      j.status === "error" ? "Video encoding failed. Please try again." : null,
  });
});
app.get("/api/exports/:id/file", async (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j || j.status !== "done") return res.status(404).end();
  try {
    if (!billing || !(await billing.store.consume(req.exportUserId, j.id)))
      return res
        .status(402)
        .json({ error: "Choose a download plan to continue" });
    j.paid = true;
  } catch {
    return res.status(503).json({ error: "Payment service is unavailable" });
  }
  res.download(
    path.join(j.dir, `animation.${j.format}`),
    `typing-animation.${j.format}`,
  );
});
app.delete("/api/exports/:id", async (req, res) => {
  const j = jobs.get(req.params.id);
  if (j) {
    j.status = "cancelled";
    j.child?.kill();
    jobs.delete(j.id);
    setTimeout(
      () => rm(j.dir, { recursive: true, force: true }).catch(() => {}),
      1000,
    );
  }
  res.json({ ok: true });
});
setInterval(() => {
  for (const [id, j] of jobs)
    if (Date.now() - j.created > 3600000) {
      j.child?.kill();
      jobs.delete(id);
      rm(j.dir, { recursive: true, force: true }).catch(() => {});
    }
}, 600000).unref();
app.use((err, req, res, next) => {
  console.error(err.message);
  if (!res.headersSent)
    res.status(500).json({ error: "Export service error. Please try again." });
});
if (production) {
  const html = applySiteMetadata(
    await readFile(path.join(root, "dist", "index.html"), "utf8"),
    origin,
  );
  app.get("/", (req, res) => res.type("html").send(html));
  const editorHtml = applySiteMetadata(
    await readFile(path.join(root, "dist", "editor.html"), "utf8"),
    origin,
    "/editor",
  );
  app.get("/editor", (req, res) => res.type("html").send(editorHtml));
  const accountHtml = applySiteMetadata(
    await readFile(path.join(root, "dist", "account.html"), "utf8"),
    origin,
    "/account",
  );
  app.get("/account", (req, res) => res.type("html").send(accountHtml));
  app.use(express.static(path.join(root, "dist"), { index: false }));
} else {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      watch: { ignored: ["**/work/**", "**/outputs/**"] },
    },
    appType: "custom",
  });
  app.get(["/", "/editor", "/account"], async (req, res, next) => {
    try {
      const editorPage = req.path === "/editor";
      const accountPage = req.path === "/account";
      const html = await readFile(
        path.join(
          root,
          editorPage
            ? "editor.html"
            : accountPage
              ? "account.html"
              : "index.html",
        ),
        "utf8",
      );
      res
        .type("html")
        .send(
          await vite.transformIndexHtml(
            editorPage
              ? "/editor.html"
              : accountPage
                ? "/account.html"
                : req.originalUrl,
            applySiteMetadata(
              html,
              origin,
              editorPage ? "/editor" : accountPage ? "/account" : "/",
            ),
          ),
        );
    } catch (error) {
      next(error);
    }
  });
  app.use(vite.middlewares);
}
app.use((req, res) =>
  res
    .status(404)
    .set("X-Robots-Tag", "noindex")
    .type("html")
    .send(
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Typing Animation</title><h1>Page not found</h1><p><a href="/">Open the typing animation generator</a></p></html>',
    ),
);
const port = Number(process.env.PORT || 3000);
app.listen(port, "127.0.0.1", () =>
  console.log(`Typing Animation ready: http://localhost:${port}`),
);
