import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import necktiePlugin from "../.opencode/plugins/necktie.mjs";
import sessions from "../lib/necktie-session.cjs";
import helpers from "./helpers.cjs";

async function fixture(t) {
  const configHome = helpers.isolatedConfig(t);
  const sessionID = `opencode-${process.pid}-${Date.now()}`;
  const plugin = await necktiePlugin();
  for (const id of [sessionID, `${sessionID}-other`]) t.after(() => fs.rmSync(sessions.statePath("opencode", id), { force: true }));
  return { configHome, sessionID, plugin,
    command: (args) => plugin["command.execute.before"]({ command: "necktie-mode", arguments: args, sessionID }),
    context: async (id = sessionID, system = []) => {
      const output = { system };
      await plugin["experimental.chat.system.transform"]({ sessionID: id }, output);
      return output.system[0];
    },
  };
}

test("OpenCode registers commands and a single skill path", async () => {
  const plugin = await necktiePlugin();
  const config = {};
  await plugin.config(config);
  await plugin.config(config);
  assert.deepEqual(Object.keys(config.command).sort(), ["necktie", "necktie-mode"]);
  assert.equal(config.skills.paths.length, 1);
  assert.equal(path.basename(config.skills.paths[0]), "skills");
});

test("OpenCode injects Full, switches sessions independently, and consumes command messages once", async (t) => {
  const { command, context, sessionID } = await fixture(t);
  assert.match(await context(sessionID, ["base"]), /^base\n\nNECKTIE MODE ACTIVE.*level: full/is);
  await command("lite");
  const switched = await context();
  assert.match(switched, /mode set to lite for this session/i);
  assert.match(switched, /level: lite/i);
  assert.doesNotMatch(await context(), /mode set to lite for this session/i);
  assert.match(await context(`${sessionID}-other`), /level: full/i);
});

test("OpenCode default writes preserve selected and fresh sessions", async (t) => {
  const { command, context, configHome } = await fixture(t);
  await command("default mammon");
  assert.match(await context(), /Current session remains full.*level: full/is);
  await command("lite");
  await command("default mammon");
  assert.match(await context(), /Current session remains lite.*level: lite/is);
  assert.equal(JSON.parse(fs.readFileSync(path.join(configHome, "necktie/config.json"), "utf8")).defaultMode, "mammon");
  process.env.NECKTIE_DEFAULT_MODE = "full";
  await command("default lite");
  assert.match(await context(), /NECKTIE_DEFAULT_MODE keeps the effective default at full.*level: lite/is);
});

test("OpenCode status and invalid commands do not create session state", async (t) => {
  const { command, context, sessionID } = await fixture(t);
  for (const [args, expected] of [["status", /current full; configured default full/], ["off", /^Usage:/]]) {
    await command(args);
    const output = await context();
    assert.match(output, expected);
    assert.match(output, /level: full/i);
    assert.equal(fs.existsSync(sessions.statePath("opencode", sessionID)), false);
  }
});
