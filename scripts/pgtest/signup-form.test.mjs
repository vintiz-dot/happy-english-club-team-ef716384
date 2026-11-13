// The public "Join the club" form must not offer a staff role (audit F-01).
//
// The database decides what a new account holds; this is the other half: the
// form does not invite a visitor to ask for teacher or admin. Reads the
// source of src/pages/Auth.tsx - there is no browser here.
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const src = readFileSync(new URL("../../src/pages/Auth.tsx", import.meta.url), "utf8");
const offered = [...src.matchAll(/<SelectItem value="([^"]+)"/g)].map((m) => m[1]).sort();
ok("the sign-up picker offers exactly Family and Student", JSON.stringify(offered) === JSON.stringify(["family", "student"]), JSON.stringify(offered));
ok("no option, default or type in the form names teacher or admin as a choice",
  !/value="(teacher|admin)"/.test(src) && !/useState<UserRole>\("(teacher|admin)"\)/.test(src) && /type UserRole = "family" \| "student";/.test(src));
ok("the form still sends the choice as sign-up metadata (a note for the school, not an authority)", /options: \{ emailRedirectTo: redirectUrl, data: \{ role \} \}/.test(src));
ok("and tells staff that the school creates their login", /the school creates your login/.test(src));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
