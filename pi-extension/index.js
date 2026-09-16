import { DEFAULT_MODE, buildInstructions, normalizeMode, resolveMode } from "../lib/necktie-policy.cjs";
import { executeModeCommand, parseModeArguments } from "../lib/necktie-command.cjs";

export { buildInstructions as coreContext, parseModeArguments as parseNecktieModeCommand };

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

export function sendSkill(pi, skill, args, ctx) {
  const suffix = String(args || "").trim();
  const message = suffix ? `/skill:${skill} ${suffix}` : `/skill:${skill}`;
  if (ctx?.isIdle?.() === false) pi.sendUserMessage(message, { deliverAs: "followUp" });
  else pi.sendUserMessage(message);
}

export default function necktieExtension(pi) {
  let currentMode = resolveMode().mode;

  pi.registerCommand("necktie", {
    description: "Run /skill:necktie",
    handler: (args, ctx) => sendSkill(pi, "necktie", args, ctx),
  });

  pi.registerCommand("necktie-mode", {
    description: "Set Necktie mode: lite or full. Commands: status, default <mode>",
    handler: async (args, ctx) => {
      const parsed = parseModeArguments(args);
      const { resolution, message } = executeModeCommand(parsed, {
        sessionMode: currentMode,
        saveSession: (mode) => pi.appendEntry?.("necktie-mode", { mode }),
      });
      currentMode = resolution.mode;
      ctx?.ui?.notify?.(message, parsed.type === "invalid" ? "warning" : "info");
      return message;
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    const configuredDefault = resolveMode();
    for (const warning of configuredDefault.warnings) ctx?.ui?.notify?.(warning, "warning");
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    currentMode = resolveSessionMode(entries, configuredDefault.mode);
  });

  pi.on("before_agent_start", async (event) => {
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${buildInstructions(currentMode)}` };
  });
}
