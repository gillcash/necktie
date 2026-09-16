import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { build, serve } from "../site.mjs";

const server = await serve(0);
const origin = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((done) => server.close(done)));
const html = await (await fetch(origin)).text();

test("serves the complete page, metadata, navigation and assets without scripts", async () => {
  for (const text of [
    "Necktie — Follow the money", "He follows the money.", "He finds the hidden cost.",
    "He takes a side.", "Who benefits?", "Who pays?", "Who decides?", "Who can leave?",
    "What disappears from the metric?", "No benchmark-performance claim yet.",
    "Opinionated, not arbitrary.", "Two lenses. One accountable user.",
  ]) assert.ok(html.includes(text), text);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /property="og:image" content="https?:\/\//);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /<script\b|\{\{SITE_ORIGIN\}\}/);

  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), id);
  for (const [, path] of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL("../dist" + path, import.meta.url)));
  }
  const hosting = JSON.parse(await readFile(new URL("../dist/.openai/hosting.json", import.meta.url)));
  assert.equal(hosting.static.directory, "dist");
  assert.equal(hosting.static.not_found_handling, "none");
  const manifest = await (await fetch(origin + "/site.webmanifest")).json();
  for (const icon of manifest.icons) assert.equal((await fetch(origin + icon.src)).status, 200, icon.src);
});

test("all six labelled native radio choices retain their install instructions", () => {
  assert.equal((html.match(/name="host"/g) || []).length, 6);
  assert.equal((html.match(/type="radio" checked/g) || []).length, 1);
  for (const [host, command] of Object.entries({
    codex: "codex plugin add necktie@necktie",
    claude: "/plugin install necktie@necktie",
    copilot: "copilot plugin install necktie@necktie",
    gemini: "gemini extensions install https://github.com/gillcash/necktie",
    pi: "pi install git:github.com/gillcash/necktie",
    opencode: "@gillcash/necktie",
  })) {
    assert.match(html, new RegExp(`<label><input id="host-${host}"[^>]+>[^<]+</label>\\s*<section class="install-panel"`));
    assert.ok(html.includes(command), host);
    assert.ok(html.includes(`id="${host}-panel-title"`), host);
  }
});

test("preview allows public assets, supports HEAD, and hides private or unknown paths", async () => {
  const head = await fetch(origin, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.match(head.headers.get("content-type"), /^text\/html/);
  assert.equal(await head.text(), "");
  assert.equal((await fetch(origin, { method: "POST" })).status, 405);
  for (const path of ["/.openai/hosting.json", "/package.json", "/%2e%2e/package.json", "/missing", "/styles/"]) {
    assert.equal((await fetch(origin + path)).status, 404, path);
  }
});

test("build accepts a public origin and rejects unsafe metadata URLs before changing output", async () => {
  try {
    await build("https://necktie.example");
    const built = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
    assert.equal((built.match(/https:\/\/necktie.example\/og\.png/g) || []).length, 2);
    for (const url of ["javascript:alert(1)", "file:///tmp/page", "https://user:secret@example.com", "https://example.com/path", "https://example.com/?query=1", "https://example.com/#fragment", "https://bad\"host/"]) {
      await assert.rejects(build(url));
    }
    assert.equal(await readFile(new URL("../dist/index.html", import.meta.url), "utf8"), built);
  } finally {
    await build();
  }
});
