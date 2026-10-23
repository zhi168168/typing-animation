import { fontOptions } from "./engine.js";

export function selectedFont(s) {
  return (
    fontOptions.find((f) => f.value === s.font) ||
    fontOptions.find((f) => f.value === "sans")
  );
}

export async function ensureFonts(s) {
  const text = s.text || "Aa";
  const style = `${s.italic ? "italic" : "normal"} ${s.weight} 32px`;
  await Promise.all(
    [selectedFont(s).face, "TF Noto Sans SC"].map((family) =>
      document.fonts.load(`${style} "${family}"`, text),
    ),
  );
}

function covers(range, text) {
  if (!range) return true;
  const ranges = range.split(",").map((part) => {
    const [start, end = start] = part.trim().replace(/^U\+/i, "").split("-");
    return [
      parseInt(start.replaceAll("?", "0"), 16),
      parseInt(end.replaceAll("?", "F"), 16),
    ];
  });
  return [...text].some((char) =>
    ranges.some(
      ([lo, hi]) => char.codePointAt(0) >= lo && char.codePointAt(0) <= hi,
    ),
  );
}

export async function exportFaces(s) {
  const { default: assets } = await import("./font-assets.json", {
    with: { type: "json" },
  });
  return [...new Set([selectedFont(s).face, "TF Noto Sans SC"])].flatMap(
    (family) => {
      const familyFaces = assets.filter((f) => f.family === family);
      const style =
        s.italic && familyFaces.some((f) => f.style === "italic")
          ? "italic"
          : "normal";
      const candidates = familyFaces.filter((f) => f.style === style);
      const distance = (f) => {
        const [lo, hi = lo] = f.weight.split(" ").map(Number);
        return Math.max(lo - Number(s.weight), Number(s.weight) - hi, 0);
      };
      const nearest = Math.min(...candidates.map(distance));
      return candidates.filter(
        (f) => distance(f) === nearest && covers(f.range, s.text || "Aa"),
      );
    },
  );
}

export async function embeddedFontCSS(s) {
  const faces = await exportFaces(s);
  const licenses = await Promise.all(
    [
      ...new Set(
        faces.map((face) => face.url.slice(0, face.url.lastIndexOf("/"))),
      ),
    ].map(async (dir) => {
      const response = await fetch(`${dir}/LICENSE.txt`);
      if (!response.ok)
        throw new Error(
          "Could not download the font license. Please try again.",
        );
      return `/* ${dir}\n${(await response.text()).replaceAll("*/", "* /").replaceAll("<", "&lt;")} */`;
    }),
  );
  return (
    licenses.join("\n") +
    "\n" +
    (
      await Promise.all(
        faces.map(async (face) => {
          const response = await fetch(face.url);
          if (!response.ok)
            throw new Error("Could not download the font. Please try again.");
          const bytes = new Uint8Array(await response.arrayBuffer());
          let binary = "";
          for (let i = 0; i < bytes.length; i += 8192)
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          return `@font-face{font-family:'${face.family}';font-style:${face.style};font-weight:${face.weight};src:url(data:font/woff2;base64,${btoa(binary)}) format('woff2');${face.range ? `unicode-range:${face.range};` : ""}}`;
        }),
      )
    ).join("\n")
  );
}
