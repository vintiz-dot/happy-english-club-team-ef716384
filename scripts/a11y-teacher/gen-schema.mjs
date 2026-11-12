// usage: node gen-schema.mjs <repoRoot> <out.json>  : table -> {col: type} from src/integrations/supabase/types.ts (types only, no data)
import fs from 'node:fs';
const [root, out] = process.argv.slice(2);
const t = fs.readFileSync(root + '/src/integrations/supabase/types.ts', 'utf8').replace(/\r/g, '');
const tablesStart = t.indexOf('    Tables: {');
const viewsStart = t.indexOf('    Views: {');
const body = t.slice(tablesStart, viewsStart > 0 ? viewsStart : undefined);
const schema = {};
const re = /\n      ([a-z0-9_]+): \{\n        Row: \{\n([\s\S]*?)\n        \}\n/g;
let m;
while ((m = re.exec(body))) {
  const cols = {};
  for (const l of m[2].split('\n')) { const mm = l.trim().match(/^([a-z0-9_]+)(\??): (.*)$/); if (mm) cols[mm[1]] = mm[3]; }
  schema[m[1]] = cols;
}
fs.writeFileSync(out, JSON.stringify(schema));
console.log(Object.keys(schema).length + ' tables');
