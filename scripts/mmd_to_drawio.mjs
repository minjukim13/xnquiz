#!/usr/bin/env node
/**
 * mmd_to_drawio.mjs
 * Mermaid 플로우차트 .mmd → draw.io 편집 가능 XML(.drawio) 변환기
 * 사용법: node scripts/mmd_to_drawio.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '../docs/flowcharts');

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

function parseMermaid(raw) {
  const content = raw.replace(/^---[\s\S]*?---\s*\n/, '');
  const nodes  = new Map();
  const edges  = [];
  const styles = new Map();
  for (const line of normalizeLines(content)) parseLine(line, nodes, edges, styles);
  return { nodes, edges, styles };
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

  const W = 200, H = 80, HGAP = 50, VGAP = 70;
  const positions = new Map();
  for (const [lv, ids] of byLevel) {
    const totalW = ids.length * W + (ids.length - 1) * HGAP;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: Math.round(-totalW / 2 + i * (W + HGAP) + W / 2 + 600),
        y: Math.round(lv * (H + VGAP) + 40),
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
  const font   = 'fontFamily=Pretendard,sans-serif;fontSize=12;align=center;';
  const base   = `fillColor=${fill};strokeColor=${stroke};fontColor=${color};${font}`;

  switch (shape) {
    case 'stadium':  return `ellipse;${base}`;
    case 'diamond':  return `rhombus;verticalLabelPosition=middle;${base}`;
    case 'rounded':  return `rounded=1;arcSize=50;${base}`;
    default:         return `rounded=1;arcSize=10;${base}`;
  }
}

function generateXml(nodes, edges, styles, positions) {
  let cid = 2;
  const nmap = new Map();
  let cells = '';

  for (const [id, node] of nodes) {
    const cId = `n${cid++}`;
    nmap.set(id, cId);
    const pos = positions.get(id) || { x: 0, y: 0 };
    const isMultiline = node.label.includes('\n');
    const w = node.shape === 'diamond' ? 160 : 190;
    const h = isMultiline ? 90 : 60;
    cells += `    <mxCell id="${cId}" value="${esc(node.label)}" style="${nodeStyle(node.shape, styles.get(id))}" vertex="1" parent="1">
      <mxGeometry x="${pos.x}" y="${pos.y}" width="${w}" height="${h}" as="geometry" />
    </mxCell>\n`;
  }

  for (const { from, to, label } of edges) {
    const src = nmap.get(from);
    const tgt = nmap.get(to);
    if (!src || !tgt) continue;
    const eId = `e${cid++}`;
    const estyle = label
      ? 'edgeStyle=orthogonalEdgeStyle;rounded=1;fontSize=11;'
      : 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
    cells += `    <mxCell id="${eId}" value="${esc(label)}" style="${estyle}" edge="1" source="${src}" target="${tgt}" parent="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>\n`;
  }

  return `<mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
${cells}  </root>
</mxGraphModel>`;
}

// ── 4. 실행 ────────────────────────────────────────────────────────────────

let ok = 0;
for (const file of FILES) {
  try {
    const raw = readFileSync(join(DIR, `${file}.mmd`), 'utf-8');
    const { nodes, edges, styles } = parseMermaid(raw);
    const positions = computeLayout(nodes, edges);
    const xml = generateXml(nodes, edges, styles, positions);
    writeFileSync(join(DIR, `${file}.drawio`), xml, 'utf-8');
    console.log(`✓  ${file}.drawio  (노드 ${nodes.size}개, 엣지 ${edges.size}개)`);
    ok++;
  } catch (e) {
    console.error(`✗  ${file}: ${e.message}`);
  }
}
console.log(`\n완료: ${ok}/${FILES.length} 파일 변환`);
console.log(`저장 위치: docs/flowcharts/*.drawio`);
console.log(`\ndraw.io에서 열기:`);
console.log(`  파일 → 열기 → 이 장치에서 → .drawio 파일 선택`);
