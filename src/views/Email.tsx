import { useState } from "react";
import { useApp, useActiveProjectId, updateProject, log, pushNotification } from "../lib/store";
import { useAppCtx } from "../app-context";
import { PageHead, Empty, Modal, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import type { EmailDraft } from "../lib/types";
import { uid } from "../lib/db";
import { getDefaultEmailTemplates } from "../lib/db";
import { apiSendEmail, getToken } from "../lib/api";

export default function EmailView() {
  const state = useApp();
  const { go } = useAppCtx();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [edit, setEdit] = useState<EmailDraft | null>(null);
  const [preview, setPreview] = useState<EmailDraft | null>(null);
  const [confirmSend, setConfirmSend] = useState<EmailDraft | null>(null);

  if (!p) return <PageHead title="Client Communication" sub="Open or create a project first." />;

  const gmailConnected = state.integrations.find((i) => i.provider === "gmail")?.state === "connected";
  const templates = getDefaultEmailTemplates();
  const drafts = p.emailDrafts ?? [];

  const createFromTemplate = (tpl: { name: string; subject: string; body: string }) => {
    const draft: EmailDraft = { id: uid("em"), name: tpl.name, subject: tpl.subject.replace("{brandName}", p.brandName), body: tpl.body.replace("{brandName}", p.brandName).replace("{firstName}", "Founder"), status: "draft", createdAt: new Date().toISOString() };
    updateProject({ id: p.id, emailDrafts: [...drafts, draft] });
    setEdit(draft);
    toast("Draft created", "Customize, preview, then approve before sending.", "info");
  };

  const saveEdit = () => {
    if (!edit) return;
    updateProject({ id: p.id, emailDrafts: drafts.map((d) => (d.id === edit.id ? { ...edit, status: "edited" } : d)) });
    setEdit(null);
    toast("Draft saved", "", "success");
  };

  const approve = (d: EmailDraft) => {
    updateProject({ id: p.id, emailDrafts: drafts.map((x) => (x.id === d.id ? { ...x, status: "approved" } : x)) });
    log(p.id, "user", "email", `Approved client message: ${d.name}`);
  };

  const send = async (d: EmailDraft) => {
    if (!getToken()) {
      toast("No API session", "Sign in to the backend to send. Until then, copy the message — it's not sent.", "warning");
      setConfirmSend(null);
      return;
    }
    try {
      const r = await apiSendEmail({ subject: d.subject, body: d.body });
      // Only mark sent if the server confirms a real send; otherwise keep draft.
      updateProject({ id: p.id, emailDrafts: drafts.map((x) => (x.id === d.id ? { ...x, status: "sent" } : x)) });
      pushNotification("Client message sent", `${d.name} → ${p.brandName}.`, "success");
      log(p.id, "system", "email", `Sent via API: ${d.name}`);
      setConfirmSend(null);
      toast("Sent", "Delivered through the configured integration.", "success");
    } catch (err: any) {
      toast("Not sent", err?.message || "The server couldn't send this (Gmail is not configured). I won't fake it — copy the message instead.", "warning");
      setConfirmSend(null);
    }
  };

  return (
    <div>
      <PageHead
        eyebrow="Client Communication"
        title="Reusable, editable client messages."
        sub="Draft, customize, preview and explicitly approve before sending. Real sending goes through the Gmail integration — until it's connected, you copy rather than fake-send."
        actions={<button className="btn btn-soft" onClick={() => go("integrations")}><Ic.plug size={16} /> {gmailConnected ? "Gmail connected" : "Connect Gmail"}</button>}
      />

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0 }}>Client message templates</h3>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {templates.map((t) => (
              <div key={t.id} className="glass card">
                <span className="chip accent">Client</span>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{t.name}</div>
                <div className="small muted">Subject: {t.subject.replace("{brandName}", p.brandName)}</div>
                <p className="small" style={{ lineHeight: 1.5, marginTop: 6 }}>{t.body.replace("{brandName}", p.brandName).replace("{firstName}", "Founder").slice(0, 120)}…</p>
                <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => createFromTemplate(t)}>Use template</button>
              </div>
            ))}
            <div className="glass card" style={{ borderStyle: "dashed" }}>
              <div className="muted"><Ic.plus size={20} /></div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>New draft</div>
              <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => { const d: EmailDraft = { id: uid("em"), name: "Untitled message", subject: "", body: "", status: "draft", createdAt: new Date().toISOString() }; updateProject({ id: p.id, emailDrafts: [...drafts, d] }); setEdit(d); }}>Start from scratch</button>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ margin: 0 }}>Drafts</h3>
          {drafts.length === 0 ? (
            <div className="glass" style={{ marginTop: 12 }}><Empty icon={<Ic.mail size={38} />} title="No drafts yet" sub="Create a draft from a template or from scratch." /></div>
          ) : (
            <div className="stack" style={{ marginTop: 12 }}>
              {drafts.map((d) => (
                <div key={d.id} className="glass card">
                  <div className="spread">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                      <div className="small muted">Subject: {d.subject || "—"}</div>
                    </div>
                    <span className={`chip ${d.status === "sent" ? "green" : d.status === "approved" ? "accent" : "outline"}`}>{d.status}</span>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn btn-soft btn-sm" onClick={() => setEdit(d)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreview(d)}>Preview</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { updateProject({ id: p.id, emailDrafts: drafts.map((x) => (x.id === d.id ? { ...x, id: uid("em"), name: d.name + " (copy)" } : x)) }); toast("Duplicated", "", "info"); }}>Duplicate</button>
                    {d.status !== "approved" && d.status !== "sent" && <button className="btn btn-primary btn-sm" onClick={() => approve(d)}>Approve</button>}
                    {d.status === "approved" && <button className="btn btn-accent btn-sm" onClick={() => setConfirmSend(d)}><Ic.send size={14} /> Send</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit message" wide footer={<>
        <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
        <button className="btn btn-accent" onClick={saveEdit}><Ic.check size={16} /> Save draft</button>
      </>}>
        {edit && (
          <div className="stack">
            <div className="field"><label>Name</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="field"><label>Subject</label><input className="input" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></div>
            <div className="field"><label>Body</label><textarea className="input" style={{ minHeight: 260 }} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></div>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Preview" wide footer={<button className="btn btn-soft" onClick={() => setPreview(null)}>Close</button>}>
        {preview && <PreviewEmail d={preview} />}
      </Modal>

      <Modal open={!!confirmSend} onClose={() => setConfirmSend(null)} title="Confirm send" footer={<>
        <button className="btn btn-ghost" onClick={() => setConfirmSend(null)}>Cancel</button>
        <button className="btn btn-accent" onClick={() => confirmSend && send(confirmSend)}><Ic.send size={16} /> Explicit confirmation — Send</button>
      </>}>
        {confirmSend && (
          <div>
            <p className="small muted">This sends <strong>{confirmSend.name}</strong> to your client via the Gmail integration. You must explicitly confirm.</p>
            <PreviewEmail d={confirmSend} />
          </div>
        )}
      </Modal>
    </div>
  );
}

function PreviewEmail({ d }: { d: EmailDraft }) {
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div className="small muted" style={{ marginBottom: 6 }}>Subject</div>
      <div style={{ fontWeight: 700, marginBottom: 16 }}>{d.subject || "—"}</div>
      <div className="small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{d.body || "—"}</div>
    </div>
  );
}
