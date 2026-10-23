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
  const key =
    char === "\n"
      ? "enter"
      : char === " "
        ? "space"
        : letterKeys.includes(char.toLowerCase())
          ? char.toLowerCase()
          : letterKeys[index % letterKeys.length];
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
