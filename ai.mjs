// One door to the language model: Claude when ANTHROPIC_API_KEY is set, otherwise a local Ollama if one answers.
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "nova";

export const aiLabel = CLAUDE_KEY ? `Claude ${CLAUDE_MODEL}` : `Ollama ${OLLAMA_MODEL} (if running)`;
export class AiOffline extends Error {}

/** messages: [{role:"user"|"assistant", content}] */
export async function ask(system, messages, { json = false, maxTokens = 500, temperature = 0.7 } = {}) {
  const sys = system + (json ? "\n\nReply with one JSON object only, no other text." : "");
  let out;
  if (CLAUDE_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01" },
      // the model may spend part of max_tokens thinking first, so leave room above the answer budget
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens + 1000, system: sys, messages }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error("model " + res.status + " " + (await res.text()).slice(0, 160));
    const j = await res.json();
    out = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (j.stop_reason === "max_tokens") throw new Error("answer cut off at max_tokens");
  } else {
    let res;
    try {
      res = await fetch(OLLAMA + "/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, ...(json ? { format: "json" } : {}), messages: [{ role: "system", content: sys }, ...messages], options: { temperature, num_predict: maxTokens } }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch { throw new AiOffline("Signal's AI core is offline right now."); }
    if (!res.ok) throw new AiOffline("Signal's AI core is offline right now.");
    out = String((await res.json())?.message?.content || "");
  }
  out = out.trim();
  if (!json) return out;
  const a = out.indexOf("{"), b = out.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : out);
}
