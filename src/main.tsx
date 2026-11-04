import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource/amiri-quran";
import "./styles.css";
import App from "./App";
import { applyLegacyRedirect } from "./redirects";

applyLegacyRedirect();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
