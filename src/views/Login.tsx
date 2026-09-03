import { useState } from "react";
import { signIn, getUser, subscribeUser } from "../lib/auth";
import { useAppCtx } from "../app-context";
import { useSyncExternalStore } from "react";
import { Ic } from "../lib/icons";

export default function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { go } = useAppCtx();
  const user = useSyncExternalStore(subscribeUser, getUser, getUser);

  const attempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const r = await signIn(name.trim(), email.trim());
    setBusy(false);
    if (r.backend) setMsg("Signed in. Backend session created — your work syncs to the API.");
    else setMsg("Signed in locally. The API server wasn't reachable from the browser, so you're in offline mode (state saves here and syncs when it recovers).");
    go("dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      <div className="canvas-bg">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
      </div>
      <div style={{ position: "absolute", top: 32, left: 32, display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
        <div className="mark" style={{ width: 38, height: 38, borderRadius: 6, background: "var(--brand)", color: "var(--white)", display: "grid", placeItems: "center", fontFamily: "var(--display)", fontWeight: 900, fontSize: 20, transform: "skew(-4deg)" }}>M</div>
        <div className="logo-word">Mannas Dungeons</div>
      </div>
      <div style={{ position: "absolute", top: 36, right: 36, zIndex: 2 }}>
        <span className="chip" style={{ letterSpacing: "0.16em" }}>Private-first</span>
      </div>

      <div style={{ width: "min(1060px, 94vw)", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center", padding: "40px 0" }}>
        <div>
          <div className="kicker" style={{ color: "var(--accent)", marginBottom: 26 }}>Brand Advancement OS</div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: "clamp(44px, 6vw, 76px)", lineHeight: 0.96, letterSpacing: "-0.02em", margin: 0 }}>
            One brand,<br />
            <span style={{ color: "var(--brand)" }}>advanced.</span>
          </h1>
          <p style={{ fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.55, maxWidth: 400, margin: "30px 0 0" }}>
            Take a fashion brand through eight outcomes — identity, world, experience, conversion, content, campaign, acquisition, growth. One workspace, one brand brain.
          </p>
          <div className="row" style={{ marginTop: 40, gap: 0 }}>
            {["01 Identity", "02 World", "03 Experience", "08 Growth"].map((s) => (
              <span key={s} className="mono" style={{ fontSize: 12, color: "var(--muted)", paddingRight: 18, marginRight: 18, borderRight: "1px solid var(--line)" }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid var(--line)", background: "var(--panel)", borderRadius: "var(--radius-lg)", padding: 40 }}>
          <div className="kicker" style={{ color: "var(--ink-soft)" }}>Enter</div>
          <h2 style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", fontSize: 26, letterSpacing: "-0.01em", margin: "10px 0 26px" }}>Sign in to the dungeon.</h2>
          <form onSubmit={attempt}>
            <div className="field">
              <label>Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kiprop" autoFocus />
            </div>
            <div className="field">
              <label>Email <span style={{ color: "var(--faint)" }}>· optional</span></label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com" />
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={!name.trim() || busy}>
              {busy ? "Entering…" : "Enter the club"}
            </button>
          </form>
          {msg && <div className="glass" style={{ marginTop: 14, padding: "12px 14px", background: "rgba(19,19,22,.03)", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-soft)" }}>{msg}</div>}

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <RowTone><Ic.shield size={14} /> No public registration</RowTone>
            <RowTone><Ic.lock size={14} /> Stays on this device</RowTone>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 28, left: 32, fontSize: 11, color: "var(--faint)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
        © 2026 Mannas Dungeons
      </div>
    </div>
  );
}

function RowTone({ children }: { children: React.ReactNode }) {
  return <div className="row" style={{ gap: 10, fontSize: 13, color: "var(--ink-soft)" }}>{children}</div>;
}
