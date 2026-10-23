// Refresh self-hosted, openly licensed Fontsource assets from the npm registry.
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
const catalog = [
  ["sans", "inter", "Sans serif"],
  ["roboto", "roboto", "Sans serif"],
  ["openSans", "open-sans", "Sans serif"],
  ["lato", "lato", "Sans serif", false],
  ["montserrat", "montserrat", "Sans serif"],
  ["poppins", "poppins", "Sans serif", false],
  ["nunito", "nunito", "Sans serif"],
  ["raleway", "raleway", "Sans serif"],
  ["workSans", "work-sans", "Sans serif"],
  ["dmSans", "dm-sans", "Sans serif"],
  ["serif", "lora", "Serif"],
  ["playfair", "playfair-display", "Serif"],
  ["merriweather", "merriweather", "Serif"],
  ["libreBaskerville", "libre-baskerville", "Serif", false],
  ["crimson", "crimson-text", "Serif", false],
  ["sourceSerif", "source-serif-4", "Serif"],
  ["cormorant", "cormorant-garamond", "Serif"],
  ["mono", "jetbrains-mono", "Monospace"],
  ["firaCode", "fira-code", "Monospace"],
  ["sourceCode", "source-code-pro", "Monospace"],
  ["ibmMono", "ibm-plex-mono", "Monospace", false],
  ["spaceMono", "space-mono", "Monospace", false],
  ["bebas", "bebas-neue", "Display & handwriting", false],
  ["oswald", "oswald", "Display & handwriting"],
  ["anton", "anton", "Display & handwriting", false],
  ["dancing", "dancing-script", "Display & handwriting"],
  ["caveat", "caveat", "Display & handwriting"],
  ["pacifico", "pacifico", "Display & handwriting", false],
  ["notoSans", "noto-sans-sc", "中文"],
  ["notoSerif", "noto-serif-sc", "中文"],
  ["hand", "ma-shan-zheng", "中文", false],
  ["zhiMang", "zhi-mang-xing", "中文", false],
];
const options = [],
  faces = [];
for (const [value, id, group, variable = true] of catalog) {
  const pkg = `@fontsource${variable ? "-variable" : ""}/${id}`;
  const meta = await (
    await fetch(`https://registry.npmjs.org/${pkg}/latest`)
  ).json();
  if (!meta.dist) throw new Error(`No package: ${pkg}`);
  const temp = path.resolve("work/font-vendor", id);
  await mkdir(temp, { recursive: true });
  const archive = path.join(temp, "font.tgz");
  const response = await fetch(meta.dist.tarball);
  if (!response.ok) throw new Error(`Download failed: ${pkg}`);
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  execFileSync("tar", ["-xf", archive, "-C", temp]);
  const dir = path.join(temp, "package");
  const metadata = JSON.parse(
    await readFile(path.join(dir, "metadata.json"), "utf8"),
  );
  const family = `TF ${metadata.family}`;
  options.push({
    value,
    label: metadata.family,
    group,
    family: `"${family}", "TF Noto Sans SC", sans-serif`,
    face: family,
  });
  const target = path.join("public/fonts", id);
  await mkdir(target, { recursive: true });
  await copyFile(path.join(dir, "LICENSE"), path.join(target, "LICENSE.txt"));
  const cssFiles = variable
    ? ["wght.css", "wght-italic.css"]
    : [
        "400.css",
        "500.css",
        "600.css",
        "700.css",
        "400-italic.css",
        "500-italic.css",
        "600-italic.css",
        "700-italic.css",
      ];
  for (const cssFile of cssFiles) {
    const css = await readFile(path.join(dir, cssFile), "utf8").catch(() => "");
    for (const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      const body = match[1];
      const filename = body.match(/url\(\.\/files\/([^)]+)\)/)?.[1];
      if (!filename) throw new Error(`Invalid CSS: ${pkg}`);
      await copyFile(
        path.join(dir, "files", filename),
        path.join(target, filename),
      );
      faces.push({
        family,
        style: body.match(/font-style:\s*([^;]+)/)[1],
        weight: body.match(/font-weight:\s*([^;]+)/)[1],
        range: body.match(/unicode-range:\s*([^;]+)/)?.[1],
        url: `/fonts/${id}/${filename}`,
      });
    }
  }
  console.log(`${metadata.family} (${meta.version})`);
}
await writeFile("src/font-assets.json", JSON.stringify(faces));
await writeFile(
  "public/fonts/fonts.css",
  faces
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url('${f.url}') format('woff2');${f.range ? `unicode-range:${f.range};` : ""}}`,
    )
    .join("\n"),
);
const engine = await readFile("src/engine.js", "utf8");
const start = engine.indexOf("// Keep the original four IDs");
const end = engine.indexOf("export function graphemes");
await writeFile(
  "src/engine.js",
  engine.slice(0, start) +
    `// Keep the original four IDs for saved projects; font files are self-hosted.\nexport const fontOptions = ${JSON.stringify(options, null, 2)};\nexport const fonts = Object.fromEntries(fontOptions.map(font => [font.value,font.family]));\n` +
    engine.slice(end),
);
await writeFile(
  "public/fonts/README.txt",
  "Self-hosted open-source fonts distributed through Fontsource (https://fontsource.org). Each family directory includes its original license. Refresh using node scripts/vendor-fonts.mjs.\n",
);
console.log(`${options.length} families, ${faces.length} faces/subsets`);
