import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles/globals.css";
import "./styles/bridge-builder-touch-targets.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Bridge Builder root element was not found.");
}

// The candidate owns one real Phaser instance. Avoid development-only
// double-mounting so the qualification canvas is not duplicated while the
// asynchronous renderer is booting.
createRoot(rootElement).render(<App />);
