const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "necktie-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function isolatedConfig(t) {
  const directory = temporary(t);
  const values = { XDG_CONFIG_HOME: directory, APPDATA: directory, NECKTIE_DEFAULT_MODE: undefined };
  for (const [key, value] of Object.entries(values)) {
    const previous = process.env[key];
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return directory;
}

module.exports = { temporary, isolatedConfig };
