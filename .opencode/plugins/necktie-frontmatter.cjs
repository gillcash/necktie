"use strict";

function parseCommandFile(filePath) {
  const fs = require("node:fs");
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const description = match[1].match(/description:\s*(.+)/)?.[1]?.trim();
  return { description, template: match[2].trim() };
}

function parseSkillFile(filePath) {
  const fs = require("node:fs");
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---[^\S\n]*\r?\n?([\s\S]*)$/);
  if (!match) return null;
  // shortcut: shipped skills use flat fields; use a YAML parser if metadata becomes nested.
  return {
    name: match[1].match(/^name:[ \t]*(.+)$/m)?.[1]?.trim(),
    description: match[1].match(/^description:[ \t]*(.+)$/m)?.[1]?.trim(),
    body: match[2],
  };
}

module.exports = { parseCommandFile, parseSkillFile };
