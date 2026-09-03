import { useState } from "react";
import { useApp, useActiveProjectId, updateProject, log } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, Modal, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { uid } from "../lib/db";
import type { Campaign } from "../lib/types";

export default function Campaigns() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ name: "", insight: "", bigIdea: "", world: "", launch: "", cta: "" });

  if (!p) return <PageHead title="Campaigns" sub="Open or create a project first." />;
  const campaigns = p.campaigns ?? [];

  const create = () => {
    if (!d.name.trim()) return;
    const c: Campaign = {
      id: uid("cam"), name: d.name, objective: `Launch for ${p.brandName}`, audience: p.market || "the community",
      insight: d.insight || "A moment the culture is waiting for.", bigIdea: d.bigIdea || `${p.brandName} — a new season.`,
      world: d.world || "Cinematic, warm, kinetic — the world only this brand could live in.",
      message: p.description || "", creativeDirection: "Hero film + photography + social rollout, one accent signature.",
      references: "", launchSequence: d.launch || "Teaser → Hero → Drop → Wearers → UGC", cta: d.cta || "Shop the drop",
      assetList: "Hero film, key visual, 9:16 verticals, UGC brief, email/SMS, website", measurementPlan: "Reach, saves, add-to-cart, CVR", status: "draft",
    };
    updateProject({ id: p.id, campaigns: [...campaigns, c] });
    log(p.id, "mannas-ai", "campaign", `Campaign created: ${c.name}`);
    toast("Campaign created", "Open it, approve the big idea, then build the rollout.", "success");
    setOpen(false); setD({ name: "", insight: "", bigIdea: "", world: "", launch: "", cta: "" });
  };

  const setStatus = (id: string, status: "draft" | "approved" | "live") => {
    updateProject({ id: p.id, campaigns: campaigns.map((c) => (c.id === id ? { ...c, status } : c)) });
  };

  return (
    <div>
      <PageHead
        eyebrow="Campaign System"
        title="Launch big ideas on a system."
        sub="Each campaign carries objective, audience, insight, big idea, world, message, creative direction, hero creative, rollout, asset list and measurement plan."
        actions={<button className="btn btn-accent" onClick={() => setOpen(true)}><Ic.plus size={16} /> New campaign</button>}
      />

      {campaigns.length === 0 ? (
        <div className="glass"><Empty icon={<Ic.sparkle size={38} />} title="No campaigns yet" sub="Create a launch concept and the OS drafts the insight, big idea, world, hero and rollout." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Create campaign</button>} /></div>
      ) : (
        <div className="grid grid-2">
          {campaigns.map((c) => (
            <div key={c.id} className="glass card">
              <div className="spread">
                <div className="row"><span className="chip accent">{c.status}</span></div>
                <div className="row">
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatus(c.id, "draft")}>Draft</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatus(c.id, "approved")}>Approve</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setStatus(c.id, "live")}>Go live</button>
                </div>
              </div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", margin: "10px 0 4px" }}>{c.name}</h3>
              <div className="small muted">Objective: {c.objective}</div>
              <div className="divider" />
              <div className="small"><strong>Insight:</strong> {c.insight}</div>
              <div className="small" style={{ marginTop: 6 }}><strong>Big idea:</strong> {c.bigIdea}</div>
              <div className="small" style={{ marginTop: 6 }}><strong>World:</strong> {c.world}</div>
              <div className="small" style={{ marginTop: 6 }}><strong>Launch sequence:</strong> {c.launchSequence}</div>
              <div className="small" style={{ marginTop: 6 }}><strong>CTA:</strong> {c.cta}</div>
              <div className="small" style={{ marginTop: 6 }}><strong>Assets:</strong> {c.assetList}</div>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-soft btn-sm" onClick={() => go("cinema")}><Ic.film size={15} /> Hero film</button>
                <button className="btn btn-soft btn-sm" onClick={() => go("design")}><Ic.pen size={15} /> Hero creative</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New campaign" footer={<>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-accent" onClick={create}>Create</button>
      </>}>
        <div className="field"><label>Campaign name</label><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder={`${p.brandName} — Fall Drop`} /></div>
        <div className="field"><label>Insight (the moment)</label><input className="input" value={d.insight} onChange={(e) => setD({ ...d, insight: e.target.value })} placeholder="What's true about the audience right now?" /></div>
        <div className="field"><label>Big idea</label><input className="input" value={d.bigIdea} onChange={(e) => setD({ ...d, bigIdea: e.target.value })} placeholder="Win on a single, memorable idea" /></div>
        <div className="field"><label>Campaign world</label><input className="input" value={d.world} onChange={(e) => setD({ ...d, world: e.target.value })} placeholder="The environment of the launch" /></div>
        <div className="grid grid-2">
          <div className="field"><label>Launch sequence</label><input className="input" value={d.launch} onChange={(e) => setD({ ...d, launch: e.target.value })} placeholder="Teaser → Hero → Drop" /></div>
          <div className="field"><label>CTA</label><input className="input" value={d.cta} onChange={(e) => setD({ ...d, cta: e.target.value })} placeholder="Shop the drop" /></div>
        </div>
      </Modal>
    </div>
  );
}
