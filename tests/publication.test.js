const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");

test("publication verification retries registry visibility and fails after twelve attempts", (t) => {
  const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/publish.yml"), "utf8").replace(/\r\n/g, "\n");
  const body = workflow.match(/- name: Verify npm publication\n\s+shell: bash\n\s+run: \|\n((?: {10}.*(?:\n|$))*)/)[1].replace(/^ {10}/gm, "");
  const bash = process.platform === "win32" ? path.join(process.env.ProgramFiles, "Git/bin/bash.exe") : "bash";
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
