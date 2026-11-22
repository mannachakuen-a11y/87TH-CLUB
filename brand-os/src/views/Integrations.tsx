import { useState } from "react";
import { useApp, updateProject } from "../lib/store";
import { PageHead, Seg, Modal, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import type { Integration } from "../lib/types";
import { apiConnect, apiTest } from "../lib/api";
import { getState as getStateSync, save as saveSync } from "../lib/db";

// Each integration shows real state. We never flip to "connected" without
// a verified token, and we never claim capabilities we can't run. In this
// build there are no provider OAuth client secrets configured, so the OS
// stays honest: providers remain "available"/"planned" and "test" reports
// the real reason it can't verify.
const PROVIDER_BADGE: Record<string, string> = {
  openai: "OPENAI", anthropic: "CLAUDE", gemini: "GEMINI", arena: "ARENA AI",
  shopify: "SHOPIFY", stripe: "STRIPE", gmail: "GMAIL", drive: "DRIVE", ga: "GA4",
  figma: "FIGMA", canva: "CANVA", adobe: "ADOBE", higgsfield: "HIGGSFIELD",
  resolve: "RESOLVE", vercel: "VERCEL", netlify: "NETLIFY", local: "LOCAL",
};

export default function Integrations() {
  const state = useApp();
  const [sel, setSel] = useState<Integration | null>(null);
  const [tab, setTab] = useState("all");
  const list = state.integrations.filter((i) => tab === "all" || i.state === tab);

  const connect = (i: Integration) => {
    setSel(i);
  };

  const doConnect = async (i: Integration) => {
    try {
      const r = await apiConnect(i.id);
      // Reflect the returned state locally without fabricating it.
      const idx = state.integrations.findIndex((x) => x.id === i.id);
      const updated = state.integrations.map((x, n) => (n === idx ? { ...x, state: r.state, error: r.error || x.error, lastSync: new Date().toISOString() } : x));
      getStateSync().integrations = updated;
      saveSync();
      toast(r.state === "connected" ? "Connected" : "Not connected", r.note || r.error, r.state === "connected" ? "success" : "warning");
    } catch (err: any) {
      toast("Could not connect", err?.message || "The server reported it can't verify this integration.", "warning");
    }
    setSel(null);
  };

  const test = async (i: Integration) => {
    try {
      const r = await apiTest(i.id);
      toast(r.ok ? "Live round-trip succeeded" : "Cannot verify", r.message, r.ok ? "success" : "warning");
    } catch (err: any) {
      toast("Test failed", err?.message, "warning");
    }
  };

  return (
    <div>
      <PageHead
        eyebrow="Integrations Hub"
        title="Specialist tools, orchestrated."
        sub="The OS is the orchestration layer. Each specialist engine (OpenAI, Claude, Gemini, Shopify, Stripe, Gmail, Drive, Canva, Figma, Higgsfield, DaVinci Resolve, Adobe, Vercel, Netlify) plugs in through APIs, OAuth, SDKs, webhooks or MCP — nothing is faked."
      />

      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <Seg options={[{ id: "all", label: "All" }, { id: "available", label: "Available" }, { id: "connected", label: "Connected" }, { id: "planned", label: "Planned" }, { id: "error", label: "Errors" }]} value={tab} onChange={setTab} />
        <span className="chip"><Ic.shield size={13}/> No API keys or secrets exposed to the browser</span>
      </div>

      <div className="grid grid-3">
        {list.map((i) => (
          <div key={i.id} className="glass card hover-lift">
            <div className="spread">
              <div className="row">
                <div className="avatar-round" style={{ width: 40, height: 40, fontSize: 12 }}>{PROVIDER_BADGE[i.provider]?.slice(0, 2)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                  <div className="small muted">{PROVIDER_BADGE[i.provider]}</div>
                </div>
              </div>
              <span className={`chip ${i.state === "connected" ? "green" : i.state === "error" ? "red" : i.state === "available" ? "outline" : "amber"}`}>{i.state}</span>
            </div>
            <div className="divider" style={{ margin: "12px 0" }} />
            <div className="small muted">Capabilities</div>
            <div className="row" style={{ marginTop: 6, gap: 4 }}>{i.capabilities.map((c, n) => <span key={n} className="chip">{c}</span>)}</div>
            <div className="small muted" style={{ marginTop: 10 }}>Permissions</div>
            <div className="row" style={{ marginTop: 4, gap: 4 }}>{i.permissions.map((c, n) => <span key={n} className="chip outline">{c}</span>)}</div>
            {i.error && <div className="chip red" style={{ marginTop: 10 }}><Ic.x size={12} /> {i.error}</div>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-primary btn-sm" onClick={() => connect(i)}><Ic.plug size={15} /> {i.state === "connected" ? "Manage" : "Connect"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => test(i)}>Test</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Connect ${sel.name}` : ""} wide footer={<>
        <button className="btn btn-ghost" onClick={() => setSel(null)}>Cancel</button>
        <button className="btn btn-accent" onClick={() => { if (sel) doConnect(sel); }}>Connect</button>
      </>}>
        {sel && (
          <div>
            <p className="small" style={{ lineHeight: 1.6 }}>
              <strong>{sel.name}</strong> is a specialist engine. The OS orchestrates it — it doesn't replace it.
            </p>
            <div className="timeline" style={{ margin: "12px 0" }}>
              <div><strong>1 · Authorization</strong><div className="small muted">Secure <span className="mono">{sel.provider}</span> OAuth handshake (or SDK/webhook/MCP for machine access). Runs on the server; the browser never sees client secrets.</div></div>
              <div><strong>2 · Verify</strong><div className="small muted">A real round-trip to confirm scopes and capabilities before any token is stored.</div></div>
              <div><strong>3 · Work in the OS</strong><div className="small muted">e.g. {sel.name} becomes the generation/editing/analytics engine while your brand brain, decisions and assets stay centralized.</div></div>
            </div>
            <div className="glass" style={{ padding: 14, background: "rgba(255,50,49,.05)" }}>
              <div className="small" style={{ fontWeight: 700, color: "var(--accent)" }}>Honest state in this build</div>
              <div className="small muted" style={{ marginTop: 4, lineHeight: 1.5 }}>No {sel.provider} OAuth client/secret is configured, so there's nothing to authenticate against and I won't pretend otherwise. The connection will only show <strong>Connected</strong> once a verified token exists. Until then it stays <strong>{sel.state}</strong>.</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
