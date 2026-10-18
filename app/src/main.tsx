import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";
import "@fontsource/im-fell-english-sc/400.css";
import "@fontsource/alegreya/400.css";
import "@fontsource/alegreya/400-italic.css";
import "@fontsource/alegreya/700.css";
import "@fontsource/alegreya-sans-sc/500.css";
import "@fontsource/alegreya-sans-sc/800.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/editor.css";
import "./styles/canvas.css";
import "./styles/pattern.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
