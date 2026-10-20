import { buildInstructions } from "../lib/necktie-policy.cjs";

export { buildInstructions as coreContext };

export function sendSkill(pi, skill, args, ctx) {
  const suffix = String(args || "").trim();
  const message = suffix ? `/skill:${skill} ${suffix}` : `/skill:${skill}`;
  if (ctx?.isIdle?.() === false) pi.sendUserMessage(message, { deliverAs: "followUp" });
  else pi.sendUserMessage(message);
}

export default function necktieExtension(pi) {
  pi.registerCommand("necktie", {
    description: "Run /skill:necktie",
    handler: (args, ctx) => sendSkill(pi, "necktie", args, ctx),
  });

  pi.on("before_agent_start", async (event) => {
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${buildInstructions()}` };
  });
}
