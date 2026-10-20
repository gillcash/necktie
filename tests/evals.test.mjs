import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { run } from "../benchmarks/run-evals.mjs";

const fixtures = JSON.parse(fs.readFileSync(new URL("../benchmarks/fixtures.json", import.meta.url), "utf8")).cases;

async function mockModel(t) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      const body = JSON.parse(raw);
      const anthropic = req.url === "/v1/messages";
      const system = anthropic ? body.system || "" : body.messages.filter((message) => message.role === "system").map((message) => message.content).join("");
      const prompt = body.messages.at(-1).content;
      requests.push({ url: req.url, headers: req.headers, system, prompt });
      let text;
      if (prompt.startsWith("You are grading one response")) {
        const count = prompt.split("Expectations:\n")[1].split("\n\nFor each expectation")[0].split("\n").length;
        const met = prompt.includes("RESPONSE-A");
        text = JSON.stringify({ results: Array.from({ length: count }, (_, index) => ({ index: index + 1, met, reason: "mock" })) });
      } else {
        text = system.includes("NECKTIE ACTIVE") ? "RESPONSE-A" : "RESPONSE-B";
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(anthropic
        ? { content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 3 } }
        : { choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 3 } }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { requests, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

for (const [provider, keyVariable] of [["anthropic", "ANTHROPIC_API_KEY"], ["openai", "OPENAI_API_KEY"]]) {
  test(`behavioral eval runs every fixture with and without the policy and grades blind (${provider})`, async (t) => {
    const mock = await mockModel(t);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "necktie-eval-"));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const output = path.join(directory, "report.json");
    const lines = [];
    const code = await run(["--provider", provider, "--model", "test-model", "--samples", "2", "--base-url", mock.baseUrl, "--output", output],
      { [keyVariable]: "test-key" }, (line) => lines.push(line));
    assert.equal(code, 0);
    assert.equal(mock.requests.length, fixtures.length * 2 * 2 * 2);
    const auth = provider === "anthropic" ? "x-api-key" : "authorization";
    assert.ok(mock.requests.every((request) => request.headers[auth].includes("test-key")));
    const gradings = mock.requests.filter((request) => request.prompt.startsWith("You are grading one response"));
    assert.equal(gradings.length, fixtures.length * 2 * 2);
    for (const grading of gradings) {
      assert.equal(grading.system, "");
      assert.doesNotMatch(grading.prompt, /NECKTIE ACTIVE|Let Necktie decide/);
    }
    const report = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(report.records.length, fixtures.length * 2 * 2);
    assert.deepEqual(report.summary.map((row) => [row.fixture, row.condition, row.graded, row.score]).sort(),
      fixtures.flatMap((fixture) => [[fixture.id, "baseline", 2, 0], [fixture.id, "necktie", 2, 1]]).sort());
    assert.match(report.policySha256, /^[0-9a-f]{64}$/);
    assert.match(lines.at(-1), /Report written to/);
  });
}

test("behavioral eval makes no request without an API key, and a dry run makes none either", async (t) => {
  const mock = await mockModel(t);
  await assert.rejects(run(["--model", "test-model", "--base-url", mock.baseUrl], {}, () => {}), /ANTHROPIC_API_KEY.*not part of npm test/);
  const lines = [];
  assert.equal(await run(["--dry-run"], {}, (line) => lines.push(line)), 0);
  assert.match(lines[0], new RegExp(`${fixtures.length} fixtures x 2 conditions x 3 samples = ${fixtures.length * 12} anthropic API calls`));
  assert.equal(mock.requests.length, 0);
});
