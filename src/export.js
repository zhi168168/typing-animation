import { dimensions, timeline, render } from "./engine";
import engineSource from "./engine.js?raw";
import { ensureFonts, embeddedFontCSS, selectedFont } from "./font-loader.js";
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function htmlExport(s) {
  const fontCSS = await embeddedFontCSS(s);
  const source = engineSource.replaceAll("export ", "");
  const config = JSON.stringify(s).replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Typeflow animation</title><style>${fontCSS}html,body{margin:0;width:100%;height:100%;display:grid;place-items:center;background:transparent}canvas{max-width:100%;max-height:100vh;object-fit:contain}</style><canvas aria-label="Typing animation"></canvas><script>${source}\nconst s=${config};const canvas=document.querySelector('canvas');[canvas.width,canvas.height]=dimensions(s);const t=timeline(s);let start;function frame(now){start??=now;const elapsed=now-start;render(canvas,s,s.loop?elapsed%t.duration:Math.min(elapsed,t.duration),t);if(s.loop||elapsed<t.duration)requestAnimationFrame(frame)}Promise.all([${JSON.stringify(selectedFont(s).face)},'TF Noto Sans SC'].map(f=>document.fonts.load((s.italic?'italic ':'normal ')+s.weight+' 32px '+JSON.stringify(f),s.text||'Aa'))).then(()=>requestAnimationFrame(frame)).catch(()=>{document.body.textContent='Unable to load embedded fonts.'});<\/script></html>`;
  download(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    "typeflow.html",
  );
}
export async function pngExport(s, ms) {
  await ensureFonts(s);
  const c = document.createElement("canvas");
  [c.width, c.height] = dimensions(s);
  render(c, s, ms);
  c.toBlob((b) => download(b, "typeflow.png"));
}
async function request(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) {
    let d = await r.json().catch(() => ({}));
    throw new Error(d.error || "Could not connect to the export service");
  }
  return r.json();
}
export async function videoExport(s, format, onProgress, signal) {
  await ensureFonts(s);
  if (__BROWSER_VIDEO_EXPORT__) {
    const { browserVideoExport } = await import("./browser-video.js");
    const blob = await browserVideoExport(s, format, onProgress, signal);
    download(blob, `typeflow.${format}`);
    return;
  }
  const [width, height] = dimensions(s),
    t = timeline(s),
    frames = Math.ceil((t.duration / 1000) * s.fps);
  if (frames > 18000)
    throw new Error(
      "Video is too long. Shorten the text or increase typing speed (18,000 frames maximum).",
    );
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  let id;
  try {
    const job = await request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        width,
        height,
        fps: s.fps,
        format,
        frames,
        transparent: s.background === "transparent",
      }),
      signal,
    });
    id = job.id;
    for (let i = 0; i < frames; i++) {
      signal.throwIfAborted();
      render(c, s, i === frames - 1 ? t.duration : (i * 1000) / s.fps, t);
      const blob = await new Promise((resolve) =>
        c.toBlob(resolve, "image/png"),
      );
      await request(`/api/exports/${id}/frames/${i}`, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: blob,
        signal,
      });
      onProgress({
        percent: Math.round(((i + 1) / frames) * 75),
        message: `Rendering frame ${i + 1} / ${frames}`,
      });
    }
    await request(`/api/exports/${id}/encode`, { method: "POST", signal });
    for (;;) {
      signal.throwIfAborted();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = await request(`/api/exports/${id}`, { signal });
      if (result.status === "error") throw new Error(result.error);
      onProgress({
        percent: 75 + Math.round(result.progress * 0.25),
        message: "Encoding video…",
      });
      if (result.status === "done") break;
    }
    const r = await fetch(`/api/exports/${id}/file`, { signal });
    if (!r.ok) throw new Error("File download failed");
    download(await r.blob(), `typeflow.${format}`);
  } finally {
    if (id)
      await fetch(`/api/exports/${id}`, { method: "DELETE" }).catch(() => {});
  }
}
