import { defaults } from "./engine.js";
import { presets } from "./presets.js";

// The homepage and editor share project settings so each example is editable.
export const landingDemos = [
  {
    id: "minimal",
    label: "Minimal",
    name: "Make every word count.",
    settings: {
      ...defaults,
      text: "Make every word count.",
      font: "sans",
      size: 78,
      weight: "500",
      align: "center",
      bg: "#101113",
      cursorColor: "#bdadf5",
      end: 2400,
    },
  },
  ...[
    ["terminal", "Terminal", "Terminal Letter"],
    ["social", "Social", "Violet Prologue"],
    ["intro", "Video intro", "Title Moment"],
  ].map(([id, label, name]) => ({
    id,
    label,
    name,
    settings: {
      ...presets.find((preset) => preset.name === name).settings,
      loop: true,
      end: 2400,
    },
  })),
];
