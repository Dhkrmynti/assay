// One door to the language model: Claude through the Anthropic SDK when credentials are present, otherwise a local Ollama if one answers.
import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const CLAUDE_EFFORT = process.env.CLAUDE_EFFORT || ""; // low | medium | high; empty keeps the model's default
const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "nova";

// the SDK reads ANTHROPIC_API_KEY, then ANTHROPIC_AUTH_TOKEN, then a profile saved by `ant auth login`
const profileDir = path.join(process.env.ANTHROPIC_CONFIG_DIR || path.join(homedir(), ".config", "anthropic"), "credentials");
const hasProfile = (() => { try { return existsSync(profileDir) && readdirSync(profileDir).some((f) => f.endsWith(".json")); } catch { return false; } })();
const useClaude = process.env.AI_PROVIDER === "claude" || (process.env.AI_PROVIDER !== "ollama" && !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || hasProfile));
const client = useClaude ? new Anthropic({ maxRetries: 3, timeout: 90_000 }) : null;
// Haiku has no server-side fallback; the larger models re-run a declined request on Anthropic's recommended model
const withFallback = !CLAUDE_MODEL.startsWith("claude-haiku");

export const aiLabel = useClaude ? `Claude ${CLAUDE_MODEL}` : `Ollama ${OLLAMA_MODEL} (if running)`;
export class AiOffline extends Error {}
const OFFLINE = "The AI core is offline right now.";

async function askClaude(sys, messages, maxTokens) {
  const params = {
    model: CLAUDE_MODEL,
    // thinking is always on for the current models, so leave room above the answer budget
    max_tokens: maxTokens + 4000,
    system: sys,
    messages,
    ...(CLAUDE_EFFORT ? { output_config: { effort: CLAUDE_EFFORT } } : {}),
  };
  let res;
  try {
    res = withFallback
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await client.messages.create(params);
  } catch (e) {
    // missing or wrong credentials, and a service still down after the SDK's retries, read as offline; anything else is a real bug
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) { console.error("claude: credentials rejected,", e.message); throw new AiOffline(OFFLINE); }
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) { console.error("claude: unavailable,", e.message); throw new AiOffline(OFFLINE); }
    throw e;
  }
  if (res.stop_reason === "refusal") throw new Error("model declined: " + (res.stop_details?.category || "no category"));
  if (res.stop_reason === "max_tokens") throw new Error("answer cut off at max_tokens");
  return res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

async function askOllama(sys, messages, { json, maxTokens, temperature }) {
  let res;
  try {
    res = await fetch(OLLAMA + "/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, ...(json ? { format: "json" } : {}), messages: [{ role: "system", content: sys }, ...messages], options: { temperature, num_predict: maxTokens } }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch { throw new AiOffline(OFFLINE); }
  if (!res.ok) throw new AiOffline(OFFLINE);
  return String((await res.json())?.message?.content || "");
}

/** messages: [{role:"user"|"assistant", content}]. temperature only reaches Ollama; current Claude models take none. */
export async function ask(system, messages, { json = false, maxTokens = 500, temperature = 0.7 } = {}) {
  const sys = system + (json ? "\n\nReply with one JSON object only, no other text." : "");
  const out = (useClaude ? await askClaude(sys, messages, maxTokens) : await askOllama(sys, messages, { json, maxTokens, temperature })).trim();
  if (!json) return out;
  const a = out.indexOf("{"), b = out.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : out);
}
