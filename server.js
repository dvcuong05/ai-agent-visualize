// Văn phòng ảo 3D cho đội AI (Claude Code + Codex).
// Máy chủ CHỈ ĐỌC nhật ký phiên có sẵn trên máy bạn (~/.claude, ~/.codex), mỗi giây đẩy trạng thái lên trình duyệt.
// Không gửi gì ra ngoài, không sửa file nào của Claude/Codex, che mọi chuỗi giống khóa trước khi hiện.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const perf = require("./lib/perf");

const ROOT = __dirname;
const CFG_FILE = path.join(ROOT, "config.json");
if (!fs.existsSync(CFG_FILE)) { console.error("Chưa có config.json. Chạy trước: npm run setup"); process.exit(1); }
const CFG = {
  title: "Văn phòng AI", subtitle: "Công ty AI · trực tiếp", ownerName: "Giám đốc",
  port: 7788, host: "127.0.0.1", projects: [], staff: [], hide: [], keepHours: 24, accessKey: "",
  claudeDir: path.join(os.homedir(), ".claude"), codexDir: path.join(os.homedir(), ".codex"),
  ...JSON.parse(fs.readFileSync(CFG_FILE, "utf8").replace(/^﻿/, "")),
};
const PORT = Number(process.env.PORT || CFG.port);
const KEEP = CFG.keepHours * 3600000;
const FIRST_READ = 8_000_000; // lần đầu chỉ đọc 8 MB cuối mỗi nhật ký
const MAX_READ = 16_000_000;

// ---------- tiện ích ----------
const now = () => Date.now();
function mask(s) {
  if (!s) return "";
  return String(s)
    .replace(/[A-Za-z]:[\\/][^\s|;,]*secrets?[^\s|;,]*/gi, "‹thư mục khóa›")
    .replace(/((?:api[_-]?)?key|token|secret|password|passwd|pwd|bearer)\s*[:=]\s*\S+/gi, "$1=‹ẩn›")
    .replace(/\b(sk|pk|rk|ghp|gho|github_pat|xox[abp]|AKIA|AIza)[-_A-Za-z0-9]{12,}/g, "‹khóa›")
    .replace(/[A-Za-z0-9_\-+/=]{48,}/g, "…")
    .replace(/\*\*|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const clip = (s, n = 180) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }
function readRange(p, start, end) {
  const fd = fs.openSync(p, "r");
  try { const buf = Buffer.alloc(Math.max(0, end - start)); fs.readSync(fd, buf, 0, buf.length, start); return buf; } finally { fs.closeSync(fd); }
}
function firstLine(f) {
  const fd = fs.openSync(f, "r");
  try { const b = Buffer.alloc(1 << 20); const n = fs.readSync(fd, b, 0, b.length, 0); const nl = b.subarray(0, n).indexOf(10); return b.subarray(0, nl < 0 ? n : nl).toString("utf8"); } finally { fs.closeSync(fd); }
}

// ---------- phiên nào thuộc dự án của bạn ----------
const normP = (p) => path.resolve(String(p || "")).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
const PROJECTS = (CFG.projects || []).filter(Boolean);
const inProject = (cwd) => !PROJECTS.length || PROJECTS.some((p) => { const a = normP(cwd), b = normP(p); return a === b || a.startsWith(b + "/"); });
// Claude Code đặt tên thư mục nhật ký theo đường dẫn dự án: mọi ký tự không phải chữ/số thành "-".
const encDir = (p) => path.resolve(p).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
const claudeDirOk = (d) => !PROJECTS.length || PROJECTS.some((p) => { const e = encDir(p), x = d.toLowerCase(); return x === e || x.startsWith(e + "-"); });
const hidden = new Set(CFG.hide || []);

// ---------- nhân viên ----------
const agents = [];
const byKey = {};
const owner = { key: "owner", name: CFG.ownerName, role: "Chủ văn phòng", platform: "human", room: "owner", owner: true, lastAt: 0, lastText: "", mins: new Set() };
function mark(a, t) { a.mins.add(Math.floor(t / 60000)); if (a.mins.size > 12000) { const cut = Math.floor((now() - 8 * 86400000) / 60000); for (const m of a.mins) if (m < cut) a.mins.delete(m); } }
function override(name, id) { return (CFG.staff || []).find((s) => s.match && (String(name).toLowerCase().includes(String(s.match).toLowerCase()) || String(id).startsWith(s.match))); }
function roomOf(name, platform, o) {
  if (o && o.room) return o.room;
  if (/quản lý|quan ly|manager|lead|trưởng|truong nhom|điều phối|dieu phoi|coordinat|\bpm\b|\bceo\b/i.test(name)) return "lead";
  if (/review|duyệt|kiểm tra|kiem tra|\btest|\bqa\b/i.test(name)) return "review";
  return platform;
}
function addAgent(platform, id, file, name, createdAt) {
  const key = (platform === "codex" ? "x-" : "c-") + id.slice(0, 8);
  if (byKey[key]) return byKey[key];
  const o = override(name, id);
  const a = {
    key, id, platform, file, autoName: !(o && o.name), name: clip(mask((o && o.name) || name), 40), role: (o && o.role) || (platform === "codex" ? "Kỹ sư Codex" : "Kỹ sư Claude Code"),
    room: roomOf((o && o.name) || name, platform, o), createdAt: createdAt || now(),
    size: 0, offset: 0, mtime: 0, lastText: "", lastTextAt: 0, working: false, subActive: 0, mins: new Set(), done: [], tools: [], lastUserAt: 0,
  };
  agents.push(a); byKey[key] = a; return a;
}
function setName(a, name) {
  if (!a.autoName || !name) return;
  const n = clip(mask(name), 40); if (n === a.name) return;
  a.name = n; const o = override(n, a.id); a.room = roomOf(n, a.platform, o);
}

// Sổ đăng ký phiên Claude đang mở (~/.claude/sessions/<pid>.json): biết phiên nào đang chạy hay đang rảnh, và tên phiên.
// Chỉ đọc file .json; không bao giờ đọc file khóa trong thư mục này.
let live = new Map(), hostToJournal = new Map();
function readLive() {
  const dir = path.join(CFG.claudeDir, "sessions"), m = new Map(), hm = new Map();
  let files = []; try { files = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)); } catch {}
  for (const f of files) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
    try { process.kill(d.pid, 0); } catch { continue; } // tiến trình đã tắt
    if (!d.sessionId || !inProject(d.cwd || "")) continue;
    m.set(d.sessionId, { name: d.name || null, busy: d.status === "busy" });
    const host = String(d.hostSessionId || "").replace(/^local_/, ""); if (host) hm.set(host, d.sessionId);
  }
  live = m; hostToJournal = hm;
}
const toJournal = (s) => { s = String(s || "").replace(/^local_/, ""); for (const [h, j] of hostToJournal) if (s.length >= 8 && h.startsWith(s.slice(0, 8))) return j; return s; };

function claudeTitle(f) {
  const st = safeStat(f); if (!st) return null;
  const tail = readRange(f, Math.max(0, st.size - 2_000_000), st.size).toString("utf8");
  const all = [...tail.matchAll(/"(?:customTitle|agentName)":"((?:[^"\\]|\\.){1,80})"/g)];
  if (all.length) { try { return JSON.parse(`"${all[all.length - 1][1]}"`); } catch {} }
  return null;
}
function codexNames() {
  const m = {};
  try { for (const l of fs.readFileSync(path.join(CFG.codexDir, "session_index.jsonl"), "utf8").split("\n")) { try { const j = JSON.parse(l); if (j.id && j.thread_name) m[j.id] = j.thread_name; } catch {} } } catch {}
  return m;
}
function walk(dir, out) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith(".jsonl")) out.push(p); }
}
const notStaff = new Set();
function discover() {
  const t = now();
  // Claude Code: ~/.claude/projects/<thư mục dự án>/<mã phiên>.jsonl
  const pdir = path.join(CFG.claudeDir, "projects");
  let dirs = []; try { dirs = fs.readdirSync(pdir).filter(claudeDirOk); } catch {}
  for (const d of dirs) {
    let files = []; try { files = fs.readdirSync(path.join(pdir, d)).filter((x) => x.endsWith(".jsonl")); } catch {}
    for (const x of files) {
      const id = x.slice(0, -6), f = path.join(pdir, d, x);
      if (hidden.has(id) || byKey["c-" + id.slice(0, 8)]) continue;
      const st = safeStat(f); if (!st || (t - st.mtimeMs > KEEP && !live.has(id))) continue;
      const L = live.get(id);
      addAgent("claude", id, f, (L && L.name) || claudeTitle(f) || `Claude ${id.slice(0, 8)}`, st.birthtimeMs);
    }
  }
  // Codex: ~/.codex/sessions/YYYY/MM/DD/*.jsonl, dòng đầu ghi thư mục làm việc (cwd).
  // Phiên chạy nhiều ngày vẫn ghi vào thư mục của ngày tạo, nên quét cả cây rồi lọc theo giờ sửa file.
  const files = []; walk(path.join(CFG.codexDir, "sessions"), files);
  let names = null;
  for (const f of files) {
    if (notStaff.has(f)) continue;
    const st = safeStat(f); if (!st || t - st.mtimeMs > KEEP) continue;
    let meta; try { meta = JSON.parse(firstLine(f)).payload || {}; } catch { notStaff.add(f); continue; }
    if (!meta.id || hidden.has(meta.id) || !inProject(meta.cwd || "")) { notStaff.add(f); continue; }
    const ex = byKey["x-" + meta.id.slice(0, 8)];
    if (ex) { if (ex.file !== f && st.mtimeMs > (safeStat(ex.file) || { mtimeMs: 0 }).mtimeMs) { ex.file = f; ex.offset = 0; ex.size = 0; } continue; }
    names = names || codexNames();
    addAgent("codex", meta.id, f, names[meta.id] || `Codex ${meta.id.slice(0, 8)}`, Date.parse(meta.timestamp || "") || st.birthtimeMs);
  }
  // cập nhật tên (phiên đổi tên giữa chừng) và cho nghỉ người im quá lâu
  for (const a of agents) {
    if (a.platform === "claude") { const L = live.get(a.id); setName(a, (L && L.name) || claudeTitle(a.file)); }
    else { names = names || codexNames(); setName(a, names[a.id]); }
  }
  for (let i = agents.length - 1; i >= 0; i--) { const a = agents[i]; if (a.mtime && t - a.mtime > KEEP && !live.has(a.id)) { agents.splice(i, 1); delete byKey[a.key]; } }
}
// Tìm người theo mã phiên (đầy đủ hoặc 8 ký tự đầu, cả mã giao diện local_…) hoặc theo tên.
function agentFromId(id) {
  if (!id) return null;
  const s = toJournal(id).toLowerCase();
  if (s.length < 8) return null;
  for (const a of agents) if (a.id.toLowerCase().startsWith(s.slice(0, 13)) || s.startsWith(a.id.toLowerCase().slice(0, 13))) return a.key;
  return null;
}
function agentFromLabel(label) {
  if (!label) return null;
  const s = String(label).toLowerCase().trim();
  const hex = (s.match(/\b[0-9a-f]{8}(?:-[0-9a-f]{4})?/) || [])[0];
  if (hex) { const k = agentFromId(hex); if (k) return k; }
  for (const a of agents) if (a.name && s.includes(a.name.toLowerCase())) return a.key;
  return null;
}

// ---------- tin nhắn ----------
const events = [];
const seenEvt = new Set();
function pushEvent(e) {
  const key = `${e.kind}|${e.from}|${e.to}|${e.title.slice(0, 60)}`, b = Math.floor(e.t / 60000);
  if (seenEvt.has(key + b) || seenEvt.has(key + (b - 1))) return;
  seenEvt.add(key + b); if (seenEvt.size > 20000) seenEvt.clear();
  events.push(e); events.sort((x, y) => x.t - y.t);
  if (events.length > 500) events.splice(0, events.length - 500);
}
function titleOf(text) { const first = mask(String(text).split("\n").find((l) => l.trim()) || ""); return clip(first.replace(/^<[^>]+>\s*/, ""), 120); }
function textOfContent(c) {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.filter((x) => x && /^(text|output_text|input_text)$/.test(x.type)).map((x) => x.text || "").join("\n");
  return "";
}
const NOT_HUMAN = /^(<|# AGENTS\.md|This session is being continued|\[Request interrupted|Caveat:|Another Claude session)/;
function ownerSays(a, t, txt) {
  if (t > owner.lastAt) { owner.lastAt = t; owner.lastText = clip(mask(txt), 200); }
  mark(owner, t);
  pushEvent({ t, kind: "owner", from: "owner", to: a.key, title: clip(mask(txt), 110), body: clip(mask(txt), 700) });
}
function keep7(arr) { const cut = now() - 7 * 86400000; while (arr.length && arr[0].t < cut) arr.shift(); }

// ---------- đọc nhật ký Claude Code ----------
function parseClaude(a, line) {
  let j; try { j = JSON.parse(line); } catch { return; }
  const t = Date.parse(j.timestamp || "") || now();
  const msg = j.message || {};
  if (j.type === "assistant") {
    mark(a, t);
    if (msg.stop_reason === "end_turn") { a.done.push({ t }); keep7(a.done); }
    for (const c of Array.isArray(msg.content) ? msg.content : []) {
      if (c.type === "text" && c.text && c.text.trim()) { a.lastText = clip(mask(c.text), 600); a.lastTextAt = t; }
      if (c.type === "tool_use") {
        const inp = c.input || {};
        if (/SendMessage|send_message/.test(c.name || "")) {
          const to = agentFromId(inp.session_id || inp.to) || agentFromLabel(inp.to);
          const body = inp.message || "";
          if (to && to !== a.key && body) pushEvent({ t, kind: "msg", from: a.key, to, title: titleOf(body), body: clip(mask(body), 700) });
        }
      }
    }
  }
  if (j.type === "user") {
    const content = msg.content;
    if (Array.isArray(content)) for (const x of content) if (x && x.type === "tool_result") { a.tools.push({ t, err: !!x.is_error }); if (a.tools.length > 5000) a.tools.splice(0, 1000); }
    const txt = textOfContent(content);
    if (!txt) return;
    const m = txt.match(/<cross-session-message from="([^"]+)"(?: from-session="([^"]+)")?(?: from-name="([^"]+)")?[^>]*>\s*([\s\S]*)/);
    if (m) {
      const from = agentFromId(m[2]) || agentFromId(m[1]) || agentFromLabel(m[3]);
      const raw = m[4].replace(/<\/cross-session-message>[\s\S]*$/, "");
      if (from && from !== a.key) pushEvent({ t, kind: "msg", from, to: a.key, title: titleOf(raw), body: clip(mask(raw), 700) });
      return;
    }
    const typed = typeof content === "string" || (Array.isArray(content) && !content.some((x) => x.type === "tool_result"));
    const s = txt.trim();
    if (typed && !j.isMeta && s && !NOT_HUMAN.test(s)) { a.lastUserAt = t; ownerSays(a, t, s); }
  }
}
// ---------- đọc nhật ký Codex ----------
function parseCodex(a, line) {
  if (line.length > 200000) return;
  let j; try { j = JSON.parse(line); } catch { return; }
  const t = Date.parse(j.timestamp || "") || now();
  const p = j.payload || {};
  if (j.type === "response_item" || j.type === "event_msg") mark(a, t);
  if (j.type === "response_item" && p.type === "message") {
    const txt = textOfContent(p.content);
    if (p.role === "assistant" && txt.trim()) { a.lastText = clip(mask(txt), 600); a.lastTextAt = t; }
    if (p.role === "user" && txt.trim()) {
      const peer = txt.match(/\[PEER MESSAGE[^\]]*\]\s*([^\n(]+)/);
      if (peer) {
        const from = agentFromLabel(peer[1]); const body = txt.slice(txt.indexOf(peer[0]) + peer[0].length);
        if (from && from !== a.key) pushEvent({ t, kind: "msg", from, to: a.key, title: titleOf(body), body: clip(mask(body), 700) });
      } else if (!NOT_HUMAN.test(txt.trim())) { a.lastUserAt = t; ownerSays(a, t, txt.trim()); }
    }
  }
  if (j.type === "response_item" && p.type === "function_call_output") {
    const out = typeof p.output === "string" ? p.output : JSON.stringify(p.output || "");
    a.tools.push({ t, err: /exit code:?\s*[1-9]|"exit_code":\s*[1-9]/i.test(out.slice(0, 400)) }); if (a.tools.length > 5000) a.tools.splice(0, 1000);
  }
  if (j.type === "event_msg") {
    if (p.type === "task_started") a.working = true;
    if (p.type === "task_complete") { a.working = false; a.done.push({ t }); keep7(a.done); }
  }
}
function pollAgent(a) {
  if (!a.file) return;
  const st = safeStat(a.file); if (!st) return;
  a.mtime = st.mtimeMs;
  if (st.size === a.size) return;
  if (st.size < a.offset) a.offset = 0;
  let start = a.offset || Math.max(0, st.size - FIRST_READ);
  if (st.size - start > MAX_READ) start = st.size - MAX_READ;
  const jumped = start !== a.offset;
  const buf = readRange(a.file, start, st.size);
  const skip = jumped && start > 0 ? buf.indexOf(10) + 1 : 0;
  const lastNl = buf.lastIndexOf(10);
  if (lastNl < skip) return;
  a.offset = start + lastNl + 1; a.size = st.size;
  const parse = a.platform === "codex" ? parseCodex : parseClaude;
  for (const line of buf.slice(skip, lastNl).toString("utf8").split("\n")) if (line) parse(a, line);
  if (a.platform === "claude") { // phiên con (subagent) đang chạy
    const sub = path.join(path.dirname(a.file), path.basename(a.file, ".jsonl"), "subagents");
    let n = 0; try { for (const f of fs.readdirSync(sub)) { const s = safeStat(path.join(sub, f)); if (s && now() - s.mtimeMs < 120000) n++; } } catch {}
    a.subActive = n;
  }
}

// ---------- ảnh chụp trạng thái ----------
function statusOf(a, t) {
  const quiet = a.mtime ? t - a.mtime : Infinity;
  let st = quiet < 90000 || (a.working && quiet < 10 * 60000) ? "active" : quiet < 6 * 3600000 ? "idle" : "away";
  if (a.platform === "claude") { const L = live.get(a.id); if (L) st = L.busy ? "active" : "idle"; else if (live.size && quiet > 90000) st = "away"; }
  return st;
}
function snapshot() {
  const t = now(), nowMin = Math.floor(t / 60000);
  const hist = (x) => Array.from({ length: 60 }, (_, i) => (x.mins.has(nowMin - 59 + i) ? 1 : 0));
  const out = [{ key: "owner", name: owner.name, role: owner.role, platform: "human", room: "owner", status: owner.lastAt && t - owner.lastAt < 15 * 60000 ? "active" : "away", flag: null,
    lastText: owner.lastText, lastTextAt: owner.lastAt, lastActive: owner.lastAt, sub: 0, hist: hist(owner) }];
  for (const a of agents) {
    const status = statusOf(a, t);
    const flag = /\[CHẶN\]|bị chặn|đang chặn|\bblocked\b/i.test(a.lastText) && status !== "active" && t - a.lastTextAt < 3 * 3600000 ? "blocked" : null;
    out.push({ key: a.key, name: a.name, role: a.role, platform: a.platform, room: a.room, status, flag, session: a.id.slice(0, 8),
      lastText: a.lastText, lastTextAt: a.lastTextAt, lastActive: a.mtime, sub: a.subActive || 0, isNew: t - a.createdAt < 3600000, createdAt: a.createdAt, hist: hist(a) });
  }
  const team = Array.from({ length: 180 }, (_, i) => { const m = nowMin - 179 + i; let cx = 0, cl = 0; for (const a of agents) if (a.mins.has(m)) { if (a.platform === "codex") cx++; else cl++; } return { t: m * 60000, codex: cx, claude: cl }; });
  const alerts = [];
  for (const a of out) if (a.flag === "blocked") alerts.push({ level: "bad", text: `${a.name} đang báo bị chặn` });
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  return { now: t, title: CFG.title, subtitle: CFG.subtitle, agents: out, events: events.filter((e) => t - e.t < 24 * 3600000).slice(-300), team, alerts,
    today: { msgs: events.filter((e) => e.t >= +day0 && e.kind === "msg").length, owner: events.filter((e) => e.t >= +day0 && e.kind === "owner").length } };
}

// ---------- vòng lặp ----------
readLive(); discover();
setInterval(() => { try { readLive(); } catch {} }, 3000);
setInterval(() => { try { discover(); } catch (e) { console.error("discover:", e.message); } }, 5000);
setInterval(() => { for (const a of agents) { try { pollAgent(a); } catch {} } }, 1000);
perf.scanAll(agents); setInterval(() => perf.scanAll(agents), 3000);

// ---------- máy chủ web ----------
const clients = new Set(), perfClients = new Set();
let perfCache = null;
const perfNow = () => { if (!perfCache || now() - perfCache.at > 1500) perfCache = { at: now(), data: perf.compute(agents, snapshot().agents, events) }; return perfCache.data; };
setInterval(() => { if (!clients.size) return; const d = "data: " + JSON.stringify(snapshot()) + "\n\n"; for (const r of clients) r.write(d); }, 1000);
setInterval(() => { if (!perfClients.size) return; const d = "data: " + JSON.stringify(perfNow()) + "\n\n"; for (const r of perfClients) r.write(d); }, 2000);

// Khóa xem (tùy chọn): đặt "accessKey" trong config.json thì phải nhập khóa một lần mới xem được (nên bật khi mở ra điện thoại qua Internet).
const KEY = String(CFG.accessKey || "");
const keyHash = KEY ? crypto.createHash("sha256").update(KEY).digest("hex").slice(0, 32) : "";
const sameKey = (x) => { const a = Buffer.from(String(x || "")), b = Buffer.from(KEY); return a.length === b.length && crypto.timingSafeEqual(a, b); };
function authed(req, url) {
  if (!KEY) return true;
  const ck = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith("vpk="));
  return (ck && ck.slice(4) === keyHash) || sameKey(url.searchParams.get("key"));
}
const LOGIN = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Văn phòng AI</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#05070a;color:#eee;font-family:system-ui,sans-serif">
<form method="get" style="display:grid;gap:10px;width:min(320px,90vw)"><b style="font-size:18px">Nhập khóa xem văn phòng</b>
<input name="key" type="password" autofocus style="padding:12px;border-radius:10px;border:1px solid #333;background:#111;color:#eee;font-size:16px">
<button style="padding:12px;border-radius:10px;border:0;background:#ecc970;font-weight:700;font-size:15px">Vào xem</button></form></body>`;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
const json = (res, d) => { res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" }); res.end(JSON.stringify(d)); };
function sse(req, res, set, first) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.write("data: " + JSON.stringify(first) + "\n\n"); set.add(res); req.on("close", () => set.delete(res));
}
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (!authed(req, url)) { res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" }); return res.end(LOGIN); }
  if (KEY && url.searchParams.has("key")) { res.writeHead(302, { "Set-Cookie": `vpk=${keyHash}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`, Location: url.pathname }); return res.end(); }
  if (url.pathname === "/events") return sse(req, res, clients, snapshot());
  if (url.pathname === "/state") return json(res, snapshot());
  if (url.pathname === "/perf-events") return sse(req, res, perfClients, perfNow());
  if (url.pathname === "/perf") return json(res, perfNow());
  const file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const p = path.join(ROOT, "public", path.normalize(file).replace(/^(\.\.[\\/])+/, ""));
  if (!p.startsWith(path.join(ROOT, "public"))) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("không có"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-cache" }); res.end(buf);
  });
}).listen(PORT, CFG.host, () => {
  console.log(`\n  ${CFG.title} đang chạy`);
  console.log(`  Mở trên máy này:  http://localhost:${PORT}`);
  console.log(`  Dự án theo dõi:   ${PROJECTS.length ? PROJECTS.join(", ") : "mọi dự án trên máy"}`);
  console.log(`  Khóa xem:         ${KEY ? "đang bật" : "tắt (chỉ máy này xem được nếu host = 127.0.0.1)"}\n`);
});
