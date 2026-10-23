import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { defaults, fontOptions, validateProject } from "../src/engine.js";
import { exportFaces } from "../src/font-loader.js";

test("Every offered font ships valid WOFF2 assets and its license", async () => {
  const assets = JSON.parse(
    await readFile(new URL("../src/font-assets.json", import.meta.url)),
  );
  assert.equal(fontOptions.length, 32);
  for (const font of fontOptions) {
    const faces = assets.filter((face) => face.family === font.face);
    assert.ok(faces.length, font.label);
    await access(
      new URL(
        `../public/fonts/${faces[0].url.split("/")[2]}/LICENSE.txt`,
        import.meta.url,
      ),
    );
  }
  for (const face of assets) {
    const bytes = await readFile(
      new URL(`../public${face.url}`, import.meta.url),
    );
    assert.equal(bytes.toString("ascii", 0, 4), "wOF2", face.url);
  }
});

test("HTML embeds only relevant subsets, including Chinese fallback and correct italic weight", async () => {
  const regular = await exportFaces({
    ...defaults,
    font: "sans",
    text: "Hello",
  });
  assert.ok(regular.some((face) => face.family === "TF Inter"));
  assert.ok(regular.every((face) => face.style === "normal"));
  const mixed = await exportFaces({
    ...defaults,
    font: "sans",
    text: "Hello 世界",
    italic: true,
    weight: "700",
  });
  assert.ok(
    mixed.some((face) => face.family === "TF Inter" && face.style === "italic"),
  );
  assert.ok(mixed.some((face) => face.family === "TF Noto Sans SC"));
  assert.ok(
    mixed.length < 20,
    "Do not embed the entire CJK font for a short phrase",
  );
});

test("Earlier device font projects migrate to bundled families", () => {
  assert.equal(validateProject({ ...defaults, font: "georgia" }).font, "serif");
  assert.equal(
    validateProject({ ...defaults, font: "heiti" }).font,
    "notoSans",
  );
  for (const font of fontOptions)
    assert.equal(
      validateProject({ ...defaults, font: font.value }).font,
      font.value,
    );
});
