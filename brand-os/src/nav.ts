// Central navigation definition so both the drawer and views agree.
import type { ReactNode } from "react";
import { Ic } from "./lib/icons";

export type View =
  | "login"
  | "dashboard"
  | "onboarding"
  | "analysis"
  | "framework"
  | "cinema"
  | "design"
  | "templates"
  | "website"
  | "references"
  | "assets"
  | "brain"
  | "ai"
  | "integrations"
  | "analytics"
  | "campaigns"
  | "calendar"
  | "email"
  | "export"
  | "book"
  | "settings";

export interface NavEntry {
  view: View;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  section: string;
  needsProject?: boolean;
}

export const NAV: NavEntry[] = [
  { view: "dashboard", label: "Dashboard", icon: Ic.grid, section: "Overview" },
  { view: "framework", label: "Framework", icon: Ic.layers, section: "Overview", needsProject: true },
  { view: "analysis", label: "Analysis", icon: Ic.search, section: "Overview", needsProject: true },
  { view: "cinema", label: "Cinema Studio", icon: Ic.film, section: "Create", needsProject: true },
  { view: "design", label: "Design Studio", icon: Ic.pen, section: "Create", needsProject: true },
  { view: "templates", label: "Templates", icon: Ic.folder, section: "Create", needsProject: true },
  { view: "website", label: "Website Studio", icon: Ic.globe, section: "Create", needsProject: true },
  { view: "references", label: "References", icon: Ic.eye, section: "Create", needsProject: true },
  { view: "campaigns", label: "Campaigns", icon: Ic.sparkle, section: "Create", needsProject: true },
  { view: "analytics", label: "Analytics", icon: Ic.chart, section: "Grow", needsProject: true },
  { view: "calendar", label: "Calendar", icon: Ic.calendar, section: "Grow", needsProject: true },
  { view: "assets", label: "Assets", icon: Ic.box, section: "Manage", needsProject: true },
  { view: "brain", label: "Brand Brain", icon: Ic.book, section: "Manage", needsProject: true },
  { view: "export", label: "Export Center", icon: Ic.download, section: "Manage", needsProject: true },
  { view: "email", label: "Client Comms", icon: Ic.mail, section: "Manage", needsProject: true },
  { view: "ai", label: "Mannas AI", icon: Ic.spark, section: "Assistant" },
  { view: "integrations", label: "Integrations", icon: Ic.plug, section: "System" },
  { view: "settings", label: "Settings", icon: Ic.gear, section: "System" },
];
