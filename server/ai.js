// ==================================================================
// AI Router — a provider abstraction. Routes a task to the best
// configured model; logs provider/model/tokens/cost; and, when no
// key is configured, returns an honest "not configured" answer rather
// than pretending to think. OpenAI / Anthropic / Gemini are real HTTP
// calls. Arena AI, Mistral, etc. plug in here too.
// ==================================================================

export async function resolveProvider(task) {
  // Prioritise by task so each specialist role can use its best model.
  const order = {
    vision: ["gemini", "openai"],
    critique: ["anthropic", "openai"],
    writing: ["anthropic", "openai"],
    strategy: ["openai", "claude", "gemini"],
    extraction: ["openai"],
    default: ["openai", "anthropic", "gemini"],
  };
  const keys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
  };
  const pref = order[task] || order.default;
  for (const p of pref) if (keys[p]) return { provider: p, key: keys[p] };
  return null;
}

export async function chat(task, system, user, opts = {}) {
  const resolved = await resolveProvider(task);
  if (!resolved) {
    return {
      provider: "none",
      model: "not-configured",
      text: "No AI provider key is configured on the server, so I'm not going to pretend to think. Set OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY in the environment (server/.env) and this same route will return a real, routed answer. I read your project's real state either way.",
      tokens: 0,
      cost: 0,
      ok: false,
    };
  }
  try {
    if (resolved.provider === "openai") {
      const model = opts.model || (task === "vision" ? "gpt-4o" : "gpt-4o-mini");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${resolved.key}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const j = await res.json();
      return { provider: "openai", model, text: j.choices?.[0]?.message?.content || "", tokens: j.usage?.total_tokens || 0, cost: (j.usage?.total_tokens || 0) * 0.0000025, ok: true };
    }
    if (resolved.provider === "anthropic") {
      const model = opts.model || "claude-3-5-sonnet-20241022";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": resolved.key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 1024, system, messages: [{ role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const j = await res.json();
      return { provider: "anthropic", model, text: j.content?.find((b) => b.type === "text")?.text || "", tokens: j.usage?.input_tokens + (j.usage?.output_tokens || 0), cost: (j.usage?.input_tokens || 0) * 0.000003 + (j.usage?.output_tokens || 0) * 0.000015, ok: true };
    }
    if (resolved.provider === "gemini") {
      const model = opts.model || "gemini-1.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolved.key}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }] }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const j = await res.json();
      const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      return { provider: "gemini", model, text: t, tokens: (j.usageMetadata?.totalTokenCount || 0), cost: (j.usageMetadata?.totalTokenCount || 0) * 0.0000025, ok: true };
    }
  } catch (err) {
    return { provider: resolved.provider, model: "error", text: `Calling ${resolved.provider} failed (${err.message}). The key may be invalid or the provider unreachable. Nothing was fabricated.`, tokens: 0, cost: 0, ok: false };
  }
  return { provider: "none", model: "not-configured", text: "", tokens: 0, cost: 0, ok: false };
}

export function buildSystemForProject(project) {
  if (!project) return "You are Mannas AI, a brand advancement assistant for Mannas Dungeons.";
  return `You are Mannas AI, an assistant inside Mannas Dungeons Brand Advancement OS, working on the fashion brand "${project.brandName}" (${project.industry || "fashion"}, ${project.market || "global"}). Current outcome: ${project.currentOutcomeId}. ${project.findings?.length || 0} findings, ${project.recommendations?.length || 0} recommendations, ${project.decisions?.length || 0} decisions in the brand brain. Be direct, specific and honest. Never invent analytics. Recommended approach: state what you found, why it matters, what you'd change, what you'd create, the test, and ask whether to proceed.`;
}
