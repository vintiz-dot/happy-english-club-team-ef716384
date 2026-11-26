import assert from "node:assert/strict";
const secrets = { Pexels_API: "k1", unsplash_api: "k2", Pixabay_API: "k3" };
globalThis.Deno = { env: { get: (k) => secrets[k] } };
const warns = []; console.warn = (m) => warns.push(m);
let handler;
globalThis.fetch = async (url, init) => handler(String(url), init);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
const { fetchWordImages } = await import(new URL("../../supabase/functions/_lib/word-images.ts", import.meta.url).href);

// 1. Pexels works: 3 images, one source, no warning, urls/credit shape
handler = (u) => u.includes("pexels") ? json({ photos: [1,2,3].map(i => ({ src: { large: `https://p/${i}.jpg`, small: `https://p/s${i}.jpg` }, alt: "cinnamon", photographer: "Ann" })) }) : json({}, 500);
let m = await fetchWordImages(["cinnamon"], 3);
assert.equal(m.get("cinnamon").length, 3);
assert.deepEqual(Object.keys(m.get("cinnamon")[0]).sort(), ["alt","credit","source","thumb","url"]);
assert.equal(m.get("cinnamon")[0].source, "pexels");
assert.equal(warns.length, 0);

// 2. Pexels 403 for every word -> falls to Openverse; ONE warning for the whole call, pexels not retried
warns.length = 0; let pexelsCalls = 0;
handler = (u) => {
  if (u.includes("pexels")) { pexelsCalls++; return json({}, 403); }
  if (u.includes("unsplash")) return json({}, 401);
  if (u.includes("openverse")) return json({ results: [{ url: "https://o/1.jpg", thumbnail: "https://o/t1.jpg", title: "t", attribution: "A by B" }] });
  return json({}, 500);
};
m = await fetchWordImages(["apple","pear","plum","fig"], 3, { concurrency: 1 });
assert.ok([...m.values()].every(v => v.length === 1 && v[0].source === "openverse"));
assert.equal(pexelsCalls, 1, "403 source must be dropped for the rest of the call");
assert.equal(warns.length, 1, warns.join("|"));
assert.match(warns[0], /pexels: HTTP 403/);
assert.match(warns[0], /unsplash: HTTP 401/);

// 3. No keys at all + Openverse down -> [] per word, never throws, one warning
for (const k of Object.keys(secrets)) delete secrets[k];
warns.length = 0;
handler = () => { throw new TypeError("network down"); };
m = await fetchWordImages(["a","b"], 3);
assert.deepEqual(m.get("a"), []); assert.equal(warns.length, 1);
assert.match(warns[0], /2\/2 words got no picture/);
assert.match(warns[0], /secret Pexels_API not set/);

// 4. Pixabay request shape: single image_type, per_page >= 3, safesearch
secrets.Pixabay_API = "k3"; let seen = "";
handler = (u) => { if (u.includes("pixabay")) { seen = u; return json({ hits: [{ webformatURL: "https://x/1.jpg", previewURL: "https://x/t.jpg", tags: "a, b", user: "U" }] }); } return json({}, 500); };
m = await fetchWordImages(["dog"], 1);
assert.match(seen, /image_type=all/); assert.match(seen, /safesearch=true/); assert.match(seen, /per_page=3/);
assert.equal(m.get("dog")[0].source, "pixabay");

// 5. Dedup + non-https Openverse url dropped
secrets.Pixabay_API = undefined;
handler = (u) => u.includes("openverse") ? json({ results: [{ url: "http://insecure/1.jpg" }, { url: "https://o/1.jpg" }, { url: "https://o/1.jpg" }] }) : json({}, 500);
m = await fetchWordImages(["cat"], 3);
assert.equal(m.get("cat").length, 1);
console.log("all word-images tests passed");
