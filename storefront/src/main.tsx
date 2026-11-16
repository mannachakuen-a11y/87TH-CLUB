import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "./App";
import Gate from "./components/Gate";
import { StoreProvider } from "./store";
import "./styles.css";

// The static preview build (VITE_STATIC=1) is hosted as a single page, so it routes in memory.
const Router = import.meta.env.VITE_STATIC ? MemoryRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Gate>
      <Router>
        <StoreProvider>
          <App />
        </StoreProvider>
      </Router>
    </Gate>
  </React.StrictMode>
);
