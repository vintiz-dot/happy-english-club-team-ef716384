import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App.tsx";
import "@/index.css";
import "react-quill-new/dist/quill.snow.css";

// Expose a first-render marker: time when the first non-loader content exists is measured from outside.
createRoot(document.getElementById("root")!).render(<App />);
