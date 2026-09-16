import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCommandFile } from "./necktie-frontmatter.cjs";
import { resolveMode } from "../../lib/necktie-policy.cjs";
import { buildContext, executeModeCommand, parseModeArguments } from "../../lib/necktie-command.cjs";
import { readSessionMode, sessionIdentifier, writeSessionMode } from "../../lib/necktie-session.cjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, "../..");
const skillsDir = path.join(root, "skills");

function sessionKey(input = {}) {
  return sessionIdentifier(input, process.env, { fallbackId: "opencode-process" });
}

export function activeMode(input = {}) {
  const key = sessionKey(input);
  const stored = readSessionMode("opencode", key);
  return resolveMode({ sessionMode: stored });
}

export function handleModeCommand(input = {}) {
  const key = sessionKey(input);
  return executeModeCommand(parseModeArguments(input.arguments), {
    sessionMode: readSessionMode("opencode", key),
    saveSession: (mode) => writeSessionMode("opencode", key, mode),
  }).message;
}

export default async function necktiePlugin({ client } = {}) {
  const commandMessages = new Map();
  const log = (message) => {
    try { client?.app?.log?.({ body: { service: "necktie", level: "info", message } }); } catch (_) {}
  };

  return {
    config: async (config) => {
      config.command ||= {};
      const commandDir = path.join(__dirname, "..", "command");
      for (const file of fs.readdirSync(commandDir).filter((name) => name.endsWith(".md"))) {
        const parsed = parseCommandFile(path.join(commandDir, file));
        if (parsed) config.command[path.basename(file, ".md")] = parsed;
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
