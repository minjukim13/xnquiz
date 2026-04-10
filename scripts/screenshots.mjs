/**
 * XN Quizzes — 페이지별 스크린샷 자동 캡처
 * 사용: node scripts/screenshots.mjs
 * 전제: npm run dev 가 localhost:5173 에서 실행 중이어야 함
 */

import { chromium } from '@playwright/test'
import { mkdir } from 'fs/promises'

const BASE = 'http://localhost:5176'
const OUT = './screenshots'
const VP = { width: 1440, height: 900 }

async function shot(page, filename) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${filename}.png` })
  console.log(`  ✓ ${filename}.png`)
}

async function waitReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(400)
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: VP })
  const page = await ctx.newPage()

  console.log('\n=== XN Quizzes 스크린샷 캡처 시작 ===\n')

  // ── 기능 01: 퀴즈 목록 (주차/차시 필터) ────────────────────────
  console.log('[기능 01] 퀴즈 목록 — 주차/차시 필터')
  await page.goto(`${BASE}/`)
  await waitReady(page)
  await shot(page, 'feature01_quiz_list')

  // ── 기능 02: 문제은행 — 난이도·그룹 분류 ─────────────────────
  console.log('[기능 02] 문제은행 — 난이도 메타데이터')
  await page.goto(`${BASE}/question-banks/bank1`)
  await waitReady(page)
  await shot(page, 'feature02_question_bank')

  // ── 기능 03: 문항 일괄 업로드 모달 ────────────────────────────
  console.log('[기능 03] 문항 일괄 업로드 모달')
  await page.goto(`${BASE}/question-banks/bank1`)
  await waitReady(page)
  try {
    await page.click('button:has-text("일괄 업로드")', { timeout: 3000 })
    await page.waitForTimeout(600)
    await shot(page, 'feature03_upload_modal')
  } catch {
    console.log('  ! 업로드 버튼 클릭 실패 — 페이지 상태로 저장')
    await shot(page, 'feature03_upload_modal')
  }

  // ── 기능 04: 문제은행 간 가져오기 모달 ────────────────────────
  console.log('[기능 04] 문제은행 간 문항 가져오기 모달')
  await page.goto(`${BASE}/question-banks`)
  await waitReady(page)
  try {
    // bank1 카드의 가져오기 버튼 클릭
    const importBtn = page.locator('button:has-text("가져오기")').first()
    await importBtn.click({ timeout: 3000 })
    await page.waitForTimeout(600)
    await shot(page, 'feature04_import_modal')
  } catch {
    console.log('  ! 가져오기 버튼 클릭 실패 — 목록 페이지로 저장')
    await shot(page, 'feature04_import_modal')
  }

  // ── 기능 05: 답안지 xlsx — 채점 대시보드 ──────────────────────
  console.log('[기능 05] 채점 대시보드 — 답안지/성적 다운로드 UI')
  await page.goto(`${BASE}/quiz/1/grade`)
  await waitReady(page)
  await shot(page, 'feature05_grading_dashboard')

  // ── 기능 06: 엑셀 일괄 채점 모달 ─────────────────────────────
  console.log('[기능 06] 엑셀 일괄 채점 모달')
  await page.goto(`${BASE}/quiz/1/grade`)
  await waitReady(page)
  try {
    // 수동채점 문항 선택 (서술형 문항 클릭)
    const essayQ = page.locator('[data-autograded="false"], .question-item').first()
    const essayExists = await essayQ.count()
    if (essayExists > 0) await essayQ.click()
    await page.waitForTimeout(400)

    const excelBtn = page.locator('button:has-text("엑셀 일괄 채점")').first()
    const btnExists = await excelBtn.count()
    if (btnExists > 0) {
      await excelBtn.click()
      await page.waitForTimeout(600)
    }
    await shot(page, 'feature06_excel_grading_modal')
  } catch {
    console.log('  ! 엑셀 채점 모달 클릭 실패 — 대시보드로 저장')
    await shot(page, 'feature06_excel_grading_modal')
  }

  // ── 보너스: 퀴즈 생성 / 통계 ──────────────────────────────────
  console.log('[보너스] 퀴즈 생성 화면')
  await page.goto(`${BASE}/quiz/new`)
  await waitReady(page)
  await shot(page, 'bonus_quiz_create')

  console.log('[보너스] 퀴즈 통계 화면')
  await page.goto(`${BASE}/quiz/2/stats`)
  await waitReady(page)
  await shot(page, 'bonus_quiz_stats')

  await browser.close()

  console.log(`\n=== 완료 — ${OUT}/ 폴더에 저장됨 ===`)
  console.log('\n다음 단계: HTML 보고서에 이미지 경로 반영')
  console.log('  feature01_quiz_list.png  → 기능 01 슬라이드')
  console.log('  feature02_question_bank.png  → 기능 02 슬라이드')
  console.log('  feature03_upload_modal.png   → 기능 03 슬라이드')
  console.log('  feature04_import_modal.png   → 기능 04 슬라이드')
  console.log('  feature05_grading_dashboard.png → 기능 05 슬라이드')
  console.log('  feature06_excel_grading_modal.png → 기능 06 슬라이드')
}

main().catch(e => {
  console.error('\n오류 발생:', e.message)
  console.error('dev 서버가 localhost:5173 에서 실행 중인지 확인하세요')
  process.exit(1)
})
