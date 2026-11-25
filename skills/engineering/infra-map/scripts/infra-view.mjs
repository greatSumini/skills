#!/usr/bin/env node
// docs/infra-map.json 을 손그림 지도로 그린다. 리퀘스트 맵(요청 하나가 지나가는 길)을 겹쳐 그릴 수도 있다. 의존성 없음.
//
//   node <skill-dir>/scripts/infra-view.mjs [docs/infra-map.json] [--request 요청.json] [--out 파일] [--png] [--no-open] [--check]
//
// 만드는 것 (--out 을 안 주면 임시 폴더)
//   <이름>.excalidraw  — excalidraw.com 에 끌어다 놓으면 그대로 열리고 고칠 수 있다
//   <이름>.html        — 브라우저 미리보기. 손그림 SVG 를 직접 그린다(폰트도 fonts/ 에서 싣는다 — 인터넷·패키지 불필요)
//   <이름>.png         — --png 일 때. 크롬 헤드리스로 html 을 찍는다
//
// --check: 지도 규칙을 어긴 곳이 있으면 종료 코드 1

import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename, dirname } from "node:path";
import { execFile, execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const valued = new Set(["--out", "--request"]);
const input = resolve(args.find((a, i) => !a.startsWith("--") && !valued.has(args[i - 1])) ?? "docs/infra-map.json");
if (!existsSync(input)) {
  console.error(`없음: ${input} — <skill-dir>/templates/infra-map.json 을 복사해 시작한다`);
  process.exit(1);
}
const map = JSON.parse(readFileSync(input, "utf8"));
const reqPath = opt("--request");
const req = reqPath ? JSON.parse(readFileSync(resolve(reqPath), "utf8")) : null;
const stem = req ? `request-${slug(req.name ?? "map")}` : basename(input, ".json");
const outBase = opt("--out") ? resolve(opt("--out")).replace(/\.(html|png|excalidraw)$/, "") : join(mkdtempSync(join(tmpdir(), "infra-map-")), stem);

// ── 검사 ─────────────────────────────────────────────
const ZONES = { client: "Client-side", server: "Server-side", external: "External Providers" };
const nodes = map.nodes ?? [];
const byName = new Map(nodes.map((n) => [n.name, n]));
const warns = [];
for (const n of nodes) {
  if (!ZONES[n.zone]) warns.push(`${n.name}: zone 은 client · server · external 중 하나`);
  for (const t of n.to ?? []) {
    const m = byName.get(t);
    if (!m) { warns.push(`${n.name} → ${t}: 없는 노드`); continue; }
    const order = { client: 0, server: 1, external: 2 };
    if (order[m.zone] < order[n.zone]) warns.push(`${n.name} → ${t}: 연결은 client → server → external 방향만 쓴다`);
    if (n.zone === "client" && m.zone === "external" && !m.auth) warns.push(`${n.name} → ${t}: 클라이언트가 외부를 직접 부른다 — 로그인 제공자(auth: true)가 아니면 서버를 거친다`);
  }
}
for (const [i, s] of (req?.steps ?? []).entries()) {
  for (const k of ["from", "to"]) if (!byName.has(s[k])) warns.push(`요청 ${i + 1}단계 ${k}: 인프라 맵에 없는 노드 "${s[k]}" — 먼저 인프라 맵에 넣는다`);
}
for (const w of warns) console.error(`⚠ ${w}`);
if (flag("--check")) process.exit(warns.length ? 1 : 0);

// ── 배치 ─────────────────────────────────────────────
// 칸: client | server | external | (external 이 부르는 external)
const W = 380, H = 130, COLX = [140, 700, 1260, 1960], TOP = 150;
const col = (n) => {
  if (n.zone === "client") return 0;
  if (n.zone === "server") return 1;
  const callers = nodes.filter((m) => (m.to ?? []).includes(n.name));
  return callers.length && callers.every((m) => m.zone === "external") ? 3 : 2;
};
const pos = new Map();
const colY = [TOP, TOP, TOP, TOP];
for (const n of nodes) {
  const c = col(n);
  // 오른쪽 칸(외부가 부르는 외부)은 부르는 쪽과 같은 높이에 둔다
  if (c === 3) {
    const caller = pos.get(nodes.find((m) => (m.to ?? []).includes(n.name))?.name);
    if (caller) colY[3] = Math.max(colY[3], caller.y);
  }
  const below = belowLines(n).length;
  pos.set(n.name, { x: COLX[c], y: colY[c], c });
  colY[c] += H + 40 + below * 30 + 30;
}
const bottom = Math.max(...colY, TOP + H) + 20;

// ── Excalidraw 요소 ──────────────────────────────────
const els = [];
let seed = 1;
const base = (o) => ({
  id: `e${els.length + 1}`, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid",
  strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null,
  seed: seed++, version: 1, versionNonce: seed * 7, isDeleted: false, boundElements: null, updated: 1, link: null, locked: false, ...o,
});
const textW = (s, size) => Math.max(...s.split("\n").map((l) => [...l].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? size : size * 0.56), 0)));
const text = (x, y, s, o = {}) => {
  const size = o.fontSize ?? 24, w = textW(s, size), h = s.split("\n").length * size * 1.25;
  const left = o.align === "left" ? x : x - w / 2;
  els.push(base({ type: "text", x: left, y, width: w, height: h, text: s, originalText: s, fontSize: size, fontFamily: 5,
    textAlign: o.align ?? "center", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true, strokeColor: o.color ?? "#1e1e1e" }));
};
const line = (x1, y1, x2, y2, o = {}) => els.push(base({
  type: "arrow", x: x1, y: y1, width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), points: [[0, 0], [x2 - x1, y2 - y1]],
  startArrowhead: null, endArrowhead: o.head === false ? null : "arrow", startBinding: null, endBinding: null, lastCommittedPoint: null,
  strokeColor: o.color ?? "#1e1e1e", strokeStyle: o.dashed ? "dashed" : "solid", strokeWidth: o.width ?? 2, roundness: { type: 2 }, elbowed: false,
}));

function belowLines(n) {
  const out = [];
  const tech = [n.stack, n.deploy].filter(Boolean).join(", ");
  if (tech) out.push(tech); // 스택·배포 위치는 모든 칸에서 상자 아래에 둔다
  for (const r of n.risks ?? []) out.push(`⚠ ${r}`);
  return out;
}

// 칸 제목 · 점선
const usedCols = new Set(nodes.map(col));
for (const [i, z] of ["client", "server", "external"].entries()) text(COLX[i] + W / 2, 40, ZONES[z], { fontSize: 28 });
for (const x of [(COLX[0] + W + COLX[1]) / 2, (COLX[1] + W + COLX[2]) / 2]) line(x, 30, x, bottom, { head: false, dashed: true });

// 노드
for (const n of nodes) {
  const { x, y } = pos.get(n.name);
  els.push(base({ type: "rectangle", x, y, width: W, height: H, roundness: { type: 3 } }));
  const label = [n.name, n.note].filter(Boolean).join("\n");
  const size = 26, lines = label.split("\n").length;
  text(x + W / 2, y + H / 2 - (lines * size * 1.25) / 2, label, { fontSize: size });
  let by = y + H + 16;
  for (const l of belowLines(n)) {
    const risk = l.startsWith("⚠");
    text(x + W / 2, by, l, { fontSize: risk ? 20 : 24, color: risk ? "#e03131" : "#1e1e1e" });
    by += 30;
  }
}

// 연결 — 경계점 사이에 긋는다. client→server 는 화살촉 없이(손그림 지도와 같게)
const anchor = (a, b) => {
  const pa = pos.get(a), pb = pos.get(b);
  const ay = pa.y + H / 2, by = pb.y + H / 2;
  if (pb.c > pa.c) return [pa.x + W, ay, pb.x, by];
  if (pb.c < pa.c) return [pa.x, ay, pb.x + W, by];
  return pb.y > pa.y ? [pa.x + W / 2, pa.y + H, pb.x + W / 2, pb.y] : [pa.x + W / 2, pa.y, pb.x + W / 2, pb.y + H];
};
if (!req) {
  for (const n of nodes) for (const t of n.to ?? []) {
    if (!byName.has(t)) continue;
    const [x1, y1, x2, y2] = anchor(n.name, t);
    line(x1, y1, x2, y2, { head: !(n.zone === "client" && byName.get(t).zone === "server") });
  }
} else {
  // 리퀘스트 맵: 인프라 연결은 옅게, 요청 단계는 빨간 번호 화살표로
  for (const e of els) if (e.type === "rectangle") e.strokeColor = "#868e96";
  const seen = new Map();
  for (const [i, s] of req.steps.entries()) {
    if (!byName.has(s.from) || !byName.has(s.to)) continue;
    const key = [s.from, s.to].sort().join("|");
    const k = seen.get(key) ?? 0; seen.set(key, k + 1);
    const off = k === 0 ? -20 : 20 + (k - 1) * 40; // 같은 두 노드 사이 여러 단계는 위아래로 벌린다
    let [x1, y1, x2, y2] = anchor(s.from, s.to);
    if (x1 !== x2) { y1 += off; y2 += off; } else { x1 += off; x2 += off; }
    line(x1, y1, x2, y2, { color: "#e03131", width: 2 });
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    els.push(base({ type: "ellipse", x: mx - 17, y: my - 17, width: 34, height: 34, strokeColor: "#e03131", backgroundColor: "#ffffff" }));
    text(mx, my - 13, String(i + 1), { fontSize: 20, color: "#e03131" });
  }
  // 범례: 단계 설명
  text(COLX[0] - 40, bottom + 30, req.name ?? "요청", { fontSize: 28, align: "left", color: "#e03131" });
  req.steps.forEach((s, i) => text(COLX[0] - 40, bottom + 80 + i * 34, `${i + 1}. ${s.from} → ${s.to}: ${s.label ?? ""}`, { fontSize: 22, align: "left" }));
}

const scene = { type: "excalidraw", version: 2, source: "infra-map", elements: els, appState: { viewBackgroundColor: "#ffffff", gridSize: null }, files: {} };
writeFileSync(`${outBase}.excalidraw`, JSON.stringify(scene, null, 1));

// ── 손그림 SVG (의존성 없음) ─────────────────────────
// Excalidraw 와 비슷하게: 선은 두 번 살짝 다르게 긋고, 글씨는 같이 싣는 손글씨 폰트(fonts/)로 쓴다.
let rs = 7;
const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647) - 0.5; // 같은 입력이면 같은 그림
const j = (v) => v + rnd() * 2.4;
const stroke1 = (x1, y1, x2, y2) => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, bow = Math.min(4, len * 0.012) * (rnd() * 2);
  const mx = (x1 + x2) / 2 + (-(y2 - y1) / len) * bow, my = (y1 + y2) / 2 + ((x2 - x1) / len) * bow;
  return `M${j(x1)} ${j(y1)} Q${mx} ${my} ${j(x2)} ${j(y2)}`;
};
const rough = (x1, y1, x2, y2) => stroke1(x1, y1, x2, y2) + " " + stroke1(x1, y1, x2, y2);
const roundRect = (x, y, w, h, r = 22) => [0, 1].map(() =>
  `M${j(x + r)} ${j(y)} L${j(x + w - r)} ${j(y)} Q${x + w} ${y} ${j(x + w)} ${j(y + r)} L${j(x + w)} ${j(y + h - r)} Q${x + w} ${y + h} ${j(x + w - r)} ${j(y + h)} L${j(x + r)} ${j(y + h)} Q${x} ${y + h} ${j(x)} ${j(y + h - r)} L${j(x)} ${j(y + r)} Q${x} ${y} ${j(x + r)} ${j(y)}`).join(" ");
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svgParts = [];
for (const e of els) {
  const st = `stroke="${e.strokeColor}" stroke-width="${e.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (e.type === "rectangle") svgParts.push(`<path d="${roundRect(e.x, e.y, e.width, e.height)}" ${st}/>`);
  else if (e.type === "ellipse") svgParts.push(`<ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" fill="${e.backgroundColor}" stroke="none"/>` +
    [0, 1].map(() => `<ellipse cx="${j(e.x + e.width / 2)}" cy="${j(e.y + e.height / 2)}" rx="${e.width / 2 + rnd()}" ry="${e.height / 2 + rnd()}" ${st}/>`).join(""));
  else if (e.type === "arrow") {
    const [x1, y1] = [e.x, e.y], [x2, y2] = [e.x + e.points[1][0], e.y + e.points[1][1]];
    if (e.strokeStyle === "dashed") { svgParts.push(`<path d="${stroke1(x1, y1, x2, y2)}" ${st} stroke-dasharray="10 10"/>`); continue; }
    let d = rough(x1, y1, x2, y2);
    if (e.endArrowhead) {
      const a = Math.atan2(y2 - y1, x2 - x1);
      for (const s of [-1, 1]) d += " " + stroke1(x2, y2, x2 - 22 * Math.cos(a + s * 0.45), y2 - 22 * Math.sin(a + s * 0.45));
    }
    svgParts.push(`<path d="${d}" ${st}/>`);
  } else if (e.type === "text") {
    const anchor = e.textAlign === "left" ? "start" : "middle", x = e.textAlign === "left" ? e.x : e.x + e.width / 2;
    const lines = e.text.split("\n").map((l, i) => `<tspan x="${x}" dy="${i ? e.fontSize * 1.25 : e.fontSize}">${esc(l)}</tspan>`).join("");
    svgParts.push(`<text y="${e.y}" font-size="${e.fontSize}" text-anchor="${anchor}" fill="${e.strokeColor}">${lines}</text>`);
  }
}
const minX = Math.min(...els.map((e) => e.x)) - 40, minY = Math.min(...els.map((e) => e.y)) - 40;
const maxX = Math.max(...els.map((e) => e.x + (e.width || 0))) + 40, maxY = Math.max(...els.map((e) => e.y + (e.height || 0))) + 40;
const font = (f) => readFileSync(join(dirname(new URL(import.meta.url).pathname), "..", "fonts", f)).toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}">
<style>@font-face{font-family:Hand;src:url(data:font/woff2;base64,${font("Excalifont-Regular.woff2")}) format("woff2")}
@font-face{font-family:HandKo;src:url(data:font/woff2;base64,${font("Gaegu-Bold-ko.woff2")}) format("woff2");size-adjust:128%}
text{font-family:Hand,HandKo,sans-serif}</style>
<rect x="${minX}" y="${minY}" width="100%" height="100%" fill="#fff"/>
${svgParts.join("\n")}
</svg>`;
const html = `<!doctype html><meta charset="utf-8"><title>${basename(outBase)}</title>
<style>body{margin:0;background:#fff}svg{display:block;max-width:100%;height:auto}</style>
${svg}`;
writeFileSync(`${outBase}.html`, html);
console.log(`${outBase}.excalidraw\n${outBase}.html`);

if (flag("--png")) {
  const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium"].find((c) => c.startsWith("/") ? existsSync(c) : true);
  const prof = mkdtempSync(join(tmpdir(), "infra-chrome-"));
  const w = maxX - minX, h = maxY - minY;
  try {
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${Math.round(w)},${Math.round(h)}`,
      "--virtual-time-budget=3000", `--user-data-dir=${prof}`, `--screenshot=${outBase}.png`, `file://${outBase}.html`], { stdio: "ignore", timeout: 90000 });
    console.log(`${outBase}.png`);
  } catch { console.error("png 실패 — html 을 브라우저로 열어 확인한다"); }
  rmSync(prof, { recursive: true, force: true });
}
if (!flag("--no-open") && !flag("--png")) execFile(process.platform === "darwin" ? "open" : "xdg-open", [`${outBase}.html`]);

function slug(s) { return s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "map"; }
