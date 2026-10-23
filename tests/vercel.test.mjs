import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createVercelHandler } from "../accounts/vercel.mjs";
import { createAccounts } from "../accounts/auth.mjs";

async function serve(t, handler) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
const env = {
  ACCOUNT_ORIGIN: "https://typing-animation.com",
  DATABASE_URL: "postgresql://test:test@db.example/typeflow?sslmode=require",
  BETTER_AUTH_SECRET: "a-test-secret-with-more-than-thirty-two-characters",
  SMTP_HOST: "test.invalid",
  SMTP_FROM: "Typeflow <test@test.invalid>",
  VERCEL: "1",
};

test("Vercel capabilities work without credentials or a database connection", async (t) => {
  const base = await serve(
    t,
    createVercelHandler({
      env: {},
      createRuntime() {
        throw new Error("must not connect");
      },
    }),
  );
  const result = await fetch(`${base}/api/auth/config`);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal((await result.json()).configured, false);
  assert.equal((await fetch(`${base}/api/auth/get-session`)).status, 503);
});

test("Vercel retries failed initialization and reuses its real auth runtime", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "typeflow-vercel-"));
  let attempts = 0,
    service;
  t.after(async () => {
    await service?.close();
    await rm(directory, { recursive: true, force: true });
  });
  const handler = createVercelHandler({
    env,
    async createRuntime(config) {
      if (++attempts === 1) throw new Error("temporary database outage");
      service = await createAccounts({ ...config, local: true }, { directory });
      return service;
    },
  });
  const base = await serve(t, handler);
  assert.equal((await fetch(`${base}/api/auth/get-session`)).status, 503);
  assert.equal((await fetch(`${base}/api/auth/get-session`)).status, 200);
  assert.equal((await fetch(`${base}/api/auth/get-session`)).status, 200);
  assert.equal(attempts, 2);
  const result = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      origin: env.ACCOUNT_ORIGIN,
      "content-type": "application/json",
      "x-vercel-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify({
      name: "Vercel test",
      email: "vercel@example.com",
      password: "test-password-123",
      callbackURL: `${env.ACCOUNT_ORIGIN}/account`,
    }),
  });
  assert.equal(result.status, 200);
  assert.equal(service.messages().length, 1);
  assert.match(
    service.messages()[0].text,
    /https:\/\/typing-animation\.com\/api\/auth\/verify-email/,
  );
  assert.equal(
    (
      await fetch(`${base}/api/auth/get-session`, {
        headers: { origin: "https://evil.example" },
      })
    ).status,
    403,
  );
});
