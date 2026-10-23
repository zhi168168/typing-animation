import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { siteURL, applySiteMetadata, robots, sitemap } from "../seo.mjs";

test("Site URLs normalize origins and reject invalid canonical targets", () => {
  assert.equal(siteURL(""), "");
  assert.equal(siteURL("https://EXAMPLE.com/"), "https://example.com");
  for (const value of [
    "javascript:alert(1)",
    "https://example.com/editor",
    "https://user:pass@example.com",
    "https://example.com/?preview=1",
    "https://example.com/#faq",
  ])
    assert.throws(() => siteURL(value));
});

test("Runtime origin replaces built metadata without duplicate canonical or stale share URLs", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const built = applySiteMetadata(html, "https://old.example");
  const served = applySiteMetadata(built, "https://new.example");
  assert.equal((served.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(!served.includes("old.example"));
  assert.ok(served.includes('href="https://new.example/"'));
  assert.ok(
    served.includes(
      'content="https://new.example/typing-animation-generator.png"',
    ),
  );
  assert.equal(applySiteMetadata(served, "https://new.example"), served);
  assert.ok(!applySiteMetadata(html, "").includes('rel="canonical"'));
  for (const match of served.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  ))
    assert.ok(JSON.parse(match[1])["@context"]);
});

test("Crawler discovery uses the same canonical origin and excludes unconfigured sitemap URLs", () => {
  assert.ok(!robots("").includes("Sitemap:"));
  assert.ok(
    robots("https://example.com").includes(
      "Sitemap: https://example.com/sitemap.xml",
    ),
  );
  assert.ok(
    sitemap("https://example.com").includes("<loc>https://example.com/</loc>"),
  );
  assert.ok(!sitemap("https://example.com").includes("<lastmod>"));
});

test("English landing content and FAQ answers are present without client rendering", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<html lang="en">/);
  assert.ok(!/\p{Script=Han}/u.test(html));
  assert.ok(html.includes("How to use the typing animation generator"));
  assert.ok(html.includes("MP4 does not support transparency"));
  assert.ok(html.includes("There is no GIF export"));
});

test("The editor has its own entry point and canonical URL", async () => {
  const [home, editor] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../editor.html", import.meta.url), "utf8"),
  ]);
  assert.ok(!home.includes('id="root"'));
  assert.ok(home.includes('href="/editor?templates=1"'));
  assert.ok(editor.includes('class="editor-page"'));
  assert.ok(editor.includes('id="root"'));
  const served = applySiteMetadata(editor, "https://example.com", "/editor");
  assert.ok(
    served.includes('rel="canonical" href="https://example.com/editor"'),
  );
  assert.equal((served.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(
    sitemap("https://example.com").includes(
      "<loc>https://example.com/editor</loc>",
    ),
  );
});
