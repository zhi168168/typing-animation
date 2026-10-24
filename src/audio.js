// Actual keyboard recordings from Mechvibes.
// Source and MIT notice: public/sounds/keyboard/README.md and LICENSE.txt.
const letterKeys = ["a", "s", "d", "f", "j", "k", "l", "h"];
const keys = [...letterKeys, "space", "enter"];
const sounds = new WeakMap();
const loading = new WeakMap();
const active = new WeakMap();
export const soundOptions = [
  { id: "cherrymx-brown-pbt", label: "Brown · PBT", path: "" },
  { id: "cherrymx-blue-pbt", label: "Blue · PBT", path: "cherrymx-blue-pbt/" },
  { id: "cherrymx-red-pbt", label: "Red · PBT", path: "cherrymx-red-pbt/" },
  {
    id: "cherrymx-black-pbt",
    label: "Black · PBT",
    path: "cherrymx-black-pbt/",
  },
  { id: "cherrymx-blue-abs", label: "Blue · ABS", path: "cherrymx-blue-abs/" },
  {
    id: "topre-purple-hybrid-pbt",
    label: "Topre · PBT",
    path: "topre-purple-hybrid-pbt/",
  },
];
export const defaultSound = "cherrymx-red-pbt";
const optionFor = (id) =>
  soundOptions.find((option) => option.id === id) ||
  soundOptions.find((option) => option.id === defaultSound);

export function keyFor(index, char = "") {
  return char === "\n"
    ? "enter"
    : char === " "
      ? "space"
      : letterKeys.includes(char.toLowerCase())
        ? char.toLowerCase()
        : letterKeys[index % letterKeys.length];
}

export async function loadKeySounds(context, id = defaultSound) {
  const option = optionFor(id);
  if (!sounds.has(context)) sounds.set(context, new Map());
  if (!loading.has(context)) loading.set(context, new Map());
  const buffers = sounds.get(context),
    pendingLoads = loading.get(context);
  if (buffers.has(option.id)) return;
  if (!pendingLoads.has(option.id)) {
    const pending = Promise.all(
      keys.map(async (key) => {
        const response = await fetch(
          `/sounds/keyboard/${option.path}${key}.wav`,
        );
        if (!response.ok)
          throw new Error(
            "Keyboard recordings could not load. Please refresh and try again.",
          );
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        return [key, buffer];
      }),
    )
      .then((entries) => {
        buffers.set(option.id, Object.fromEntries(entries));
      })
      .finally(() => pendingLoads.delete(option.id));
    pendingLoads.set(option.id, pending);
  }
  await pendingLoads.get(option.id);
}

export function stopKeySounds(context) {
  for (const source of active.get(context) || []) {
    source.stop();
    source.disconnect();
  }
  active.delete(context);
}

export function playKeyClick(
  context,
  index = 0,
  char = "",
  delay = 0,
  id = defaultSound,
) {
  const buffers = sounds.get(context)?.get(optionFor(id).id);
  if (context.state !== "running" || !buffers) return;
  const key = keyFor(index, char);
  const source = context.createBufferSource();
  source.buffer = buffers[key];
  // Preserve the recorded pitch and the full key-down/key-up sound.
  source.connect(context.destination);
  if (!active.has(context)) active.set(context, new Set());
  const sources = active.get(context);
  sources.add(source);
  source.onended = () => {
    source.disconnect();
    sources.delete(source);
  };
  source.start(context.currentTime + delay);
}

// Render every key at its timeline timestamp, independently of preview FPS.
export async function renderKeyboardAudio(
  t,
  id = defaultSound,
  duration = t.duration,
  signal,
) {
  signal?.throwIfAborted();
  const context = new OfflineAudioContext(1, Math.ceil(duration * 48), 48000);
  await loadKeySounds(context, id);
  signal?.throwIfAborted();
  const buffers = sounds.get(context).get(optionFor(id).id);
  t.events.forEach(({ char, at }, index) => {
    const source = context.createBufferSource();
    source.buffer = buffers[keyFor(index, char)];
    source.connect(context.destination);
    source.start(at / 1000);
  });
  const rendered = await context.startRendering();
  signal?.throwIfAborted();
  return encodeWav(rendered.getChannelData(0), rendered.sampleRate);
}

export function encodeWav(samples, sampleRate) {
  const wav = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(wav.buffer);
  const text = (offset, value) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, wav.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  // Normalize overlapping recordings together to avoid clipping or changing pitch.
  let peak = 1;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  samples.forEach((sample, i) => {
    const value = sample / peak;
    view.setInt16(
      44 + i * 2,
      Math.round(value * (value < 0 ? 32768 : 32767)),
      true,
    );
  });
  return wav;
}
