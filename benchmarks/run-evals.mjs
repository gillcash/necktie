#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import policyModule from "../lib/necktie-policy.cjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS = {
  anthropic: { keyVariable: "ANTHROPIC_API_KEY", baseUrl: "https://api.anthropic.com" },
  openai: { keyVariable: "OPENAI_API_KEY", baseUrl: "https://api.openai.com" },
};
const USAGE = `Usage: npm run eval -- --model <id> [--provider anthropic|openai] [--grader-model <id>]
       [--samples 3] [--max-tokens 1500] [--fixtures benchmarks/fixtures.json] [--output <file>]
       [--base-url <url>] [--dry-run]

Runs every fixture with and without the Necktie policy, then grades each response
against the fixture's expectations with a blind grader call. It calls a paid model
API, needs ANTHROPIC_API_KEY or OPENAI_API_KEY, and is not part of npm test.`;

function parseArgs(argv) {
  const options = { samples: 3, maxTokens: 1500, fixtures: path.join(here, "fixtures.json"), dryRun: false };
  const names = { "--provider": "provider", "--model": "model", "--grader-model": "graderModel", "--samples": "samples",
    "--max-tokens": "maxTokens", "--fixtures": "fixtures", "--output": "output", "--base-url": "baseUrl" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (names[arg] && index + 1 < argv.length) options[names[arg]] = argv[++index];
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  options.samples = Number(options.samples);
  options.maxTokens = Number(options.maxTokens);
  if (!Number.isInteger(options.samples) || options.samples < 1) throw new Error("--samples must be a positive integer");
  return options;
}

function chooseProvider(options, env) {
  if (options.provider) {
    if (!PROVIDERS[options.provider]) throw new Error(`--provider must be one of: ${Object.keys(PROVIDERS).join(", ")}`);
    return options.provider;
  }
  return Object.keys(PROVIDERS).find((name) => env[PROVIDERS[name].keyVariable]) || "anthropic";
}

async function callModel({ provider, baseUrl, apiKey, model, system, prompt, maxTokens }) {
  const anthropic = provider === "anthropic";
  const url = `${baseUrl.replace(/\/$/, "")}${anthropic ? "/v1/messages" : "/v1/chat/completions"}`;
  const headers = anthropic
    ? { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
    : { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
  const body = anthropic
    ? { model, max_tokens: maxTokens, ...(system ? { system } : {}), messages: [{ role: "user", content: prompt }] }
    : { model, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }] };
  for (let attempt = 1; ; attempt += 1) {
    const started = Date.now();
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const latencyMs = Date.now() - started;
    if (response.ok) {
      const data = await response.json();
      const text = anthropic
        ? (data.content || []).filter((part) => part.type === "text").map((part) => part.text).join("")
        : data.choices?.[0]?.message?.content ?? "";
      const usage = anthropic
        ? { inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null }
        : { inputTokens: data.usage?.prompt_tokens ?? null, outputTokens: data.usage?.completion_tokens ?? null };
      return { text, latencyMs, usage };
    }
    const detail = (await response.text()).slice(0, 300);
    if (attempt >= 3 || (response.status !== 429 && response.status < 500)) {
      throw new Error(`${provider} returned HTTP ${response.status}: ${detail}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
}

function gradingPrompt(fixture, response) {
  const expectations = fixture.expectations.map((expectation, index) => `${index + 1}. ${expectation}`).join("\n");
  return `You are grading one response to a user request. Judge only what the response says, not its length or style.

User request:
<request>
${fixture.prompt}
</request>

Response to grade:
<response>
${response}
</response>

Expectations:
${expectations}

For each expectation, decide whether the response meets it. Return only JSON in this shape, with one entry per expectation in order:
{"results":[{"index":1,"met":true,"reason":"one sentence citing the response"}]}`;
}

function parseGrades(text, count) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const results = JSON.parse(match[0]).results;
    if (!Array.isArray(results) || results.length !== count || results.some((item) => typeof item.met !== "boolean")) return null;
    return results.map((item, index) => ({ index: index + 1, met: item.met, reason: String(item.reason ?? "") }));
  } catch {
    return null;
  }
}

function summarize(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.fixture}\u0000${record.condition}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return [...groups.values()].map((group) => {
    const graded = group.filter((record) => record.score !== null);
    const mean = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    return {
      fixture: group[0].fixture,
      condition: group[0].condition,
      samples: group.length,
      graded: graded.length,
      score: mean(graded.map((record) => record.score)),
      meanLatencyMs: mean(group.map((record) => record.latencyMs)),
      meanOutputTokens: mean(group.map((record) => record.usage.outputTokens).filter((value) => value !== null)),
    };
  });
}

function formatTable(summary) {
  const fixed = (value, digits) => (value === null ? "n/a" : value.toFixed(digits));
  const rows = summary.map((row) => [row.fixture, row.condition, `${row.graded}/${row.samples}`, fixed(row.score, 2),
    fixed(row.meanLatencyMs, 0), fixed(row.meanOutputTokens, 0)]);
  const header = ["fixture", "condition", "graded", "score", "latency ms", "output tokens"];
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)));
  return [header, ...rows].map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join("  ")).join("\n");
}

export async function run(argv = process.argv.slice(2), env = process.env, log = console.log) {
  const options = parseArgs(argv);
  if (options.help) {
    log(USAGE);
    return 0;
  }
  const fixtures = JSON.parse(fs.readFileSync(options.fixtures, "utf8")).cases;
  const policy = policyModule.buildInstructions();
  const conditions = [{ name: "baseline", system: "" }, { name: "necktie", system: policy }];
  const provider = chooseProvider(options, env);
  const calls = fixtures.length * conditions.length * options.samples * 2;
  if (options.dryRun) {
    log(`Dry run: ${fixtures.length} fixtures x ${conditions.length} conditions x ${options.samples} samples = ${calls} ${provider} API calls (half generation, half grading).`);
    log(`Fixtures: ${fixtures.map((fixture) => fixture.id).join(", ")}. Policy: ${policy.length} characters as the system prompt in the necktie condition.`);
    return 0;
  }
  const apiKey = env[PROVIDERS[provider].keyVariable];
  if (!apiKey || !options.model) {
    throw new Error(`Set ${PROVIDERS[provider].keyVariable} and pass --model (or use --dry-run). This eval calls a paid model API and is not part of npm test.`);
  }
  const baseUrl = options.baseUrl || env.NECKTIE_EVAL_BASE_URL || PROVIDERS[provider].baseUrl;
  const graderModel = options.graderModel || options.model;
  const records = [];
  for (const fixture of fixtures) {
    for (const condition of conditions) {
      for (let sample = 1; sample <= options.samples; sample += 1) {
        const generation = await callModel({ provider, baseUrl, apiKey, model: options.model, system: condition.system, prompt: fixture.prompt, maxTokens: options.maxTokens });
        const grading = await callModel({ provider, baseUrl, apiKey, model: graderModel, system: "", prompt: gradingPrompt(fixture, generation.text), maxTokens: options.maxTokens });
        const grades = parseGrades(grading.text, fixture.expectations.length);
        records.push({
          fixture: fixture.id, condition: condition.name, sample, output: generation.text,
          latencyMs: generation.latencyMs, usage: generation.usage,
          grades, score: grades ? grades.filter((grade) => grade.met).length / grades.length : null,
        });
        log(`${fixture.id} ${condition.name} sample ${sample}: ${grades ? `${grades.filter((grade) => grade.met).length}/${grades.length} expectations met` : "grading failed"}`);
      }
    }
  }
  const summary = summarize(records);
  const report = {
    createdAt: new Date().toISOString(), provider, model: options.model, graderModel, samples: options.samples,
    policySha256: createHash("sha256").update(policy).digest("hex"),
    fixturesSha256: createHash("sha256").update(fs.readFileSync(options.fixtures)).digest("hex"),
    method: "Each fixture prompt is sent once per sample with no system prompt (baseline) and with the Necktie policy as the system prompt (necktie). A separate grader call sees only the request, the response and the expectations.",
    summary, records,
  };
  const output = options.output || path.join(here, "results", `${report.createdAt.replace(/[:.]/g, "-")}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  log(`\n${formatTable(summary)}\n\nReport written to ${output}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (error) => {
    console.error(`error: ${error.message}`);
    process.exitCode = 2;
  });
}
