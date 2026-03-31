import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '../docs/flowcharts');

const PAGES = [
  { file: 'flow_01_sitemap',       name: '01. 전체 사이트맵' },
  { file: 'flow_02_instructor',    name: '02. 교수자 흐름' },
  { file: 'flow_03_student',       name: '03. 학생 응시 흐름' },
  { file: 'flow_04_questionbank',  name: '04. 문제은행 관리' },
];

let diagrams = '';
for (const { file, name } of PAGES) {
  const content = readFileSync(join(DIR, `${file}.drawio`), 'utf-8');

  // <mxfile> 래퍼가 있으면 내부 <mxGraphModel> 만 추출
  const inner = content.match(/<mxGraphModel[\s\S]*<\/mxGraphModel>/)?.[0]
              ?? content.trim();

  diagrams += `  <diagram name="${name}">\n    ${inner}\n  </diagram>\n`;
}

const merged = `<mxfile host="app.diagrams.net">\n${diagrams}</mxfile>`;
const outPath = join(DIR, 'XN_Quizzes_화면흐름도.drawio');
writeFileSync(outPath, merged, 'utf-8');
console.log('완료: XN_Quizzes_화면흐름도.drawio');
