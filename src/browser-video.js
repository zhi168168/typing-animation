import { FFmpeg } from "@ffmpeg/ffmpeg";
import { dimensions, timeline, render } from "./engine.js";

// Single-threaded, self-hosted WebAssembly works without cross-origin isolation.
// Each export owns its worker, so cancellation also frees its frame memory.
export async function browserVideoExport(s, format, onProgress, signal) {
  signal.throwIfAborted();
  const encoder = new FFmpeg();
  const abort = () => encoder.terminate();
  signal.addEventListener("abort", abort, { once: true });
  try {
    const t = timeline(s);
    const frames = Math.ceil((t.duration / 1000) * s.fps);
    if (frames > 18000)
      throw new Error(
        "Video is too long. Shorten the text or increase typing speed (18,000 frames maximum).",
      );
    onProgress({ percent: 0, message: "Loading video encoder…" });
    await encoder.load({
      coreURL: new URL("/encoder/ffmpeg-core.js", window.location.origin).href,
      wasmURL: new URL("/encoder/ffmpeg-core.wasm", window.location.origin)
        .href,
    });
    signal.throwIfAborted();
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = dimensions(s);
    for (let i = 0; i < frames; i++) {
      signal.throwIfAborted();
      render(canvas, s, i === frames - 1 ? t.duration : (i * 1000) / s.fps, t);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Could not render video frame");
      await encoder.writeFile(
        `${String(i).padStart(6, "0")}.png`,
        new Uint8Array(await blob.arrayBuffer()),
      );
      onProgress({
        percent: Math.round(((i + 1) / frames) * 75),
        message: `Rendering frame ${i + 1} / ${frames}`,
      });
    }
    encoder.on("progress", ({ progress }) =>
      onProgress({
        percent: 75 + Math.round(Math.max(0, Math.min(1, progress)) * 24),
        message: "Encoding video…",
      }),
    );
    const args = ["-framerate", String(s.fps), "-i", "%06d.png"];
    if (format === "webm")
      args.push(
        "-c:v",
        "libvpx",
        "-pix_fmt",
        s.background === "transparent" ? "yuva420p" : "yuv420p",
        "-auto-alt-ref",
        "0",
        "-b:v",
        "2M",
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
        "ultrafast",
        "-movflags",
        "+faststart",
      );
    args.push("-threads", "1", `animation.${format}`);
    if ((await encoder.exec(args)) !== 0)
      throw new Error(
        "Video encoding failed. Try a lower resolution or shorter animation.",
      );
    signal.throwIfAborted();
    const data = await encoder.readFile(`animation.${format}`);
    return new Blob([data], {
      type: format === "mp4" ? "video/mp4" : "video/webm",
    });
  } catch (error) {
    signal.throwIfAborted();
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    encoder.terminate();
  }
}
