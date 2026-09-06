import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key] || file === ".env.local") {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const bucket = "nuta-schola";
const files = new Files({ adapter: neon({ bucket }) });
const key = `smoke/app-layer-${Date.now()}.txt`;
const body = `files-sdk neon adapter smoke @ ${new Date().toISOString()}`;

await files.upload(key, body, { contentType: "text/plain" });
const url = await files.url(key, { expiresIn: 3600 });
const listed = await files.list({ prefix: "smoke/" });
console.log("upload key:", key);
console.log("url ok:", Boolean(url));
console.log("list count:", listed.items?.length ?? 0);
console.log("APP_LAYER_OK");
