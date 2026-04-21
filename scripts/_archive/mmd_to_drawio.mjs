#!/usr/bin/env node
/**
 * mmd_to_drawio.mjs — Mermaid → draw.io 변환기 v2
 *
 * npm run convert                  전체 변환 + 합본 전체 갱신
 * npm run convert -- --only 02     지정 페이지만 변환 (합본의 나머지 페이지 유지)
 * npm run convert -- --only 02,03  복수 지정
 *
 * 출력:
 *   docs/flowcharts/flow_0N_*.drawio              (페이지별 개별 파일)
 *   docs/flowcharts/XN_Quizzes_화면흐름도.drawio   (4페이지 합본)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '../docs/flowcharts');
const COMBINED_OUT = join(DIR, 'XN_Quizzes_화면흐름도.drawio');

const FILES = [
  { key: '01', file: 'flow_01_sitemap',      page: '01 사이트맵'   },
  { key: '02', file: 'flow_02_instructor',   page: '02 교수자흐름' },
  { key: '03', file: 'flow_03_student',      page: '03 학생응시'   },
  { key: '04', file: 'flow_04_questionbank', page: '04 문제은행'   },
];

// ── CLI 파싱: --only 02,03 ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const onlyKeys = onlyIdx >= 0
  ? new Set((args[onlyIdx + 1] || '').split(',').filter(Boolean))
  : null; // null = 전체 재생성

// ── 1. Mermaid 파서 ───────────────────────────────────────────────────────────

/** 멀티라인 백틱 문자열을 한 줄로 합침 */
function normalizeLines(content) {
  const result = [];
  let buf = '', inBt = false;
  for (const raw of content.split('\n')) {
    const btCount = (raw.match(/`/g) || []).length;
    if (!inBt) {
      buf = raw;
      if (btCount % 2 !== 0) inBt = true;
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

/** 노드 fragment 파싱 후 nodes Map에 등록, nodeId 반환 */
function addNodeFrag(frag, nodes, membership, currentSg) {
  frag = frag.trim();
  let m, id, label, shape;

  if      ((m = frag.match(/^(\w+)\(\[(.+)\]\)$/s))) [id, label, shape] = [m[1], m[2], 'stadium'];
  else if ((m = frag.match(/^(\w+)\{(.+)\}$/s)))     [id, label, shape] = [m[1], m[2], 'diamond'];
  else if ((m = frag.match(/^(\w+)\(([^)]+)\)$/s)))  [id, label, shape] = [m[1], m[2], 'rounded'];
  else if ((m = frag.match(/^(\w+)\[(.+)\]$/s)))     [id, label, shape] = [m[1], m[2], 'rect'];
  else if ((m = frag.match(/^(\w+)$/)))              [id, label, shape] = [m[1], m[1], 'rect'];
  else return null;

  if (!nodes.has(id)) nodes.set(id, { label: cleanLabel(label), shape });
  if (currentSg && !membership.has(id)) membership.set(id, currentSg);
  return id;
}

function parseMermaid(raw) {
  const titleM = raw.match(/^---\s*\ntitle:\s*(.+)\n---/);
  const title  = titleM ? titleM[1].trim() : '';
  const content = raw.replace(/^---[\s\S]*?---\s*\n/, '');

  const nodes      = new Map(); // id → { label, shape }
  const edges      = [];        // { from, to, label, dashed }
  const styles     = new Map(); // id → { fill, stroke, color }
  const subgraphs  = new Map(); // sgId → { title, members: Set }
  const membership = new Map(); // nodeId → sgId

  let currentSg = null;

  for (const line of normalizeLines(content)) {
    const t = line.trim();
    if (!t || t.startsWith('%%')) continue;
    if (/^(flowchart|graph)\s/.test(t)) continue;
    if (t.startsWith('direction')) continue;

    if (t === 'end') { currentSg = null; continue; }

    // subgraph
    const sgM = t.match(/^subgraph\s+(\w+)(?:\s+\[?"?([^"\]]+)"?\]?)?/);
    if (sgM) {
      currentSg = sgM[1];
      subgraphs.set(currentSg, { title: (sgM[2] || sgM[1]).trim(), members: new Set() });
      continue;
    }

    // style
    if (t.startsWith('style ')) {
      const sm = t.match(/^style\s+(\w+)\s+(.+)$/);
      if (sm) {
        const st = {};
        sm[2].split(',').forEach(p => {
          const ci = p.indexOf(':');
          if (ci > -1) st[p.slice(0, ci).trim()] = p.slice(ci + 1).trim();
        });
        styles.set(sm[1], st);
      }
      continue;
    }

    // edge  (-->  /  -.->  /  ==>)
    const em = t.match(/^(.*?)\s*(-->|-.->|==>)\s*(?:\|([^|]*)\|)?\s*(.+)$/s);
    if (em) {
      const fromId = addNodeFrag(em[1].trim(), nodes, membership, currentSg);
      const toId   = addNodeFrag(em[4].trim(), nodes, membership, currentSg);
      if (fromId && toId)
        edges.push({ from: fromId, to: toId, label: em[3] || '', dashed: em[2] === '-.->‌' });
      continue;
    }

    // 단독 노드
    addNodeFrag(t, nodes, membership, currentSg);
  }

  // membership → subgraph.members
  for (const [nodeId, sgId] of membership)
    if (subgraphs.has(sgId)) subgraphs.get(sgId).members.add(nodeId);

  return { nodes, edges, styles, subgraphs, membership, title };
}

// ── 2. 크기 계산 ──────────────────────────────────────────────────────────────

function calcNodeSize(label, shape) {
  const lines = String(label || '').split('\n');
  const maxW  = Math.max(...lines.map(l => {
    const k = (l.match(/[가-힣]/g) || []).length;
    return k * 13 + (l.length - k) * 8;
  }));
  const minW = shape === 'diamond' ? 180 : 220;
  return {
    w: Math.max(minW, maxW + 40),
    h: Math.max(shape === 'diamond' ? 80 : 50, lines.length * 20 + 24),
  };
}

// ── 3. 레이아웃 ───────────────────────────────────────────────────────────────

const COL_W  = 320;
const ROW_H  = 140;
const SG_PAD = 30; // 서브그래프 내부 패딩

function bfsLevels(ids, edges) {
  const adj   = new Map(ids.map(k => [k, []]));
  const inDeg = new Map(ids.map(k => [k, 0]));

  for (const { from, to } of edges) {
    if (adj.has(from) && adj.has(to)) {
      adj.get(from).push(to);
      inDeg.set(to, (inDeg.get(to) || 0) + 1);
    }
  }

  const level = new Map();
  const roots = ids.filter(id => (inDeg.get(id) || 0) === 0);
  roots.forEach(id => level.set(id, 0));
  const queue = [...roots]; let qi = 0;
  while (qi < queue.length) {
    const lv = level.get(queue[qi]);
    for (const next of adj.get(queue[qi++]) || [])
      if (!level.has(next)) { level.set(next, lv + 1); queue.push(next); }
  }
  ids.forEach(id => { if (!level.has(id)) level.set(id, 0); });

  const byLevel = new Map();
  for (const [id, lv] of level) {
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push(id);
  }
  return byLevel;
}

/**
 * 레이아웃 계산
 * @returns {
 *   positions:        Map<nodeId, {x,y}>   — 최상위 노드 절대 좌표
 *   sgPositions:      Map<sgId, {x,y,w,h}> — 서브그래프 컨테이너
 *   sgMemberPos:      Map<nodeId, {x,y}>   — 서브그래프 내부 상대 좌표
 *   mainBottom:       number               — 메인 그래프 최하단 y
 * }
 */
function computeLayout(nodes, edges, subgraphs, membership) {
  // ── 메인 레이아웃 (서브그래프 멤버 제외) ──────────────────────────────────
  const mainIds  = [...nodes.keys()].filter(id => !membership.has(id));
  const mainEdges = edges.filter(e => mainIds.includes(e.from) && mainIds.includes(e.to));
  const byLevel   = bfsLevels(mainIds, mainEdges);

  const positions = new Map();
  let maxY = 0;

  for (const [lv, ids] of byLevel) {
    const x = 60 + lv * COL_W;
    ids.forEach((id, i) => {
      const y = 60 + i * ROW_H;
      positions.set(id, { x, y });
      maxY = Math.max(maxY, y + ROW_H);
    });
  }

  // ── 서브그래프 내부 레이아웃 ───────────────────────────────────────────────
  const sgPositions  = new Map();
  const sgMemberPos  = new Map();
  let sgY = maxY + 60;

  for (const [sgId, sg] of subgraphs) {
    const memberIds  = [...sg.members];
    if (memberIds.length === 0) continue;

    const sgEdges = edges.filter(e =>
      memberIds.includes(e.from) && memberIds.includes(e.to)
    );
    const memberByLevel = bfsLevels(memberIds, sgEdges);
    const HEADER = 30; // swimlane 헤더 높이

    let maxMemberX = 0, maxMemberY = 0;
    for (const [lv, ids] of memberByLevel) {
      ids.forEach((id, i) => {
        const node     = nodes.get(id) || { label: id, shape: 'rect' };
        const { w, h } = calcNodeSize(node.label, node.shape);
        const rx = SG_PAD + lv * (w + 20);
        const ry = HEADER + SG_PAD + i * (h + 16);
        sgMemberPos.set(id, { x: rx, y: ry });
        maxMemberX = Math.max(maxMemberX, rx + w);
        maxMemberY = Math.max(maxMemberY, ry + h);
      });
    }

    const sgW = maxMemberX + SG_PAD;
    const sgH = maxMemberY + SG_PAD;
    sgPositions.set(sgId, { x: 60, y: sgY, w: sgW, h: sgH });
    sgY += sgH + 40;
  }

  return { positions, sgPositions, sgMemberPos, mainBottom: maxY };
}

// ── 4. XML 생성 ────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '&#xa;');
}

function nodeStyle(shape, st) {
  const fill   = st?.fill   || '#ffffff';
  const stroke = st?.stroke || '#999999';
  const color  = st?.color  || '#000000';
  const font   = 'fontFamily=Pretendard,sans-serif;fontSize=12;align=center;whiteSpace=wrap;html=1;';
  const base   = `fillColor=${fill};strokeColor=${stroke};fontColor=${color};${font}`;
  switch (shape) {
    case 'stadium': return `ellipse;${base}`;
    case 'diamond': return `rhombus;verticalLabelPosition=middle;${base}`;
    case 'rounded': return `rounded=1;arcSize=50;${base}`;
    default:        return `rounded=1;arcSize=10;${base}`;
  }
}

function subgraphStyle(st) {
  const fill   = st?.fill   || '#f5f5f5';
  const stroke = st?.stroke || '#666666';
  const color  = st?.color  || '#333333';
  return `swimlane;fontStyle=1;startSize=30;align=left;fillColor=${fill};strokeColor=${stroke};fontColor=${color};fontFamily=Pretendard,sans-serif;fontSize=12;`;
}

function generateXml(nodes, edges, styles, subgraphs, membership, layout) {
  const { positions, sgPositions, sgMemberPos } = layout;
  let cid = 2;
  const nmap = new Map(); // mermaidId → mxCell id
  let cells = '';

  // 서브그래프 컨테이너 먼저 등록 (자식 노드가 parent 참조 가능하도록)
  for (const [sgId] of subgraphs) {
    const cellId = `sg${cid++}`;
    nmap.set(sgId, cellId);
  }

  // 일반 노드 등록
  for (const [id] of nodes) {
    if (!nmap.has(id)) nmap.set(id, `n${cid++}`);
  }

  // 엣지 (렌더링 순서: 아래)
  for (const { from, to, label, dashed } of edges) {
    const src = nmap.get(from);
    const tgt = nmap.get(to);
    if (!src || !tgt) continue;
    const eId  = `e${cid++}`;
    const dash = dashed ? 'dashed=1;' : '';
    const est  = `edgeStyle=orthogonalEdgeStyle;rounded=1;${dash}fontSize=11;fontFamily=Pretendard,sans-serif;labelBackgroundColor=#FFFFFF;labelBorderColor=#CCCCCC;`;
    cells += `    <mxCell id="${eId}" value="${esc(label)}" style="${est}" edge="1" source="${src}" target="${tgt}" parent="1">\n      <mxGeometry relative="1" as="geometry" />\n    </mxCell>\n`;
  }

  // 서브그래프 컨테이너
  for (const [sgId, sg] of subgraphs) {
    const pos = sgPositions.get(sgId);
    if (!pos) continue;
    const cId = nmap.get(sgId);
    const st  = styles.get(sgId);
    cells += `    <mxCell id="${cId}" value="${esc(sg.title)}" style="${subgraphStyle(st)}" vertex="1" parent="1">\n      <mxGeometry x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" as="geometry" />\n    </mxCell>\n`;

    // 서브그래프 내부 노드
    for (const memberId of sg.members) {
      const mCid  = nmap.get(memberId);
      const rpos  = sgMemberPos.get(memberId) || { x: 10, y: 40 };
      const node  = nodes.get(memberId) || { label: memberId, shape: 'rect' };
      const { w, h } = calcNodeSize(node.label, node.shape);
      const mst   = styles.get(memberId);
      cells += `    <mxCell id="${mCid}" value="${esc(node.label)}" style="${nodeStyle(node.shape, mst)}" vertex="1" parent="${cId}">\n      <mxGeometry x="${rpos.x}" y="${rpos.y}" width="${w}" height="${h}" as="geometry" />\n    </mxCell>\n`;
    }
  }

  // 메인 노드 (서브그래프 멤버 제외)
  for (const [id, node] of nodes) {
    if (membership.has(id)) continue;
    const cId = nmap.get(id);
    const pos = positions.get(id) || { x: 0, y: 0 };
    const { w, h } = calcNodeSize(node.label, node.shape);
    const st = styles.get(id);
    cells += `    <mxCell id="${cId}" value="${esc(node.label)}" style="${nodeStyle(node.shape, st)}" vertex="1" parent="1">\n      <mxGeometry x="${pos.x}" y="${pos.y}" width="${w}" height="${h}" as="geometry" />\n    </mxCell>\n`;
  }

  return `<mxGraphModel dx="2400" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="3300" pageHeight="1169" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
${cells}  </root>
</mxGraphModel>`;
}

// ── 5. 합본 파일 관리 ─────────────────────────────────────────────────────────

/** 기존 합본 파일에서 페이지명 → XML 내용 Map 추출 */
function parseExistingPages(filePath) {
  const map = new Map();
  if (!existsSync(filePath)) return map;
  const content = readFileSync(filePath, 'utf-8');
  for (const m of content.matchAll(/<diagram[^>]*\sname="([^"]*)"[^>]*>([\s\S]*?)<\/diagram>/g))
    map.set(m[1], m[2].trim());
  return map;
}

function buildCombinedDrawio(pages) {
  const diagrams = pages.map(({ name, id, xml }) =>
    `  <diagram name="${esc(name)}" id="${id}">\n    ${xml}\n  </diagram>`
  ).join('\n');
  return `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="mmd-to-drawio" version="21.0.0" type="device">\n${diagrams}\n</mxfile>`;
}

// ── 6. 실행 ───────────────────────────────────────────────────────────────────

const existingPages = parseExistingPages(COMBINED_OUT);
let ok = 0;
const newPages = new Map(); // key → { name, id, xml }

for (let i = 0; i < FILES.length; i++) {
  const { key, file, page } = FILES[i];

  // --only 지정 시 해당 키가 없으면 기존 페이지 유지
  if (onlyKeys && !onlyKeys.has(key)) {
    const existXml = existingPages.get(page);
    if (existXml) {
      newPages.set(key, { name: page, id: `p0${i + 1}`, xml: existXml });
      console.log(`–  ${page}  (변경 없음 — 기존 유지)`);
    }
    continue;
  }

  try {
    const raw = readFileSync(join(DIR, `${file}.mmd`), 'utf-8');
    const { nodes, edges, styles, subgraphs, membership } = parseMermaid(raw);
    const layout = computeLayout(nodes, edges, subgraphs, membership);
    const xml    = generateXml(nodes, edges, styles, subgraphs, membership, layout);

    // 개별 파일 저장
    writeFileSync(join(DIR, `${file}.drawio`), xml, 'utf-8');
    const sgCount = subgraphs.size;
    console.log(`✓  ${file}.drawio  (노드 ${nodes.size}개, 엣지 ${edges.length}개, 서브그래프 ${sgCount}개)`);

    newPages.set(key, { name: page, id: `p0${i + 1}`, xml });
    ok++;
  } catch (e) {
    console.error(`✗  ${file}: ${e.message}`);
  }
}

// 합본 파일 조립 (FILES 순서 유지)
const orderedPages = FILES
  .map(({ key }) => newPages.get(key))
  .filter(Boolean);

if (orderedPages.length > 0) {
  writeFileSync(COMBINED_OUT, buildCombinedDrawio(orderedPages), 'utf-8');
  const updated = onlyKeys ? [...onlyKeys].join(', ') : '전체';
  console.log(`\n✓  XN_Quizzes_화면흐름도.drawio  갱신 (${updated})`);
}

console.log(`\n완료: ${ok}개 파일 변환`);
console.log(`저장 위치: docs/flowcharts/`);
