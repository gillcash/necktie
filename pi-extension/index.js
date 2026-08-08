import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function coreContext() {
  return fs.readFileSync(path.resolve(__dirname, "..", "core", "necktie-core.md"), "utf8").trim();
}

export function sendSkill(pi, skill, args, ctx) {
  const suffix = String(args || "").trim();
  const message = suffix ? `/skill:${skill} ${suffix}` : `/skill:${skill}`;
  if (ctx?.isIdle?.() === false) pi.sendUserMessage(message, { deliverAs: "followUp" });
  else pi.sendUserMessage(message);
}

export default function necktieExtension(pi) {
  for (const skill of ["necktie"]) {
    pi.registerCommand(skill, {
      description: `Run /skill:${skill}`,
      handler: (args, ctx) => sendSkill(pi, skill, args, ctx),
    });
  }
  pi.on("before_agent_start", async (event) => {
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${coreContext()}` };
  });
}
