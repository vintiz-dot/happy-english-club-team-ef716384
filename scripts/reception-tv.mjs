#!/usr/bin/env node
// HEC reception TV: package, install and look after the LG webOS app.
//
//   node scripts/reception-tv.mjs setup      one-off: install the LG CLI, add the TV, fetch its key
//   node scripts/reception-tv.mjs package    build the .ipk (writes the display token into it)
//   node scripts/reception-tv.mjs install    package + install + launch on the TV
//   node scripts/reception-tv.mjs install-later  package now; the helper installs it when the TV is next on
//   node scripts/reception-tv.mjs pair       one-off: accept the prompt on the TV so the helper may launch apps
//   node scripts/reception-tv.mjs pair-input one-off: accept a second prompt so the helper may press a key
//                                            that keeps the TV's idle timers (screensaver, 4-hour off) from running out
//   node scripts/reception-tv.mjs check      one pass of the helper (what `watch` does every few minutes)
//   node scripts/reception-tv.mjs watch      run the helper for ever (Task Scheduler / systemd)
//   node scripts/reception-tv.mjs status     print what the helper knows
//   node scripts/reception-tv.mjs youtube-now  play the next YouTube item now (a test)
//   node scripts/reception-tv.mjs show         put the display in front now and renew Developer Mode
//   node scripts/reception-tv.mjs autostart  copy the helper to ~/.hec-reception and start it at logon
//
// The helper, every 90 seconds during opening hours:
//   - wakes the TV (Wake-on-LAN) if it is off,
//   - brings the display app back to the front if anything else is showing,
//   - renews Developer Mode once a day (it lapses after 50 hours otherwise),
//   - after `pair-input`, presses an unused key (RED) every 4 minutes while the
//     display is in front, so the TV never counts itself idle,
// and switches the TV off once at closing time.
//
// Settings and secrets live OUTSIDE the repo, in ~/.hec-reception/config.json:
//   { "tvIp": "192.168.1.204", "tvMac": "a0:6f:aa:46:d1:30", "token": "<display token>",
//     "schedule": { "1": [["17:15","21:20"]], "6": [["07:30","11:00"],["16:00","18:00"]], ... },
//     "clientKey": "<from pair>" }   (schedule: Hanoi time, 0 = Sunday, any number of windows a day)
// Node 22+ (built-in WebSocket). Runs the same on Windows and a Raspberry Pi.
import { execFileSync, spawnSync } from "node:child_process";
import { createSocket } from "node:dgram";
import { connect as netConnect } from "node:net";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "com.happyenglishclub.reception";
const DEVICE = "hec-reception";
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(REPO, "public", "reception-tv");
const HOME = join(homedir(), ".hec-reception");
const CONFIG = join(HOME, "config.json");
const STATE = join(HOME, "state.json");
const TOOLS = join(HOME, "tools");
const BUILD = join(HOME, "build");
const LOG = join(HOME, "helper.log");

mkdirSync(HOME, { recursive: true });
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const defaults = { tvIp: "192.168.1.204", tvMac: "a0:6f:aa:46:d1:30", token: "",
  // The centre's hours (owner, 16 Nov 2026).
  schedule: {
    "0": [["07:30", "11:00"], ["18:45", "21:30"]],
    "1": [["17:15", "21:20"]], "2": [["17:15", "21:20"]], "3": [["17:15", "21:20"]], "4": [["17:15", "21:20"]], "5": [["17:15", "21:20"]],
    "6": [["07:30", "11:00"], ["16:00", "18:00"]],
  },
};
const cfg = { ...defaults, ...readJson(CONFIG, {}) };
if ("open" in cfg || "close" in cfg || "days" in cfg) { delete cfg.open; delete cfg.close; delete cfg.days; writeFileSync(CONFIG, JSON.stringify(cfg, null, 2)); }
const saveCfg = () => writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));
const state = readJson(STATE, {});
const saveState = () => writeFileSync(STATE, JSON.stringify(state, null, 2));
if (!existsSync(CONFIG)) saveCfg();

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try {
    const old = existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").slice(-2000).join("\n") : "";
    writeFileSync(LOG, `${old}${old ? "\n" : ""}${line}`);
  } catch {}
}

// ------------------------------------------------------------------ LG CLI
const ARES_PKG = "@webos-tools/cli@3.2.1";
// The LG CLI's dependencies call util.isDate and friends, which Node 23
// removed ("isDate is not a function" on install). Put them back for it.
const SHIM = join(HOME, "node-util-shim.cjs");
writeFileSync(SHIM, `const u = require("util");
const add = (k, f) => { if (typeof u[k] !== "function") u[k] = f; };
add("isDate", (x) => x instanceof Date); add("isRegExp", (x) => x instanceof RegExp);
add("isError", (x) => x instanceof Error); add("isArray", Array.isArray);
add("isFunction", (x) => typeof x === "function"); add("isString", (x) => typeof x === "string");
add("isNumber", (x) => typeof x === "number"); add("isBoolean", (x) => typeof x === "boolean");
add("isSymbol", (x) => typeof x === "symbol"); add("isUndefined", (x) => x === undefined);
add("isNull", (x) => x === null); add("isNullOrUndefined", (x) => x == null);
add("isObject", (x) => x !== null && typeof x === "object"); add("isBuffer", (x) => Buffer.isBuffer(x));
add("isPrimitive", (x) => x === null || (typeof x !== "object" && typeof x !== "function"));
`);
// NODE_OPTIONS takes the path literally: forward slashes, quoted only if it must be.
const shimArg = /\s/.test(SHIM) ? JSON.stringify(SHIM.replace(/\\/g, "/")) : SHIM.replace(/\\/g, "/");
function ares(cmd, args, opts = {}) {
  const bin = join(TOOLS, "node_modules", ".bin", platform() === "win32" ? `${cmd}.cmd` : cmd);
  if (!existsSync(bin)) throw new Error(`LG CLI not installed. Run: node scripts/reception-tv.mjs setup`);
  // .cmd shims need a shell on Windows; quote every argument ourselves.
  const r = spawnSync(platform() === "win32" ? `"${bin}"` : bin, args.map((a) => (platform() === "win32" ? `"${a}"` : a)), {
    encoding: "utf8", shell: platform() === "win32", timeout: opts.timeout ?? 120000, input: opts.input,
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${shimArg}`.trim() },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} failed: ${out}`);
  return out;
}

function setup() {
  mkdirSync(TOOLS, { recursive: true });
  if (!existsSync(join(TOOLS, "package.json"))) writeFileSync(join(TOOLS, "package.json"), '{ "private": true }');
  console.log(`Installing ${ARES_PKG} into ${TOOLS} …`);
  const npm = platform() === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["install", "--no-audit", "--no-fund", ARES_PKG], { cwd: TOOLS, stdio: "inherit", shell: platform() === "win32" });
  const list = ares("ares-setup-device", ["--list"], { allowFail: true });
  if (!list.includes(DEVICE)) {
    ares("ares-setup-device", ["--add", DEVICE, "--info", `host=${cfg.tvIp}`, "--info", "port=9922", "--info", "username=prisoner"]);
  }
  const passphrase = process.argv[3];
  if (!passphrase) {
    console.log(`\nTV added as "${DEVICE}". Now open the Developer Mode app on the TV, turn on Key Server, and run:\n  node scripts/reception-tv.mjs setup <PASSPHRASE shown on the TV>`);
    return;
  }
  // --getkey saves ~/.ssh/<device>_webos, then asks for the passphrase on a
  // prompt that ignores piped input; record the key and passphrase directly.
  console.log(ares("ares-novacom", ["--device", DEVICE, "--getkey"], { input: `${passphrase}\n`, allowFail: true, timeout: 60000 }));
  ares("ares-setup-device", ["--modify", DEVICE, "--info", `privatekey=${DEVICE}_webos`, "--info", `passphrase=${passphrase}`]);
  cfg.devPassphrase = passphrase; saveCfg(); // the daily dev-mode renewal unlocks the key with it
  console.log(ares("ares-device", ["-i", "-d", DEVICE]));
}

// ------------------------------------------------------------------ package / install
function pkg() {
  const token = process.env.RECEPTION_TOKEN || cfg.token;
  if (!/^[a-f0-9]{48}$/.test(token)) {
    throw new Error(`No display token. Copy it from Admin > Reception > Screen and save it:\n  node scripts/reception-tv.mjs token <TOKEN>`);
  }
  const app = join(BUILD, "app");
  rmSync(BUILD, { recursive: true, force: true });
  mkdirSync(app, { recursive: true });
  cpSync(SRC, app, { recursive: true, filter: (p) => !/demo-(feed\.js|video\.mp4|loader\.js)$/.test(p) });
  const conf = readFileSync(join(SRC, "config.js"), "utf8").replace(/token:\s*""/, `token: "${token}"`).replace(/screen:\s*""/, 'screen: "tv"');
  if (!conf.includes(token)) throw new Error("Could not write the token into config.js");
  writeFileSync(join(app, "config.js"), conf);
  const out = ares("ares-package", [app, "--outdir", BUILD, "--no-minify"]);
  const ipk = (out.match(/[\w.\-]+\.ipk/) || [])[0];
  const path = ipk ? join(BUILD, ipk) : null;
  if (!path || !existsSync(path)) throw new Error(`Packaging did not produce an .ipk:\n${out}`);
  console.log(`Packaged ${path}`);
  return path;
}

function install() {
  const ipk = pkg();
  console.log(ares("ares-install", ["--device", DEVICE, ipk], { timeout: 300000 }));
  console.log(ares("ares-launch", ["--device", DEVICE, APP_ID]));
  state.installedAt = new Date().toISOString();
  saveState();
}

// ------------------------------------------------------------------ talking to the TV
// LG's own remote-control protocol (SSAP over a WebSocket on port 3000). The
// first `pair` shows a prompt on the TV; once accepted, the client key lets the
// helper ask which app is in front, launch ours and switch the TV off.
const MAIN_ID = { keyField: "clientKey", appId: "com.happyenglishclub.helper", name: "HEC reception helper",
  permissions: ["LAUNCH", "CONTROL_POWER", "CONTROL_AUDIO", "READ_RUNNING_APPS", "READ_CURRENT_CHANNEL", "READ_INSTALLED_APPS"] };
// Its own app id and key: pairing it shows one prompt and leaves the main pairing as it is.
const INPUT_ID = { keyField: "inputClientKey", appId: "com.happyenglishclub.helper.input", name: "HEC reception keep-awake",
  permissions: ["CONTROL_MOUSE_AND_KEYBOARD", "CONTROL_INPUT_JOYSTICK", "READ_RUNNING_APPS"] };
function ssap(requests, { pairing = false, timeoutMs = 15000, id = MAIN_ID, onDone = null } = {}) {
  return new Promise((resolvePromise, reject) => {
    if (typeof WebSocket === "undefined") return reject(new Error("Node 22 or newer is needed (built-in WebSocket)."));
    const ws = new WebSocket(`ws://${cfg.tvIp}:3000`);
    const results = [];
    let i = 0;
    const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("TV did not answer")); }, pairing ? 90000 : timeoutMs);
    const send = (o) => ws.send(JSON.stringify(o));
    const nextRequest = () => {
      if (i >= requests.length) { clearTimeout(timer); ws.close(); return resolvePromise(results); }
      const [uri, payload] = requests[i];
      send({ id: `req${i}`, type: "request", uri, payload: payload ?? {} });
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("TV unreachable")); };
    ws.onopen = () => send({
      id: "reg", type: "register",
      payload: {
        forcePairing: false, pairingType: "PROMPT", "client-key": cfg[id.keyField] || undefined,
        manifest: {
          manifestVersion: 1, appVersion: "1.0", signed: { appId: id.appId, vendorId: "hec", created: "20261116", localizedAppNames: { "": id.name }, permissions: [] },
          permissions: id.permissions,
        },
      },
    });
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id === "reg") {
        if (m.type === "registered") {
          if (m.payload?.["client-key"] && m.payload["client-key"] !== cfg[id.keyField]) { cfg[id.keyField] = m.payload["client-key"]; saveCfg(); }
          return nextRequest();
        }
        if (m.type === "error") { clearTimeout(timer); ws.close(); return reject(new Error(`TV refused: ${m.error}`)); }
        return; // "response" with pairingType PROMPT: waiting for someone to press OK on the TV
      }
      if (m.id === `req${i}`) { results.push(m.payload ?? {}); i++; nextRequest(); }
    };
  });
}

/**
 * Find the TV by its MAC: ask the network who runs webOS (SSDP), which also
 * fills the ARP table, then pick the responder whose MAC is the TV's.
 * Returns its address, or null when it is not on the network (off).
 */
function portOpen(host, port, ms = 3000) {
  return new Promise((ok) => {
    const sock = netConnect({ host, port });
    const end = (v) => { sock.destroy(); ok(v); };
    sock.setTimeout(ms, () => end(false));
    sock.on("connect", () => end(true)).on("error", () => end(false));
  });
}
async function findTv() {
  const responders = await new Promise((done) => {
    const found = new Set();
    const s = createSocket({ type: "udp4", reuseAddr: true });
    const msg = Buffer.from('M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n');
    s.on("message", (m, r) => { if (/webos/i.test(String(m))) found.add(r.address); });
    s.on("error", () => { try { s.close(); } catch {} done(found); });
    s.bind(() => {
      for (let i = 0; i < 3; i++) setTimeout(() => s.send(msg, 1900, "239.255.255.250"), i * 300);
      setTimeout(() => { try { s.close(); } catch {} done(found); }, 4000);
    });
  });
  const mac = cfg.tvMac.toLowerCase().replace(/[:-]/g, "");
  const table = platform() === "win32"
    ? spawnSync("arp", ["-a"], { encoding: "utf8" }).stdout ?? ""
    : spawnSync("ip", ["neigh"], { encoding: "utf8" }).stdout ?? "";
  for (const line of table.split(/\r?\n/)) {
    const ip = line.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
    const m = line.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i)?.[0]?.toLowerCase().replace(/[:-]/g, "");
    // SSDP can miss the TV when this machine has a second network (a hotspot),
    // so the MAC match alone is enough if the TV's control port answers.
    if (ip && m === mac && (responders.has(ip) || (await portOpen(ip, 3000)))) return ip;
  }
  return null;
}

function wake() {
  const mac = cfg.tvMac.split(/[:-]/).map((h) => parseInt(h, 16));
  const packet = Buffer.alloc(102, 0xff);
  for (let k = 0; k < 16; k++) Buffer.from(mac).copy(packet, 6 + k * 6);
  return new Promise((done) => {
    const s = createSocket("udp4");
    s.bind(() => {
      s.setBroadcast(true);
      const bcast = cfg.tvIp.replace(/\.\d+$/, ".255");
      let left = 2;
      const fin = () => { if (--left === 0) { s.close(); done(); } };
      s.send(packet, 9, bcast, fin);
      s.send(packet, 9, "255.255.255.255", fin);
    });
  });
}

// ------------------------------------------------------------------ Developer Mode timer
// The current LG CLI has no ares-extend-dev. It did two things, done here:
// read the TV's dev-mode session token over the dev SSH link (the key from
// `setup`), then ask LG's server to reset that session's 50-hour timer.
async function extendDevMode() {
  const { createRequire } = await import("node:module");
  const req = createRequire(join(TOOLS, "node_modules", "@webos-tools", "cli", "package.json"));
  const { Client } = req("ssh2");
  if (!cfg.devPassphrase) throw new Error("No Developer Mode passphrase saved. Run: node scripts/reception-tv.mjs setup <PASSPHRASE>");
  const token = await new Promise((ok, fail) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); fail(new Error("TV did not answer on the dev port")); }, 30000);
    c.on("ready", () => c.exec("cat /var/luna/preferences/devmode_enabled", (e, s) => {
      if (e) { clearTimeout(timer); c.end(); return fail(e); }
      let out = "";
      s.on("data", (d) => (out += d)).on("close", () => { clearTimeout(timer); c.end(); ok(out.trim()); });
    }))
      .on("error", (e) => { clearTimeout(timer); fail(e); })
      .connect({
        host: cfg.tvIp, port: 9922, username: "prisoner", readyTimeout: 20000,
        privateKey: readFileSync(join(homedir(), ".ssh", `${DEVICE}_webos`)),
        passphrase: cfg.devPassphrase,
      });
  });
  if (!/^[A-Za-z0-9]{16,128}$/.test(token)) throw new Error("No dev-mode session on the TV (is Developer Mode still on?)");
  const res = await fetch(`https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=${token}`);
  const text = await res.text();
  if (!res.ok || !/"result"\s*:\s*"success"/.test(text)) throw new Error(`LG refused the renewal (${res.status}): ${text.slice(0, 120)}`);
}

// ------------------------------------------------------------------ the helper
const hanoiNow = () => new Date(Date.now() + 7 * 3600 * 1000);
// cfg.schedule: Hanoi times the screen is on, per weekday (0 = Sunday), any
// number of windows a day: { "1": [["17:15", "21:20"]], "6": [["07:30", "11:00"], ["16:00", "18:00"]] }.
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const minutes = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
function openNow(at = hanoiNow()) {
  const hm = at.getUTCHours() * 60 + at.getUTCMinutes();
  const day = at.toISOString().slice(0, 10);
  const windows = cfg.schedule?.[String(at.getUTCDay())] ?? [];
  const w = windows.find(([from, to]) => hm >= minutes(from) && hm < minutes(to));
  return { open: !!w, day, window: w ? `${day} ${w[0]}-${w[1]}` : null };
}
const describeSchedule = () =>
  DAY_NAMES.map((n, i) => `${n} ${(cfg.schedule?.[String(i)] ?? []).map((w) => w.join("-")).join(", ") || "off"}`).join("; ");

/** The TV answered at a new address (DHCP): remember it. True when it moved. */
async function relocate() {
  const moved = await findTv().catch(() => null);
  if (!moved || moved === cfg.tvIp) return false;
  log(`TV found at a new address ${moved} (was ${cfg.tvIp})`);
  cfg.tvIp = moved;
  saveCfg();
  try { ares("ares-setup-device", ["--modify", DEVICE, "--info", `host=${moved}`]); } catch (err) { log(`could not update the LG tools: ${err.message}`); }
  return true;
}

async function tvAnswers() {
  try { await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]], { timeoutMs: 6000 }); return true; }
  catch { return (await relocate()) ? tvAnswersAt() : false; }
}
async function tvAnswersAt() {
  try { await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]], { timeoutMs: 6000 }); return true; } catch { return false; }
}

// ------------------------------------------------------------------ keep the TV from idling
// The display already loops a black clip (the TV starts no screensaver while
// a video plays), but webOS also counts REMOTE input for its screensaver and
// its "4 Hours Auto Power Off". After `pair-input`, the helper presses RED,
// a key no system screen uses and the display ignores, every 4 minutes while
// the display is in front during opening hours. Nothing shows on screen.
async function pressKey(name = "RED") {
  const [r] = await ssap([["ssap://com.webos.service.networkinput/getPointerInputSocket"]], { id: INPUT_ID, timeoutMs: 8000 });
  if (!r?.socketPath) throw new Error("the TV gave no input socket");
  await new Promise((done, fail) => {
    const ws = new WebSocket(r.socketPath);
    const t = setTimeout(() => { try { ws.close(); } catch {} fail(new Error("input socket timeout")); }, 8000);
    ws.onerror = () => { clearTimeout(t); fail(new Error("input socket refused")); };
    ws.onopen = () => { ws.send(`type:button
name:${name}

`); setTimeout(() => { clearTimeout(t); try { ws.close(); } catch {} done(); }, 300); };
  });
}
async function nudge() {
  if (!cfg.inputClientKey || !openNow().open || Date.now() < (state.nextNudgeAt ?? 0)) return;
  state.nextNudgeAt = Date.now() + 4 * 60 * 1000;
  try {
    const [front] = await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]], { timeoutMs: 6000 });
    if (front?.appId !== APP_ID) return; // never press keys in someone else's app
    await pressKey();
    if (state.nudgeFailing) { log("keep-awake key works again"); delete state.nudgeFailing; saveState(); }
  } catch (e) {
    if (!state.nudgeFailing) { log(`keep-awake key failed (${e.message}); run "pair-input" again if this stays`); state.nudgeFailing = true; saveState(); }
  }
}

// ------------------------------------------------------------------ admin power buttons
// Admin > Reception > Screen leaves a command in reception_settings; the
// feed hands it over to this helper (op "command") and takes the result
// back (op "ack"). The admin page cannot reach the TV itself.
async function feedCall(payload) {
  const conf = cfg.feedUrl && cfg.apiKey ? cfg : publicConfig();
  if (!conf.feedUrl || !cfg.token) return null;
  const res = await fetch(conf.feedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: conf.apiKey, Authorization: `Bearer ${conf.apiKey}` },
    body: JSON.stringify({ token: cfg.token, screen: "helper", ...payload }),
  });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return res.json();
}

async function runAdminCommand() {
  const r = await feedCall({ op: "command" });
  if (!r?.command) return;
  let result;
  try {
    if (r.command === "off") {
      if (!(await tvAnswers())) result = "The TV was already off.";
      else { await ssap([["ssap://system/turnOff"]]); result = "TV switched off."; }
      state.manualOffWindow = openNow().window; // stays off until the next opening window
    } else {
      delete state.manualOffWindow;
      let up = await tvAnswers();
      if (!up && r.command === "on") {
        for (let i = 0; i < 9 && !up; i++) { await wake(); await sleep(10000); up = await tvAnswers(); }
      }
      if (!up) {
        result = r.command === "on"
          ? "The TV did not wake up. Turn it on with the remote once, and check TV Settings > General > Mobile TV On (Turn on via Wi-Fi) is on."
          : "The TV is off. Press Turn on first.";
      } else {
        if (!installPending()) await ssap([["ssap://system.launcher/launch", { id: APP_ID }]]);
        result = r.command === "on" ? "TV is on and showing the display." : "The display is in front.";
      }
    }
  } catch (e) {
    result = `Could not do it: ${e.message}`;
  }
  saveState();
  log(`admin pressed ${r.command}: ${result}`);
  await feedCall({ op: "ack", at: r.at, result }).catch((e) => log(`could not report back: ${e.message}`));
}

/** Install an update packaged while the TV was off (`install-later`) and launch it. True when it did. */
function installPending() {
  if (!state.pendingInstall || !existsSync(state.pendingInstall)) return false;
    try {
      ares("ares-install", ["--device", DEVICE, state.pendingInstall], { timeout: 300000 });
      ares("ares-launch", ["--device", DEVICE, APP_ID]);
      log(`display updated (${state.pendingInstall.split(/[\\/]/).pop()})`);
      state.installedAt = new Date().toISOString();
      delete state.pendingInstall;
      saveState();
      return true;
    } catch (e) {
      log(`display update failed, will retry: ${e.message.split("\n").slice(-1)[0]}`);
    }
  return false;
}

async function check() {
  const { open, window, day } = openNow();
  if (!open) {
    // A window just ended: switch the TV off once for it.
    if (state.lastWindow && state.offFor !== state.lastWindow) {
      try { await ssap([["ssap://system/turnOff"]]); log(`closing time (${state.lastWindow}): TV switched off`); }
      catch (e) { log(`closing time (${state.lastWindow}): could not switch off (${e.message})`); }
      state.offFor = state.lastWindow; saveState();
    }
    return;
  }
  state.lastWindow = window;
  // An admin switched it off from Admin > Reception during this window: leave it off until the next one.
  if (state.manualOffWindow === window) return;
  let front = null;
  try {
    const [info] = await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]]);
    front = info?.appId ?? "";
  } catch (e) {
    // The router may have given the TV a new address (it did on 16 Nov):
    // look for it by its MAC before deciding it is off.
    if (await relocate()) return; // the next pass talks to it there
    log(`TV not answering (${e.message}); sending Wake-on-LAN`);
    await wake();
    saveState();
    return; // the next pass launches the app once the TV is up
  }
  // An update packaged while the TV was off (`install-later`) goes on now.
  if (installPending()) return;
  if (front !== APP_ID) {
    try { await ssap([["ssap://system.launcher/launch", { id: APP_ID }]]); log(`display relaunched (was: ${front || "home screen"})`); }
    catch (e) { log(`could not launch the display: ${e.message}`); }
  }
  // Developer Mode lapses after 50 hours; renew it once a day.
  if (state.extendedOn !== day) {
    try { await extendDevMode(); state.extendedOn = day; log("Developer Mode renewed"); }
    catch (e) { log(`Developer Mode renewal failed: ${e.message.split("\n")[0]}`); }
  }
  state.lastCheck = new Date().toISOString();
  saveState();
}

// ------------------------------------------------------------------ YouTube breaks
// The TV's 2016 browser cannot play YouTube inside the display, and the TV
// will not let the display open another app. The helper can: every
// youtube_every_minutes (Admin > Reception > Screen) it plays the next
// YouTube item in the TV's YouTube app for its play_seconds, muted or not as
// the admin chose, then brings the display back.
const YOUTUBE_APP = "youtube.leanback.v4";
const YOUTUBE_START_MS = 10000; // the 2016 YouTube app takes a while to open
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let feedCache = { at: 0, data: null };

async function readFeed() {
  if (Date.now() - feedCache.at < 5 * 60 * 1000 && feedCache.data) return feedCache.data;
  const conf = cfg.feedUrl && cfg.apiKey ? cfg : publicConfig();
  if (!conf.feedUrl || !cfg.token) return null;
  const res = await fetch(conf.feedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: conf.apiKey, Authorization: `Bearer ${conf.apiKey}` },
    body: JSON.stringify({ token: cfg.token, screen: "helper" }),
  });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  feedCache = { at: Date.now(), data: await res.json() };
  return feedCache.data;
}

/** feedUrl and the publishable key, from the display's own config.js (saved so the copy in ~/.hec-reception has them). */
function publicConfig() {
  try {
    const text = readFileSync(join(SRC, "config.js"), "utf8");
    const feedUrl = text.match(/feedUrl:\s*"([^"]+)"/)?.[1];
    const apiKey = text.match(/apiKey:\s*"([^"]+)"/)?.[1];
    if (feedUrl && apiKey) { cfg.feedUrl = feedUrl; cfg.apiKey = apiKey; saveCfg(); }
  } catch {}
  return cfg;
}

async function youtubeBreak({ force = false } = {}) {
  if (!force && (!openNow().open || Date.now() < (state.nextYoutubeAt ?? 0))) return;
  const feed = await readFeed();
  const list = feed?.youtube ?? [];
  const every = Math.max(2, Number(feed?.settings?.youtube_every_minutes) || 10);
  state.nextYoutubeAt = Date.now() + every * 60 * 1000;
  saveState();
  if (!list.length) return;
  // Only ever interrupt our own display, never someone using the TV.
  const [front] = await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]]);
  if (front?.appId !== APP_ID) return;
  const v = list[(state.youtubeIndex ?? 0) % list.length];
  state.youtubeIndex = ((state.youtubeIndex ?? 0) + 1) % list.length;
  saveState();

  let wasMuted = null;
  try { const [a] = await ssap([["ssap://audio/getStatus"]]); wasMuted = typeof a?.mute === "boolean" ? a.mute : null; } catch {}
  try { await ssap([["ssap://audio/setMute", { mute: !v.sound }]]); }
  catch (e) { log(`YouTube: could not set the sound (${e.message}); run "pair" again to allow it`); }
  await ssap([["ssap://system.launcher/launch", { id: YOUTUBE_APP, contentId: v.youtube_id }]]);
  log(`YouTube: playing "${v.title}" for ${v.play_seconds}s${v.sound ? " with sound" : ", muted"}`);
  await sleep(YOUTUBE_START_MS + v.play_seconds * 1000);
  try {
    const [now] = await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]]);
    // Someone switched to something else meanwhile: leave the TV to them.
    if (now?.appId === YOUTUBE_APP) await ssap([["ssap://system.launcher/launch", { id: APP_ID }]]);
  } finally {
    if (wasMuted !== null) { try { await ssap([["ssap://audio/setMute", { mute: wasMuted }]]); } catch {} }
  }
}

async function watch() {
  log(`helper started (TV ${cfg.tvIp}; on, Hanoi time: ${describeSchedule()})`);
  publicConfig();
  // The copy in ~/.hec-reception has no public/reception-tv beside it, so the
  // feed address must already be in config.json (saved by any run from the repo).
  if (!cfg.feedUrl || !cfg.apiKey) log("no feed address saved: the admin buttons and YouTube breaks are off. Run `node scripts/reception-tv.mjs show` once from the repo.");
  let lastCheck = 0;
  for (;;) {
    if (Date.now() - lastCheck >= 90 * 1000) {
      lastCheck = Date.now();
      try { await check(); } catch (e) { log(`check failed: ${e.message}`); }
    }
    try { await runAdminCommand(); } catch (e) { if (!/fetch failed/.test(e.message)) log(`admin command check failed: ${e.message}`); }
    try { await youtubeBreak(); } catch (e) { log(`YouTube break failed: ${e.message}`); }
    try { await nudge(); } catch {}
    await sleep(20 * 1000);
  }
}

// ------------------------------------------------------------------ autostart
// The repo copy may be a temporary worktree, so the helper runs from its own
// copy in ~/.hec-reception (watch needs nothing else from the repo).
function autostart() {
  publicConfig();
  const dest = join(HOME, "reception-tv.mjs");
  cpSync(fileURLToPath(import.meta.url), dest);
  if (platform() === "win32") {
    // wscript runs node with no console window.
    const vbs = join(HOME, "helper.vbs");
    writeFileSync(vbs, `CreateObject("WScript.Shell").Run """${process.execPath}"" ""${dest}"" watch", 0, False\r\n`);
    // The user's own Startup folder: no administrator rights needed (a logon
    // task in Task Scheduler needs them).
    const startup = join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
    const link = join(startup, "HEC Reception TV helper.vbs");
    cpSync(vbs, link);
    // Start it now unless one is already running.
    const running = spawnSync("powershell", ["-NoProfile", "-Command",
      "(Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -like '*reception-tv.mjs* watch*' }).Count"], { encoding: "utf8" });
    if (!(Number(running.stdout?.trim()) > 0)) spawnSync("wscript.exe", [vbs]);
    console.log(`Helper installed: starts whenever you sign in to Windows. Log: ${LOG}
Remove it by deleting: ${link}`);
  } else {
    console.log(`Helper copied to ${dest}. On a Raspberry Pi, save this as /etc/systemd/system/hec-reception.service and run
  sudo systemctl enable --now hec-reception

[Unit]
Description=HEC reception TV helper
After=network-online.target
Wants=network-online.target

[Service]
User=${process.env.USER || "pi"}
ExecStart=${process.execPath} ${dest} watch
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target`);
  }
}

// ------------------------------------------------------------------ main
const cmd = process.argv[2];
try {
  if (cmd === "setup") setup();
  else if (cmd === "token") {
    const t = (process.argv[3] || "").trim().toLowerCase();
    if (!/^[a-f0-9]{48}$/.test(t)) throw new Error("That is not a display token (48 characters, 0-9 and a-f).");
    cfg.token = t; saveCfg(); console.log(`Saved in ${CONFIG}`);
  }
  else if (cmd === "package") pkg();
  else if (cmd === "install") install();
  else if (cmd === "install-later") {
    // Package now; the helper installs it the next time the TV is reachable.
    const ipk = pkg();
    const keep = join(HOME, "pending.ipk");
    cpSync(ipk, keep);
    state.pendingInstall = keep;
    saveState();
    console.log(`The helper installs this on the TV when it next comes on: ${keep}`);
  }
  else if (cmd === "pair") { console.log("Look at the TV and accept the prompt with the remote…"); await ssap([], { pairing: true }); console.log("Paired."); }
  else if (cmd === "pair-input") {
    console.log("Look at the TV and accept the prompt with the remote (HEC reception keep-awake)…");
    await ssap([], { pairing: true, id: INPUT_ID });
    await pressKey();
    console.log("Paired; pressed RED once. The helper now keeps the TV from idling while the display is in front.");
  }
  else if (cmd === "check") await check();
  else if (cmd === "show") {
    publicConfig();
    // Put the display in front now (the TV must be on), and renew Developer Mode while it answers.
    if (!(await tvAnswers())) throw new Error("The TV does not answer: is it on and on the Wi-Fi?");
    if (!installPending()) await ssap([["ssap://system.launcher/launch", { id: APP_ID }]]);
    console.log(`Display launched on ${cfg.tvIp}.`);
    try { await extendDevMode(); state.extendedOn = openNow().day; saveState(); console.log("Developer Mode renewed."); }
    catch (e) { console.log(`Developer Mode not renewed: ${e.message}`); }
  }
  else if (cmd === "youtube-now") { feedCache.at = 0; await youtubeBreak({ force: true }); }
  else if (cmd === "watch") await watch();
  else if (cmd === "autostart") autostart();
  else if (cmd === "status") console.log(JSON.stringify({ config: { ...cfg, token: cfg.token ? "(set)" : "(missing)", clientKey: cfg.clientKey ? "(paired)" : "(not paired)", inputClientKey: cfg.inputClientKey ? "(paired)" : "(not paired)" }, state, schedule: describeSchedule(),
    // `status 2026-11-21T16:30` checks a Hanoi local time instead of now.
    open: openNow(process.argv[3] ? new Date(`${process.argv[3]}Z`) : undefined) }, null, 2));
  else console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 20).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
