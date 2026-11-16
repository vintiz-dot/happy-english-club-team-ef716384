import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Copied into <repo>/.claude/fix-preview/ by the FIX-screens harness. The fake client alias comes BEFORE "@".
// FIX_IVORY=1: "@/lib/ivoryScope" is a harness copy with the staff routes listed (harness only, never the repo).
const repo = path.resolve(__dirname, "../..");
const ivoryCopy = path.resolve(__dirname, "ivoryScope.harness.ts");
const useIvory = process.env.FIX_IVORY === "1" && fs.existsSync(ivoryCopy);
export default defineConfig({
  root: __dirname,
  cacheDir: path.resolve(__dirname, useIvory ? ".vite-cache-ivory" : ".vite-cache"),
  publicDir: path.resolve(repo, "public"),
  css: { postcss: repo },
  server: { host: "127.0.0.1", fs: { strict: false } },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/integrations/supabase/client", replacement: path.resolve(__dirname, "fake-supabase.ts") },
      ...(useIvory ? [{ find: /^@\/lib\/ivoryScope$/, replacement: ivoryCopy }] : []),
      { find: "@", replacement: path.resolve(repo, "src") },
    ],
  },
});
