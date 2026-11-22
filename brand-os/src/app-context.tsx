import { createContext, useContext } from "react";
import type { ID } from "./lib/types";
import type { View } from "./nav";

export interface AppContextValue {
  view: View;
  go: (v: View) => void;
  openProject: (id: ID | null) => void;
  activeProjectId: ID | null;
  activeOutcome: number;
  openOutcome: (n: number) => void;
}

export const AppContext = createContext<AppContextValue>({
  view: "dashboard",
  go: () => {},
  openProject: () => {},
  activeProjectId: null,
  activeOutcome: 1,
  openOutcome: () => {},
});

export const useAppCtx = () => useContext(AppContext);
