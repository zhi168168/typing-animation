import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  graphemes,
  timeline,
  visibleCount,
  dimensions,
  validateProject,
} from "../src/engine.js";
test("中文与组合 emoji 按完整字符打字", () => {
  assert.deepEqual(graphemes("你👨‍👩‍👧‍👦👍🏽好"), ["你", "👨‍👩‍👧‍👦", "👍🏽", "好"]);
});
test("时间轴在开始延迟、标点停顿与结束停留处保持一致", () => {
  const t = timeline({
    ...defaults,
    text: "你，好",
    start: 500,
    end: 1000,
    speed: 100,
    variance: 0,
    punctuation: 200,
  });
  assert.deepEqual(
    t.events.map((e) => e.at),
    [500, 600, 900],
  );
  assert.equal(visibleCount(t, 499), 0);
  assert.equal(visibleCount(t, 600), 2);
  assert.equal(visibleCount(t, 900), 3);
  assert.equal(t.duration, 2000);
});
test("录制节奏可直接用于确定性导出", () => {
  const t = timeline({
    ...defaults,
    text: "abc",
    start: 0,
    end: 0,
    recorded: [200, 500, 100],
    punctuation: 0,
  });
  assert.deepEqual(
    t.events.map((e) => e.at),
    [0, 200, 700],
  );
  assert.equal(t.duration, 800);
});
test("横竖屏分辨率保持偶数，满足 H264 编码", () => {
  assert.deepEqual(
    dimensions({ ...defaults, ratio: "9:16", resolution: 1080 }),
    [1080, 1920],
  );
  assert.deepEqual(
    dimensions({ ...defaults, ratio: "16:9", resolution: 720 }),
    [1280, 720],
  );
});
test("录制时已有的标点停顿不会被重复叠加", () => {
  const t = timeline({
    ...defaults,
    text: "a,b",
    start: 0,
    end: 0,
    recorded: [100, 700, 100],
    punctuation: 500,
  });
  assert.deepEqual(
    t.events.map((e) => e.at),
    [0, 100, 800],
  );
});
test("导入项目限制无效参数与不完整录制数据", () => {
  const s = validateProject({
    text: "abc",
    size: 999,
    color: "javascript:bad",
    ratio: "invalid",
    fps: 1000,
    recorded: [1],
  });
  assert.equal(s.size, 160);
  assert.equal(s.color, defaults.color);
  assert.equal(s.ratio, "16:9");
  assert.equal(s.fps, 30);
  assert.equal(s.recorded, null);
});
