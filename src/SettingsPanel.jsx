import React, { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Type,
  SlidersHorizontal,
  MousePointer2,
  Move,
  Palette,
  LayoutGrid,
  Film,
  Image,
  Keyboard,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Mic,
  Square,
} from "lucide-react";
import {
  Button,
  Select,
  Range,
  Toggle,
  Color,
  Segment,
  Section,
} from "./controls";
import { graphemes, fontOptions } from "./engine";
import { presets } from "./presets";
export function SettingsPanel({
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
}) {
  const textInput = useRef(null);
  const [showTextGuide, setShowTextGuide] = useState(() => {
    try {
      return localStorage.getItem("typeflow-text-guide-v1") !== "done";
    } catch {
      return true;
    }
  });
  function dismissTextGuide() {
    setShowTextGuide(false);
    try {
      localStorage.setItem("typeflow-text-guide-v1", "done");
    } catch {
      // The guide still dismisses when browser storage is unavailable.
    }
  }
  return (
    <div className="settings-scroll">
      {panel === "text" && (
        <>
          <Section
            icon={Type}
            title="Your text"
            extra={<span className="section-note">Start with a sentence</span>}
          >
            <div className={showTextGuide ? "text-guide-target" : undefined}>
              <textarea
                ref={textInput}
                aria-label="Your text"
                aria-describedby={
                  showTextGuide ? "text-guide-description" : undefined
                }
                value={s.text}
                placeholder="Write your story here…"
                onChange={(e) => {
                  dismissTextGuide();
                  editText(e.target.value);
                }}
                spellCheck={false}
              />
            </div>
            {showTextGuide && (
              <aside className="text-guide" aria-label="Getting started">
                <span className="text-guide-eyebrow">YOUR FIRST ANIMATION</span>
                <strong>Start here — type your text</strong>
                <p id="text-guide-description">
                  Replace the sample above with your own words, then press Play
                  to preview.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    dismissTextGuide();
                    textInput.current?.focus();
                  }}
                >
                  Got it <ArrowUpRight size={13} aria-hidden="true" />
                </button>
              </aside>
            )}
            <div className="text-caption">
              <span>
                {recording ? (
                  <span className="record-indicator">
                    Recording your typing rhythm
                  </span>
                ) : (
                  "Line breaks, languages and emoji"
                )}
              </span>
              <span>{graphemes(s.text).length} / 1000</span>
            </div>
          </Section>
          <Section icon={Keyboard} title="Typing rhythm">
            <p className="section-description">
              Capture your own typing speed and pauses for a more natural
              animation.
            </p>
            <Button
              className={`wide-button ${recording ? "recording" : ""}`}
              icon={recording ? Square : Mic}
              onClick={record}
            >
              {recording ? "Stop recording" : "Record typing rhythm"}
            </Button>
            {s.recorded && (
              <div className="recorded-note">
                <Check size={13} />
                Using recorded rhythm
                <Button
                  className="text-button"
                  onClick={() => update("recorded", null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </Section>
          <Section
            icon={LayoutGrid}
            title="Start with a template"
            extra={
              <span className="section-note">{presets.length} styles</span>
            }
          >
            <div className="mini-presets">
              {presets.slice(0, 3).map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setRecording(false);
                    setS({ ...p.settings });
                    setMs(0);
                    setPlaying(false);
                  }}
                >
                  <span className={`preset-swatch swatch-${i}`}>Aa</span>
                  <span>
                    {p.name}
                    <small>{p.category}</small>
                  </span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
            <Button
              className="text-button all-templates"
              onClick={() => setModal("templates")}
            >
              View all {presets.length} templates <ArrowUpRight size={13} />
            </Button>
          </Section>
          <div className="tip">
            <Keyboard size={16} />
            <span>
              Words carry ideas. Rhythm adds feeling.
              <br />
              Try a longer pause at punctuation.
            </span>
          </div>
        </>
      )}
      {panel === "style" && (
        <>
          <Section icon={Type} title="Typography">
            <Select
              label="Font"
              value={s.font}
              onChange={(v) => update("font", v)}
              options={fontOptions}
            />
            <p className="section-description">
              32 open-source web fonts. No installation needed. Multilingual
              text uses Noto Sans SC as a Chinese fallback.
            </p>
            <div className="two-fields">
              <Select
                label="Weight"
                value={s.weight}
                onChange={(v) => update("weight", v)}
                options={[
                  { value: "400", label: "Regular" },
                  { value: "500", label: "Medium" },
                  { value: "600", label: "Semibold" },
                  { value: "700", label: "Bold" },
                ]}
              />
              <div className="field">
                <span>Style</span>
                <Button
                  className={`wide-button italic ${s.italic ? "active" : ""}`}
                  aria-pressed={s.italic}
                  onClick={() => update("italic", !s.italic)}
                >
                  I Italic
                </Button>
              </div>
            </div>
            <Range
              label="Font size"
              value={s.size}
              min={12}
              max={160}
              onChange={(v) => update("size", v)}
              unit=" px"
            />
            <Range
              label="Line height"
              value={s.lineHeight}
              min={1}
              max={2.5}
              step={0.05}
              onChange={(v) => update("lineHeight", v)}
            />
            <Color
              label="Text color"
              value={s.color}
              onChange={(v) => update("color", v)}
            />
            <Segment
              label="Text alignment"
              value={s.align}
              onChange={(v) => update("align", v)}
              options={[
                { value: "left", label: "Left", icon: AlignLeft },
                { value: "center", label: "Center", icon: AlignCenter },
                { value: "right", label: "Right", icon: AlignRight },
              ]}
            />
          </Section>
          <Section icon={Move} title="Position">
            <Segment
              label="Horizontal"
              value={s.horizontal}
              onChange={(v) => update("horizontal", v)}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
            <Segment
              label="Vertical"
              value={s.vertical}
              onChange={(v) => update("vertical", v)}
              options={[
                { value: "top", label: "Top" },
                { value: "center", label: "Center" },
                { value: "bottom", label: "Bottom" },
              ]}
            />
            <div className="two-fields">
              {["x", "y"].map((k) => (
                <label className="field" key={k}>
                  <span>{k.toUpperCase()} offset</span>
                  <div className="number-field">
                    <input
                      aria-label={`${k.toUpperCase()} offset`}
                      type="number"
                      min={-2000}
                      max={2000}
                      value={s[k]}
                      onChange={(e) =>
                        update(
                          k,
                          Math.max(-2000, Math.min(2000, +e.target.value)),
                        )
                      }
                    />
                    <span>px</span>
                  </div>
                </label>
              ))}
            </div>
          </Section>
        </>
      )}
      {panel === "motion" && (
        <>
          <Section icon={SlidersHorizontal} title="Typing timing">
            {s.recorded ? (
              <div className="info-note">
                Using your recorded typing rhythm.
                <Button
                  className="text-button"
                  onClick={() => update("recorded", null)}
                >
                  Use automatic timing
                </Button>
              </div>
            ) : (
              <>
                <Range
                  label="Character interval"
                  value={s.speed}
                  min={15}
                  max={500}
                  step={5}
                  onChange={(v) => update("speed", v)}
                  unit=" ms"
                />
                <div className="range-hints">
                  <span>Fast</span>
                  <span>Relaxed</span>
                </div>
                <Range
                  label="Timing variation"
                  value={s.variance}
                  min={0}
                  max={150}
                  step={5}
                  onChange={(v) => update("variance", v)}
                  unit=" ms"
                />
              </>
            )}
            <Range
              label="Punctuation pause"
              value={s.punctuation}
              min={0}
              max={1500}
              step={50}
              onChange={(v) => update("punctuation", v)}
              unit=" ms"
            />
            <Range
              label="Start delay"
              value={s.start}
              min={0}
              max={5000}
              step={100}
              onChange={(v) => update("start", v)}
              unit=" ms"
            />
            <Range
              label="End hold"
              value={s.end}
              min={0}
              max={5000}
              step={100}
              onChange={(v) => update("end", v)}
              unit=" ms"
            />
          </Section>
          <Section icon={MousePointer2} title="Cursor">
            <Toggle
              label="Show cursor"
              value={s.cursor}
              onChange={(v) => update("cursor", v)}
            />
            {s.cursor && (
              <>
                <Select
                  label="Cursor style"
                  value={s.cursorStyle}
                  onChange={(v) => update("cursorStyle", v)}
                  options={[
                    { value: "bar", label: "Bar |" },
                    { value: "block", label: "Block ▌" },
                    { value: "underline", label: "Underline _" },
                  ]}
                />
                <Toggle
                  label="Match text color"
                  value={s.sameColor}
                  onChange={(v) => update("sameColor", v)}
                />
                {!s.sameColor && (
                  <Color
                    label="Cursor color"
                    value={s.cursorColor}
                    onChange={(v) => update("cursorColor", v)}
                  />
                )}
                <Segment
                  label="Blink speed"
                  value={s.blink}
                  onChange={(v) => update("blink", v)}
                  options={[
                    { value: 800, label: "Slow" },
                    { value: 530, label: "Medium" },
                    { value: 300, label: "Fast" },
                  ]}
                />
              </>
            )}
          </Section>
        </>
      )}
      {panel === "canvas" && (
        <>
          <Section icon={Image} title="Canvas size">
            <Select
              label="Aspect ratio"
              value={s.ratio}
              onChange={(v) => update("ratio", v)}
              options={[
                { value: "16:9", label: "16:9 · Landscape" },
                { value: "9:16", label: "9:16 · Portrait" },
                { value: "1:1", label: "1:1 · Square" },
                { value: "4:3", label: "4:3 · Classic" },
              ]}
            />
            <Select
              label="Resolution"
              value={s.resolution}
              onChange={(v) => update("resolution", +v)}
              options={[
                { value: 720, label: "720p · Standard" },
                { value: 1080, label: "1080p · HD" },
              ]}
            />
            <div className="size-readout">
              {dims[0]} × {dims[1]} <span>pixels</span>
            </div>
          </Section>
          <Section icon={Palette} title="Background">
            <Segment
              label="Background type"
              value={s.background}
              onChange={(v) => update("background", v)}
              options={[
                { value: "solid", label: "Solid" },
                { value: "gradient", label: "Gradient" },
                { value: "transparent", label: "Transparent" },
              ]}
            />
            {s.background !== "transparent" && (
              <Color
                label={
                  s.background === "gradient"
                    ? "Start color"
                    : "Background color"
                }
                value={s.bg}
                onChange={(v) => update("bg", v)}
              />
            )}
            {s.background === "gradient" && (
              <Color
                label="End color"
                value={s.bg2}
                onChange={(v) => update("bg2", v)}
              />
            )}
            {s.background === "transparent" && (
              <div className="info-note">
                The checkerboard is a preview guide. Export WebM for transparent
                video, or use transparent PNG or HTML.
              </div>
            )}
            <div className="color-presets">
              {[
                "#151318",
                "#000000",
                "#ffffff",
                "#f0e8dd",
                "#d8fa80",
                "#26204d",
              ].map((color) => (
                <button
                  key={color}
                  aria-label={`Set background ${color}`}
                  style={{ background: color }}
                  onClick={() => {
                    setS((o) => ({ ...o, bg: color, background: "solid" }));
                  }}
                />
              ))}
            </div>
          </Section>
          <Section icon={Film} title="Video settings">
            <Select
              label="Frame rate"
              value={s.fps}
              onChange={(v) => update("fps", +v)}
              options={[
                { value: 24, label: "24 FPS · Cinematic" },
                { value: 30, label: "30 FPS · Standard" },
                { value: 60, label: "60 FPS · Smooth" },
              ]}
            />
            <p className="section-description">
              Download your animation as MP4, WebM, HTML or PNG. HTML and PNG
              are created in your browser.
            </p>
          </Section>
        </>
      )}
    </div>
  );
}
