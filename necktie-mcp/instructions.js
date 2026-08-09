// Pure mode selection for the optional Necktie MCP adapter.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const policy = require("../lib/necktie-policy.cjs");

export const MODES = [...policy.MODES];

export function selectInstructions(requestedMode, options = {}) {
  const resolution = policy.resolveMode({
    requestedMode,
    env: options.env || process.env,
    configOptions: options.configOptions || {},
  });
  for (const warning of resolution.warnings) options.onWarning?.(warning);
  return {
    mode: resolution.mode,
    instructions: policy.buildInstructions(resolution.mode, options.buildOptions || {}),
  };
}

export function resolveMode(requestedMode, options = {}) {
  return selectInstructions(requestedMode, options).mode;
}

export function buildInstructions(requestedMode, options = {}) {
  return selectInstructions(requestedMode, options).instructions;
}
