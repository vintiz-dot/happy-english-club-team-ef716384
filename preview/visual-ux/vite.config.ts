// Preview harness: real screens, made-up data, no sign-in. The Supabase
// client is replaced by an in-memory fake, so nothing here can reach the
// real project. Run: node ./node_modules/vite/bin/vite.js --config preview/visual-ux/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const here = __dirname;
const root = path.resolve(here, "../..");

export default defineConfig({
  root: here,
  // The app's own static files (the mascot's pose files live in public/mascot).
  publicDir: path.resolve(root, "public"),
  cacheDir: path.resolve(here, ".vite-cache"),
  plugins: [react()],
  css: { postcss: root },
  server: { host: "localhost", port: 8091, strictPort: true, fs: { strict: false } },
  resolve: {
    alias: [
      { find: "@/integrations/supabase/client", replacement: path.resolve(here, "fakeSupabase.ts") },
      { find: "@", replacement: path.resolve(root, "src") },
    ],
  },
});
