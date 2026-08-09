"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MODES = Object.freeze(["lite", "full", "mammon"]);
const DEFAULT_MODE = "full";
const ROOT = path.resolve(__dirname, "..");

class InvalidModeError extends Error {
  constructor(value) {
    super(`Invalid Necktie mode: ${String(value)}. Expected lite, full, or mammon.`);
    this.name = "InvalidModeError";
    this.code = "NECKTIE_INVALID_MODE";
  }
}

function normalizeMode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return MODES.includes(normalized) ? normalized : null;
}

function configPath(env = process.env, options = {}) {
  if (options.configPath) return path.resolve(options.configPath);
  const platform = options.platform || process.platform;
  const home = options.home || os.homedir();
  if (platform === "win32") {
    const base = env.APPDATA || path.win32.join(home, "AppData", "Roaming");
    return path.win32.join(base, "necktie", "config.json");
  }
  if (env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME, "necktie", "config.json");
  return path.join(home, ".config", "necktie", "config.json");
}

function readConfig(env = process.env, options = {}) {
  const target = configPath(env, options);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, "utf8").replace(/^\uFEFF/, ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { config: {}, warning: `Ignored non-object Necktie configuration at ${target}.`, path: target };
    }
    return { config: parsed, warning: null, path: target };
  } catch (error) {
    if (error?.code === "ENOENT") return { config: {}, warning: null, path: target };
    return { config: {}, warning: `Ignored invalid Necktie configuration at ${target}.`, path: target };
  }
}

function resolveDefaultMode(env = process.env, options = {}) {
  const warnings = [];
  let environmentMode = null;
  const environmentValue = env.NECKTIE_DEFAULT_MODE;
  if (environmentValue !== undefined) {
    environmentMode = normalizeMode(environmentValue);
    if (!environmentMode) warnings.push(`Ignored invalid NECKTIE_DEFAULT_MODE value: ${String(environmentValue)}.`);
  }

  const loaded = readConfig(env, options);
  if (loaded.warning) warnings.push(loaded.warning);
  let configuredMode = DEFAULT_MODE;
  let configuredSource = "built-in";
  if (loaded.config.defaultMode !== undefined) {
    const configured = normalizeMode(loaded.config.defaultMode);
    if (configured) {
      configuredMode = configured;
      configuredSource = "config";
    } else {
      warnings.push(`Ignored invalid defaultMode in ${loaded.path}.`);
    }
  }

  return {
    mode: environmentMode || configuredMode,
    source: environmentMode ? "environment" : configuredSource,
    configuredMode,
    configuredSource,
    environmentOverride: environmentMode,
    configPath: loaded.path,
    warnings,
  };
}

function resolveMode({ requestedMode, sessionMode, env = process.env, configOptions = {} } = {}) {
  const defaultResolution = resolveDefaultMode(env, configOptions);
  const warnings = [...defaultResolution.warnings];

  if (requestedMode !== undefined && requestedMode !== null) {
    const requested = normalizeMode(requestedMode);
    if (!requested) throw new InvalidModeError(requestedMode);
    return {
      mode: requested,
      source: "requested",
      defaultMode: defaultResolution.mode,
      defaultSource: defaultResolution.source,
      configuredDefaultMode: defaultResolution.configuredMode,
      configuredDefaultSource: defaultResolution.configuredSource,
      environmentOverride: defaultResolution.environmentOverride,
      configPath: defaultResolution.configPath,
      warnings,
    };
  }

  if (sessionMode !== undefined && sessionMode !== null && sessionMode !== "") {
    const session = normalizeMode(sessionMode);
    if (session) {
      return {
        mode: session,
        source: "session",
        defaultMode: defaultResolution.mode,
        defaultSource: defaultResolution.source,
        configuredDefaultMode: defaultResolution.configuredMode,
        configuredDefaultSource: defaultResolution.configuredSource,
        environmentOverride: defaultResolution.environmentOverride,
        configPath: defaultResolution.configPath,
        warnings,
      };
    }
    warnings.push(`Ignored invalid stored Necktie session mode: ${String(sessionMode)}.`);
  }

  return {
    mode: defaultResolution.mode,
    source: defaultResolution.source,
    defaultMode: defaultResolution.mode,
    defaultSource: defaultResolution.source,
    configuredDefaultMode: defaultResolution.configuredMode,
    configuredDefaultSource: defaultResolution.configuredSource,
    environmentOverride: defaultResolution.environmentOverride,
    configPath: defaultResolution.configPath,
    warnings,
  };
}

function buildInstructions(mode = DEFAULT_MODE, options = {}) {
  const normalized = normalizeMode(mode);
  if (!normalized) throw new InvalidModeError(mode);
  const root = options.root ? path.resolve(options.root) : ROOT;
  return fs.readFileSync(path.join(root, "core", `necktie-${normalized}.md`), "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function writeDefaultMode(mode, env = process.env, options = {}) {
  const normalized = normalizeMode(mode);
  if (!normalized) throw new InvalidModeError(mode);
  const loaded = readConfig(env, options);
  const config = { ...loaded.config, defaultMode: normalized };
  const target = loaded.path;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporary, target);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch (_) {}
  }
  return {
    writtenMode: normalized,
    ...resolveDefaultMode(env, options),
  };
}

module.exports = {
  DEFAULT_MODE,
  InvalidModeError,
  MODES,
  buildInstructions,
  configPath,
  normalizeMode,
  readConfig,
  resolveDefaultMode,
  resolveMode,
  writeDefaultMode,
};
