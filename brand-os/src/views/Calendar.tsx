import { useState } from "react";
import { useApp, useActiveProjectId, addCalendarEvent, updateProject, log } from "../lib/store";
import { PageHead, Modal, toast } from "../components/ui";
import { Ic } from "../lib/icons";
import { uid } from "../lib/db";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube Shorts", "Stories", "Feed", "Email", "SMS"];
const FORMATS = ["Reel", "Post", "Carousel", "Story", "Lookbook", "Teaser", "UGC"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Calendar() {
  const state = useApp();
  const activeId = useActiveProjectId();
  const p = state.projects.find((x) => x.id === activeId);
  const [week, setWeek] = useState(startOfWeek(new Date()));
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string>("");
  const [d, setD] = useState({ title: "", platform: "Instagram", format: "Reel", notes: "" });

  if (!p) return <PageHead title="Calendar" sub="Open or create a project first." />;
  const events = p.calendarEvents ?? [];
  const days = Array.from({ length: 7 }, (_, i) => { const x = new Date(week); x.setDate(week.getDate() + i); return x; });
  const iso = (dd: Date) => dd.toISOString().slice(0, 10);

  const add = () => {
    if (!d.title.trim()) return;
    addCalendarEvent(p.id, { id: uid("ev"), date: day, title: d.title, platform: d.platform, format: d.format, status: "scheduled", notes: d.notes });
    log(p.id, "user", "calendar", `Scheduled: ${d.title} (${d.platform} ${d.format})`);
    setOpen(false); setD({ title: "", platform: "Instagram", format: "Reel", notes: "" });
    toast("Scheduled", "Content added to the calendar.", "success");
  };

  return (
    <div>
      <PageHead
        eyebrow="Content Calendar"
        title="A repeatable schedule."
        sub="Batch and schedule content from the content engine. Weekly cadence, platform-by-platform, with status."
        actions={<div className="row"><button className="btn btn-soft" onClick={() => setWeek(startOfWeek(new Date(week.getTime() - 7 * 864e5)))}><Ic.chevL size={16} /></button><button className="btn btn-primary" onClick={() => setWeek(startOfWeek(new Date()))}>This week</button><button className="btn btn-soft" onClick={() => setWeek(startOfWeek(new Date(week.getTime() + 7 * 864e5)))}><Ic.chevR size={16} /></button></div>}
      />

      <div className="glass card" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, padding: 12 }}>
        {days.map((dd, i) => {
          const key = iso(dd);
          const dayEvents = events.filter((e) => e.date === key);
          const isToday = iso(new Date()) === key;
          return (
            <div key={key} style={{ minHeight: 220, border: "1px solid var(--line)", borderRadius: 14, padding: 10, background: isToday ? "rgba(255,50,49,.05)" : "transparent" }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{DAYS[i]} {dd.getDate()}</span>
                {isToday && <span className="chip accent" style={{ fontSize: 9 }}>today</span>}
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {dayEvents.map((e) => (
                  <div key={e.id} style={{ background: "rgba(0,0,0,.04)", borderRadius: 10, padding: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 11.5 }}>{e.title}</div>
                    <div className="small muted" style={{ fontSize: 10 }}>{e.platform} · {e.format}</div>
                  </div>
                ))}
                <button className="chip outline" style={{ justifyContent: "center", width: "100%", cursor: "pointer" }} onClick={() => { setDay(key); setOpen(true); }}><Ic.plus size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule content" footer={<>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-accent" onClick={add}>Schedule</button>
      </>}>
        <div className="field"><label>Title / hook</label><input className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="The drop — 24h preview" /></div>
        <div className="grid grid-2">
          <div className="field"><label>Platform</label><select className="input" value={d.platform} onChange={(e) => setD({ ...d, platform: e.target.value })}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>Format</label><select className="input" value={d.format} onChange={(e) => setD({ ...d, format: e.target.value })}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></div>
        </div>
        <div className="field"><label>Notes</label><input className="input" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Link to asset, brief, CTA…" /></div>
      </Modal>
    </div>
  );
}
