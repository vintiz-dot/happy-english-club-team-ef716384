import { createRoot } from "react-dom/client";
import App from "@/App.tsx";
import "@/index.css";
import "react-quill-new/dist/quill.snow.css";
import { Lab } from "./lab";

// /__lab mounts the teacher components on their own (with a React Profiler around the HUD);
// every other path is the real app, against the fake client.
const root = createRoot(document.getElementById("root")!);
root.render(location.pathname.startsWith("/__lab") ? <Lab /> : <App />);
