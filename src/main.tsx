import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { applyBaseFontSize, getDevicePixelRatio } from "./utils/display";

applyBaseFontSize(getDevicePixelRatio());

window.addEventListener("resize", () => {
  applyBaseFontSize(getDevicePixelRatio());
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
