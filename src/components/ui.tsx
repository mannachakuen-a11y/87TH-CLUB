import { useEffect, useState, type ReactNode } from "react";
import { Ic } from "../lib/icons";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function PageHead({ eyebrow, title, sub, actions }: { eyebrow?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="pagehead spread" style={{ alignItems: isJustTitle(title) ? "center" : "flex-end" }}>
      <div>
        {eyebrow && <div className="kicker" style={{ color: "var(--accent)" }}>{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
function isJustTitle(title: string) {
  // Heuristic: single short word → center vertically like a heading plate
  return title.trim().split(/\s+/).length <= 2;
}
// Shared display heading style so every title/stat uses the zine display font.
const DISPLAY: React.CSSProperties = {
  fontFamily: "var(--display)",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "-0.01em",
};

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ margin: 0, fontSize: 22, ...DISPLAY }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Ic.x size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Seg({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tag({ tone, children }: { tone?: "accent" | "ink" | "green" | "amber" | "red" | "outline"; children: ReactNode }) {
  return <span className={`chip ${tone ? tone : ""}`}>{children}</span>;
}

export function Progress({ pct, thin, accent }: { pct: number; thin?: boolean; accent?: boolean }) {
  return (
    <div className={`progress-track ${thin ? "progress-thin" : ""}`}>
      <div className={accent ? "accent" : ""} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="stat-num">{value}</div>
      <div className="kicker" style={{ marginTop: 6, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "70px 20px" }}>
      <div style={{ marginBottom: 18, color: "var(--faint)" }}>{icon ?? <Ic.box size={36} />}</div>
      <div style={{ ...DISPLAY, fontSize: 28 }}>{title}</div>
      {sub && <div className="muted" style={{ marginTop: 8, maxWidth: 430, marginInline: "auto", lineHeight: 1.55 }}>{sub}</div>}
      {action && <div style={{ marginTop: 22 }}>{action}</div>}
    </div>
  );
}

// ---- a tiny toast store (module-level, so any component can fire one) ----
let pushToastFn: ((t: { title: string; body?: string; tone?: "success" | "warning" | "action" | "info" }) => void) | null = null;
export function toast(title: string, body?: string, tone: "success" | "warning" | "action" | "info" = "success") {
  pushToastFn?.({ title, body, tone });
}
export function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; title: string; body?: string; tone: string }[]>([]);
  useEffect(() => {
    pushToastFn = (t) => {
      const id = Date.now() + Math.random();
      setToasts((p) => [...p, { id, title: t.title, body: t.body, tone: t.tone ?? "info" }]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4200);
    };
    return () => { pushToastFn = null; };
  }, []);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <div style={{ flex: 1 }}>
            <strong>{t.title}</strong>
            {t.body && <div style={{ opacity: 0.85, marginTop: 2 }}>{t.body}</div>}
          </div>
          <button className="x" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "87";
}
