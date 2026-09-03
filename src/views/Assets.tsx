import { useRef, useState } from "react";
import { useApp, useActiveProjectId, addAsset, updateAsset } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Seg, Empty, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import type { Asset } from "../lib/types";
import { uid } from "../lib/db";

const SCOPES = ["global", "project", "campaign", "template", "reference"];
const KIND_ICON: Record<Asset["kind"], any> = { image: Ic.image, video: Ic.video, document: Ic.doc, audio: Ic.play, data: Ic.chart };

export default function Assets() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [scope, setScope] = useState("project");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!p) return <PageHead title="Asset Library" sub="Open or create a project first." />;

  const projIds = new Set(p.assets ?? []);
  const all = state.assetsAll.filter((a) => projIds.has(a.id) || a.scope === "global");
  const filtered = all.filter((a) => (scope === "global" ? a.scope === "global" : ((a.scope ?? "project") === scope)) && (!q || a.name.toLowerCase().includes(q.toLowerCase())) && (!favOnly || a.favorite));

  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const kind: Asset["kind"] = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) ? "image" : ["mp4", "mov"].includes(ext) ? "video" : ["mp3", "wav"].includes(ext) ? "audio" : "document";
      let url: string | undefined;
      if (kind === "image") url = await readUrl(f);
      const a: Asset = { id: uid("asset"), name: f.name, kind, tags: [p.industry || "fashion"], favorite: false, approved: false, url, scope: scope as any, createdAt: new Date().toISOString() };
      addAsset(a, p.id);
    }
    toast("Uploaded", "Assets added and AI-classified by kind.", "success");
  };

  const classCount = filtered.reduce<Record<string, number>>((acc, a) => { acc[a.kind] = (acc[a.kind] ?? 0) + 1; return acc; }, {});

  return (
    <div>
      <PageHead
        eyebrow="Asset Library"
        title="One library, every asset."
        sub="Global, project, campaign, template and reference assets. Upload, drag-in, preview, search, tag, favorite, version, approve/reject and link to outcomes, campaigns or templates."
        actions={<button className="btn btn-accent" onClick={() => fileRef.current?.click()}><Ic.upload size={16} /> Upload</button>}
      />
      <input ref={fileRef} type="file" multiple hidden accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.mov,.mp3,.wav,.pdf,.txt,.csv" onChange={(e) => upload(e.target.files)} />

      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <Seg options={SCOPES.map((s) => ({ id: s, label: s === "project" ? "Project assets" : s[0].toUpperCase() + s.slice(1) }))} value={scope} onChange={setScope} />
        <div className="searchbox" style={{ flex: 1 }}><Ic.search size={15} /><input placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="btn btn-soft" onClick={() => setFavOnly((v) => !v)} style={{ background: favOnly ? "var(--ink)" : undefined, color: favOnly ? "#fff" : undefined }}><Ic.heart size={16} /></button>
        <span className="chip"><Ic.spark size={13} /> AI classifies assets</span>
      </div>

      <div className="row" style={{ marginBottom: 14, gap: 8 }}>
        {Object.entries(classCount).map(([k, v]) => <span key={k} className="chip outline">{k} · {v}</span>)}
      </div>

      {filtered.length === 0 ? (
        <div className="glass"><Empty icon={<Ic.box size={38} />} title="No assets in this scope" sub="Upload files or drag them in. Images preview in place." action={<button className="btn btn-primary" onClick={() => fileRef.current?.click()}>Upload assets</button>} /></div>
      ) : (
        <div className="grid grid-4">
          {filtered.map((a) => (
            <div key={a.id} className="glass card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 120, background: "rgba(0,0,0,.05)", display: "grid", placeItems: "center", position: "relative" }}>
                {a.url ? <img src={a.url} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} /> : (() => { const Icon = KIND_ICON[a.kind]; return <Icon size={30} />; })()}
                {a.favorite && <span className="chip accent" style={{ position: "absolute", top: 8, right: 8 }}>♥</span>}
                {a.approved && <span className="chip green" style={{ position: "absolute", top: 8, left: 8 }}>approved</span>}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div className="small muted">{a.kind} · {a.scope}</div>
                <div className="row" style={{ marginTop: 8, gap: 4, flexWrap: "wrap" }}>{a.tags.slice(0, 2).map((t) => <span key={t} className="chip">{t}</span>)}</div>
                <div className="row" style={{ marginTop: 10, gap: 4 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateAsset(a.id, { favorite: !a.favorite })} title="Favourite"><Ic.heart size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateAsset(a.id, { approved: !a.approved })} title="Approve"><Ic.check size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { addAsset({ ...a, id: uid("asset"), name: a.name + " (copy)" }, p.id); toast("Duplicated", "", "info"); }} title="Duplicate"><Ic.copy size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { go("campaigns"); }} title="Link to campaign"><Ic.plug size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function readUrl(f: File) {
  return new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => res(""); r.readAsDataURL(f); });
}
