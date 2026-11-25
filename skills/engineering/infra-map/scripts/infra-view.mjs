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
// 칸: client | server | external | (external 이 부르는 external). 외부 상자는 이름·배포처를 한 줄로 넣어 낮게 그린다
const W = 380, H = 130, COLX = [140, 700, 1260, 1960], TOP = 150;
const hOf = (n) => (n.zone === "external" ? 96 : H);
const col = (n) => {
  if (n.zone === "client") return 0;
  if (n.zone === "server") return 1;
  const callers = nodes.filter((m) => (m.to ?? []).includes(n.name));
  return callers.length && callers.every((m) => m.zone === "external") ? 3 : 2;
};
const pos = new Map();
const colY = [TOP, TOP, TOP, TOP];
const place = (n) => {
  const c = col(n);
  if (c === 3) {
    const caller = pos.get(nodes.find((m) => (m.to ?? []).includes(n.name))?.name);
    if (caller) colY[3] = Math.max(colY[3], caller.y);
  }
  const below = belowLines(n).length;
  const h = hOf(n);
  pos.set(n.name, { x: COLX[c], y: colY[c], c, h });
  colY[c] += h + (n.zone === "external" ? 24 : 70) + below * 30;
};
// 왼쪽 칸부터 놓고, 다음 칸은 부르는 노드들의 평균 높이 순으로 정렬한다(교차 줄이기).
// 클라이언트가 직접 여는 노드(로그인 제공자)는 외부 칸 맨 위에 둔다 — 아래에 두면 그 선이 서버 칸을 가로지른다
{
  for (const c of [0, 1, 2, 3]) {
    const cs = nodes.filter((n) => col(n) === c);
    const bary = (n) => { const ys = nodes.filter((m) => (m.to ?? []).includes(n.name) && pos.has(m.name)).map((m) => pos.get(m.name).y); return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Infinity; };
    const authTop = (n) => (nodes.some((m) => m.zone === "client" && (m.to ?? []).includes(n.name)) ? -1e6 : 0);
    const order = c === 0 ? cs : cs.map((n, i) => ({ n, i, b: bary(n) + authTop(n) })).sort((p, q) => p.b - q.b || p.i - q.i).map((p) => p.n);
    order.forEach(place);
    if (c === 1) {
      // 서버 칸이 짧으면 클라이언트 칸 가운데로 내린다 — 외부 칸 정렬 전에 해야 순서가 맞다
      const ps = [...pos.values()], cl = ps.filter((p) => p.c === 0), sv = ps.filter((p) => p.c === 1);
      if (cl.length && sv.length) {
        const ct = Math.max(...cl.map((p) => p.y + p.h)), st = Math.max(...sv.map((p) => p.y + p.h)) - Math.min(...sv.map((p) => p.y));
        const shift = Math.max(0, (ct - TOP - st) / 2);
        for (const p of sv) p.y += shift;
      }
    }
  }
}
const bottom = Math.max(...[...pos.values()].map((p) => p.y + p.h + 120), TOP + H) + 20;

// ── Excalidraw 요소 ──────────────────────────────────
const els = [];
let seed = 1;
const base = (o) => ({
  id: `e${els.length + 1}`, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid",
  strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null,
  seed: seed++, version: 1, versionNonce: seed * 7, isDeleted: false, boundElements: null, updated: 1, link: null, locked: false, ...o,
});
function textW(s, size) { return Math.max(...s.split("\n").map((l) => [...l].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? size : size * 0.56), 0))); }
const text = (x, y, s, o = {}) => {
  const size = o.fontSize ?? 24, w = textW(s, size), h = s.split("\n").length * size * 1.25;
  const left = o.align === "left" ? x : x - w / 2;
  els.push(base({ type: "text", x: left, y, width: w, height: h, text: s, originalText: s, fontSize: size, fontFamily: 5,
    textAlign: o.align ?? "center", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true, strokeColor: o.color ?? "#1e1e1e" }));
};
const line = (x1, y1, x2, y2, o = {}) => poly([[x1, y1], [x2, y2]], o);
const poly = (pts, o = {}) => els.push(base({
  type: "arrow", x: pts[0][0], y: pts[0][1], width: Math.abs(pts.at(-1)[0] - pts[0][0]), height: Math.abs(pts.at(-1)[1] - pts[0][1]), points: pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]]),
  startArrowhead: null, endArrowhead: o.head === false ? null : "arrow", startBinding: null, endBinding: null, lastCommittedPoint: null,
  strokeColor: o.color ?? "#1e1e1e", strokeStyle: o.dashed ? "dashed" : "solid", strokeWidth: o.width ?? 2, roundness: { type: 2 }, elbowed: false,
}));

function wrap(s, size, max) {
  const out = []; let cur = "";
  for (const w of s.split(" ")) { const t = cur ? cur + " " + w : w; if (cur && textW(t, size) > max) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
function belowLines(n) {
  const out = [];
  const tech = [n.stack, n.deploy].filter(Boolean).join(", ");
  if (tech && n.zone !== "external") out.push(tech); // 외부 노드는 배포처를 상자 안에 쓴다
  for (const r of n.risks ?? []) out.push(...wrap(`⚠ ${r}`, 20, W)); // 경고는 상자 폭에서 줄을 바꾼다
  return out;
}

// 칸 제목 · 점선
for (const [i, z] of ["client", "server", "external"].entries()) text(COLX[i] + W / 2, 40, ZONES[z], { fontSize: 28 });
for (const x of [(COLX[0] + W + COLX[1]) / 2, (COLX[1] + W + COLX[2]) / 2]) line(x, 30, x, bottom, { head: false, dashed: true });

// 노드
for (const n of nodes) {
  const { x, y, h } = pos.get(n.name), first = els.length;
  els.push(base({ type: "rectangle", x, y, width: W, height: h, roundness: { type: 3 } }));
  const inline = n.zone === "external";
  const label = inline ? [n.name + (n.deploy && n.deploy !== n.name ? ` · ${n.deploy}` : ""), (n.note ?? "").replace(/\n/g, " ")].filter(Boolean).join("\n") : [n.name, n.note].filter(Boolean).join("\n");
  const lines = label.split("\n").length, size = Math.min(26, (h - 24) / (lines * 1.25), 26 * (W - 28) / textW(label, 26)); // 넘치면 줄인다
  text(x + W / 2, y + h / 2 - (lines * size * 1.25) / 2, label, { fontSize: size });
  let by = y + h + 16;
  for (const l of belowLines(n)) {
    const risk = l !== [n.stack, n.deploy].filter(Boolean).join(", ");
    text(x + W / 2, by, l, { fontSize: risk ? 20 : 24, color: risk ? "#e03131" : "#1e1e1e" });
    by += 30;
  }
  for (const e of els.slice(first)) e.customData = { node: n.name }; // html 단계 보기에서 이 단계에 안 쓰는 노드를 옅게
}

// 연결 — 경계점 사이에 긋는다. client→server 는 화살촉 없이(손그림 지도와 같게)
const edges = [];
for (const n of nodes) for (const t of n.to ?? []) if (byName.has(t)) edges.push([n.name, t]);
const cy = (name) => pos.get(name).y + pos.get(name).h / 2;
// 한 상자 옆면에 붙는 선들은 출발·도착점을 나눠 둔다(상대 노드 높이 순) — 한 점에서 다발로 나가지 않게
const port = new Map(); // "a|b" -> [a 쪽 y, b 쪽 y]
{
  const sides = new Map(); // `${node}|${side}` -> [{ k, me, other }]
  const push = (key, v) => (sides.get(key) ?? sides.set(key, []).get(key)).push(v);
  for (const [a, b] of edges) {
    const pa = pos.get(a), pb = pos.get(b);
    if (pa.c === pb.c) continue;
    const ra = pb.c > pa.c ? "R" : "L", rb = ra === "R" ? "L" : "R";
    push(`${a}|${ra}`, { k: `${a}|${b}`, me: 0, other: b });
    push(`${b}|${rb}`, { k: `${a}|${b}`, me: 1, other: a });
  }
  for (const [key, list] of sides) {
    const nm = key.split("|")[0], p = pos.get(nm);
    list.sort((u, v) => cy(u.other) - cy(v.other));
    const gap = Math.min(28, (p.h - 30) / Math.max(1, list.length - 1));
    list.forEach((u, i) => {
      const cur = port.get(u.k) ?? [null, null];
      cur[u.me] = cy(nm) + (i - (list.length - 1) / 2) * gap;
      port.set(u.k, cur);
    });
  }
}
const anchor = (a, b) => {
  const pa = pos.get(a), pb = pos.get(b);
  const [pay, pby] = port.get(`${a}|${b}`) ?? [];
  const ay = pay ?? cy(a), by = pby ?? cy(b);
  if (pb.c > pa.c) return [pa.x + W, ay, pb.x, by];
  if (pb.c < pa.c) return [pa.x, ay, pb.x + W, by];
  return pb.y > pa.y ? [pa.x + W / 2, pa.y + pa.h, pb.x + W / 2, pb.y] : [pa.x + W / 2, pa.y, pb.x + W / 2, pb.y + pb.h];
};
// 서버 칸에서 상자·아래 글씨가 차지한 높이 구간 — 두 칸 건너는 선(클라이언트→로그인 제공자)은 그 사이 빈 길로 지난다
const busy = (c) => nodes.filter((n) => pos.get(n.name).c === c).map((n) => { const p = pos.get(n.name); return [p.y - 14, p.y + p.h + 16 + belowLines(n).length * 30 + 10]; });
const freeY = (c, want) => {
  const bs = busy(c); if (!bs.some(([t, b]) => want > t && want < b)) return want;
  const cands = bs.flatMap(([t, b]) => [t - 6, b + 6]).filter((y) => !bs.some(([t, b]) => y > t && y < b));
  return cands.sort((u, v) => Math.abs(u - want) - Math.abs(v - want))[0] ?? want;
};
if (!req) {
  for (const [a, b] of edges) {
    const [x1, y1, x2, y2] = anchor(a, b);
    const head = !(byName.get(a).zone === "client" && byName.get(b).zone === "server");
    const ca = pos.get(a).c, cb = pos.get(b).c;
    if (Math.abs(cb - ca) >= 2) {
      const yf = freeY(ca + 1, y2);
      const xa = COLX[ca + 1] - 40, xb = COLX[cb - 1] + W + 40;
      if (Math.abs(yf - y2) < 2 && Math.abs(yf - y1) < 2) line(x1, y1, x2, y2, { head }); else poly([[x1, y1], [xa, yf], [xb, yf], [x2, y2]], { head });
    } else line(x1, y1, x2, y2, { head });
  }
} else {
  // 리퀘스트 맵: 인프라 연결은 옅게, 요청 단계는 빨간 번호 화살표로
  for (const e of els) if (e.type === "rectangle") e.strokeColor = "#868e96";
  const seen = new Map();
  for (const [i, s] of req.steps.entries()) {
    if (!byName.has(s.from) || !byName.has(s.to)) continue;
    const first = els.length; // 이 단계에서 만든 요소에 단계 번호를 단다(html 단계 보기용)
    const key = [s.from, s.to].sort().join("|");
    const k = seen.get(key) ?? 0; seen.set(key, k + 1);
    const off = k === 0 ? -20 : 20 + (k - 1) * 40; // 같은 두 노드 사이 여러 단계는 위아래로 벌린다
    let [x1, y1, x2, y2] = anchor(s.from, s.to);
    if (x1 !== x2) { y1 += off; y2 += off; } else { x1 += off; x2 += off; }
    line(x1, y1, x2, y2, { color: "#e03131", width: 2 });
    // 두 칸을 건너는 선(클라이언트↔외부)은 번호를 가운데 칸 상자 위가 아니라 칸 사이 빈 곳에 둔다
    const span = Math.abs(pos.get(s.to).c - pos.get(s.from).c), t = span >= 2 ? (pos.get(s.to).c > pos.get(s.from).c ? 0.8 : 0.2) : 0.5;
    const mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * t;
    els.push(base({ type: "ellipse", x: mx - 17, y: my - 17, width: 34, height: 34, strokeColor: "#e03131", backgroundColor: "#ffffff" }));
    text(mx, my - 13, String(i + 1), { fontSize: 20, color: "#e03131" });
    for (const e of els.slice(first)) e.customData = { step: i + 1 };
  }
  // 범례: 단계 설명 (html 단계 보기에서는 숨기고 위쪽 한 줄로 보인다)
  const legendFrom = els.length;
  text(COLX[0] - 40, bottom + 30, req.name ?? "요청", { fontSize: 28, align: "left", color: "#e03131" });
  req.steps.forEach((s, i) => text(COLX[0] - 40, bottom + 80 + i * 34, `${i + 1}. ${s.from} → ${s.to}: ${s.label ?? ""}`, { fontSize: 22, align: "left" }));
  for (const e of els.slice(legendFrom)) e.customData = { legend: true };
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
const tag = (e) => { const c = e.customData ?? {}; return c.step ? ` data-step="${c.step}"` : c.node ? ` data-node="${esc(c.node)}"` : c.legend ? " data-legend" : ""; };
for (const e of els) {
  const at = svgParts.length;
  draw(e);
  if (svgParts.length > at && tag(e)) svgParts[at] = `<g${tag(e)}>${svgParts[at]}</g>`;
}
function draw(e) {
  const st = `stroke="${e.strokeColor}" stroke-width="${e.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (e.type === "rectangle") svgParts.push(`<path d="${roundRect(e.x, e.y, e.width, e.height)}" ${st}/>`);
  else if (e.type === "ellipse") svgParts.push(`<ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" fill="${e.backgroundColor}" stroke="none"/>` +
    [0, 1].map(() => `<ellipse cx="${j(e.x + e.width / 2)}" cy="${j(e.y + e.height / 2)}" rx="${e.width / 2 + rnd()}" ry="${e.height / 2 + rnd()}" ${st}/>`).join(""));
  else if (e.type === "arrow") {
    const P = e.points.map(([px, py]) => [e.x + px, e.y + py]);
    const [x1, y1] = P.at(-2), [x2, y2] = P.at(-1);
    if (e.strokeStyle === "dashed") { svgParts.push(`<path d="${stroke1(P[0][0], P[0][1], x2, y2)}" ${st} stroke-dasharray="10 10"/>`); return; }
    let d = P.slice(1).map((q, i) => rough(P[i][0], P[i][1], q[0], q[1])).join(" ");
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
// 리퀘스트 맵 html 은 단계 보기로 연다 — 한 번에 선 하나와 설명 한 줄만. ←/→(또는 화면 오른쪽·왼쪽 탭)로 이동, 0단계 = 전체.
// 주소 끝 #숫자 로 그 단계를 바로 연다 — #0 은 전체 보기(png 는 이걸 찍는다)
const stepper = !req ? "" : `
<div id="cap"></div>
<style>#cap{position:sticky;top:0;z-index:1;background:#fff;border-bottom:2px solid #e03131;padding:14px 20px;font:26px Hand,HandKo,sans-serif;color:#1e1e1e}
#cap b{color:#e03131;margin-right:12px}#cap small{color:#868e96;font-size:18px;margin-left:12px}
body.one [data-step],body.one [data-legend]{display:none}body.one [data-step].on{display:inline}
body.one [data-node]{opacity:.25}body.one [data-node].on{opacity:1}body.one [data-node].on path{stroke:#1e1e1e;stroke-width:3}</style>
<script>
const S = ${JSON.stringify(req.steps.map((s) => ({ from: s.from, to: s.to, label: s.label ?? "" }))).replace(/</g, "\\u003c")}, N = S.length, title = ${JSON.stringify(req.name ?? "요청").replace(/</g, "\\u003c")};
let i = /^#\\d+$/.test(location.hash) ? Math.min(N, +location.hash.slice(1)) : 1;
const cap = document.getElementById("cap"), t = (s) => { const d = document.createElement("span"); d.textContent = s; return d.innerHTML; };
function show() {
  document.body.classList.toggle("one", i > 0);
  document.querySelectorAll("[data-step]").forEach((g) => g.classList.toggle("on", +g.dataset.step === i));
  const s = S[i - 1];
  document.querySelectorAll("[data-node]").forEach((g) => g.classList.toggle("on", !!s && (g.dataset.node === s.from || g.dataset.node === s.to)));
  cap.innerHTML = i ? "<b>" + i + " / " + N + "</b>" + t(s.from + " → " + s.to + ": " + s.label) + "<small>← →</small>" : "<b>" + t(title) + "</b>전체 " + N + "단계<small>→ 로 한 단계씩</small>";
}
addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === " ") i = Math.min(N, i + 1); else if (e.key === "ArrowLeft") i = Math.max(0, i - 1); else return; e.preventDefault(); show(); });
addEventListener("click", (e) => { i = e.clientX > innerWidth / 2 ? Math.min(N, i + 1) : Math.max(0, i - 1); show(); });
addEventListener("DOMContentLoaded", show);
if (location.search.includes("print")) cap.style.display = "none"; // png 는 전체 그림만 찍는다
</script>`;
const html = `<!doctype html><meta charset="utf-8"><title>${basename(outBase)}</title>
<style>body{margin:0;background:#fff}svg{display:block;max-width:100%;height:auto}</style>
${stepper}${svg}`;
writeFileSync(`${outBase}.html`, html);
console.log(`${outBase}.excalidraw\n${outBase}.html`);

if (flag("--png")) {
  const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium"].find((c) => c.startsWith("/") ? existsSync(c) : true);
  const prof = mkdtempSync(join(tmpdir(), "infra-chrome-"));
  const w = maxX - minX, h = maxY - minY;
  try {
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${Math.round(w)},${Math.round(h)}`,
      "--virtual-time-budget=3000", `--user-data-dir=${prof}`, `--screenshot=${outBase}.png`, `file://${outBase}.html?print#0`], { stdio: "ignore", timeout: 90000 });
    console.log(`${outBase}.png`);
  } catch { console.error("png 실패 — html 을 브라우저로 열어 확인한다"); }
  rmSync(prof, { recursive: true, force: true });
}
if (!flag("--no-open") && !flag("--png")) execFile(process.platform === "darwin" ? "open" : "xdg-open", [`${outBase}.html`]);

function slug(s) { return s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "map"; }
