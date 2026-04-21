/**
 * XN Quizzes 구현현황 보고서 업데이트 스크립트
 *
 * 1. 기존 HTML의 모든 슬라이드 내 스크린샷 이미지를 새로운 캡처로 교체
 * 2. 표지 슬라이드 뒤에 "Claude 기반 개발 플로우" 슬라이드 삽입
 * 3. 표지 날짜 업데이트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const screenshotDir = path.join(rootDir, 'screenshots');
const htmlPath = path.join(rootDir, 'XNQuizzes_구현현황_보고.html');

function toBase64(filename) {
  const filePath = path.join(screenshotDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  WARNING: ${filename} not found`);
    return null;
  }
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// ── 슬라이드별 스크린샷 매핑 ──
// 슬라이드 식별자 → 교체할 이미지 파일명 (순서대로 매핑)
const slideScreenshotMap = {
  '기능 01': ['01_quiz_list.png'],
  '기능 02': ['08_question_bank_detail.png'],
  '기능 03': ['modal_bulk_upload.png'],
  '기능 04': ['modal_import.png'],
  // 기능05는 multi-panel이므로 별도 처리
  '기능 06': ['modal_excel_grading.png'],
  '구현 완료 · 문제은행': ['07_question_bank_list.png'],
  '구현 완료 · 채점·성적·재응시': null, // 여러개라 별도 처리
};

// ── Claude 개발 플로우 슬라이드 HTML ──
const flowSlideHTML = `
  <!-- ── 슬라이드: Claude 기반 개발 프로세스 ── -->
  <div class="slide" style="aspect-ratio: unset; min-height: 660px;">
    <div class="slide-header">
      <div class="slide-header-left">
        <span class="slide-number">Process · AI 기반 개발 프로세스</span>
        <span class="slide-title">Claude Code 기반 병렬 개발 플로우</span>
        <span class="slide-desc">역할별 에이전트를 활용한 기획-구현-검증 동시 진행 방식으로, 기획서 작성과 프로토타입 구현을 병렬로 수행</span>
      </div>
      <span class="req-badge indigo">AI-Assisted Development</span>
    </div>

    <div class="slide-body full" style="padding: 20px 36px 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto;">

      <!-- 플로우 다이어그램 -->
      <div style="display: flex; align-items: stretch; gap: 12px; flex-wrap: nowrap;">
        <!-- Step 1 -->
        <div style="flex: 1; background: linear-gradient(135deg, #eef2ff, #e0e7ff); border: 1px solid #c7d2fe; border-radius: 10px; padding: 14px 16px; min-width: 0;">
          <div style="font-size: 0.6em; font-weight: 800; color: #4f46e5; margin-bottom: 6px; letter-spacing: 0.08em;">STEP 1</div>
          <div style="font-size: 0.82em; font-weight: 700; color: #1e1b4b; margin-bottom: 6px;">요구사항 분석</div>
          <div style="font-size: 0.68em; color: #4338ca; line-height: 1.5;">
            고객사 요구사항 정의서 기반<br>
            기능 목록 도출 및 우선순위화<br>
            Canvas 오픈소스 분석
          </div>
        </div>
        <div style="display: flex; align-items: center; color: #a5b4fc; font-size: 1.2em;">→</div>
        <!-- Step 2 -->
        <div style="flex: 1.3; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; min-width: 0;">
          <div style="font-size: 0.6em; font-weight: 800; color: #16a34a; margin-bottom: 6px; letter-spacing: 0.08em;">STEP 2 · 병렬 수행</div>
          <div style="font-size: 0.82em; font-weight: 700; color: #14532d; margin-bottom: 6px;">에이전트 기반 병렬 작업</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 0.63em; color: #166534; line-height: 1.45;">
            <div style="background: rgba(255,255,255,0.7); border-radius: 5px; padding: 4px 6px;">
              <strong>PM1 디자인</strong><br>UI/UX 검토 보고서
            </div>
            <div style="background: rgba(255,255,255,0.7); border-radius: 5px; padding: 4px 6px;">
              <strong>PM2 기획</strong><br>기획 검토 보고서
            </div>
            <div style="background: rgba(255,255,255,0.7); border-radius: 5px; padding: 4px 6px;">
              <strong>PM3 개발</strong><br>개발 검토 보고서
            </div>
            <div style="background: rgba(255,255,255,0.7); border-radius: 5px; padding: 4px 6px;">
              <strong>PM4 QA</strong><br>테스트 보고서
            </div>
          </div>
          <div style="margin-top: 6px; font-size: 0.63em; color: #166534; background: rgba(255,255,255,0.7); border-radius: 5px; padding: 4px 6px; text-align: center;">
            <strong>프로토타입 구현</strong> — 위 보고서 작업과 동시 진행
          </div>
        </div>
        <div style="display: flex; align-items: center; color: #a5b4fc; font-size: 1.2em;">→</div>
        <!-- Step 3 -->
        <div style="flex: 1; background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; min-width: 0;">
          <div style="font-size: 0.6em; font-weight: 800; color: #a16207; margin-bottom: 6px; letter-spacing: 0.08em;">STEP 3</div>
          <div style="font-size: 0.82em; font-weight: 700; color: #713f12; margin-bottom: 6px;">Gap 분석 및 보완</div>
          <div style="font-size: 0.68em; color: #854d0e; line-height: 1.5;">
            Canvas vs XN퀴즈 갭 분석<br>
            미반영 기능 식별 및 구현<br>
            PD 논의 후 정책 결정
          </div>
        </div>
        <div style="display: flex; align-items: center; color: #a5b4fc; font-size: 1.2em;">→</div>
        <!-- Step 4 -->
        <div style="flex: 1; background: linear-gradient(135deg, #fff7ed, #ffedd5); border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 16px; min-width: 0;">
          <div style="font-size: 0.6em; font-weight: 800; color: #c2410c; margin-bottom: 6px; letter-spacing: 0.08em;">STEP 4 · 현재</div>
          <div style="font-size: 0.82em; font-weight: 700; color: #7c2d12; margin-bottom: 6px;">테스트 및 디테일</div>
          <div style="font-size: 0.68em; color: #9a3412; line-height: 1.5;">
            기능/성능/보안 테스트<br>
            디테일 보완 및 수정<br>
            최종 스펙 문서 작성 예정
          </div>
        </div>
      </div>

      <!-- 핵심 포인트 3단 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <!-- 포인트 1 -->
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px;">
          <div style="font-size: 0.65em; font-weight: 800; color: #4f46e5; margin-bottom: 8px; letter-spacing: 0.06em;">병렬 에이전트 활용</div>
          <div class="point-list">
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">1</div>
              <span class="point-text" style="font-size: 0.68em;">역할별 에이전트(디자인, 기획, 개발, QA)를 <strong>병렬로 실행</strong></span>
            </div>
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">2</div>
              <span class="point-text" style="font-size: 0.68em;">보고서 작성과 <strong>구현을 동시 진행</strong>하여 효율 극대화</span>
            </div>
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">3</div>
              <span class="point-text" style="font-size: 0.68em;">총 커밋 <strong>179건</strong>, 7개 주요 페이지 + 13개 컴포넌트</span>
            </div>
          </div>
        </div>
        <!-- 포인트 2 -->
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px;">
          <div style="font-size: 0.65em; font-weight: 800; color: #4f46e5; margin-bottom: 8px; letter-spacing: 0.06em;">구현 범위 및 방식</div>
          <div class="point-list">
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">1</div>
              <span class="point-text" style="font-size: 0.68em;"><strong>Canvas 오픈소스</strong> 바탕 퀴즈 필수 기능 전체 구현</span>
            </div>
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">2</div>
              <span class="point-text" style="font-size: 0.68em;">고객사 <strong>요구사항 17건 전 항목 반영</strong></span>
            </div>
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">3</div>
              <span class="point-text" style="font-size: 0.68em;">Canvas vs XN퀴즈 <strong>Gap 분석</strong> 후 미반영 기능 추가 구현 중</span>
            </div>
          </div>
        </div>
        <!-- 포인트 3 -->
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px;">
          <div style="font-size: 0.65em; font-weight: 800; color: #4f46e5; margin-bottom: 8px; letter-spacing: 0.06em;">PD 논의 및 다음 단계</div>
          <div class="point-list">
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">1</div>
              <span class="point-text" style="font-size: 0.68em;">논의가 필요한 부분은 PD와 협의 후 결정 — <a href="https://xinics.atlassian.net/wiki/spaces/XP2/pages/4979851467" target="_blank" style="color: #4f46e5; text-decoration: underline;">논의 내역</a></span>
            </div>
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">4</div>
              <span class="point-text" style="font-size: 0.68em;">기능/성능/보안 <strong>테스트 진행 예정</strong></span>
            </div>
            <div class="point-item" style="border: none; padding: 3px 0; background: none;">
              <div class="point-dot" style="width: 18px; height: 18px; font-size: 0.6em;">5</div>
              <span class="point-text" style="font-size: 0.68em;">테스트 완료 후 <strong>최종 스펙 문서</strong> 작성 예정<br><span style="font-size:0.9em; color: #64748b;">(구현 중 스펙 변경 다수 → 최종 정리 예정)</span></span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
`;

// ── 메인 로직 ──
let html = fs.readFileSync(htmlPath, 'utf-8');

// 1. 표지 날짜 업데이트
html = html.replace('INTERNAL REVIEW · 2026.04.10', 'INTERNAL REVIEW · 2026.04.16');

// 2. 표지 슬라이드 뒤에 플로우 슬라이드 삽입
// 표지 슬라이드 닫힘 </div> 직후, 다음 슬라이드 시작 전에 삽입
const coverEndMarker = '<!-- ── 슬라이드: 전체 요구사항 현황 참조 ── -->';
if (html.includes(coverEndMarker)) {
  html = html.replace(coverEndMarker, flowSlideHTML + '\n\n  ' + coverEndMarker);
  console.log('OK: 플로우 슬라이드 삽입 완료');
} else {
  console.warn('WARNING: 표지 이후 삽입 지점 못 찾음 - 수동으로 대응 필요');
}

// 3. 각 슬라이드의 스크린샷 이미지 교체
// data:image/png;base64,... 패턴을 해당 슬라이드 영역 내에서 교체
function replaceScreenshotInSlide(html, slideIdentifier, newImageFile) {
  const b64 = toBase64(newImageFile);
  if (!b64) return html;

  // 슬라이드 식별자를 포함하는 영역을 찾아서 그 안의 첫 번째 base64 이미지를 교체
  const identifierIdx = html.indexOf(slideIdentifier);
  if (identifierIdx === -1) {
    console.warn(`  WARNING: "${slideIdentifier}" 슬라이드 못 찾음`);
    return html;
  }

  // 식별자 이후 첫 번째 img src="data:image/png;base64,..." 교체
  const imgPattern = /src="data:image\/png;base64,[^"]+"/;
  const afterIdentifier = html.substring(identifierIdx);
  const match = afterIdentifier.match(imgPattern);
  if (match) {
    const replacement = `src="${b64}"`;
    const replaceIdx = identifierIdx + afterIdentifier.indexOf(match[0]);
    html = html.substring(0, replaceIdx) + replacement + html.substring(replaceIdx + match[0].length);
    console.log(`  OK: "${slideIdentifier}" → ${newImageFile}`);
  } else {
    console.warn(`  WARNING: "${slideIdentifier}" 영역에 img 없음`);
  }
  return html;
}

console.log('\n스크린샷 교체 시작...');

// 기능01: 퀴즈 목록
html = replaceScreenshotInSlide(html, '기능 01 · 제출물·목록 관리', '01_quiz_list.png');

// 기능02: 문제은행 난이도
html = replaceScreenshotInSlide(html, '기능 02 · 문제은행', '08_question_bank_detail.png');

// 기능03: 엑셀 업로드
html = replaceScreenshotInSlide(html, '기능 03 · 문항 등록 효율화', 'modal_bulk_upload.png');

// 기능04: 문제은행 간 복사
html = replaceScreenshotInSlide(html, '기능 04 · 문항 재사용', 'modal_import.png');

// 기능05: 다운로드 - 여러 패널이 있으므로 첫 번째 이미지 교체
html = replaceScreenshotInSlide(html, '기능 05 · 출력 및 문서화', '06_quiz_stats.png');

// 기능06: 엑셀 채점
html = replaceScreenshotInSlide(html, '기능 06 · 채점·성적', 'modal_excel_grading.png');

// 구현완료 - 문제은행
html = replaceScreenshotInSlide(html, '구현 완료 · 문제은행', '07_question_bank_list.png');

// 구현완료 - 채점·성적·재응시 (첫 번째)
html = replaceScreenshotInSlide(html, '구현 완료 · 채점·성적·재응시', '05_grading_dashboard.png');

// 구현완료 - 채점·성적·재응시 (두 번째) - 같은 식별자 두 번째 등장
// 두 번째는 부분점수 관련이므로 채점 대시보드의 다른 뷰 사용
const firstOccurrence = html.indexOf('구현 완료 · 채점·성적·재응시');
if (firstOccurrence !== -1) {
  const secondOccurrence = html.indexOf('구현 완료 · 채점·성적·재응시', firstOccurrence + 50);
  if (secondOccurrence !== -1) {
    const b64 = toBase64('05b_grading_detail.png');
    if (b64) {
      const imgPattern = /src="data:image\/png;base64,[^"]+"/;
      const after = html.substring(secondOccurrence);
      const match = after.match(imgPattern);
      if (match) {
        const replacement = `src="${b64}"`;
        const replaceIdx = secondOccurrence + after.indexOf(match[0]);
        html = html.substring(0, replaceIdx) + replacement + html.substring(replaceIdx + match[0].length);
        console.log('  OK: "구현 완료 · 채점·성적·재응시 (2nd)" → 05b_grading_detail.png');
      }
    }
  }
}

// 4. 저장
fs.writeFileSync(htmlPath, html, 'utf-8');
console.log(`\n완료! ${htmlPath} 업데이트됨`);
console.log(`파일 크기: ${(fs.statSync(htmlPath).size / 1024).toFixed(0)} KB`);
