#!/usr/bin/env node
/**
 * mmd_to_drawio.mjs
 * Mermaid 플로우차트 .mmd → draw.io 편집 가능 XML(.drawio) 변환기
 *
 * 사용법:
 *   node scripts/mmd_to_drawio.mjs          (또는 npm run convert)
 *
 * 출력:
 *   docs/flowcharts/flow_0N_*.drawio        (페이지별 개별 파일)
 *   docs/flowcharts/XN_Quizzes_화면흐름도.drawio  (4페이지 합본 — draw.io에서 바로 열기)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '../docs/flowcharts');
const COMBINED_OUT = join(DIR, 'XN_Quizzes_화면흐름도.drawio');

const FILES = [
  'flow_01_sitemap',
  'flow_02_instructor',
  'flow_03_student',
  'flow_04_questionbank',
];

// ── 1. Mermaid 파서 ────────────────────────────────────────────────────────

/** 멀티라인 백틱 문자열이 있는 라인을 한 줄로 합침 */
function normalizeLines(content) {
  const result = [];
  let buf = '';
  let inBt = false;

  for (const raw of content.split('\n')) {
    const btCount = (raw.match(/`/g) || []).length;
    if (!inBt) {
      buf = raw;
      if (btCount % 2 !== 0) { inBt = true; }
      else { result.push(buf); buf = ''; }
    } else {
      buf += ' ' + raw.trim();
      if (btCount % 2 !== 0) { inBt = false; result.push(buf); buf = ''; }
    }
  }
  if (buf) result.push(buf);
  return result;
}

function cleanLabel(s) {
  return s
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\*\*/g, '')
    .replace(/\\n/g, '\n')
    .replace(/`/g, '')
    .trim();
}

/** 노드 fragment 파싱: ID([..]) / ID{..} / ID(..) / ID[..] / ID */
function parseNodeFrag(frag, nodes) {
  frag = frag.trim();
  let m;

  // Stadium  ID([...])
  m = frag.match(/^(\w+)\(\[(.+)\]\)$/s);
  if (m) { if (!nodes.has(m[1])) nodes.set(m[1], { label: cleanLabel(m[2]), shape: 'stadium' }); return m[1]; }

  // Diamond  ID{...}
  m = frag.match(/^(\w+)\{(.+)\}$/s);
  if (m) { if (!nodes.has(m[1])) nodes.set(m[1], { label: cleanLabel(m[2]), shape: 'diamond' }); return m[1]; }

  // Rounded  ID(...)
  m = frag.match(/^(\w+)\(([^)]+)\)$/s);
  if (m) { if (!nodes.has(m[1])) nodes.set(m[1], { label: cleanLabel(m[2]), shape: 'rounded' }); return m[1]; }

  // Rectangle  ID[...]
  m = frag.match(/^(\w+)\[(.+)\]$/s);
  if (m) { if (!nodes.has(m[1])) nodes.set(m[1], { label: cleanLabel(m[2]), shape: 'rect' }); return m[1]; }

  // Plain ID
  m = frag.match(/^(\w+)$/);
  if (m) { if (!nodes.has(m[1])) nodes.set(m[1], { label: m[1], shape: 'rect' }); return m[1]; }

  return null;
}

function parseLine(line, nodes, edges, styles) {
  const t = line.trim();
  if (!t || t.startsWith('%%')) return;
  if (/^(flowchart|graph)\s/.test(t)) return;
  if (/^(subgraph|end|direction)\b/.test(t)) return;

  // style 정의
  if (t.startsWith('style ')) {
    const m = t.match(/^style\s+(\w+)\s+(.+)$/);
    if (m) {
      const st = {};
      m[2].split(',').forEach(p => {
        const ci = p.indexOf(':');
        if (ci > -1) st[p.slice(0, ci).trim()] = p.slice(ci + 1).trim();
      });
      styles.set(m[1], st);
    }
    return;
  }

  // 엣지 라인 파싱  (-->  / -.->  / ==>)
  const em = t.match(/^(.*?)\s*(-->|-.->|==>)\s*(?:\|([^|]*)\|)?\s*(.+)$/s);
  if (em) {
    const fromId = parseNodeFrag(em[1].trim(), nodes);
    const toId   = parseNodeFrag(em[4].trim(), nodes);
    if (fromId && toId) edges.push({ from: fromId, to: toId, label: em[3] || '' });
    return;
  }

  // 단독 노드 정의
  parseNodeFrag(t, nodes);
}

function parseFrontmatterTitle(raw) {
  const m = raw.match(/^---\s*\ntitle:\s*(.+)\n---/);
  return m ? m[1].trim() : '';
}

function parseMermaid(raw) {
  const title   = parseFrontmatterTitle(raw);
  const content = raw.replace(/^---[\s\S]*?---\s*\n/, '');
  const nodes  = new Map();
  const edges  = [];
  const styles = new Map();
  for (const line of normalizeLines(content)) parseLine(line, nodes, edges, styles);
  return { nodes, edges, styles, title };
}

// ── 2. 레이아웃 ────────────────────────────────────────────────────────────

function computeLayout(nodes, edges) {
  const adj   = new Map([...nodes.keys()].map(k => [k, []]));
  const inDeg = new Map([...nodes.keys()].map(k => [k, 0]));

  for (const { from, to } of edges) {
    if (adj.has(from) && adj.has(to)) {
      adj.get(from).push(to);
      inDeg.set(to, inDeg.get(to) + 1);
    }
  }

  const level = new Map();
  const queue = [...nodes.keys()].filter(id => inDeg.get(id) === 0);
  queue.forEach(id => level.set(id, 0));

  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    const lv  = level.get(cur);
    for (const next of adj.get(cur) || []) {
      if (!level.has(next)) { level.set(next, lv + 1); queue.push(next); }
    }
  }
  for (const id of nodes.keys()) if (!level.has(id)) level.set(id, 0);

  const byLevel = new Map();
  for (const [id, lv] of level) {
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push(id);
  }

  // 수평 레이아웃: 레벨 = X축(좌→우), 같은 레벨 노드 = Y축(위→아래)
  const COL_W = 320;  // 레벨 간 가로 간격 (열 너비)
  const ROW_H = 140;  // 같은 레벨 노드 간 세로 간격 (행 높이)
  const OFFSET_X = 60;
  const OFFSET_Y = 60;

  const positions = new Map();
  for (const [lv, ids] of byLevel) {
    const totalH = ids.length * ROW_H;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: Math.round(lv * COL_W + OFFSET_X),
        y: Math.round(-totalH / 2 + i * ROW_H + ROW_H / 2 + 600 + OFFSET_Y),
      });
    });
  }
  return positions;
}

// ── 3. XML 생성 ────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#xa;');
}

function nodeStyle(shape, st) {
  const fill   = st?.fill   || '#ffffff';
  const stroke = st?.stroke || '#999999';
  const color  = st?.color  || '#000000';
  const font   = 'fontFamily=Pretendard,sans-serif;fontSize=12;align=center;whiteSpace=wrap;html=1;';
  const base   = `fillColor=${fill};strokeColor=${stroke};fontColor=${color};${font}`;

  switch (shape) {
    case 'stadium':  return `ellipse;${base}`;
    case 'diamond':  return `rhombus;verticalLabelPosition=middle;${base}`;
    case 'rounded':  return `rounded=1;arcSize=50;${base}`;
    default:         return `rounded=1;arcSize=10;${base}`;
  }
}

/** 라벨 텍스트 기준으로 노드 너비/높이 계산 */
function calcNodeSize(label, shape) {
  const lines = label.split('\n');
  // 한글 1자 ≈ 12px, 영문/숫자 1자 ≈ 7px, 양쪽 패딩 40px
  const maxLineW = Math.max(...lines.map(l => {
    const korean = (l.match(/[가-힣]/g) || []).length;
    const other  = l.length - korean;
    return korean * 13 + other * 8;
  }));
  const minW = shape === 'diamond' ? 180 : 220;
  const w = Math.max(minW, maxLineW + 40);
  // 줄당 높이 20px, 상하 패딩 24px
  const h = Math.max(shape === 'diamond' ? 80 : 50, lines.length * 20 + 24);
  return { w, h };
}

function generateXml(nodes, edges, styles, positions) {
  let cid = 2;
  const nmap = new Map();
  let edgeCells = '';
  let nodeCells = '';

  // 노드 ID 먼저 등록 (엣지가 source/target 참조할 수 있도록)
  for (const [id] of nodes) {
    nmap.set(id, `n${cid++}`);
  }
  cid = 2 + nodes.size;

  // 엣지를 먼저 (렌더링 순서: 아래쪽)
  for (const { from, to, label } of edges) {
    const src = nmap.get(from);
    const tgt = nmap.get(to);
    if (!src || !tgt) continue;
    const eId = `e${cid++}`;
    const estyle = `edgeStyle=orthogonalEdgeStyle;rounded=1;fontSize=11;fontFamily=Pretendard,sans-serif;labelBackgroundColor=#FFFFFF;labelBorderColor=#CCCCCC;labelPosition=center;verticalLabelPosition=center;align=center;`;
    edgeCells += `    <mxCell id="${eId}" value="${esc(label)}" style="${estyle}" edge="1" source="${src}" target="${tgt}" parent="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>\n`;
  }

  // 노드를 나중에 (렌더링 순서: 위쪽 — 선 위에 표시)
  for (const [id, node] of nodes) {
    const cId = nmap.get(id);
    const pos = positions.get(id) || { x: 0, y: 0 };
    const { w, h } = calcNodeSize(node.label, node.shape);
    nodeCells += `    <mxCell id="${cId}" value="${esc(node.label)}" style="${nodeStyle(node.shape, styles.get(id))}" vertex="1" parent="1">
      <mxGeometry x="${pos.x}" y="${pos.y}" width="${w}" height="${h}" as="geometry" />
    </mxCell>\n`;
  }

  const cells = edgeCells + nodeCells;

  return `<mxGraphModel dx="2400" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="3300" pageHeight="1169" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
${cells}  </root>
</mxGraphModel>`;
}

// ── 4. 합본 파일 생성 ──────────────────────────────────────────────────────

/** 여러 페이지를 하나의 .drawio 파일(mxfile)로 묶음 */
function generateCombinedDrawio(pages) {
  const diagrams = pages.map(({ name, id, xml }) =>
    `  <diagram name="${esc(name)}" id="${id}">\n    ${xml}\n  </diagram>`
  ).join('\n');

  return `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="mmd-to-drawio" version="21.0.0" type="device">
${diagrams}
</mxfile>`;
}

// ── 5. 실행 ────────────────────────────────────────────────────────────────

const PAGE_NAMES = [
  '01 사이트맵',
  '02 교수자흐름',
  '03 학생응시',
  '04 문제은행',
];

let ok = 0;
const combinedPages = [];

for (let i = 0; i < FILES.length; i++) {
  const file = FILES[i];
  try {
    const raw = readFileSync(join(DIR, `${file}.mmd`), 'utf-8');
    const { nodes, edges, styles, title } = parseMermaid(raw);
    const positions = computeLayout(nodes, edges);
    const xml = generateXml(nodes, edges, styles, positions);

    // 개별 파일 저장
    writeFileSync(join(DIR, `${file}.drawio`), xml, 'utf-8');
    console.log(`✓  ${file}.drawio  (노드 ${nodes.size}개, 엣지 ${edges.length}개)`);

    // 합본용 페이지 누적
    combinedPages.push({ name: PAGE_NAMES[i] || file, id: `p0${i + 1}`, xml });
    ok++;
  } catch (e) {
    console.error(`✗  ${file}: ${e.message}`);
  }
}

// 합본 파일 저장
if (combinedPages.length > 0) {
  writeFileSync(COMBINED_OUT, generateCombinedDrawio(combinedPages), 'utf-8');
  console.log(`\n✓  XN_Quizzes_화면흐름도.drawio  (${combinedPages.length}페이지 합본)`);
}

console.log(`\n완료: ${ok}/${FILES.length} 파일 변환`);
console.log(`저장 위치: docs/flowcharts/`);
