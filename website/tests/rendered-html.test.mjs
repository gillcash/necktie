import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete Necktie case", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Necktie — Follow the money<\/title>/i);
  assert.match(html, /He follows the money\./);
  assert.match(html, /He finds the hidden cost\./);
  assert.match(html, /He takes a side\./);
  assert.match(html, /One metric\. Four hidden costs\./);
  assert.match(html, /Who benefits\?/);
  assert.match(html, /Who pays\?/);
  assert.match(html, /Who decides\?/);
  assert.match(html, /Who can leave\?/);
  assert.match(html, /What disappears from the metric\?/);
  assert.match(html, /No benchmark-performance claim yet\./);
  assert.match(html, /Lite/);
  assert.match(html, /Full/);
  assert.doesNotMatch(html, /mammon|angel/i);
  assert.match(html, /Opinionated, not arbitrary\./);
  assert.match(html, /http:\/\/localhost(?::3000)?\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships six native, script-free install choices", async () => {
  const response = await render();
  const html = await response.text();

  assert.equal((html.match(/name="host"/g) ?? []).length, 6);
  assert.match(html, /id="host-codex"[^>]*checked=""/);
  assert.match(html, /codex plugin add necktie@necktie/);
  assert.match(html, /\/plugin install necktie@necktie/);
  assert.match(html, /copilot plugin install necktie@necktie/);
  assert.match(html, /gemini extensions install https:\/\/github\.com\/gillcash\/necktie/);
  assert.match(html, /pi install git:github\.com\/gillcash\/necktie/);
  assert.match(html, /@gillcash\/necktie/);
  assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*(analytics|tracking|pixel)/i);
});

test("rejects a malformed metadata host without failing the page", async () => {
  const response = await render({
    "x-forwarded-host": "attacker.example/path",
    "x-forwarded-proto": "javascript",
  });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /http:\/\/localhost:3000\/og\.png/);
  assert.doesNotMatch(html, /attacker\.example|javascript:/);
});

test("removes unused starter machinery", async () => {
  const [packageJson, page] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(packageJson, /react-loading-skeleton|drizzle|tailwind/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await assert.rejects(access(new URL("../db/", import.meta.url)));
  await assert.rejects(access(new URL("../examples/", import.meta.url)));
});
