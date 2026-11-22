import type { Project } from "../lib/types";
import { FRAMEWORK } from "../lib/framework";
import { overallProgress } from "../lib/ai";

// The always-visible BRAND ADVANCEMENT journey. Real, derived from state:
// shows outcomes 01–08, highlights the current one, and fills an overall
// % that genuinely moves as steps are completed. No fake animation.
export default function Advancement({ project }: { project: Project }) {
  const pct = overallProgress(project);
  return (
    <div style={{ borderBottom: "1px solid var(--line-strong)", background: "rgba(11,11,13,.03)" }}>
      <div className="content" style={{ padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, maxWidth: 1200 }}>
        {/* Journey */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>
          {FRAMEWORK.map((o, i) => {
            const done = o.steps.filter((s) => {
              const st = project.steps[o.id + "." + s.key.split(".")[1]];
              return st && st !== "pending";
            }).length;
            const complete = done === o.steps.length;
            const current = o.id === project.currentOutcomeId;
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 40 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
                    fontSize: 11, fontWeight: 800,
                    fontFamily: "var(--display)",
                    background: complete ? "var(--ink)" : current ? "var(--accent)" : "transparent",
                    color: complete || current ? "var(--bg)" : "var(--faint)",
                    border: complete || current ? "1px solid transparent" : "1px solid var(--line-strong)",
                    transition: "all .3s var(--ease)",
                  }}>{complete ? "✓" : o.id}</span>
                </div>
                {i < FRAMEWORK.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: complete ? "var(--ink)" : "var(--line-strong)", position: "relative" }}>
                    <div style={{ height: "100%", width: pct >= ((i + 1) / FRAMEWORK.length) * 100 ? "100%" : "0%", background: "var(--ink)", transition: "width .6s var(--ease)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Percentage */}
        <div style={{ textAlign: "right", minWidth: 96 }}>
          <div style={{ fontFamily: "var(--display)", fontWeight: 900, fontSize: 28, lineHeight: 1, letterSpacing: "-0.02em" }}>{pct}<span style={{ fontSize: 14, color: "var(--muted)" }}>%</span></div>
          <div className="kicker" style={{ color: "var(--muted)", marginTop: 3 }}>brand advanced</div>
        </div>
      </div>
    </div>
  );
}
