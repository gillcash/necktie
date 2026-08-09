import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { parseCommandFile } = require("./necktie-frontmatter.cjs");
const { buildInstructions, resolveMode, writeDefaultMode } = require("../../lib/necktie-policy.cjs");
const { USAGE, formatStatus, parseModeArguments } = require("../../lib/necktie-command.cjs");
const { readSessionMode, sessionIdentifier, writeSessionMode } = require("../../lib/necktie-session.cjs");

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
  const parsed = parseModeArguments(input.arguments);
  if (parsed.type === "invalid") return parsed.usage || USAGE;
  const key = sessionKey(input);
  let stored = readSessionMode("opencode", key);

  if (parsed.type === "set-session") {
    try {
      writeSessionMode("opencode", key, parsed.mode);
      return `Necktie mode set to ${parsed.mode} for this session.`;
    } catch (error) {
      return `Failed to save Necktie session mode: ${error.message}`;
    }
  }
  if (parsed.type === "set-default") {
    if (!stored) {
      stored = resolveMode().mode;
      try { writeSessionMode("opencode", key, stored); }
      catch (error) { return `Failed to initialize Necktie session mode: ${error.message}`; }
    }
    try {
      const written = writeDefaultMode(parsed.mode);
      return written.environmentOverride
        ? `Saved default ${written.writtenMode}, but NECKTIE_DEFAULT_MODE keeps the effective default at ${written.mode}. Current session remains ${stored}.`
        : `Default Necktie mode set to ${written.writtenMode} for new sessions. Current session remains ${stored}.`;
    } catch (error) {
      return `Failed to save Necktie default: ${error.message}. Current session remains ${stored}.`;
    }
  }
  return formatStatus(resolveMode({ sessionMode: stored }));
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
      const message = commandMessages.get(sessionKey(input));
      commandMessages.delete(sessionKey(input));
      const instructions = buildInstructions(resolution.mode, { root });
      const context = message
        ? `${message}\n\nAcknowledge this mode result concisely. Do not treat it as a decision request.\n\n${instructions}`
        : instructions;
      if (output.system.length) output.system[output.system.length - 1] += `\n\n${context}`;
      else output.system.push(context);
    },
  };
}
