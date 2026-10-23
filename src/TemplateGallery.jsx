import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { presets } from "./presets";
import { dimensions, render, timeline } from "./engine";
import { ensureFonts } from "./font-loader.js";

function TemplatePreview({ settings }) {
  const ref = useRef(null);
  useEffect(() => {
    const [w, h] = dimensions(settings);
    const canvas = ref.current;
    canvas.width = Math.round((w / h) * 240);
    canvas.height = 240;
    let active = true;
    ensureFonts(settings)
      .then(() => {
        if (active) render(canvas, settings, timeline(settings).duration);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [settings]);
  return (
    <div className="template-preview">
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

export function TemplateGallery({ onApply }) {
  const [group, setGroup] = useState("All");
  const groups = [
    "All",
    "Minimal",
    "Tech",
    "Literary",
    "Gradient",
    "Bold",
    "Social",
  ];
  const visible = presets.filter((p) => group === "All" || p.group === group);
  return (
    <>
      <div
        className="template-filters"
        role="group"
        aria-label="Filter template styles"
      >
        {groups.map((g) => (
          <button
            key={g}
            aria-pressed={group === g}
            className={group === g ? "selected" : ""}
            onClick={() => setGroup(g)}
          >
            {g}
            <span>
              {g === "All"
                ? presets.length
                : presets.filter((p) => p.group === g).length}
            </span>
          </button>
        ))}
      </div>
      <div className="template-grid">
        {visible.map((p) => (
          <button
            key={p.name}
            className="template-card"
            aria-label={`Apply template: ${p.name}`}
            onClick={() => onApply(p)}
          >
            <TemplatePreview settings={p.settings} />
            <div>
              {p.name}
              <small>{p.category}</small>
              <ArrowUpRight size={16} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
