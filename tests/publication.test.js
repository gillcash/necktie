const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");

const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/publish.yml"), "utf8").replace(/\r\n/g, "\n");
const bash = process.platform === "win32" ? path.join(process.env.ProgramFiles, "Git/bin/bash.exe") : "bash";

function stepScript(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return workflow.match(new RegExp(`- name: ${escaped}\\n(?: {8}.*\\n)*? {8}run: \\|\\n((?: {10}.*(?:\\n|$))*)`))[1].replace(/^ {10}/gm, "");
}

function jobs() {
  const lines = workflow.split("\n");
  const sections = {};
  let current;
  for (const line of lines.slice(lines.indexOf("jobs:") + 1)) {
    const header = line.match(/^  ([\w-]+):\s*$/);
    if (header) sections[(current = header[1])] = [];
    else if (current) sections[current].push(line);
  }
  return Object.fromEntries(Object.entries(sections).map(([name, body]) => [name, body.join("\n")]));
}

test("publication verification retries registry visibility and fails after twelve attempts", (t) => {
  const body = stepScript("Verify npm publication");
  for (const [visibleOn, attempts, sleeps, status] of [[1, 1, 0, 0], [3, 3, 2, 0], [13, 12, 11, 1]]) {
    const directory = temporary(t);
    const result = spawnSync(bash, ["--noprofile", "--norc", "-e", "-o", "pipefail"], {
      cwd: directory, encoding: "utf8", timeout: 10000,
      input: `
        node() { case "$2" in *.name) echo @test/necktie;; *.version) echo 1.2.3;; *) return 2;; esac; }
        npm() {
          [ "$*" = "view @test/necktie@1.2.3 version" ] || return 2
          count=0
          if [ -f attempts ]; then read -r count < attempts; fi
          count=$((count + 1))
          echo "$count" > attempts
          if [ "$count" -ge ${visibleOn} ]; then echo 1.2.3; else return 1; fi
        }
        sleep() { [ "$1" = 5 ] && echo sleep >> sleeps; }
        ${body}
      `,
    });
    assert.ifError(result.error);
    assert.equal(result.status, status, result.stderr);
    assert.equal(Number(fs.readFileSync(path.join(directory, "attempts"), "utf8")), attempts);
    const sleepFile = path.join(directory, "sleeps");
    assert.equal(fs.existsSync(sleepFile) ? fs.readFileSync(sleepFile, "utf8").trim().split("\n").length : 0, sleeps);
    assert.match(result.stdout, status ? /::error::.*after 12 attempts/ : /is available on npm/);
  }
});

test("the test workflow pins actions to commit SHAs and reads with a read-only token", () => {
  const testWorkflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/test.yml"), "utf8").replace(/\r\n/g, "\n");
  const uses = [...testWorkflow.matchAll(/^\s+- uses: (\S+)(.*)$/gm)];
  assert.ok(uses.length >= 3);
  for (const [, action, comment] of uses) {
    assert.match(action, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, action);
    assert.match(comment, /^ # v\d+\.\d+\.\d+$/, action);
  }
  assert.match(testWorkflow, /^permissions:\n  contents: read$/m);
});

test("only a dependency-free job that follows verification can request an OIDC token", () => {
  const { verify, publish, ...others } = jobs();
  assert.deepEqual(Object.keys(others), []);
  assert.doesNotMatch(workflow.slice(0, workflow.indexOf("\njobs:")), /id-token/);
  assert.match(publish, /^    needs: verify$/m);
  assert.match(publish, /^      id-token: write$/m);
  assert.doesNotMatch(publish, /npm ci|npm test|setup-python/);
  assert.match(verify, /npm ci --prefix necktie-mcp/);
  assert.match(verify, /npm test/);
  assert.doesNotMatch(verify, /id-token|npm publish|registry-url/);
  for (const [, script] of workflow.matchAll(/run: \|\n((?: {10}.*(?:\n|$))*)/g)) assert.doesNotMatch(script, /\$\{\{/);
  assert.doesNotMatch(workflow, /^\s+run: (?!\|).*\$\{\{/m);
});

test("release guard accepts only the package version tag on main and never evaluates the tag", (t) => {
  const body = stepScript("Require a version tag on main");
  for (const [refType, tag, ancestor, status] of [
    ["tag", "v1.2.3", 0, 0],
    ["branch", "main", 0, 1],
    ["tag", "v1.2.4", 0, 1],
    ["tag", "v1.2.3", 1, 1],
    ["tag", "v$(touch pwned)", 0, 1],
    ["tag", 'v1.2.3";touch pwned;"', 0, 1],
  ]) {
    const directory = temporary(t);
    const result = spawnSync(bash, ["--noprofile", "--norc", "-e", "-o", "pipefail"], {
      cwd: directory, encoding: "utf8", timeout: 10000,
      env: { ...process.env, GITHUB_REF_TYPE: refType, RELEASE_TAG: tag, GITHUB_SHA: "abc123", ANCESTOR: String(ancestor) },
      input: `
        node() { case "$2" in *.version) echo 1.2.3;; *) return 2;; esac; }
        git() { echo "$*" >> git-calls; [ "$*" = "merge-base --is-ancestor abc123 origin/main" ] || return 2; return "$ANCESTOR"; }
        ${body}
      `,
    });
    assert.ifError(result.error);
    assert.equal(result.status, status, `${refType} ${tag}: ${result.stdout}${result.stderr}`);
    assert.equal(fs.existsSync(path.join(directory, "pwned")), false, tag);
    const ancestryChecked = fs.existsSync(path.join(directory, "git-calls"));
    assert.equal(ancestryChecked, refType === "tag" && tag === "v1.2.3", `${refType} ${tag}`);
    assert.match(result.stdout, status ? /::error::/ : /v1\.2\.3 points to a commit on main/);
  }
});
