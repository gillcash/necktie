import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCommandFile, parseSkillFile } from "./necktie-frontmatter.cjs";
import { resolveMode } from "../../lib/necktie-policy.cjs";
import { buildContext, executeModeCommand, parseModeArguments } from "../../lib/necktie-command.cjs";
import { readSessionMode, sessionIdentifier, writeSessionMode } from "../../lib/necktie-session.cjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, "../..");
const skillsDir = path.join(root, "skills");

function sessionKey(input = {}) {
  return sessionIdentifier(input, process.env, { fallbackId: "opencode-process" });
}

function activeMode(input = {}) {
  const key = sessionKey(input);
  const stored = readSessionMode("opencode", key);
  return resolveMode({ sessionMode: stored });
}

function handleModeCommand(input = {}) {
  const key = sessionKey(input);
  return executeModeCommand(parseModeArguments(input.arguments), {
    sessionMode: readSessionMode("opencode", key),
    saveSession: (mode) => writeSessionMode("opencode", key, mode),
  }).message;
}

function readCommands() {
  const commandDir = path.join(__dirname, "..", "command");
  return fs.readdirSync(commandDir)
    .filter((name) => name.endsWith(".md"))
    .map((file) => {
      const parsed = parseCommandFile(path.join(commandDir, file));
      return parsed && { name: path.basename(file, ".md"), ...parsed };
    })
    .filter(Boolean);
}

function readSkills() {
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = path.join(skillsDir, entry.name, "SKILL.md");
      if (!fs.existsSync(file)) return null;
      const parsed = parseSkillFile(file);
      return parsed && {
        id: entry.name,
        name: parsed.name || entry.name,
        description: parsed.description,
        path: file,
        content: parsed.body,
      };
    })
    .filter(Boolean);
}

function withArguments(template, input) {
  const text = String(input ?? "");
  if (template.includes("$ARGUMENTS")) return template.replaceAll("$ARGUMENTS", () => text);
  return text.trim() ? `${template}\n\n${text.trim()}` : template;
}

async function server({ client } = {}) {
  const commandMessages = new Map();
  const log = (message) => {
    try { client?.app?.log?.({ body: { service: "necktie", level: "info", message } }); } catch (_) {}
  };

  return {
    config: async (config) => {
      config.command ||= {};
      for (const { name, ...command } of readCommands()) {
        config.command[name] = command;
      }
      config.skills ||= {};
      config.skills.paths ||= [];
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);
    },

    "command.execute.before": async (input) => {
      if (input?.command !== "necktie-mode") return;
      const message = handleModeCommand(input);
      commandMessages.set(sessionKey(input), message);
      log(message);
    },

    "experimental.chat.system.transform": async (input, output) => {
      const resolution = activeMode(input);
      for (const warning of resolution.warnings) log(warning);
      const key = sessionKey(input);
      const context = buildContext(resolution.mode, commandMessages.get(key), { root });
      commandMessages.delete(key);
      if (output.system.length) output.system[output.system.length - 1] += `\n\n${context}`;
      else output.system.push(context);
    },
  };
}

// One plugin export: V1 (1.18.29+) calls server(), V2 reads id and setup().
export default {
  id: "necktie",
  server,

  async setup(ctx) {
    const commands = readCommands();
    const skills = readSkills();
    const commandMessages = new Map();

    await ctx.skill.transform((editor) => {
      for (const skill of skills) editor.add(skill);
    });

    await ctx.command.transform((editor) => {
      for (const command of commands) {
        editor.add({
          name: command.name,
          description: command.description,
          execute: async ({ sessionID, prompt, delivery }) => {
            if (command.name === "necktie-mode") {
              const input = { sessionID, arguments: prompt.text };
              commandMessages.set(sessionKey(input), handleModeCommand(input));
            }
            // Mentions select the command's attachments; prompt() accepts resolved items.
            const withoutMentions = (items) => items?.map(({ mention, ...item }) => item);
            await ctx.session.prompt({
              ...prompt,
              sessionID,
              text: withArguments(command.template, prompt.text),
              files: withoutMentions(prompt.files),
              agents: withoutMentions(prompt.agents),
              skills: withoutMentions(prompt.skills),
              delivery,
            });
          },
        });
      }
    });

    const addContext = (event, consumeMessage) => {
      const key = sessionKey(event);
      const message = consumeMessage ? commandMessages.get(key) : "";
      event.system.push({ type: "text", text: buildContext(activeMode(event).mode, message, { root }) });
      if (consumeMessage) commandMessages.delete(key);
    };
    await ctx.session.hook("context", (event) => addContext(event, true));
    // Compaction uses the same policy without consuming a pending command result.
    await ctx.session.hook("compaction", (event) => addContext(event, false));
  },
};
