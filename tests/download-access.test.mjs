import test from "node:test";
import assert from "node:assert/strict";
import { requireDownloadSession } from "../src/download-access.js";

test("Downloads require a fresh session and fail closed on service errors", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  for (const [status, body, allowed] of [
    [200, null, false],
    [200, {}, false],
    [401, {}, false],
    [503, {}, false],
    [200, { user: { id: "creator" } }, true],
  ]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "/api/auth/get-session");
      assert.equal(options.cache, "no-store");
      assert.equal(options.credentials, "same-origin");
      return Response.json(body, { status });
    };
    if (allowed)
      assert.equal((await requireDownloadSession()).user.id, "creator");
    else await assert.rejects(requireDownloadSession());
  }
  globalThis.fetch = async () => {
    throw new TypeError("Offline");
  };
  await assert.rejects(requireDownloadSession());
});
