import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import necktiePlugin from "../.opencode/plugins/necktie.mjs";
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

test("OpenCode V1 registers one command without replacing host configuration", async () => {
  const plugin = await necktiePlugin.server();
  const existing = { template: "existing command" };
  const config = { command: { existing }, skills: { paths: ["host-skills"] } };
  await plugin.config(config);
  await plugin.config(config);
  assert.deepEqual(Object.keys(config.command).sort(), ["existing", "necktie"]);
  assert.equal(config.command.existing, existing);
  assert.deepEqual(config.skills.paths.slice(0, 1), ["host-skills"]);
  assert.equal(config.skills.paths.length, 2);
  assert.equal(path.basename(config.skills.paths[1]), "skills");
  assert.equal(plugin["command.execute.before"], undefined);
});

test("OpenCode V1 keeps a user-defined necktie command", async () => {
  const plugin = await necktiePlugin.server();
  const userCommand = { template: "my own necktie command" };
  const config = { command: { necktie: userCommand } };
  await plugin.config(config);
  assert.equal(config.command.necktie, userCommand);
});

test("OpenCode V1 injects the sole policy into empty and existing system prompts", async () => {
  const plugin = await necktiePlugin.server();
  const empty = { system: [] };
  await plugin["experimental.chat.system.transform"]({}, empty);
  assert.equal(empty.system.length, 1);
  assert.match(empty.system[0], /^NECKTIE ACTIVE\./);
  assert.match(empty.system[0], /Let Necktie decide/);

  const existing = { system: ["first", "base"] };
  await plugin["experimental.chat.system.transform"]({ sessionID: "another-session" }, existing);
  assert.deepEqual(existing.system, ["first", `base\n\n${empty.system[0]}`]);
});

for (const api of ["v1", "v2"]) {
  test(`OpenCode ${api} ignores legacy settings without reading or changing them`, async (t) => {
    const directory = helpers.isolatedConfig(t);
    const legacy = path.join(directory, "necktie");
    const settings = path.join(legacy, "config.json");
    fs.mkdirSync(legacy);
    fs.writeFileSync(settings, '{"defaultMode":"lite","keep":"untouched"}');
    process.env.NECKTIE_DEFAULT_MODE = "lite";
    const originalRead = fs.readFileSync;
    const originalWrite = fs.writeFileSync;
    const guard = (file) => assert.ok(!path.resolve(String(file)).startsWith(`${legacy}${path.sep}`), "legacy settings must not be accessed");
    fs.readFileSync = (file, ...args) => { guard(file); return originalRead(file, ...args); };
    fs.writeFileSync = (file, ...args) => { guard(file); return originalWrite(file, ...args); };
    t.after(() => { fs.readFileSync = originalRead; fs.writeFileSync = originalWrite; });

    let policy;
    if (api === "v1") {
      const plugin = await necktiePlugin.server();
      const output = { system: [] };
      await plugin["experimental.chat.system.transform"]({ sessionID: "legacy-session" }, output);
      policy = output.system[0];
    } else {
      const plugin = await v2Harness();
      const event = { sessionID: "legacy-session", system: [] };
      await plugin.hooks.get("context")(event);
      policy = event.system[0].text;
    }
    assert.match(policy, /^NECKTIE ACTIVE\./);
    assert.match(policy, /Let Necktie decide/);
    assert.equal(originalRead(settings, "utf8"), '{"defaultMode":"lite","keep":"untouched"}');
  });
}

test("OpenCode V2 registers usable skills and preserves command text, attachments, and delivery", async () => {
  const plugin = await v2Harness();
  assert.deepEqual([...plugin.commands.keys()], ["necktie"]);
  assert.deepEqual([...plugin.skills.keys()].sort(), ["necktie", "necktie-research"]);
  assert.deepEqual([...plugin.hooks.keys()].sort(), ["compaction", "context"]);
  for (const skill of plugin.skills.values()) {
    assert.ok(fs.existsSync(skill.path));
    assert.equal(skill.name, skill.id);
    assert.ok(skill.description.length > 0);
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
  const original = structuredClone(prompt);
  await plugin.commands.get("necktie").execute({ sessionID: "session", prompt, delivery: "steer" });
  assert.equal(plugin.prompts.length, 1);
  const sent = plugin.prompts[0];
  assert.equal(sent.sessionID, "session");
  assert.equal(sent.delivery, "steer");
  assert.equal(sent.model, prompt.model);
  assert.deepEqual(sent.files, [{ url: "file:///README.md", mime: "text/plain" }]);
  assert.deepEqual(sent.agents, [{ name: "build" }]);
  assert.deepEqual(sent.skills, [{ name: "necktie" }]);
  assert.ok(sent.text.includes(prompt.text));
  assert.doesNotMatch(sent.text, /\$ARGUMENTS/);
  assert.deepEqual(prompt, original);

  await plugin.commands.get("necktie").execute({ sessionID: "session", prompt: { text: "" }, delivery: "queue" });
  assert.equal(plugin.prompts[1].delivery, "queue");
  assert.equal(plugin.prompts[1].files, undefined);
  assert.equal(plugin.prompts[1].agents, undefined);
  assert.equal(plugin.prompts[1].skills, undefined);
});

test("OpenCode V2 context and compaction preserve existing parts and host data", async () => {
  const plugin = await v2Harness();
  let policy;
  for (const hook of ["context", "compaction"]) {
    const existing = { type: "text", text: "original", cache: { type: "ephemeral" } };
    const event = { sessionID: "session", system: [existing], messages: [{ role: "user" }], tools: {} };
    await plugin.hooks.get(hook)(event);
    assert.equal(event.system[0], existing);
    assert.deepEqual(existing, { type: "text", text: "original", cache: { type: "ephemeral" } });
    assert.equal(event.system.length, 2);
    assert.equal(event.system[1].type, "text");
    assert.match(event.system[1].text, /^NECKTIE ACTIVE\./);
    assert.match(event.system[1].text, /Let Necktie decide/);
    if (policy) assert.equal(event.system[1].text, policy);
    policy = event.system[1].text;
    assert.deepEqual(event.messages, [{ role: "user" }]);
    assert.deepEqual(event.tools, {});
  }
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
  for (const relative of ["../opencode.json", "../.opencode/opencode.json"]) {
    const file = new URL(relative, import.meta.url);
    if (!fs.existsSync(file)) continue;
    const config = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(config.plugin, undefined, relative);
    assert.equal(config.plugins, undefined, relative);
  }
});
