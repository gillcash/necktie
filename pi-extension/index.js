import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DEFAULT_MODE, buildInstructions, normalizeMode, resolveMode, writeDefaultMode } = require("../lib/necktie-policy.cjs");
const { USAGE, formatStatus, parseModeArguments } = require("../lib/necktie-command.cjs");

export function coreContext(mode = DEFAULT_MODE) {
  return buildInstructions(mode);
}

export function resolveSessionMode(entries, fallbackMode = DEFAULT_MODE) {
  const fallback = normalizeMode(fallbackMode) || DEFAULT_MODE;
  if (!Array.isArray(entries)) return fallback;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.type !== "custom" || entry?.customType !== "necktie-mode") continue;
    const mode = normalizeMode(entry?.data?.mode);
    if (mode) return mode;
  }
  return fallback;
}

export function parseNecktieModeCommand(text) {
  return parseModeArguments(text);
}

export function sendSkill(pi, skill, args, ctx) {
  const suffix = String(args || "").trim();
  const message = suffix ? `/skill:${skill} ${suffix}` : `/skill:${skill}`;
  if (ctx?.isIdle?.() === false) pi.sendUserMessage(message, { deliverAs: "followUp" });
  else pi.sendUserMessage(message);
}

export default function necktieExtension(pi) {
  let configuredDefault = resolveMode();
  let currentMode = configuredDefault.mode;

  pi.registerCommand("necktie", {
    description: "Run /skill:necktie",
    handler: (args, ctx) => sendSkill(pi, "necktie", args, ctx),
  });

  pi.registerCommand("necktie-mode", {
    description: "Set Necktie mode: lite or full. Commands: status, default <mode>",
    handler: async (args, ctx) => {
      const parsed = parseModeArguments(args);
      let message;
      if (parsed.type === "set-session") {
        try {
          pi.appendEntry?.("necktie-mode", { mode: parsed.mode });
          currentMode = parsed.mode;
          message = `Necktie mode set to ${currentMode} for this session.`;
        } catch (error) {
          message = `Failed to save Necktie session mode: ${error.message}`;
        }
      } else if (parsed.type === "set-default") {
        try {
          const written = writeDefaultMode(parsed.mode);
          configuredDefault = resolveMode();
          message = written.environmentOverride
            ? `Saved default ${written.writtenMode}, but NECKTIE_DEFAULT_MODE keeps the effective default at ${written.mode}. Current session remains ${currentMode}.`
            : `Default Necktie mode set to ${written.writtenMode} for new sessions. Current session remains ${currentMode}.`;
        } catch (error) {
          message = `Failed to save Necktie default: ${error.message}`;
        }
      } else if (parsed.type === "status") {
        message = formatStatus(resolveMode({ sessionMode: currentMode }));
      } else {
        message = parsed.usage || USAGE;
      }
      ctx?.ui?.notify?.(message, parsed.type === "invalid" ? "warning" : "info");
      return message;
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    configuredDefault = resolveMode();
    for (const warning of configuredDefault.warnings) ctx?.ui?.notify?.(warning, "warning");
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    currentMode = resolveSessionMode(entries, configuredDefault.mode);
  });

  pi.on("before_agent_start", async (event) => {
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${coreContext(currentMode)}` };
  });
}
