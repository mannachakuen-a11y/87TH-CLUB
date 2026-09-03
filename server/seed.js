// Seed the integrations table (safe to run repeatedly). Uses the same
// repository as the API so it works on both sqlite and supabase.
import { getRepo } from "./db.js";

const INTEGRATIONS = [
  ["int_openai", "openai", "OpenAI", "available", ["GPT-4o strategy", "vision analysis", "structured extraction"], ["model access"]],
  ["int_anthropic", "anthropic", "Anthropic Claude", "available", ["long-context reasoning", "writing", "critique"], ["model access"]],
  ["int_gemini", "gemini", "Google Gemini", "available", ["multimodal analysis", "video understanding"], ["model access"]],
  ["int_arena", "arena", "Arena AI", "available", ["agentic tool use", "orchestration"], ["agent access"]],
  ["int_shopify", "shopify", "Shopify", "available", ["orders", "products", "analytics"], ["store.read"]],
  ["int_stripe", "stripe", "Stripe", "available", ["payments", "revenue analytics"], ["charges.read"]],
  ["int_gmail", "gmail", "Gmail", "available", ["draft/send client messages", "client communication"], ["gmail.send", "gmail.drafts"]],
  ["int_drive", "drive", "Google Drive", "available", ["asset sync"], ["drive.read"]],
  ["int_ga", "ga", "Google Analytics", "available", ["traffic", "acquisition", "behavior"], ["analytics.read"]],
  ["int_figma", "figma", "Figma", "planned", ["web/design handoff"], ["files.read"]],
  ["int_canva", "canva", "Canva", "planned", ["social + presentation assets"], ["content.write"]],
  ["int_adobe", "adobe", "Adobe Creative Cloud", "planned", ["creative processing"], ["assets.read"]],
  ["int_higgsfield", "higgsfield", "Higgsfield", "planned", ["video generation"], ["video.create"]],
  ["int_resolve", "resolve", "DaVinci Resolve", "planned", ["professional editing/color"], ["project.write"]],
  ["int_jitter", "jitter", "Jitter", "planned", ["motion graphics"], ["video.create"]],
  ["int_vercel", "vercel", "Vercel", "planned", ["deploy", "preview"], ["deploy.write"]],
  ["int_netlify", "netlify", "Netlify", "planned", ["deploy", "forms"], ["deploy.write"]],
  ["int_playwright", "local", "Browser / Playwright", "planned", ["website intelligence", "browser automation"], ["browser"]],
];

(async () => {
  const r = await getRepo();
  for (const [id, provider, name, state, caps, perms] of INTEGRATIONS) {
    await r.saveIntegration({ id, provider, name, state, capabilities: caps, permissions: perms });
  }
  console.log(`[87th] Seeded ${INTEGRATIONS.length} integrations on driver ${r.name}.`);
  process.exit(0);
})();
