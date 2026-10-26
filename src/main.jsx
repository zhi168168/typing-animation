import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Check,
  Download,
  Type,
  SlidersHorizontal,
  MousePointer2,
  Palette,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  LayoutGrid,
  Sun,
  Moon,
  X,
  Code2,
  Film,
  Image,
  FolderOpen,
  Save,
  Keyboard,
  Volume2,
  VolumeX,
  HelpCircle,
  Loader2,
} from "lucide-react";
import {
  defaults,
  dimensions,
  timeline,
  render,
  graphemes,
  validateProject,
  visibleCount,
} from "./engine";
import { download, htmlExport, pngExport, videoExport } from "./export";
import {
  loadKeySounds,
  playKeyClick,
  stopKeySounds,
  soundOptions,
  defaultSound,
} from "./audio.js";
import "./styles.css";
import "./studio.css";
import "./landing.css";
import "./brand.css";
import { HeroDemo } from "./HeroDemo.jsx";
import { landingDemos } from "./landing-demos.js";
import { ensureFonts } from "./font-loader.js";
import { TemplateGallery } from "./TemplateGallery";
import { Button } from "./controls";
import { SettingsPanel } from "./SettingsPanel";
import { AccountLink, AccountPage } from "./Account";
import { requireDownloadSession } from "./download-access.js";
import { requireDownloadPayment } from "./billing.js";
import { BillingPanel } from "./BillingPanel.jsx";

function pendingDownload() {
  try {
    const pending = JSON.parse(
      sessionStorage.getItem("typeflow-pending-download"),
    );
    return pending &&
      Date.now() - pending.created < 60 * 60 * 1000 &&
      ["webm", "mp4", "html", "png", "project"].includes(pending.format)
      ? pending
      : null;
  } catch {
    return null;
  }
}

function load() {
  const demoId = new URLSearchParams(window.location.search).get("demo");
  const demo = landingDemos.find((item) => item.id === demoId);
  if (demo && !pendingDownload()) return validateProject(demo.settings);
  try {
    const saved = JSON.parse(localStorage.getItem("typeflow-project"));
    // Upgrade the previous starter copy without replacing authored projects.
    if (saved?.text === "hello" || saved?.text === defaults.text)
      return validateProject({ ...saved, text: defaults.text, loop: true });
    return validateProject(saved || defaults);
  } catch {
    return defaults;
  }
}
const timeLabel = (ms) =>
  `${Math.floor(ms / 60000)}:${((ms / 1000) % 60).toFixed(2).padStart(5, "0")}`;
function App() {
  const [pending] = useState(pendingDownload);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (landingDemos.some((demo) => demo.id === url.searchParams.get("demo"))) {
      url.searchParams.delete("demo");
      window.history.replaceState(null, "", url);
    }
  }, []);
  useEffect(() => {
    sessionStorage.removeItem("typeflow-pending-download");
  }, []);
  useEffect(() => {
    const templateLinks = [
      ...document.querySelectorAll("[data-open-templates]"),
    ];
    const showTemplates = (event) => {
      event.preventDefault();
      setModal("templates");
    };
    templateLinks.forEach((link) =>
      link.addEventListener("click", showTemplates),
    );
    return () =>
      templateLinks.forEach((link) =>
        link.removeEventListener("click", showTemplates),
      );
  }, []);
  const [soundPack, setSoundPack] = useState(() => {
    // Apply the updated default once; remember subsequent manual choices.
    if (localStorage.getItem("typeflow-sound-default") !== defaultSound)
      return defaultSound;
    const saved = localStorage.getItem("typeflow-sound-pack");
    return soundOptions.some((option) => option.id === saved)
      ? saved
      : defaultSound;
  });
  const [soundLoading, setSoundLoading] = useState(false);
  const [fontState, setFontState] = useState({ key: "", error: "" });
  const [s, setS] = useState(load),
    [ms, setMs] = useState(() =>
      Number.isFinite(pending?.ms) ? pending.ms : 0,
    ),
    [playing, setPlaying] = useState(!pending),
    [panel, setPanel] = useState("text"),
    [modal, setModal] = useState(() =>
      new URLSearchParams(window.location.search).get("templates") === "1"
        ? "templates"
        : pending && pending.format !== "project"
          ? "export"
          : null,
    ),
    [theme, setTheme] = useState(
      () => localStorage.getItem("typeflow-theme") || "dark",
    ),
    [toast, setToast] = useState(""),
    [format, setFormat] = useState(
      pending && pending.format !== "project" ? pending.format : "webm",
    ),
    [progress, setProgress] = useState(null),
    [recording, setRecording] = useState(false),
    [sound, setSound] = useState(
      () => localStorage.getItem("typeflow-sound") !== "false",
    );
  const canvas = useRef(null),
    file = useRef(null),
    abort = useRef(null),
    recordRef = useRef({ last: 0, times: [], text: "" }),
    audio = useRef(null),
    previousCount = useRef(0),
    dialog = useRef(null),
    previousProject = useRef(s);
  const t = useMemo(() => timeline(s), [s]),
    dims = dimensions(s);
  const fontKey = JSON.stringify([s.font, s.weight, s.italic, s.text]);
  const fontsReady = fontState.key === fontKey && !fontState.error;
  useEffect(() => {
    let active = true;
    ensureFonts(s)
      .then(() => {
        if (active) setFontState({ key: fontKey, error: "" });
      })
      .catch(() => {
        if (active)
          setFontState({
            key: fontKey,
            error: "Fonts could not load. Please refresh and try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [fontKey]);
  const update = (key, value) => {
    setPlaying(false);
    setS((old) => ({
      ...old,
      [key]: value,
      ...(key === "text" ? { recorded: null } : {}),
    }));
  };
  const notify = (msg) => setToast(msg);
  function downloadError(error, requestedFormat = format) {
    if (error.code === "PAYMENT_REQUIRED") {
      setModal("export");
      notify(error.message);
      return;
    }
    if (error.code === "SIGN_IN_REQUIRED") {
      try {
        localStorage.setItem("typeflow-project", JSON.stringify(s));
        sessionStorage.setItem(
          "typeflow-pending-download",
          JSON.stringify({
            format: requestedFormat,
            ms,
            created: Date.now(),
          }),
        );
        window.location.assign(
          "/account?view=login&returnTo=%2Feditor&download=1",
        );
      } catch {
        notify(
          "Could not save your project before sign-in. Please allow browser storage and try again.",
        );
      }
    } else notify(error.message || "Download failed. Please try again.");
  }
  useEffect(() => {
    localStorage.setItem("typeflow-sound-pack", soundPack);
    localStorage.setItem("typeflow-sound-default", defaultSound);
  }, [soundPack]);
  useEffect(() => {
    localStorage.setItem("typeflow-project", JSON.stringify(s));
  }, [s]);
  useEffect(() => {
    localStorage.setItem("typeflow-sound", String(sound));
  }, [sound]);
  useEffect(
    () => () => {
      audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (previousProject.current !== s && !recording) setMs(t.duration);
    previousProject.current = s;
  }, [s]);
  useEffect(() => {
    if (!sound) return;
    // Browsers may suspend audio until a real user gesture.
    const unlock = () => {
      void enableAudio(true);
    };
    unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [sound, soundPack]);
  useEffect(() => {
    localStorage.setItem("typeflow-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (canvas.current && fontsReady)
      render(canvas.current, s, recording ? t.duration : ms, t);
  }, [s, ms, t, recording, fontsReady]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(
      () => dialog.current?.querySelector("button:not(:disabled)")?.focus(),
      0,
    );
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const nodes = [
        ...dialog.current.querySelectorAll(
          "button:not(:disabled),input,select,textarea,a[href]",
        ),
      ];
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, [modal]);
  useEffect(() => {
    if (!playing || !fontsReady) return;
    let id,
      start = performance.now(),
      offset = ms;
    function frame(now) {
      let next = offset + now - start;
      if (next >= t.duration) {
        if (s.loop) {
          next %= t.duration;
          start = now;
          offset = next;
        } else {
          setMs(t.duration);
          setPlaying(false);
          return;
        }
      }
      setMs(next);
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [playing, t.duration, s.loop, fontsReady]);
  useEffect(() => {
    const count = visibleCount(t, ms);
    if (
      sound &&
      playing &&
      count > previousCount.current &&
      audio.current?.state === "running"
    ) {
      playKeyClick(
        audio.current,
        count - 1,
        t.events[count - 1]?.char,
        0,
        soundPack,
      );
    }
    previousCount.current = count;
  }, [ms, sound, playing, t, soundPack]);
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape" && !progress) setModal(null);
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
          document.activeElement.tagName,
        ) &&
        !modal
      ) {
        e.preventDefault();
        play();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });
  async function enableAudio(quiet = false) {
    if (!quiet) setSoundLoading(true);
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("Audio unavailable");
      if (!audio.current || audio.current.state === "closed")
        audio.current = new Audio();
      await Promise.race([
        audio.current.resume(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Audio timeout")), 2000),
        ),
      ]);
      if (audio.current.state !== "running") throw new Error("Audio suspended");
      await loadKeySounds(audio.current, soundPack);
      return true;
    } catch (error) {
      if (!quiet)
        notify(
          error.message.includes("recordings")
            ? error.message
            : "Could not enable typing sounds. Check your browser audio permissions.",
        );
      return false;
    } finally {
      if (!quiet) setSoundLoading(false);
    }
  }
  function changeSoundPack(id) {
    setPlaying(false);
    if (audio.current) stopKeySounds(audio.current);
    setSoundPack(id);
  }
  async function testSound() {
    setPlaying(false);
    if (audio.current) stopKeySounds(audio.current);
    if (await enableAudio()) {
      for (let i = 0; i < 5; i++)
        playKeyClick(audio.current, i, "", i * 0.14, soundPack);
    }
  }
  async function toggleSound() {
    if (sound) {
      if (audio.current) stopKeySounds(audio.current);
      return setSound(false);
    }
    if (await enableAudio()) {
      setSound(true);
      playKeyClick(audio.current, 0, "", 0, soundPack);
    }
  }
  async function play() {
    if (soundLoading) return;
    if (!fontsReady)
      return notify(fontState.error || "Loading fonts. Please wait.");
    if (playing) return setPlaying(false);
    if (sound && !(await enableAudio())) return;
    if (ms >= t.duration) {
      previousCount.current = 0;
      setMs(0);
    }
    setPlaying(true);
  }
  function editText(value) {
    if (graphemes(value).length > 1000) return;
    if (recording) {
      const r = recordRef.current,
        chars = graphemes(value),
        before = graphemes(r.text),
        now = performance.now();
      if (value.startsWith(r.text)) {
        for (let i = before.length; i < chars.length; i++)
          r.times[i] = i === before.length ? Math.min(5000, now - r.last) : 0;
      } else r.times = r.times.slice(0, chars.length);
      r.last = now;
      r.text = value;
      setS((old) => ({ ...old, text: value, recorded: null }));
    } else update("text", value);
  }
  function record() {
    setPlaying(false);
    setMs(0);
    if (recording) {
      const times = Array.from(
        { length: graphemes(s.text).length },
        (_, i) => recordRef.current.times[i + 1] ?? s.speed,
      );
      setS((old) => ({ ...old, recorded: times }));
      setRecording(false);
      notify("Typing rhythm saved. Press play to preview.");
    } else {
      recordRef.current = { last: performance.now(), times: [], text: "" };
      setS((old) => ({ ...old, text: "", recorded: null }));
      setRecording(true);
      setPanel("text");
    }
  }
  async function importProject(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      setRecording(false);
      setS(validateProject(data.settings || data));
      setMs(0);
      setPlaying(false);
      notify("Project imported");
    } catch {
      notify(
        "Could not read this project. Choose a Typing Animation JSON file.",
      );
    }
    e.target.value = "";
  }
  async function doExport() {
    if (recording)
      return notify("Stop recording your typing rhythm before exporting.");
    setPlaying(false);
    setProgress({ percent: 0, message: "Checking download access…" });
    try {
      await requireDownloadSession();
      await requireDownloadPayment();
    } catch (error) {
      downloadError(error);
      setProgress(null);
      return;
    }
    if (format === "html" || format === "png") {
      setProgress({ percent: 0, message: "Preparing fonts and file…" });
      try {
        if (format === "html")
          await htmlExport(s, { enabled: sound, pack: soundPack });
        else await pngExport(s, ms);
        notify(
          format === "html"
            ? "HTML animation exported"
            : "Current frame exported",
        );
      } catch (error) {
        downloadError(error);
      } finally {
        setProgress(null);
      }
      return;
    }
    if (s.background === "transparent" && format === "mp4") {
      setProgress(null);
      return;
    }
    abort.current = new AbortController();
    setProgress({ percent: 0, message: "Preparing export…" });
    try {
      await document.fonts.ready;
      await videoExport(s, format, setProgress, abort.current.signal, {
        enabled: sound,
        pack: soundPack,
      });
      notify("Video created and downloaded");
      setModal(null);
    } catch (e) {
      if (e.name === "AbortError") notify("Export cancelled");
      else downloadError(e);
    } finally {
      setProgress(null);
      abort.current = null;
    }
  }
  const tabs = [
    { id: "text", icon: Type, label: "Text" },
    { id: "style", icon: SlidersHorizontal, label: "Style" },
    { id: "motion", icon: MousePointer2, label: "Motion" },
    { id: "canvas", icon: Palette, label: "Canvas" },
  ];
  return (
    <div id="editor" className="app-shell" tabIndex={-1}>
      <header className="studio-toolbar">
        <a
          className="brand editor-brand"
          href="/"
          aria-label="Back to home"
          title="Back to home"
        >
          <img
            className="brand-logo"
            src="/logo.png"
            width="28"
            height="28"
            alt=""
          />
          <span>Editor</span>
        </a>
        <div className="header-divider" />
        <div className="project-title">
          Untitled project{" "}
          <span className="saved">
            <i /> Autosaved
          </span>
        </div>
        <div className="header-actions">
          <AccountLink returnTo="/editor" />
          <Button
            className="icon-button"
            icon={HelpCircle}
            title="How to use"
            aria-label="How to use"
            onClick={() => setModal("help")}
          />
          <Button
            className="icon-button"
            icon={theme === "dark" ? Sun : Moon}
            title="Toggle theme"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
          <Button
            className="quiet-button save-button"
            icon={Save}
            onClick={async () => {
              try {
                await download(
                  new Blob(
                    [JSON.stringify({ version: 1, settings: s }, null, 2)],
                    { type: "application/json" },
                  ),
                  "typing-animation-project.json",
                );
                notify("Project file saved");
              } catch (error) {
                downloadError(error, "project");
              }
            }}
          >
            Save project
          </Button>
          <Button
            className="primary-button"
            icon={Download}
            onClick={() => setModal("export")}
          >
            Export animation
          </Button>
        </div>
      </header>
      <main
        className="editor-layout"
        aria-label="Typing animation editor"
        tabIndex={-1}
      >
        <div className="workspace">
          <div className="workspace-toolbar">
            <div className="mode-label">
              <Keyboard size={16} />
              Typing animation
            </div>
            <Button
              className="quiet-button"
              icon={LayoutGrid}
              onClick={() => setModal("templates")}
            >
              Templates <ArrowUpRight size={13} />
            </Button>
          </div>
          <div className="stage-area">
            <div
              className={`canvas-frame ${s.background === "transparent" ? "checker" : ""}`}
              style={{
                "--aspect": s.ratio.split(":")[0] / s.ratio.split(":")[1],
                aspectRatio: s.ratio.replace(":", " / "),
                maxWidth: `min(100%, ${s.ratio === "9:16" ? "290px" : s.ratio === "1:1" ? "470px" : "900px"})`,
              }}
            >
              <canvas
                ref={canvas}
                width={dims[0]}
                height={dims[1]}
                aria-label="Typing animation preview"
              />
            </div>
            <div className="canvas-meta">
              {!fontsReady && (
                <span role="status">{fontState.error || "Loading fonts…"}</span>
              )}
              <span>
                {dims[0]} × {dims[1]}
              </span>
              <span className="meta-dot" />
              <span>{s.ratio}</span>
              <span className="meta-dot" />
              <span>
                {s.background === "transparent"
                  ? "Transparent background"
                  : s.background === "gradient"
                    ? "Gradient background"
                    : "Solid background"}
              </span>
            </div>
          </div>
          <div className="transport">
            <div className="timeline-label">
              <span>Preview timeline</span>
              <span>
                {graphemes(s.text).length} characters <i />{" "}
                {s.recorded ? "Recorded rhythm" : "Typewriter effect"}
              </span>
            </div>
            <div className="timeline-track">
              <span>{timeLabel(ms)}</span>
              <input
                aria-label="Preview timeline"
                type="range"
                min="0"
                max={t.duration}
                step="1"
                value={Math.min(ms, t.duration)}
                style={{ "--progress": `${(ms / t.duration) * 100}%` }}
                onChange={(e) => {
                  setPlaying(false);
                  setMs(+e.target.value);
                }}
              />
              <span>{timeLabel(t.duration)}</span>
            </div>
            <div
              className="sound-controls"
              aria-label="Keyboard sound settings"
            >
              <Button
                className={`icon-button ${sound ? "active" : ""}`}
                icon={sound ? Volume2 : VolumeX}
                title={
                  sound
                    ? "Mute typing sounds in preview and exports"
                    : "Enable typing sounds in preview and exports"
                }
                aria-label="Toggle typing sounds in preview and exports"
                aria-pressed={sound}
                disabled={soundLoading}
                onClick={toggleSound}
              />
              <label className="sound-picker">
                <span>Keyboard sound</span>
                <select
                  aria-label="Keyboard sound type"
                  value={soundPack}
                  disabled={soundLoading}
                  onChange={(e) => changeSoundPack(e.target.value)}
                >
                  {soundOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                className="sound-test"
                title="Test typing sounds"
                aria-label="Test typing sounds"
                disabled={soundLoading}
                onClick={testSound}
              >
                {soundLoading ? "Loading" : "Test"}
              </Button>
            </div>
            <div className="playback-controls">
              <div aria-hidden="true" />
              <div className="play-buttons">
                <Button
                  className="icon-button"
                  icon={RotateCcw}
                  aria-label="Back to start"
                  title="Back to start"
                  onClick={() => {
                    setPlaying(false);
                    setMs(0);
                  }}
                />
                <Button
                  className="icon-button"
                  icon={SkipBack}
                  aria-label="Back one second"
                  title="Back one second"
                  onClick={() => {
                    setPlaying(false);
                    setMs(Math.max(0, ms - 1000));
                  }}
                />
                <Button
                  className="play-button"
                  icon={playing ? Pause : Play}
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={play}
                />
                <Button
                  className="icon-button"
                  icon={SkipForward}
                  aria-label="Forward one second"
                  title="Forward one second"
                  onClick={() => {
                    setPlaying(false);
                    setMs(Math.min(t.duration, ms + 1000));
                  }}
                />
                <span className="space-hint">Space to play</span>
              </div>
              <label className="loop-toggle">
                <input
                  type="checkbox"
                  checked={s.loop}
                  onChange={(e) =>
                    setS((o) => ({ ...o, loop: e.target.checked }))
                  }
                />
                Loop
              </label>
            </div>
          </div>
          <footer className="workspace-footer">
            <span>
              <span className="local-dot" />
              Free to edit · Downloads from $1.90
            </span>
            <Button
              className="text-button"
              icon={FolderOpen}
              onClick={() => file.current.click()}
            >
              Import project
            </Button>
            <div className="workspace-contact">
              <a href="/pricing.html">Pricing</a>
              <span>Customer support: <a href="mailto:zhihaosong168@gmail.com">zhihaosong168@gmail.com</a></span>
            </div>
          </footer>
        </div>
        <aside className="inspector">
          <div
            className="inspector-tabs"
            role="tablist"
            aria-label="Editor settings"
          >
            {tabs.map((tab) => (
              <button
                role="tab"
                aria-selected={panel === tab.id}
                key={tab.id}
                onClick={() => setPanel(tab.id)}
                className={panel === tab.id ? "selected" : ""}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          <SettingsPanel
            {...{
              panel,
              s,
              recording,
              setRecording,
              editText,
              record,
              setS,
              setMs,
              setPlaying,
              setModal,
              update,
              dims,
            }}
          />
          <div className="inspector-footer">
            <span>
              <i /> One engine for preview and export
            </span>
            <Button
              className="text-button"
              icon={RotateCcw}
              title="Reset settings"
              aria-label="Reset settings"
              onClick={() => setModal("reset")}
            />
          </div>
        </aside>
      </main>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={importProject}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !progress) setModal(null);
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`modal modal-${modal}`}
          >
            <div className="modal-heading">
              <div>
                <h2 id="modal-title">
                  {
                    {
                      export: "Export your animation",
                      templates: "Find your next starting point",
                      help: "Your typing animation workspace",
                      reset: "Reset to defaults?",
                    }[modal]
                  }
                </h2>
                <p>
                  {
                    {
                      export:
                        "Choose a format and download plan. Your project stays saved.",
                      templates:
                        "Choose a starting point and make the words your own.",
                      help: "Go from text to animation in a few steps.",
                      reset:
                        "This replaces your current project with the default example. Save your project first to keep a copy.",
                    }[modal]
                  }
                </p>
              </div>
              <Button
                className="icon-button"
                icon={X}
                aria-label="Close dialog"
                disabled={!!progress}
                onClick={() => setModal(null)}
              />
            </div>
            {modal === "templates" && (
              <TemplateGallery
                onApply={(p) => {
                  setRecording(false);
                  setS({ ...p.settings });
                  setMs(0);
                  setPlaying(false);
                  setModal(null);
                }}
              />
            )}
            {modal === "export" && (
              <>
                <BillingPanel
                  onError={downloadError}
                  beforeCheckout={() => {
                    localStorage.setItem("typeflow-project", JSON.stringify(s));
                    sessionStorage.setItem(
                      "typeflow-pending-download",
                      JSON.stringify({ format, ms, created: Date.now() }),
                    );
                  }}
                />
                <div className="format-grid">
                  {[
                    {
                      id: "webm",
                      name: "WebM video",
                      desc: "Supports transparency",
                      icon: Film,
                    },
                    {
                      id: "mp4",
                      name: "MP4 video",
                      desc: "For sharing and editing",
                      icon: Film,
                    },
                    {
                      id: "html",
                      name: "HTML animation",
                      desc: "Standalone, offline playback",
                      icon: Code2,
                    },
                    {
                      id: "png",
                      name: "PNG image",
                      desc: "Save the current frame",
                      icon: Image,
                    },
                  ].map((f) => (
                    <button
                      disabled={
                        !!progress ||
                        (f.id === "mp4" && s.background === "transparent")
                      }
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`format-option ${format === f.id ? "selected" : ""}`}
                    >
                      <f.icon size={21} />
                      <strong>{f.name}</strong>
                      <span>{f.desc}</span>
                      {format === f.id && <Check size={15} />}
                    </button>
                  ))}
                </div>
                {format === "mp4" && s.background === "transparent" && (
                  <div className="info-note">
                    MP4 does not support transparency. Choose WebM or change the
                    background.
                  </div>
                )}
                <div className="export-summary">
                  <span>
                    {dims[0]} × {dims[1]}
                  </span>
                  <span>{s.fps} FPS</span>
                  <span>{(t.duration / 1000).toFixed(2)} s</span>
                  <span>
                    {s.background === "transparent"
                      ? "Transparent background"
                      : "Colored background"}
                  </span>
                </div>
                <p className="export-note">
                  {format === "webm"
                    ? "WebM alpha support varies between video editors. Check compatibility before importing."
                    : format === "html"
                      ? "Includes the animation, settings and selected open-source fonts for offline playback."
                      : format === "png"
                        ? "Exports the current frame. Scrub the timeline to choose a frame before exporting."
                        : "Uses H.264 for compatibility with most video players and editors."}
                  {format !== "png" &&
                    (sound
                      ? ` Includes ${soundOptions.find((option) => option.id === soundPack)?.label || "selected keyboard"} typing sounds.`
                      : " Typing sounds are muted in this export.")}
                  {format === "html" &&
                    sound &&
                    " Click Play in the exported page to start with sound."}
                </p>
                {progress ? (
                  <div className="export-progress">
                    <div>
                      <Loader2 size={16} className="spin" />
                      {progress.message}
                      <span>{progress.percent}%</span>
                    </div>
                    <progress max="100" value={progress.percent} />
                    <Button
                      className="quiet-button"
                      onClick={() => abort.current?.abort()}
                    >
                      Cancel export
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="primary-button export-cta"
                    icon={Download}
                    disabled={
                      (format === "mp4" && s.background === "transparent") ||
                      recording
                    }
                    onClick={doExport}
                  >
                    Export
                    {
                      {
                        webm: " WebM",
                        mp4: " MP4",
                        html: " HTML",
                        png: " PNG",
                      }[format]
                    }
                  </Button>
                )}
              </>
            )}
            {modal === "help" && (
              <div className="help-content">
                {[
                  [
                    "01",
                    "Write your text",
                    "Enter text in the Text tab. Add line breaks and emoji, or record your own typing rhythm.",
                  ],
                  [
                    "02",
                    "Style your animation",
                    "Use Style for fonts, size and position. Use Motion for speed, pauses and cursor settings.",
                  ],
                  [
                    "03",
                    "Preview every moment",
                    "Press play or Space, then scrub the timeline to inspect any frame. Canvas offers landscape, portrait and transparent backgrounds.",
                  ],
                  [
                    "04",
                    "Download your work",
                    "Export video, standalone HTML or a PNG frame. Projects autosave in this browser; download a JSON backup to keep a copy.",
                  ],
                ].map(([n, title, desc]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <section>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </section>
                  </div>
                ))}
              </div>
            )}
            {modal === "reset" && (
              <div className="reset-actions">
                <Button className="quiet-button" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button
                  className="primary-button"
                  onClick={() => {
                    setS(defaults);
                    setMs(0);
                    setPlaying(false);
                    setRecording(false);
                    setModal(null);
                  }}
                >
                  Reset to defaults
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
try {
  const savedTheme = localStorage.getItem("typeflow-theme");
  if (["light", "dark"].includes(savedTheme))
    document.documentElement.dataset.theme = savedTheme;
} catch {
  /* Use the default theme when browser storage is unavailable. */
}
const demoRoot = document.getElementById("hero-demo");
if (demoRoot) createRoot(demoRoot).render(<HeroDemo />);
const editorRoot = document.getElementById("root");
if (editorRoot) createRoot(editorRoot).render(<App />);
const accountRoot = document.getElementById("account-root");
if (accountRoot) createRoot(accountRoot).render(<AccountPage />);
const sessionRoot = document.getElementById("session-root");
if (sessionRoot) createRoot(sessionRoot).render(<AccountLink />);
