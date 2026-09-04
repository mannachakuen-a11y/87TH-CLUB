import { useState, useRef, useEffect } from "react";
import { useApp, useActiveProjectId, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead } from "../components/ui";
import { Ic } from "../lib/icons";
import { ask87th } from "../lib/ai";
import { apiAsk } from "../lib/api";
import type { View } from "../nav";

const SUGGESTIONS = [
  "Analyze this brand",
  "Continue Outcome 02",
  "What is wrong with the website?",
  "Show the highest-priority problem",
  "Create three solutions",
  "Build the homepage redesign",
  "Create a campaign",
  "What is pending?",
  "What did we decide?",
  "What should we test next?",
];

export default function AIChat() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [msgs, setMsgs] = useState<{ who: "user" | "ai"; text: string; tone?: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  if (!p) return <PageHead title="Mannas AI" sub="Open or create a project first." />;

  const actionToView = (action: string): View | null => {
    const map: Record<string, View> = {
      "open:onboarding": "onboarding",
      "open:dashboard": "dashboard",
      "open:findings": "analysis",
      "open:design": "design",
      "open:outcome": "framework",
      "open:campaign": "campaigns",
      "open:templates": "templates",
      "open:cinema": "cinema",
      "open:book": "book",
      "open:analytics": "analytics",
    };
    if (action?.startsWith("outcome:")) { go("framework"); return null; }
    return action ? (map[action] ?? null) : null;
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setMsgs((m) => [...m, { who: "user", text: t }]);
    setInput("");
    try {
      const result = await apiAsk(t, p.id);
      const tone = result.ok === false ? "warning" : result.tone;
      setMsgs((m) => [...m, { who: "ai", text: result.text, tone }]);
      log(p.id, "mannas-ai", "ai", `You: ${t}\n→ ${result.text}`);
      const v = actionToView(result.action ?? "");
      if (v) setTimeout(() => go(v), 600);
    } catch {
      const fallback = ask87th(p, t);
      const fallbackText = `${fallback.text}\n\n[Local fallback used because the AI API could not be reached.]`;
      setMsgs((m) => [...m, { who: "ai", text: fallbackText, tone: fallback.tone }]);
      log(p.id, "mannas-ai", "ai", `You: ${t}\n→ ${fallbackText}`);
      const v = actionToView(fallback.action ?? "");
      if (v) setTimeout(() => go(v), 600);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHead eyebrow="Mannas AI" title="Your project-aware assistant." sub={`It knows ${p.brandName}, the framework, approved decisions, rejected directions, references, assets, campaigns, analytics, the current outcome and pending work.`} />
      <div className="glass card-lg" style={{ padding: 20 }}>
        <div className="chat">
          <div className="chat-msgs">
            {msgs.length === 0 && (
              <div className="msg ai">
                <div className="who">Mannas AI</div>
                I'm wired into this brand, not a generic chatbot. Try one of these commands, or ask your own — I'll answer from your real project data. If something needs a live model or an API key, I'll say so plainly.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.who}`}>
                {m.who === "ai" && <div className="who">Mannas AI</div>}
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="chat-input">
            <div className="chat-suggest">
              {SUGGESTIONS.map((s) => <button key={s} className="chip outline" onClick={() => send(s)} disabled={sending}>{s}</button>)}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <input className="input" placeholder="Ask or command…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} disabled={sending} />
              <button className="btn btn-accent" onClick={() => send(input)} disabled={sending}><Ic.spark size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
