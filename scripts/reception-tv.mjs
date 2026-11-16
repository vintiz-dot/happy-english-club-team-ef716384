#!/usr/bin/env node
// HEC reception TV: package, install and look after the LG webOS app.
//
//   node scripts/reception-tv.mjs setup      one-off: install the LG CLI, add the TV, fetch its key
//   node scripts/reception-tv.mjs package    build the .ipk (writes the display token into it)
//   node scripts/reception-tv.mjs install    package + install + launch on the TV
//   node scripts/reception-tv.mjs pair       one-off: accept the prompt on the TV so the helper may launch apps
//   node scripts/reception-tv.mjs check      one pass of the helper (what `watch` does every few minutes)
//   node scripts/reception-tv.mjs watch      run the helper for ever (Task Scheduler / systemd)
//   node scripts/reception-tv.mjs status     print what the helper knows
//   node scripts/reception-tv.mjs autostart  copy the helper to ~/.hec-reception and start it at logon
//
// The helper, every 3 minutes during opening hours:
//   - wakes the TV (Wake-on-LAN) if it is off,
//   - brings the display app back to the front if anything else is showing,
//   - renews Developer Mode once a day (it lapses after 50 hours otherwise),
// and switches the TV off once at closing time.
//
// Settings and secrets live OUTSIDE the repo, in ~/.hec-reception/config.json:
//   { "tvIp": "192.168.1.204", "tvMac": "a0:6f:aa:46:d1:30", "token": "<display token>",
//     "open": "07:30", "close": "21:45", "days": [0,1,2,3,4,5,6], "clientKey": "<from pair>" }
// Node 22+ (built-in WebSocket). Runs the same on Windows and a Raspberry Pi.
import { execFileSync, spawnSync } from "node:child_process";
import { createSocket } from "node:dgram";
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
const defaults = { tvIp: "192.168.1.204", tvMac: "a0:6f:aa:46:d1:30", token: "", open: "07:30", close: "21:45", days: [0, 1, 2, 3, 4, 5, 6] };
const cfg = { ...defaults, ...readJson(CONFIG, {}) };
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
  cpSync(SRC, app, { recursive: true, filter: (p) => !/demo-feed\.js$/.test(p) });
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
function ssap(requests, { pairing = false, timeoutMs = 15000 } = {}) {
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
        forcePairing: false, pairingType: "PROMPT", "client-key": cfg.clientKey || undefined,
        manifest: {
          manifestVersion: 1, appVersion: "1.0", signed: { appId: "com.happyenglishclub.helper", vendorId: "hec", created: "20261116", localizedAppNames: { "": "HEC reception helper" }, permissions: [] },
          permissions: ["LAUNCH", "CONTROL_POWER", "READ_RUNNING_APPS", "READ_CURRENT_CHANNEL", "READ_INSTALLED_APPS"],
        },
      },
    });
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id === "reg") {
        if (m.type === "registered") {
          if (m.payload?.["client-key"] && m.payload["client-key"] !== cfg.clientKey) { cfg.clientKey = m.payload["client-key"]; saveCfg(); }
          return nextRequest();
        }
        if (m.type === "error") { clearTimeout(timer); ws.close(); return reject(new Error(`TV refused: ${m.error}`)); }
        return; // "response" with pairingType PROMPT: waiting for someone to press OK on the TV
      }
      if (m.id === `req${i}`) { results.push(m.payload ?? {}); i++; nextRequest(); }
    };
  });
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

// ------------------------------------------------------------------ the helper
const hanoiNow = () => new Date(Date.now() + 7 * 3600 * 1000);
function openNow() {
  const d = hanoiNow();
  const hm = d.getUTCHours() * 60 + d.getUTCMinutes();
  const at = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  return { open: cfg.days.includes(d.getUTCDay()) && hm >= at(cfg.open) && hm < at(cfg.close), day: d.toISOString().slice(0, 10) };
}

async function check() {
  const { open, day } = openNow();
  if (!open) {
    if (state.offOn !== day && state.lastOpenDay === day) {
      try { await ssap([["ssap://system/turnOff"]]); log("closing time: TV switched off"); } catch (e) { log(`closing time: could not switch off (${e.message})`); }
      state.offOn = day; saveState();
    }
    return;
  }
  state.lastOpenDay = day;
  let front = null;
  try {
    const [info] = await ssap([["ssap://com.webos.applicationManager/getForegroundAppInfo"]]);
    front = info?.appId ?? "";
  } catch (e) {
    log(`TV not answering (${e.message}); sending Wake-on-LAN`);
    await wake();
    saveState();
    return; // the next pass launches the app once the TV is up
  }
  if (front !== APP_ID) {
    try { await ssap([["ssap://system.launcher/launch", { id: APP_ID }]]); log(`display relaunched (was: ${front || "home screen"})`); }
    catch (e) { log(`could not launch the display: ${e.message}`); }
  }
  // Developer Mode lapses after 50 hours; renew it once a day.
  if (state.extendedOn !== day) {
    try { ares("ares-extend-dev", ["--device", DEVICE], { timeout: 60000 }); state.extendedOn = day; log("Developer Mode renewed"); }
    catch (e) { log(`Developer Mode renewal failed: ${e.message.split("\n")[0]}`); }
  }
  state.lastCheck = new Date().toISOString();
  saveState();
}

async function watch() {
  log(`helper started (TV ${cfg.tvIp}, open ${cfg.open}-${cfg.close} Hanoi time)`);
  for (;;) {
    try { await check(); } catch (e) { log(`check failed: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 3 * 60 * 1000));
  }
}

// ------------------------------------------------------------------ autostart
// The repo copy may be a temporary worktree, so the helper runs from its own
// copy in ~/.hec-reception (watch needs nothing else from the repo).
function autostart() {
  const dest = join(HOME, "reception-tv.mjs");
  cpSync(fileURLToPath(import.meta.url), dest);
  if (platform() === "win32") {
    // wscript runs node with no console window.
    const vbs = join(HOME, "helper.vbs");
    writeFileSync(vbs, `CreateObject("WScript.Shell").Run """${process.execPath}"" ""${dest}"" watch", 0, False

`);
    const task = "HEC Reception TV helper";
    execFileSync("schtasks", ["/Create", "/TN", task, "/SC", "ONLOGON", "/RL", "LIMITED", "/F", "/TR", `wscript.exe "${vbs}"`], { stdio: "inherit" });
    execFileSync("schtasks", ["/Run", "/TN", task], { stdio: "inherit" });
    console.log(`Helper installed: starts at every logon. Log: ${LOG}
Remove with: schtasks /Delete /TN "${task}" /F`);
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
  else if (cmd === "pair") { console.log("Look at the TV and accept the prompt with the remote…"); await ssap([], { pairing: true }); console.log("Paired."); }
  else if (cmd === "check") await check();
  else if (cmd === "watch") await watch();
  else if (cmd === "autostart") autostart();
  else if (cmd === "status") console.log(JSON.stringify({ config: { ...cfg, token: cfg.token ? "(set)" : "(missing)", clientKey: cfg.clientKey ? "(paired)" : "(not paired)" }, state, open: openNow() }, null, 2));
  else console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 20).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
