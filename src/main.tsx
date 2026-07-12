import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-quill-new/dist/quill.snow.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA (Production only)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("ServiceWorker registered successfully with scope: ", registration.scope);
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}

