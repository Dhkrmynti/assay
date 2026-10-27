// Checks the AI engine end to end: which provider is active, and one short answer from it.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
try { for (const l of (await readFile(path.join(DIR, ".env"), "utf8")).split("\n")) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2"); } } catch {}
const { ask, aiLabel, AiOffline } = await import("./ai.mjs");

console.log("engine:", aiLabel);
const t0 = Date.now();
try {
  const out = await ask("You check that an AI service is reachable.", [{ role: "user", content: "Reply with exactly: ready" }], { maxTokens: 20 });
  console.log(`answer: ${out} (${Date.now() - t0} ms)`);
} catch (e) {
  console.log(e instanceof AiOffline ? "offline: no working credentials or service (see the log line above, if any)" : "error: " + e.message);
  process.exitCode = 1;
}
