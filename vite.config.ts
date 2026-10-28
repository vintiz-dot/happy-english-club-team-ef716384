import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// mcpPlugin regenerates supabase/functions/mcp/index.ts on every build and
// dev start. On Windows (@lovable.dev/mcp-js 3.3.0) it takes the entry's
// C:\ path for a package name and writes `import mcp from "npm:C:\..."`,
// which cannot boot once deployed. Lovable and Cloudflare build on Linux
// and regenerate it correctly; a build on a Windows machine must leave the
// committed file alone.
const emitsMcpFunction = process.platform !== "win32";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), emitsMcpFunction && mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
