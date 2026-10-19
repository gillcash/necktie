import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import necktiePlugin from "../.opencode/plugins/necktie.mjs";
import sessions from "../lib/necktie-session.cjs";
import helpers from "./helpers.cjs";

async function v2Harness() {
  const commands = new Map();
  const skills = new Map();
  const hooks = new Map();
  const prompts = [];
  await necktiePlugin.setup({
    command: { transform: async (callback) => callback({ add: (command) => commands.set(command.name, command) }) },
    skill: { transform: async (callback) => callback({ add: (skill) => skills.set(skill.id, skill) }) },
    session: {
      hook: async (name, callback) => hooks.set(name, callback),
      prompt: async (prompt) => prompts.push(prompt),
    },
  });
  return { commands, skills, hooks, prompts };
}

async function fixture(t, api = "v1") {
  const configHome = helpers.isolatedConfig(t);
  const sessionID = `opencode-${process.pid}-${Date.now()}`;
  const plugin = api === "v1" ? await necktiePlugin.server() : await v2Harness();
  for (const id of [sessionID, `${sessionID}-other`]) t.after(() => fs.rmSync(sessions.statePath("opencode", id), { force: true }));
  return { configHome, sessionID, plugin,
    command: (args) => api === "v1"
      ? plugin["command.execute.before"]({ command: "necktie-mode", arguments: args, sessionID })
      : plugin.commands.get("necktie-mode").execute({ sessionID, prompt: { text: args }, delivery: "queue" }),
    context: async (id = sessionID, system = []) => {
      if (api === "v1") {
        const output = { system };
        await plugin["experimental.chat.system.transform"]({ sessionID: id }, output);
        return output.system[0];
      }
      const event = { sessionID: id, system: system.map((text) => ({ type: "text", text })) };
      await plugin.hooks.get("context")(event);
      return event.system.map((part) => part.text).join("\n\n");
    },
  };
}

test("OpenCode V1 registers commands and a single skill path", async () => {
  const plugin = await necktiePlugin.server();
  const config = {};
  await plugin.config(config);
  await plugin.config(config);
  assert.deepEqual(Object.keys(config.command).sort(), ["necktie", "necktie-mode"]);
  assert.equal(config.skills.paths.length, 1);
  assert.equal(path.basename(config.skills.paths[0]), "skills");
});

for (const api of ["v1", "v2"]) {
test(`OpenCode ${api} injects Full, switches sessions independently, and consumes command messages once`, async (t) => {
  const { command, context, sessionID } = await fixture(t, api);
  assert.match(await context(sessionID, ["base"]), /^base\n\nNECKTIE MODE ACTIVE.*level: full/is);
  await command("lite");
  const switched = await context();
  assert.match(switched, /mode set to lite for this session/i);
  assert.match(switched, /level: lite/i);
  assert.doesNotMatch(await context(), /mode set to lite for this session/i);
  assert.match(await context(`${sessionID}-other`), /level: full/i);
});

test(`OpenCode ${api} default writes preserve selected and fresh sessions`, async (t) => {
  const { command, context, configHome, sessionID } = await fixture(t, api);
  await command("default mammon");
  assert.match(await context(), /Current session remains full.*level: full/is);
  assert.match(await context(`${sessionID}-other`), /level: mammon/i);
  await command("lite");
  await command("default mammon");
  assert.match(await context(), /Current session remains lite.*level: lite/is);
  assert.equal(JSON.parse(fs.readFileSync(path.join(configHome, "necktie/config.json"), "utf8")).defaultMode, "mammon");
  process.env.NECKTIE_DEFAULT_MODE = "full";
  await command("default lite");
  assert.match(await context(), /NECKTIE_DEFAULT_MODE keeps the effective default at full.*level: lite/is);
});

test(`OpenCode ${api} status and invalid commands do not create session state`, async (t) => {
  const { command, context, sessionID } = await fixture(t, api);
  for (const [args, expected] of [["status", /current full; configured default full/], ["off", /^Usage:/]]) {
    await command(args);
    const output = await context();
    assert.match(output, expected);
    assert.match(output, /level: full/i);
    assert.equal(fs.existsSync(sessions.statePath("opencode", sessionID)), false);
  }
});
}

test("OpenCode V2 registers usable skills and preserves command text, attachments, and delivery", async (t) => {
  const { plugin, sessionID, context } = await fixture(t, "v2");
  assert.deepEqual([...plugin.commands.keys()].sort(), ["necktie", "necktie-mode"]);
  assert.deepEqual([...plugin.skills.keys()].sort(), ["necktie", "necktie-research"]);
  assert.deepEqual([...plugin.hooks.keys()].sort(), ["compaction", "context"]);
  for (const skill of plugin.skills.values()) {
    assert.ok(fs.existsSync(skill.path));
    assert.equal(skill.name, skill.id);
    assert.ok(skill.description.length > 40);
    assert.match(skill.content, /^\s*# Necktie/);
    assert.doesNotMatch(skill.content, /^---/);
  }
  const prompt = {
    text: "review $& and $` literally",
    files: [{ mention: "@readme", url: "file:///README.md", mime: "text/plain" }],
    agents: [{ mention: "@build", name: "build" }],
    skills: [{ mention: "$necktie", name: "necktie" }],
    model: { providerID: "test", id: "test-model" },
  };
  await plugin.commands.get("necktie").execute({ sessionID, prompt, delivery: "steer" });
  assert.equal(plugin.prompts.length, 1);
  const sent = plugin.prompts[0];
  assert.equal(sent.sessionID, sessionID);
  assert.equal(sent.delivery, "steer");
  assert.equal(sent.model, prompt.model);
  assert.deepEqual(sent.files, [{ url: "file:///README.md", mime: "text/plain" }]);
  assert.deepEqual(sent.agents, [{ name: "build" }]);
  assert.deepEqual(sent.skills, [{ name: "necktie" }]);
  assert.match(sent.text, /Use \$necktie on: review \$& and \$` literally/);
  assert.equal(prompt.files[0].mention, "@readme");
  assert.match(await context(), /level: full/i);
  assert.equal(fs.existsSync(sessions.statePath("opencode", sessionID)), false);
});

test("OpenCode V2 compaction preserves existing parts and pending command results", async (t) => {
  const { plugin, sessionID, command, context } = await fixture(t, "v2");
  await command("mammon");
  const existing = { type: "text", text: "original", cache: { type: "ephemeral" } };
  const event = { sessionID, system: [existing], messages: [{ role: "user" }], tools: {} };
  await plugin.hooks.get("compaction")(event);
  assert.equal(event.system[0], existing);
  assert.deepEqual(event.system[0], { type: "text", text: "original", cache: { type: "ephemeral" } });
  assert.equal(event.system.length, 2);
  assert.equal(event.system[1].type, "text");
  assert.match(event.system[1].text, /level: mammon/i);
  assert.doesNotMatch(event.system[1].text, /mode set to mammon/i);
  assert.deepEqual(event.messages, [{ role: "user" }]);
  assert.deepEqual(event.tools, {});
  assert.match(await context(), /mode set to mammon for this session/i);
  assert.doesNotMatch(await context(), /mode set to mammon for this session/i);
});

test("OpenCode V1 and V2 share session modes", async (t) => {
  const { plugin, sessionID, context } = await fixture(t, "v2");
  const v1 = await necktiePlugin.server();
  await v1["command.execute.before"]({ sessionID, command: "necktie-mode", arguments: "lite" });
  assert.match(await context(), /level: lite/i);
  await plugin.commands.get("necktie-mode").execute({ sessionID, prompt: { text: "mammon" }, delivery: "queue" });
  const output = { system: [] };
  await v1["experimental.chat.system.transform"]({ sessionID }, output);
  assert.match(output.system[0], /level: mammon/i);
});

test("OpenCode directory and npm entry points expose exactly one dual API plugin", async () => {
  for (const entry of ["../.opencode/plugins/index.js", "@gillcash/necktie", "@gillcash/necktie/plugin"]) {
    const module = await import(entry);
    assert.deepEqual(Object.keys(module), ["default"]);
    assert.equal(module.default, necktiePlugin);
    assert.equal(module.default.id, "necktie");
    assert.equal(typeof module.default.server, "function");
    assert.equal(typeof module.default.setup, "function");
  }
  const config = JSON.parse(fs.readFileSync(new URL("../opencode.json", import.meta.url), "utf8"));
  assert.equal(config.plugin, undefined);
  assert.equal(config.plugins, undefined);
});
