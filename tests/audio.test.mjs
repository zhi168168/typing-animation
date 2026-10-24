import test from "node:test";
import assert from "node:assert/strict";
import { encodeWav, keyFor } from "../src/audio.js";

test("Keyboard mappings preserve space, enter and recorded letter keys", () => {
  assert.equal(keyFor(0, " "), "space");
  assert.equal(keyFor(2, "\n"), "enter");
  assert.equal(keyFor(0, "F"), "f");
  assert.equal(keyFor(9, "你"), "s");
});

test("Export WAV preserves silence and duration, normalizes overlaps without integer overflow", () => {
  const samples = new Float32Array([0, 0, 2, -2, 1, -1, 0]);
  const wav = encodeWav(samples, 48000);
  const data = new DataView(wav.buffer);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF");
  assert.equal(data.getUint32(4, true), wav.length - 8);
  assert.equal(data.getUint16(22, true), 1);
  assert.equal(data.getUint32(24, true), 48000);
  assert.equal(data.getUint32(40, true), samples.length * 2);
  assert.deepEqual(
    Array.from({ length: samples.length }, (_, i) =>
      data.getInt16(44 + i * 2, true),
    ),
    [0, 0, 32767, -32768, 16384, -16384, 0],
  );
});
