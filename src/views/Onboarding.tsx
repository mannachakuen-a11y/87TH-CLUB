import { useState, useRef } from "react";
import { useApp, useActiveProjectId, updateProject, log, pushNotification, addFindingToProject } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { analyzeWebsite, buildFindings, buildQuestions, buildAnalysis } from "../lib/analysis";
import type { Asset, WebsiteHealth } from "../lib/types";
import { uid, getState } from "../lib/db";

const INDUSTRIES = ["Streetwear", "Luxury", "Premium", "Formal", "Minimalist", "Maximalist", "Sportswear", "Athleisure", "Denim", "Vintage", "Y2K", "Techwear", "Outdoor", "Skate", "Cultural", "Artistic", "Avant-Garde", "Essentials", "Fast Fashion", "Slow Fashion", "Sustainable", "Resort", "Evening", "Tailoring", "Footwear", "Accessories", "Jewelry", "Beauty / Fashion hybrid"];
const MARKETS = ["Global", "Africa", "Kenya", "Europe", "UK", "US", "Asia", "Middle East"];

interface TextAsset {
  name: string;
  content: string;
}

export default function Onboarding() {
  const activeId = useActiveProjectId();
  const state = useApp();
  const { go } = useAppCtx();
  const project = state.projects.find((p) => p.id === activeId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({
    brandName: project?.brandName ?? "",
    industry: project?.industry ?? "Streetwear",
    market: project?.market ?? "Africa",
    description: project?.description ?? "",
    websiteUrl: project?.websiteUrl ?? "",
    context: project?.context ?? "",
  });
  const [socials, setSocials] = useState<string[]>(project?.socialUrls?.length ? project.socialUrls : []);
  const [socialInput, setSocialInput] = useState("");
  const [uploaded, setUploaded] = useState<Asset[]>([]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<"intake" | "upload" | "analyzing">("intake");

  if (!project) return <PageHead title="New project" sub="Project not found." />;

  const saveDraft = () => {
    updateProject({ id: project.id, ...draft, socialUrls: socials });
  };

  const addSocial = () => {
    const v = socialInput.trim();
    if (!v) return;
    setSocials((p) => [...p, v]);
    setSocialInput("");
  };

  const set = (k: keyof typeof draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const textAssets: TextAsset[] = [];
    for (const f of Array.from(files)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const kind: Asset["kind"] = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) ? "image" : ["mp4", "mov"].includes(ext) ? "video" : ["mp3", "wav"].includes(ext) ? "audio" : ["mp4", "mov"].includes(ext) ? "video" : "document";
      if (ext === "txt" || ext === "csv") {
        try {
          const text = await f.text();
          textAssets.push({ name: f.name, content: text });
        } catch { /* ignore */ }
      }
      let url: string | undefined;
      if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" || ext === "gif" || ext === "svg") {
        url = await readDataUrl(f);
      }
      const a: Asset = {
        id: uid("asset"),
        name: f.name,
        kind,
        tags: [draft.industry, "intake"],
        favorite: false,
        approved: false,
        url,
        scope: "project",
        createdAt: new Date().toISOString(),
      };
      setUploaded((p) => [...p, a]);
      updateProject({ id: project.id, assets: [...(project.assets ?? []), a.id] });
    }
    if (textAssets.length) {
      (window as any).__textAssets__ = [...((window as any).__textAssets__ ?? []), ...textAssets];
    }
    if (textAssets.length) toast(`${textAssets.length} text file(s) read — they'll feed the analysis.`, "", "info");
    else toast("Files stored as assets.", "Text extraction (TXT/CSV) feeds analysis; PDF/DOCX/PPTX are stored — run extraction via the browser bridge.", "info");
  };

  const runAnalysis = async () => {
    saveDraft();
    setStep("analyzing");
    setRunning(true);
    const textAssets: TextAsset[] = (window as any).__textAssets__ ?? [];
    const allAssets: Asset[] = [...uploaded, ...(project.assets ?? []).map((id) => getState().assetsAll.find((a) => a.id === id)).filter(Boolean) as Asset[]];
    allAssets.forEach((a) => getState().assetsAll.find((x) => x.id === a.id) ?? pushAsset(a));

    // Website intelligence — honest fetch
    let health: WebsiteHealth = { reachable: false, url: draft.websiteUrl || "none", hasH1: false, hasCta: false, hasReviews: false, hasSizeGuide: false, hasShippingReturns: false, hasFaq: false, hasNewsletter: false, wordCount: 0, title: "", notes: [] };
    if (draft.websiteUrl.trim()) {
      const r = await analyzeWebsite(draft.websiteUrl.trim());
      health = r.health;
    }

    const proj = getState().projects.find((p) => p.id === project.id)!;
    const findings = buildFindings({ ...proj, description: draft.description, websiteUrl: draft.websiteUrl }, health, textAssets, { audience: draft.industry });
    findings.forEach((f) => addFindingToProject(project.id, f));
    const questions = buildQuestions({ ...proj, description: draft.description, websiteUrl: draft.websiteUrl, industry: draft.industry }, findings);
    const analysis = buildAnalysis({ ...proj, description: draft.description, websiteUrl: draft.websiteUrl }, health, findings);
    updateProject({ id: project.id, analysis, findings, pendingQuestions: questions, websiteUrl: draft.websiteUrl });
    log(project.id, "system", "analysis", `First-pass analysis complete. ${findings.length} findings, ${questions.length} high-value questions.`);
    pushNotification("First-pass analysis complete", `${findings.length} findings surfaced across ${health.reachable ? "your live website" : "provided materials"}. Review them, then start Outcome 01.`, "action");
    setRunning(false);
    toast("Analysis complete", `Website: ${health.reachable ? "reachable" : "not reachable"}. ${findings.length} findings.`, "success");
    go("analysis");
  };

  const canProgress = draft.brandName.trim().length > 0;

  return (
    <div>
      <PageHead eyebrow="Project intake" title="Add your brand materials." sub="No long questionnaire. Give us what you have; the OS runs a first-pass analysis and only asks what's missing." />

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)", alignItems: "start" }}>
        <div className="glass card-lg stack">
          <div className="field">
            <label>Brand name *</label>
            <input className="input" value={draft.brandName} onChange={(e) => set("brandName", e.target.value)} placeholder="e.g. Kiprop Supply" />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Industry</label>
              <select className="input" value={draft.industry} onChange={(e) => set("industry", e.target.value)}>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Market</label>
              <select className="input" value={draft.market} onChange={(e) => set("market", e.target.value)}>
                {MARKETS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Brand description</label>
            <textarea className="input" value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="What do you make, for whom, and what makes it different?" style={{ minHeight: 120 }} />
          </div>
          <div className="field">
            <label>Website URL</label>
            <div className="row">
              <input className="input" value={draft.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="brand.com" style={{ flex: 1 }} />
            </div>
          </div>
          <div className="field">
            <label>Social URLs</label>
            <div className="row">
              <input className="input" value={socialInput} onChange={(e) => setSocialInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSocial()} placeholder="@handle or URL" style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={addSocial}><Ic.plus size={16} /></button>
            </div>
            {socials.length > 0 && (
              <div className="row" style={{ marginTop: 4 }}>
                {socials.map((s, i) => <span key={i} className="chip outline">{s} <button onClick={() => setSocials((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: 0, color: "var(--muted)" }}>✕</button></span>)}
              </div>
            )}
          </div>
          <div className="field">
            <label>Optional context</label>
            <textarea className="input" value={draft.context} onChange={(e) => set("context", e.target.value)} placeholder="Founding story, current campaign, what's holding the brand back…" />
          </div>
        </div>

        <div className="stack">
          <div className="glass card-lg">
            <div className="spread" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Existing assets</h3>
              <span className="small muted">{uploaded.length} uploaded</span>
            </div>
            <button className="btn btn-soft btn-block" onClick={() => fileRef.current?.click()}>
              <Ic.upload size={16} /> Upload materials
            </button>
            <input ref={fileRef} type="file" multiple hidden accept=".pdf,.docx,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.mov,.mp3,.wav" onChange={(e) => handleFiles(e.target.files)} />
            <p className="small muted" style={{ lineHeight: 1.5, marginTop: 10 }}>
              Guidelines, catalogues, pitch decks, lookbooks, logos, photos, screenshots, campaigns, packaging, fonts. TXT/CSV feed the analysis; everything is stored as an Asset.
            </p>
            {uploaded.length > 0 && (
              <div className="stack" style={{ marginTop: 12 }}>
                {uploaded.map((a) => (
                  <div key={a.id} className="row" style={{ padding: "8px 10px", background: "rgba(0,0,0,.03)", borderRadius: 12 }}>
                    {a.url ? <img src={a.url} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 8 }} /> : <Ic.doc size={16} />}
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    <span className="chip">{a.kind}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass card-lg">
            <h3 style={{ marginTop: 0 }}>What happens next</h3>
            <div className="timeline">
              <div><strong>First-pass analysis</strong><div className="small muted">Reads your materials + reachable site. Separates CONFIRMED / OBSERVED / INFERRED / MISSING.</div></div>
              <div><strong>Outcome 01 — Identity</strong><div className="small muted">Positioning, audience, promise, message. Tested for clarity.</div></div>
              <div><strong>…through Outcome 08</strong><div className="small muted">Each step can be completed, skipped, paused, reopened or overridden.</div></div>
            </div>
            <button className="btn btn-accent btn-block btn-lg" style={{ marginTop: 14 }} disabled={!canProgress || running} onClick={runAnalysis}>
              {running ? <><Ic.refresh size={16} /> Analysing…</> : <><Ic.spark size={16} /> Run first-pass analysis</>}
            </button>
            <div className="row" style={{ marginTop: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { saveDraft(); toast("Details saved — start Outcome 01 when ready."); }}>Save & skip analysis</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function readDataUrl(f: File): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => res("");
    r.readAsDataURL(f);
  });
}

function pushAsset(a: Asset) {
  const s = getState();
  s.assetsAll.push(a);
}
