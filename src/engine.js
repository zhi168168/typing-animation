export const defaults = {
  text: "Hello World！\nWe can try to make something new!",
  font: "mono",
  size: 52,
  weight: "400",
  italic: false,
  color: "#f4f4f5",
  align: "left",
  horizontal: "center",
  vertical: "center",
  x: 0,
  y: 0,
  lineHeight: 1.55,
  speed: 90,
  variance: 20,
  punctuation: 250,
  start: 600,
  end: 1200,
  cursor: true,
  cursorStyle: "bar",
  cursorColor: "#b9a0ff",
  sameColor: false,
  blink: 530,
  loop: true,
  background: "solid",
  bg: "#151318",
  bg2: "#3b2b59",
  ratio: "16:9",
  resolution: 720,
  fps: 30,
  recorded: null,
};
// Keep the original four IDs for saved projects; font files are self-hosted.
export const fontOptions = [
  {
    value: "sans",
    label: "Inter",
    group: "Sans serif",
    family: '"TF Inter", "TF Noto Sans SC", sans-serif',
    face: "TF Inter",
  },
  {
    value: "roboto",
    label: "Roboto",
    group: "Sans serif",
    family: '"TF Roboto", "TF Noto Sans SC", sans-serif',
    face: "TF Roboto",
  },
  {
    value: "openSans",
    label: "Open Sans",
    group: "Sans serif",
    family: '"TF Open Sans", "TF Noto Sans SC", sans-serif',
    face: "TF Open Sans",
  },
  {
    value: "lato",
    label: "Lato",
    group: "Sans serif",
    family: '"TF Lato", "TF Noto Sans SC", sans-serif',
    face: "TF Lato",
  },
  {
    value: "montserrat",
    label: "Montserrat",
    group: "Sans serif",
    family: '"TF Montserrat", "TF Noto Sans SC", sans-serif',
    face: "TF Montserrat",
  },
  {
    value: "poppins",
    label: "Poppins",
    group: "Sans serif",
    family: '"TF Poppins", "TF Noto Sans SC", sans-serif',
    face: "TF Poppins",
  },
  {
    value: "nunito",
    label: "Nunito",
    group: "Sans serif",
    family: '"TF Nunito", "TF Noto Sans SC", sans-serif',
    face: "TF Nunito",
  },
  {
    value: "raleway",
    label: "Raleway",
    group: "Sans serif",
    family: '"TF Raleway", "TF Noto Sans SC", sans-serif',
    face: "TF Raleway",
  },
  {
    value: "workSans",
    label: "Work Sans",
    group: "Sans serif",
    family: '"TF Work Sans", "TF Noto Sans SC", sans-serif',
    face: "TF Work Sans",
  },
  {
    value: "dmSans",
    label: "DM Sans",
    group: "Sans serif",
    family: '"TF DM Sans", "TF Noto Sans SC", sans-serif',
    face: "TF DM Sans",
  },
  {
    value: "serif",
    label: "Lora",
    group: "Serif",
    family: '"TF Lora", "TF Noto Sans SC", sans-serif',
    face: "TF Lora",
  },
  {
    value: "playfair",
    label: "Playfair Display",
    group: "Serif",
    family: '"TF Playfair Display", "TF Noto Sans SC", sans-serif',
    face: "TF Playfair Display",
  },
  {
    value: "merriweather",
    label: "Merriweather",
    group: "Serif",
    family: '"TF Merriweather", "TF Noto Sans SC", sans-serif',
    face: "TF Merriweather",
  },
  {
    value: "libreBaskerville",
    label: "Libre Baskerville",
    group: "Serif",
    family: '"TF Libre Baskerville", "TF Noto Sans SC", sans-serif',
    face: "TF Libre Baskerville",
  },
  {
    value: "crimson",
    label: "Crimson Text",
    group: "Serif",
    family: '"TF Crimson Text", "TF Noto Sans SC", sans-serif',
    face: "TF Crimson Text",
  },
  {
    value: "sourceSerif",
    label: "Source Serif 4",
    group: "Serif",
    family: '"TF Source Serif 4", "TF Noto Sans SC", sans-serif',
    face: "TF Source Serif 4",
  },
  {
    value: "cormorant",
    label: "Cormorant Garamond",
    group: "Serif",
    family: '"TF Cormorant Garamond", "TF Noto Sans SC", sans-serif',
    face: "TF Cormorant Garamond",
  },
  {
    value: "mono",
    label: "JetBrains Mono",
    group: "Monospace",
    family: '"TF JetBrains Mono", "TF Noto Sans SC", sans-serif',
    face: "TF JetBrains Mono",
  },
  {
    value: "firaCode",
    label: "Fira Code",
    group: "Monospace",
    family: '"TF Fira Code", "TF Noto Sans SC", sans-serif',
    face: "TF Fira Code",
  },
  {
    value: "sourceCode",
    label: "Source Code Pro",
    group: "Monospace",
    family: '"TF Source Code Pro", "TF Noto Sans SC", sans-serif',
    face: "TF Source Code Pro",
  },
  {
    value: "ibmMono",
    label: "IBM Plex Mono",
    group: "Monospace",
    family: '"TF IBM Plex Mono", "TF Noto Sans SC", sans-serif',
    face: "TF IBM Plex Mono",
  },
  {
    value: "spaceMono",
    label: "Space Mono",
    group: "Monospace",
    family: '"TF Space Mono", "TF Noto Sans SC", sans-serif',
    face: "TF Space Mono",
  },
  {
    value: "bebas",
    label: "Bebas Neue",
    group: "Display & handwriting",
    family: '"TF Bebas Neue", "TF Noto Sans SC", sans-serif',
    face: "TF Bebas Neue",
  },
  {
    value: "oswald",
    label: "Oswald",
    group: "Display & handwriting",
    family: '"TF Oswald", "TF Noto Sans SC", sans-serif',
    face: "TF Oswald",
  },
  {
    value: "anton",
    label: "Anton",
    group: "Display & handwriting",
    family: '"TF Anton", "TF Noto Sans SC", sans-serif',
    face: "TF Anton",
  },
  {
    value: "dancing",
    label: "Dancing Script",
    group: "Display & handwriting",
    family: '"TF Dancing Script", "TF Noto Sans SC", sans-serif',
    face: "TF Dancing Script",
  },
  {
    value: "caveat",
    label: "Caveat",
    group: "Display & handwriting",
    family: '"TF Caveat", "TF Noto Sans SC", sans-serif',
    face: "TF Caveat",
  },
  {
    value: "pacifico",
    label: "Pacifico",
    group: "Display & handwriting",
    family: '"TF Pacifico", "TF Noto Sans SC", sans-serif',
    face: "TF Pacifico",
  },
  {
    value: "notoSans",
    label: "Noto Sans SC",
    group: "Chinese",
    family: '"TF Noto Sans SC", "TF Noto Sans SC", sans-serif',
    face: "TF Noto Sans SC",
  },
  {
    value: "notoSerif",
    label: "Noto Serif SC",
    group: "Chinese",
    family: '"TF Noto Serif SC", "TF Noto Sans SC", sans-serif',
    face: "TF Noto Serif SC",
  },
  {
    value: "hand",
    label: "Ma Shan Zheng",
    group: "Chinese",
    family: '"TF Ma Shan Zheng", "TF Noto Sans SC", sans-serif',
    face: "TF Ma Shan Zheng",
  },
  {
    value: "zhiMang",
    label: "Zhi Mang Xing",
    group: "Chinese",
    family: '"TF Zhi Mang Xing", "TF Noto Sans SC", sans-serif',
    face: "TF Zhi Mang Xing",
  },
];
export const fonts = Object.fromEntries(
  fontOptions.map((font) => [font.value, font.family]),
);
export function graphemes(text) {
  return typeof Intl.Segmenter === "function"
    ? [
        ...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text),
      ].map((x) => x.segment)
    : Array.from(text);
}
export function dimensions(s) {
  let [w, h] = s.ratio.split(":").map(Number);
  return w >= h
    ? [Math.round((s.resolution * w) / h / 2) * 2, s.resolution]
    : [s.resolution, Math.round((s.resolution * h) / w / 2) * 2];
}
export function timeline(s) {
  let time = s.start;
  const chars = graphemes(s.text);
  const events = chars.map((char, i) => {
    const at = time;
    time +=
      s.recorded?.[i] ??
      Math.max(15, s.speed + Math.sin(i * 19.43) * s.variance);
    if (!s.recorded && /[，。！？；：,.!?;:]/u.test(char))
      time += s.punctuation;
    return { char, at };
  });
  return {
    events,
    duration: Math.max(100, s.text ? time + s.end : s.start + s.end),
  };
}
export function visibleCount(t, ms) {
  let lo = 0,
    hi = t.events.length;
  while (lo < hi) {
    let mid = (lo + hi) >> 1;
    if (t.events[mid].at <= ms) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
export function layout(ctx, s, width, height) {
  const scale = height / 720,
    fs = s.size * scale,
    pad = width * 0.08;
  ctx.font = `${s.italic ? "italic " : ""}${s.weight} ${fs}px ${fonts[s.font] || fonts.sans}`;
  const lines = [[]];
  let lineWidth = 0;
  const positions = [];
  for (const char of graphemes(s.text)) {
    let cw = ctx.measureText(char).width;
    if (char === "\n") {
      positions.push({ line: lines.length - 1, x: lineWidth, width: 0, char });
      lines.push([]);
      lineWidth = 0;
      continue;
    }
    if (lineWidth + cw > width - pad * 2 && lines.at(-1).length) {
      lines.push([]);
      lineWidth = 0;
    }
    const pos = { line: lines.length - 1, x: lineWidth, width: cw, char };
    positions.push(pos);
    lines.at(-1).push(pos);
    lineWidth += cw;
  }
  const widths = lines.map((l) => l.reduce((sum, p) => sum + p.width, 0));
  const block = Math.max(...widths, 0);
  const blockHeight = lines.length * fs * s.lineHeight;
  let baseX =
    s.horizontal === "left"
      ? pad
      : s.horizontal === "right"
        ? width - pad - block
        : (width - block) / 2;
  let baseY =
    s.vertical === "top"
      ? height * 0.12
      : s.vertical === "bottom"
        ? height * 0.88 - blockHeight
        : (height - blockHeight) / 2;
  return {
    positions,
    widths,
    baseX: baseX + s.x * scale,
    baseY: baseY + s.y * scale,
    fs,
    step: fs * s.lineHeight,
    block,
  };
}
export function render(canvas, s, ms, t = timeline(s)) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (s.background !== "transparent") {
    let fill = s.bg;
    if (s.background === "gradient") {
      fill = ctx.createLinearGradient(0, 0, w, h);
      fill.addColorStop(0, s.bg);
      fill.addColorStop(1, s.bg2);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
  }
  const l = layout(ctx, s, w, h);
  ctx.textBaseline = "top";
  ctx.fillStyle = s.color;
  const count = visibleCount(t, ms);
  const offset = (line) =>
    s.align === "center"
      ? (l.block - l.widths[line]) / 2
      : s.align === "right"
        ? l.block - l.widths[line]
        : 0;
  for (let i = 0; i < count; i++) {
    const p = l.positions[i];
    if (p && p.char !== "\n")
      ctx.fillText(
        p.char,
        l.baseX + p.x + offset(p.line),
        l.baseY + p.line * l.step,
      );
  }
  if (s.cursor && Math.floor(ms / s.blink) % 2 === 0) {
    let line = 0,
      x = 0;
    const last = l.positions[count - 1];
    if (last) {
      line = last.line;
      x = last.x + last.width;
      if (last.char === "\n") {
        line++;
        x = 0;
      }
    }
    let cx = l.baseX + x + offset(Math.min(line, l.widths.length - 1)),
      cy = l.baseY + line * l.step;
    ctx.fillStyle = s.sameColor ? s.color : s.cursorColor;
    if (s.cursorStyle === "block") ctx.fillRect(cx + 2, cy, l.fs * 0.55, l.fs);
    else if (s.cursorStyle === "underline")
      ctx.fillRect(cx + 2, cy + l.fs, l.fs * 0.6, Math.max(2, l.fs * 0.05));
    else ctx.fillRect(cx + 3, cy, Math.max(2, l.fs * 0.04), l.fs);
  }
}
export function validateProject(input) {
  const s = { ...defaults };
  if (!input || typeof input !== "object")
    throw new Error("Invalid project file format");
  const nums = {
    size: [12, 160],
    x: [-2000, 2000],
    y: [-2000, 2000],
    lineHeight: [1, 2.5],
    speed: [15, 500],
    variance: [0, 150],
    punctuation: [0, 1500],
    start: [0, 5000],
    end: [0, 5000],
    blink: [100, 2000],
  };
  for (const [k, [a, b]] of Object.entries(nums))
    if (Number.isFinite(input[k])) s[k] = Math.min(b, Math.max(a, input[k]));
  for (const k of ["cursor", "sameColor", "italic", "loop"])
    if (typeof input[k] === "boolean") s[k] = input[k];
  for (const k of ["color", "cursorColor", "bg", "bg2"])
    if (/^#[0-9a-f]{6}$/i.test(input[k])) s[k] = input[k];
  const enums = {
    font: Object.keys(fonts),
    weight: ["400", "500", "600", "700"],
    align: ["left", "center", "right"],
    horizontal: ["left", "center", "right"],
    vertical: ["top", "center", "bottom"],
    cursorStyle: ["bar", "block", "underline"],
    background: ["solid", "gradient", "transparent"],
    ratio: ["16:9", "9:16", "1:1", "4:3"],
    resolution: [720, 1080],
    fps: [24, 30, 60],
  };
  // Migrate the earlier device-font catalog to bundled open-source alternatives.
  const legacyFonts = {
    heiti: "notoSans",
    fangsong: "notoSerif",
    dengxian: "notoSans",
    jhenghei: "notoSans",
    nsimsun: "notoSerif",
    courier: "spaceMono",
    lucida: "sourceCode",
    arial: "sans",
    segoe: "openSans",
    calibri: "lato",
    verdana: "openSans",
    tahoma: "roboto",
    trebuchet: "workSans",
    bahnschrift: "oswald",
    georgia: "serif",
    times: "libreBaskerville",
    cambria: "sourceSerif",
    constantia: "crimson",
    palatino: "cormorant",
    impact: "anton",
    arialBlack: "bebas",
    comic: "caveat",
    ink: "caveat",
    print: "caveat",
    script: "dancing",
    gabriola: "pacifico",
  };
  if (legacyFonts[input.font]) s.font = legacyFonts[input.font];
  for (const [k, values] of Object.entries(enums))
    if (values.includes(input[k])) s[k] = input[k];
  s.text =
    typeof input.text === "string"
      ? graphemes(input.text).slice(0, 1000).join("")
      : defaults.text;
  if (
    Array.isArray(input.recorded) &&
    input.recorded.length === graphemes(s.text).length &&
    input.recorded.every((v) => Number.isFinite(v) && v >= 0 && v <= 5000)
  )
    s.recorded = input.recorded;
  return s;
}
