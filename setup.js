// Cài đặt văn phòng ảo: hỏi vài câu rồi ghi config.json.
// Chạy: npm run setup   (hoặc: node setup.js --project "D:/du-an" --title "Văn phòng ABC" --owner "Anh Hải" --yes)
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const readline = require("readline");

const ROOT = __dirname, OUT = path.join(ROOT, "config.json");
const HOME = os.homedir();
const CLAUDE = path.join(HOME, ".claude"), CODEX = path.join(HOME, ".codex");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const flags = (n) => args.flatMap((a, i) => (a === "--" + n ? [args[i + 1]] : [])).filter(Boolean);
const YES = args.includes("--yes");

const major = +process.versions.node.split(".")[0];
if (major < 18) { console.error(`Cần Node.js 18 trở lên (máy đang có ${process.versions.node}). Tải ở https://nodejs.org`); process.exit(1); }

function headText(f, n = 256 * 1024) { const fd = fs.openSync(f, "r"); try { const b = Buffer.alloc(n); const k = fs.readSync(fd, b, 0, n, 0); return b.subarray(0, k).toString("utf8"); } finally { fs.closeSync(fd); } }
function walk(dir, out, depth = 0) { let e; try { e = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; } for (const x of e) { const p = path.join(dir, x.name); if (x.isDirectory() && depth < 4) walk(p, out, depth + 1); else if (x.name.endsWith(".jsonl")) out.push(p); } }

// Tìm các thư mục dự án đã dùng Claude Code / Codex trong 14 ngày qua (đọc trường "cwd" trong nhật ký, không đọc nội dung khác).
function findProjects() {
  const found = new Map(), cut = Date.now() - 14 * 86400000;
  const add = (cwd, t, who) => { if (!cwd) return; const k = path.resolve(cwd); const v = found.get(k) || { cwd: k, t: 0, who: new Set() }; v.t = Math.max(v.t, t); v.who.add(who); found.set(k, v); };
  let dirs = []; try { dirs = fs.readdirSync(path.join(CLAUDE, "projects")); } catch {}
  for (const d of dirs) {
    let files = []; try { files = fs.readdirSync(path.join(CLAUDE, "projects", d)).filter((x) => x.endsWith(".jsonl")).map((x) => path.join(CLAUDE, "projects", d, x)); } catch {}
    const recent = files.map((f) => [f, fs.statSync(f).mtimeMs]).filter(([, t]) => t > cut).sort((a, b) => b[1] - a[1])[0];
    if (!recent) continue;
    const m = headText(recent[0]).match(/"cwd":"((?:[^"\\]|\\.)+)"/);
    if (m) { try { add(JSON.parse(`"${m[1]}"`), recent[1], "Claude Code"); } catch {} }
  }
  const cf = []; walk(path.join(CODEX, "sessions"), cf);
  for (const f of cf) {
    const t = fs.statSync(f).mtimeMs; if (t < cut) continue;
    try { const meta = JSON.parse(headText(f, 64 * 1024).split("\n")[0]).payload || {}; add(meta.cwd, t, "Codex"); } catch {}
  }
  // gộp worktree con vào thư mục cha nếu cha cũng có trong danh sách
  const list = [...found.values()].sort((a, b) => b.t - a.t);
  return list.filter((x) => !list.some((y) => y !== x && x.cwd.toLowerCase().startsWith(y.cwd.toLowerCase() + path.sep)));
}

async function main() {
  console.log("\n=== Cài đặt Văn phòng ảo 3D cho đội AI ===\n");
  console.log(`Claude Code: ${fs.existsSync(path.join(CLAUDE, "projects")) ? "có (" + CLAUDE + ")" : "chưa thấy"}`);
  console.log(`Codex:       ${fs.existsSync(path.join(CODEX, "sessions")) ? "có (" + CODEX + ")" : "chưa thấy"}`);
  if (!fs.existsSync(path.join(CLAUDE, "projects")) && !fs.existsSync(path.join(CODEX, "sessions"))) console.log("\n(!) Máy này chưa có nhật ký Claude Code hay Codex. Vẫn cài được, văn phòng sẽ trống cho tới khi bạn mở phiên đầu tiên.");
  const rl = YES ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q, def) => YES ? Promise.resolve(def) : new Promise((r) => rl.question(`${q}${def ? ` [${def}]` : ""}: `, (a) => r(a.trim() || def || "")));

  let projects = flags("project");
  if (!projects.length) {
    const ps = findProjects().slice(0, 12);
    if (ps.length) {
      console.log("\nCác thư mục dự án đã dùng AI trong 14 ngày qua:");
      ps.forEach((p, i) => console.log(`  ${i + 1}. ${p.cwd}   (${[...p.who].join(" + ")})`));
    }
    const a = await ask("\nChọn số thứ tự dự án (nhiều dự án cách nhau dấu phẩy), dán đường dẫn khác, hoặc để trống = theo dõi MỌI dự án", ps.length ? "1" : "");
    for (const x of a.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (/^\d+$/.test(x) && ps[+x - 1]) projects.push(ps[+x - 1].cwd);
      else if (fs.existsSync(x)) projects.push(path.resolve(x));
      else console.log(`  Bỏ qua "${x}": không có thư mục này.`);
    }
  }
  const title = flag("title") || await ask("Tên văn phòng", "Văn phòng AI");
  const ownerName = flag("owner") || await ask("Bạn muốn được gọi là gì trong văn phòng", "Giám đốc");
  const phone = flag("key") ? "c" : (await ask("Có muốn xem trên điện thoại qua Internet không? (c/k)", "k")).toLowerCase();
  const accessKey = flag("key") || (phone.startsWith("c") ? crypto.randomBytes(9).toString("base64url") : "");
  if (rl) rl.close();

  const cfg = { title, subtitle: "Công ty AI · trực tiếp", ownerName, port: 7788, host: "127.0.0.1", projects, keepHours: 24, accessKey, staff: [], hide: [] };
  if (fs.existsSync(OUT)) fs.copyFileSync(OUT, OUT + ".bak");
  fs.writeFileSync(OUT, JSON.stringify(cfg, null, 2) + "\n");
  console.log(`\nĐã ghi ${OUT}`);
  console.log(`Theo dõi: ${projects.length ? projects.join(", ") : "mọi dự án trên máy"}`);
  if (accessKey) console.log(`\nKhóa xem văn phòng (ghi lại, nhập một lần trên điện thoại): ${accessKey}\nKhóa nằm trong config.json — đừng đưa file này lên GitHub.`);
  console.log("\nBước tiếp:  npm start   rồi mở http://localhost:7788\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
