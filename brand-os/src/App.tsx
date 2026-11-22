import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Ic } from "./lib/icons";
import { useApp, useActiveProjectId, setActive, markNotificationsRead, initFromServer } from "./lib/store";
import { getUser, subscribeUser, signOut } from "./lib/auth";
import { AppContext } from "./app-context";
import type { View } from "./nav";
import { NAV } from "./nav";
import { FRAMEWORK } from "./lib/framework";
import { ToastHost, initials } from "./components/ui";
import { overallProgress } from "./lib/ai";

import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import Onboarding from "./views/Onboarding";
import Analysis from "./views/Analysis";
import Framework from "./views/Framework";
import CinemaStudio from "./views/CinemaStudio";
import DesignStudio from "./views/DesignStudio";
import Templates from "./views/Templates";
import WebsiteStudio from "./views/WebsiteStudio";
import References from "./views/References";
import Assets from "./views/Assets";
import BrandBrain from "./views/BrandBrain";
import AIChat from "./views/AIChat";
import Integrations from "./views/Integrations";
import Analytics from "./views/Analytics";
import Campaigns from "./views/Campaigns";
import Calendar from "./views/Calendar";
import EmailView from "./views/Email";
import ExportCenter from "./views/Export";
import Book from "./views/Book";
import Settings from "./views/Settings";

function useUserHook() {
  return useSyncExternalStore(subscribeUser, getUser, getUser);
}

export default function App() {
  const [view, setView] = useState<View>("login");
  const [activeOutcome, setActiveOutcome] = useState<number>(1);
  const [railOpen, setRailOpen] = useState(false);
  const activeProjectId = useActiveProjectId();
  const session = useUserHook();
  const appState = useApp();

  const activeProject = useMemo(
    () => appState.projects.find((p) => p.id === activeProjectId) ?? null,
    [appState.projects, activeProjectId],
  );

  useEffect(() => {
    if (!getUser()) setView("login");
    else if (view === "login") setView("dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (getUser()) initFromServer();
  }, [session]);

  const go = (v: View) => {
    setView(v);
    setRailOpen(false);
  };
  const openOutcome = (n: number) => {
    setActiveOutcome(n);
    setView("framework");
    setRailOpen(false);
  };
  const openProject = (id: string | null) => {
    setActive(id);
    if (id) go("dashboard");
  };

  const unauth = !getUser();

  const outcomeDone = (id: number): number => {
    if (!activeProject) return 0;
    const o = FRAMEWORK.find((f) => f.id === id)!;
    const steps = activeProject.steps || {};
    return o.steps.filter((s) => {
      const st = steps[`${o.id}.${s.key.split(".")[1]}`];
      return st && st !== "pending";
    }).length;
  };

  const toolEntries = NAV.filter((n) => n.view !== "framework");

  return (
    <AppContext.Provider value={{ view, go, openProject, activeProjectId, activeOutcome, openOutcome }}>
      {unauth ? (
        <Login />
      ) : (
        <div className="app">
          <div className="canvas-bg">
            <span className="orb o1" /><span className="orb o2" /><span className="orb o3" />
          </div>

          {/* ------- LEFT SIDEBAR / RAIL ------- */}
          <aside className={`rail ${railOpen ? "open" : ""}`}>
            <button className="logo" onClick={() => go("dashboard")} aria-label="Mannas Dungeons home">
              <span className="logo-mark">M</span>
              <span className="logo-word">Mannas&nbsp;Dungeons</span>
              <span className="logo-tag">Brand Advancement OS</span>
            </button>

            {activeProject && (
              <button className="rail-project" onClick={() => go("dashboard")}>
                <span className="rp-num">{String(activeProject.currentOutcomeId).padStart(2, "0")}</span>
                <span className="rp-body">
                  <span className="rp-name">{activeProject.brandName}</span>
                  <span className="rp-meta">{activeProject.industry || "Fashion"} · {overallProgress(activeProject)}%</span>
                </span>
              </button>
            )}

            <nav className="rail-scroll">
              <div className="rail-label">The Journey</div>
              <div className="rail-outcomes">
                {FRAMEWORK.map((o) => {
                  const done = worldDone(activeProject, o.id);
                  const total = o.steps.length;
                  const pct = activeProject ? Math.round((done / total) * 100) : 0;
                  const isActive = view === "framework" && activeOutcome === o.id;
                  const current = !isActive && activeProject && o.id === activeProject.currentOutcomeId;
                  const complete = activeProject ? done === total : false;
                  return (
                    <button key={o.id} className={`road ${isActive ? "active" : ""} ${current ? "current" : ""}`} onClick={() => openOutcome(o.id)}>
                      <span className="road-num">{o.number}</span>
                      <span className="road-body">
                        <span className="road-name">{o.title}</span>
                        <span className="road-bar"><span style={{ width: `${pct}%` }} /></span>
                      </span>
                      <span className="road-state">
                        {complete ? <Ic.check size={16} /> : <span className="road-pct">{pct}%</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rail-label">Tools</div>
              <div className="rail-tools">
                {toolEntries.reduce<React.ReactNode[]>((acc, entry) => {
                  const isNewSection = acc.length === 0 || toolEntries[toolEntries.indexOf(entry) - 1]?.section !== entry.section;
                  const Icon = entry.icon;
                  const isActive = view === entry.view;
                  const disabled = entry.needsProject && !activeProject;
                  if (isNewSection) acc.push(<div key={"s" + entry.section} className="rail-subsection">{entry.section}</div>);
                  acc.push(
                    <button key={entry.view} className={`tool ${isActive ? "active" : ""}`} disabled={disabled} onClick={() => go(entry.view)}>
                      <Icon size={17} />
                      <span>{entry.label}</span>
                    </button>,
                  );
                  return acc;
                }, [])}
              </div>
            </nav>

            <div className="rail-foot">
              <div className="rail-overall">
                <span className="ro-label">Overall</span>
                <span className="ro-pctbig">{activeProject ? overallProgress(activeProject) : 0}%</span>
              </div>
              <div className="rail-user">
                <div className="avatar" title={session?.name}>{session ? initials(session.name) : "M"}</div>
                <div className="rail-user-meta">
                  <span className="ru-name">{session?.name || "Founder"}</span>
                  <span className="ru-role">{session?.role || "Brand Owner"}</span>
                </div>
                <button className="rail-signout" onClick={signOut} title="Sign out" aria-label="Sign out"><Ic.x size={18} /></button>
              </div>
            </div>
          </aside>

          {/* Mobile rail scrim */}
          <div className={`railscrim ${railOpen ? "show" : ""}`} onClick={() => setRailOpen(false)} />

          {/* ------- MAIN COLUMN ------- */}
          <div className="shell">
            <header className="topbar">
              <button className="burger" onClick={() => setRailOpen(true)} aria-label="Open menu">
                <span /><span /><span />
              </button>
              <div className="topbar-crumb">
                <span className="tc-label">{view === "framework" ? "Outcome " + String(activeOutcome).padStart(2, "0") : view === "dashboard" ? "Overview" : viewLabel(view)}</span>
              </div>
              <div className="top-actions">
                <div className="searchbox">
                  <Ic.search size={15} />
                  <input placeholder="Search brand, asset, finding…" />
                </div>
                {activeProject && (
                  <div className="progress-pill">
                    <span style={{ fontWeight: 800 }}>{overallProgress(activeProject)}%</span>
                    <div className="mini-bar"><div style={{ width: `${overallProgress(activeProject)}%` }} /></div>
                  </div>
                )}
                <button className="icon-btn" onClick={() => { markNotificationsRead(); go("dashboard"); }} title="Notifications" style={{ position: "relative" }}>
                  <Ic.bell size={18} />
                  {appState.notifications.some((n) => !n.read) && <span className="dot" />}
                </button>
              </div>
            </header>

            <main className="content" key={activeProject?.id ?? "none"}>
              {!activeProject && view !== "dashboard" && view !== "login" ? (
                <Dashboard />
              ) : (
                <>
                  {view === "dashboard" && <Dashboard />}
                  {view === "onboarding" && <Onboarding />}
                  {view === "analysis" && <Analysis />}
                  {view === "framework" && <Framework />}
                  {view === "cinema" && <CinemaStudio />}
                  {view === "design" && <DesignStudio />}
                  {view === "templates" && <Templates />}
                  {view === "website" && <WebsiteStudio />}
                  {view === "references" && <References />}
                  {view === "assets" && <Assets />}
                  {view === "brain" && <BrandBrain />}
                  {view === "ai" && <AIChat />}
                  {view === "integrations" && <Integrations />}
                  {view === "analytics" && <Analytics />}
                  {view === "campaigns" && <Campaigns />}
                  {view === "calendar" && <Calendar />}
                  {view === "email" && <EmailView />}
                  {view === "export" && <ExportCenter />}
                  {view === "book" && <Book />}
                  {view === "settings" && <Settings />}
                </>
              )}
            </main>
          </div>

          <ToastHost />
        </div>
      )}
    </AppContext.Provider>
  );
}

// Per-outcome completion (safe when steps is missing).
function worldDone(project: { steps?: Record<string, string> } | null, id: number): number {
  if (!project) return 0;
  const o = FRAMEWORK.find((f) => f.id === id)!;
  const steps = project.steps || {};
  return o.steps.filter((s) => {
    const st = steps[`${o.id}.${s.key.split(".")[1]}`];
    return st && st !== "pending";
  }).length;
}

// Friendly label for the topbar breadcrumb.
function viewLabel(v: View): string {
  const found = NAV.find((n) => n.view === v);
  return found ? found.label : "Overview";
}
