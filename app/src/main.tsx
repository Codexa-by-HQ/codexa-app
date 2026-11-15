import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./i18n.ts";

import { Root } from "./root.tsx";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element.");

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
