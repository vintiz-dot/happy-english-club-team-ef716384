import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// A2.1 teacher-stability preview. teacher-stability.mjs copies this folder into <harness>/preview
// (OUTSIDE the repo) and starts Vite with cwd = repo and A2_REPO = repo. The fake client alias
// comes BEFORE "@", so no page can reach the live Supabase project.
const repo = process.env.A2_REPO ? path.resolve(process.env.A2_REPO) : path.resolve(__dirname, "../../..");
export default defineConfig({
  root: __dirname,
  cacheDir: path.resolve(__dirname, ".vite-cache"),
  css: { postcss: repo },
  server: { host: "127.0.0.1", fs: { strict: false }, hmr: false },
  plugins: [react()],
  build: { rollupOptions: { input: { main: path.resolve(__dirname, "index.html"), book: path.resolve(__dirname, "book.html") } } },
  resolve: {
    alias: [
      { find: "@/integrations/supabase/client", replacement: path.resolve(__dirname, "fake-supabase.ts") },
      { find: "@", replacement: path.resolve(repo, "src") },
    ],
  },
});
