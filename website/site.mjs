import { cp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { renderContent } from "./content.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const output = resolve(root, "dist");
const types = { ".html": "text/html", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".xml": "application/xml" };

export async function build(siteUrl = process.env.SITE_URL || "http://localhost:3000") {
  const url = new URL(siteUrl);
  if (!["http:", "https:"].includes(url.protocol) || /["'<>\s]/.test(siteUrl) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTP(S) origin without credentials, path, query, or fragment");
  }
  const html = renderContent(await readFile(resolve(root, "index.html"), "utf8")).replaceAll("{{SITE_ORIGIN}}", url.origin);
  // The output path is fixed beneath this module; never delete a caller-supplied path.
  await rm(output, { recursive: true, force: true });
  await mkdir(output);
  for (const directory of ["public", "styles", ".openai"]) {
    await cp(resolve(root, directory), directory === "public" ? output : resolve(output, directory), { recursive: true });
  }
  await writeFile(resolve(output, "index.html"), html);
}

export async function serve(port = Number(process.env.PORT || 3000)) {
  // Serve an allowlist of built public assets, never project files or hosting metadata.
  const files = new Map();
  for (const name of await readdir(output, { recursive: true })) {
    const path = await realpath(resolve(output, name));
    if (types[extname(name)] && path.startsWith(output + sep)) files.set("/" + name.replaceAll(sep, "/"), path);
  }
  files.set("/", resolve(output, "index.html"));
  const server = createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      const path = files.get(new URL(request.url, "http://localhost").pathname);
      if (!path) {
        response.writeHead(404).end("Not found");
        return;
      }
      const body = await readFile(path);
      response.writeHead(200, { "Content-Type": types[extname(path)], "Content-Length": body.length, "X-Content-Type-Options": "nosniff" });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch (error) {
      console.error(error);
      response.writeHead(500).end("Unable to read asset");
    }
  });
  await new Promise((ready, reject) => server.once("error", reject).listen(port, "127.0.0.1", ready));
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command !== "start") await build();
  if (command === "dev" || command === "start") {
    const server = await serve();
    console.log(`Necktie: http://localhost:${server.address().port}`);
  }
}
