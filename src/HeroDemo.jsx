import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play, RotateCcw } from "lucide-react";
import { render, timeline } from "./engine.js";
import { ensureFonts } from "./font-loader.js";
import { landingDemos } from "./landing-demos.js";

export function HeroDemo() {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [restart, setRestart] = useState(0);
  const [fontError, setFontError] = useState(false);
  const canvas = useRef(null);
  const elapsed = useRef(0);
  const demo = landingDemos[selected];

  useEffect(() => {
    elapsed.current = 0;
  }, [selected, restart]);

  useEffect(() => {
    let active = true;
    let animation;
    let previous;
    const track = timeline(demo.settings);
    setFontError(false);
    const draw = (now) => {
      if (!active) return;
      // Cap background-tab gaps so returning to the page does not skip the demo.
      if (previous !== undefined && !paused)
        elapsed.current =
          (elapsed.current + Math.min(now - previous, 80)) % track.duration;
      previous = now;
      render(
        canvas.current,
        demo.settings,
        paused && elapsed.current === 0 ? track.duration : elapsed.current,
        track,
      );
      if (!paused) animation = requestAnimationFrame(draw);
    };
    ensureFonts(demo.settings)
      .catch(() => {
        if (active) setFontError(true);
      })
      .then(() => {
        if (active) animation = requestAnimationFrame(draw);
      });
    return () => {
      active = false;
      cancelAnimationFrame(animation);
    };
  }, [demo, paused, restart]);

  return (
    <>
      <div className="demo-toolbar">
        <div className="demo-styles" role="group" aria-label="Preview styles">
          {landingDemos.map((item, index) => (
            <button
              key={item.id}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="demo-live">
          <i aria-hidden="true" />
          Live preview
        </span>
      </div>
      <div className="hero-demo-stage" style={{ background: demo.settings.bg }}>
        <canvas
          ref={canvas}
          width="1280"
          height="720"
          role="img"
          aria-label={`${demo.label} typing animation: ${demo.settings.text}`}
        />
        <div className="demo-playback">
          <button
            aria-label="Replay demo"
            title="Replay demo"
            onClick={() => {
              setRestart((value) => value + 1);
              setPaused(false);
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            aria-label={paused ? "Play demo" : "Pause demo"}
            title={paused ? "Play demo" : "Pause demo"}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>
      <div className="demo-caption">
        <p>
          {fontError
            ? "Preview font unavailable. Try reloading the page."
            : "Your words. Your style. Your timing."}
        </p>
        <a href={`/editor?demo=${demo.id}`}>
          Edit this template
          <ArrowUpRight size={16} />
        </a>
      </div>
    </>
  );
}
