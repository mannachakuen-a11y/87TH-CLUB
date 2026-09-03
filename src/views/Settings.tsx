import { useApp } from "../lib/store";
import { useActiveProjectId } from "../lib/store";
import { PageHead } from "../components/ui";
import { Ic } from "../lib/icons";
import { getUser, signOut } from "../lib/auth";
import { FRAMEWORK } from "../lib/framework";

export default function Settings() {
  const state = useApp();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const user = getUser();

  const reset = () => {
    if (!confirm("Reset all local data? This clears every project, brand brain and decision. This cannot be undone.")) return;
    localStorage.clear();
    location.reload();
  };

  return (
    <div>
      <PageHead eyebrow="Settings" title="Your private OS." sub="Private-first, authenticated, no public registration. No credits. Provider and model use is monitored, not sold." />

      <div className="grid grid-2">
        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>Account</h3>
          <div className="row">
            <div className="avatar-round">{user?.name?.slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{user?.name}</div>
              <div className="small muted">{user?.email} · {user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => { signOut(); location.reload(); }}>Sign out</button>
        </div>

        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>Current project</h3>
          {p ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{p.brandName}</div>
              <div className="small muted">{p.industry || "—"} · {p.market || "—"} · {p.status}</div>
              <div className="small muted" style={{ marginTop: 4 }}>Website: {p.websiteUrl || "none"} · Created {new Date(p.createdAt).toLocaleDateString()}</div>
            </>
          ) : <div className="muted">No active project.</div>}
        </div>

        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>AI architecture</h3>
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            A provider abstraction and AI Router let the model be changed. Providers across OpenAI, Anthropic Claude, Google Gemini, Mistral and future engines are selected per task (strategy, multimodal analysis, writing, critique, image, video, structured extraction).
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="chip">Strategy</span><span className="chip">Multimodal</span><span className="chip">Writing</span><span className="chip">Critique</span><span className="chip">Structured extraction</span>
          </div>
          <div className="divider" />
          <div className="small muted" style={{ lineHeight: 1.6 }}>
            <strong>Usage & cost monitoring</strong> — provider, model, task, tokens, estimated cost, date and success/failure are logged. There is <strong>no user-facing credit system</strong>; external providers are paid separately.
          </div>
        </div>

        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>Framework configuration</h3>
          <p className="small muted">The eight outcomes live as configurable data, so steps can be changed without touching the app.</p>
          {FRAMEWORK.map((o) => (
            <div key={o.id} className="row" style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--display)", fontWeight: 900, color: "var(--brand)" }}>{o.number}</span>
              <span style={{ fontWeight: 600 }}>{o.title}</span>
              <span className="small muted" style={{ marginLeft: "auto" }}>{o.steps.length} steps</span>
            </div>
          ))}
        </div>

        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>Security & privacy</h3>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row"><Ic.shield size={15} /> <span className="small">Private-first, authenticated — no public registration.</span></div>
            <div className="row"><Ic.lock size={15} /> <span className="small">API keys, OAuth secrets and service-role credentials never reach the browser.</span></div>
            <div className="row"><Ic.shield size={15} /> <span className="small">Row-level security, validated uploads, safe errors, rate limits, audit logs.</span></div>
            <div className="row"><Ic.eye size={15} /> <span className="small">No fabricated analytics, fake connections, scans, exports or uploads.</span></div>
          </div>
        </div>

        <div className="glass card-lg">
          <h3 style={{ marginTop: 0 }}>Data</h3>
          <p className="small muted">This build stores state on this device. In production it maps to Supabase (Postgres + pgvector), Auth with Google OAuth, and Storage.</p>
          <button className="btn btn-ghost" style={{ marginTop: 6, color: "var(--accent)", borderColor: "rgba(255,50,49,.3)" }} onClick={reset}>Reset local data</button>
        </div>
      </div>
    </div>
  );
}
