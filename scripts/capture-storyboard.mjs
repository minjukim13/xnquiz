// 퀴즈 생성 화면 스토리보드 자동 캡쳐 스크립트
// 사용법:
//   1) 다른 터미널에서 `npm run dev` 로 Vite 가 5173 포트에 떠 있는 상태
//   2) `npm run capture-storyboard`
//   3) 출력 폴더에 PNG 22장이 떨어집니다 (기본: ~/Downloads/QUIZ참고/스토리보드_캡쳐)

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const HOME = process.env.USERPROFILE || process.env.HOME || '.'
const OUT_DIR = process.env.OUT_DIR || resolve(HOME, 'Downloads/QUIZ참고/스토리보드_캡쳐')
const VIEWPORT = { width: 1440, height: 900 }
const ACTION_TIMEOUT = 4000

await mkdir(OUT_DIR, { recursive: true })

console.log(`[capture] 대상 URL : ${BASE_URL}`)
console.log(`[capture] 저장 폴더: ${OUT_DIR}`)

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
context.setDefaultTimeout(ACTION_TIMEOUT)
const page = await context.newPage()

const results = { ok: [], fail: [] }

async function shot(name, opts = {}) {
  const filename = `${name}.png`
  const path = join(OUT_DIR, filename)
  await page.screenshot({ path, fullPage: opts.fullPage ?? false })
  results.ok.push(name)
  console.log(`[ok]   ${filename}`)
}

async function safeStep(name, fn) {
  try {
    await fn()
  } catch (err) {
    results.fail.push({ name, err: String(err.message || err).slice(0, 200) })
    console.log(`[fail] ${name}: ${String(err.message || err).slice(0, 120)}`)
    // 실패 시점 캡쳐 보관
    try { await page.screenshot({ path: join(OUT_DIR, `_fail_${name}.png`) }) } catch {}
  }
}

async function gotoNew() {
  await page.goto(`${BASE_URL}/quiz/new`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1:has-text("새 퀴즈 만들기")', { timeout: 8000 })
  await page.waitForTimeout(400)
}

async function fillBasic() {
  await page.getByPlaceholder('예) 중간고사 - 데이터베이스 설계').fill('데이터베이스 정규화 1차 평가')
  await page.getByPlaceholder('학생에게 표시될 퀴즈 설명 (선택)').fill('1NF~3NF 개념과 분해 과정을 평가합니다.')
}

async function clickToggleByLabel(label) {
  const row = page.locator('label, div').filter({ hasText: label }).first()
  const sw = row.getByRole('switch')
  if (await sw.count()) {
    await sw.first().click()
  } else {
    await row.click()
  }
}

async function scrollTo(textSelector) {
  await page.locator(textSelector).first().scrollIntoViewIfNeeded({ timeout: 3000 })
  await page.waitForTimeout(200)
}

async function closeOverlays() {
  // 다이얼로그/팝오버를 닫기 위한 다중 시도
  // 1) 다이얼로그 close 슬롯 버튼
  const closeBtn = page.locator('[data-slot="dialog-close"]').first()
  if (await closeBtn.count()) {
    try { await closeBtn.click({ timeout: 1000 }) } catch {}
  }
  await page.waitForTimeout(200)
  // 2) AlertDialog "확인"
  const okBtn = page.locator('[role="alertdialog"] button:has-text("확인")').first()
  if (await okBtn.count()) {
    try { await okBtn.click({ timeout: 1000 }) } catch {}
  }
  await page.waitForTimeout(200)
  // 3) ESC 3회
  for (let i = 0; i < 3; i++) {
    const visible = await page.locator('[role="dialog"], [role="alertdialog"]').count()
    if (!visible) break
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
  }
}

// ════════════════════════════════════════════════════════════════════
// 캡쳐 시작
// ════════════════════════════════════════════════════════════════════

try {
  // ── S-01 진입점 ─────────────────────────
  await safeStep('01_S-01_진입점', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await shot('01_S-01_진입점')
  })

  // ── S-02a 시험 설정 ① ─────────────────────────
  await safeStep('02_S-02a_시험설정_일정', async () => {
    await gotoNew()
    await fillBasic()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)
    await shot('02_S-02a_시험설정_일정')
  })

  // ── S-02b 시험 설정 ② ─────────────────────────
  await safeStep('03_S-02b_시험설정_응시동작', async () => {
    await scrollTo('text=응시 설정')
    await shot('03_S-02b_시험설정_응시동작')
  })

  // ── S-02c 시험 설정 ③ ─────────────────────────
  await safeStep('04_S-02c_시험설정_공개정책', async () => {
    await scrollTo('text=성적 공개 정책')
    await shot('04_S-02c_시험설정_공개정책')
  })

  // ── S-02d 토글 ON ① ─────────────────────────
  await safeStep('05_S-02d_토글ON_지각시간', async () => {
    await scrollTo('text=응시 기간')
    await clickToggleByLabel('마감 후 지각 제출 허용')
    await page.waitForTimeout(300)
    await shot('05_S-02d_토글ON_지각시간')
  })

  // ── S-02e 토글 ON ② ─────────────────────────
  await safeStep('06_S-02e_토글ON_재응시공개', async () => {
    await scrollTo('text=응시 설정')
    await clickToggleByLabel('재응시 허용')
    await page.waitForTimeout(200)
    await scrollTo('text=성적 공개 정책')
    await clickToggleByLabel('성적 공개')
    await page.waitForTimeout(300)
    const periodRadio = page.locator('label:has-text("기간 설정")').first()
    if (await periodRadio.count()) {
      try { await periodRadio.click({ timeout: 1500 }) } catch {}
    }
    await page.waitForTimeout(300)
    await shot('06_S-02e_토글ON_재응시공개')
  })

  // ── S-02f 추가 기간 설정 ─────────────────────────
  await safeStep('07_S-02f_추가기간_인라인', async () => {
    await gotoNew()
    await fillBasic()
    await scrollTo('text=추가 기간 설정')
    const addBtn = page.locator('button:has-text("추가")').first()
    if (await addBtn.count()) {
      try { await addBtn.click({ timeout: 1500 }) } catch {}
    }
    await page.waitForTimeout(400)
    await shot('07_S-02f_추가기간_인라인')
  })

  // ── S-02f2 대상 선택 모달 (옵셔널) ─────────────────────────
  await safeStep('08_S-02f2_추가기간_대상선택모달', async () => {
    const selectTargetBtn = page.locator('button:has-text("대상 선택")').first()
    if (await selectTargetBtn.count()) {
      try { await selectTargetBtn.click({ timeout: 2000 }) } catch {}
    }
    await page.waitForTimeout(500)
    await shot('08_S-02f2_추가기간_대상선택모달')
  })

  // ── S-03 문항 구성 빈 상태 ─────────────────────────
  await safeStep('09_S-03_문항구성_빈상태', async () => {
    await gotoNew()
    await fillBasic()
    const tabBtn = page.locator('button:has-text("문항 구성")').first()
    await tabBtn.click({ timeout: 3000 })
    await page.waitForTimeout(400)
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot('09_S-03_문항구성_빈상태')
  })

  // ── S-04 문제모음 팝오버 ─────────────────────────
  await safeStep('10_S-04_문제모음_팝오버', async () => {
    await page.locator('button:has-text("문제모음에서 추가")').first().click({ timeout: 3000 })
    await page.waitForTimeout(500)
    await shot('10_S-04_문제모음_팝오버')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  // ── S-05 문항 만들기 모달 ─────────────────────────
  await safeStep('11_S-05_문항만들기_유형선택', async () => {
    await page.locator('button:has-text("문항 만들기")').first().click({ timeout: 3000 })
    await page.waitForTimeout(600)
    await shot('11_S-05_문항만들기_유형선택')
    await closeOverlays()
  })

  // ── S-06 문제모음 직접 선택 모달 ─────────────────────────
  let questionsAdded = false
  await safeStep('12_S-06_문제모음_직접선택', async () => {
    await page.locator('button:has-text("문제모음에서 추가")').first().click({ timeout: 3000 })
    await page.waitForTimeout(300)
    await page.locator('text=직접 선택').first().click({ timeout: 3000 })
    await page.waitForTimeout(700)
    await shot('12_S-06_문제모음_직접선택')
    // 임의 문항 3개 체크 (S-08 위해)
    const checkboxes = page.locator('[role="dialog"] input[type="checkbox"]')
    const cbCount = await checkboxes.count()
    for (let i = 1; i <= Math.min(4, cbCount); i++) {
      try { await checkboxes.nth(i).check({ timeout: 800 }) } catch {}
    }
    const dialogAdd = page.locator('[role="dialog"] button:has-text("추가")').last()
    if (await dialogAdd.count()) {
      try { await dialogAdd.click({ timeout: 2000 }); questionsAdded = true } catch {}
    }
    await page.waitForTimeout(800)
    await closeOverlays()
  })

  // ── S-07 문제모음 랜덤 출제 모달 (별도 진입) ─────────────────────────
  await safeStep('13_S-07_문제모음_랜덤출제', async () => {
    // 새로 시작해서 안정성 확보
    await gotoNew()
    await fillBasic()
    await page.locator('button:has-text("문항 구성")').first().click({ timeout: 3000 })
    await page.waitForTimeout(300)
    await page.locator('button:has-text("문제모음에서 추가")').first().click({ timeout: 3000 })
    await page.waitForTimeout(300)
    await page.locator('text=랜덤 출제').first().click({ timeout: 3000 })
    await page.waitForTimeout(700)
    await shot('13_S-07_문제모음_랜덤출제')
    await closeOverlays()
  })

  // ── S-08 문항 채워진 상태 ─────────────────────────
  await safeStep('14_S-08_문항_채워진상태', async () => {
    await gotoNew()
    await fillBasic()
    await page.locator('button:has-text("문항 구성")').first().click({ timeout: 3000 })
    await page.waitForTimeout(300)
    await page.locator('button:has-text("문제모음에서 추가")').first().click({ timeout: 3000 })
    await page.waitForTimeout(300)
    await page.locator('text=직접 선택').first().click({ timeout: 3000 })
    await page.waitForTimeout(700)
    // 모달 내 "전체 선택" 체크박스 (top filter 영역)
    const selectAll = page.locator('[role="dialog"] label:has-text("전체") input[type="checkbox"]').first()
    if (await selectAll.count()) {
      try { await selectAll.check({ timeout: 1500 }) } catch {}
    } else {
      // fallback: 개별 질문 카드(border rounded-lg label) 3개 클릭
      const qLabels = page.locator('[role="dialog"] label.rounded-lg')
      const qCount = await qLabels.count()
      for (let i = 0; i < Math.min(3, qCount); i++) {
        try { await qLabels.nth(i).click({ timeout: 1000 }) } catch {}
      }
    }
    await page.waitForTimeout(400)
    // 푸터의 "N개 추가" 버튼 클릭 (확정)
    const addBtn = page.locator('[role="dialog"] button:has-text("개 추가")').first()
    if (await addBtn.count()) {
      try { await addBtn.click({ timeout: 2000 }) } catch {}
    } else {
      // fallback: 마지막 "추가" 버튼
      const fallback = page.locator('[role="dialog"] button:has-text("추가")').last()
      if (await fallback.count()) {
        try { await fallback.click({ timeout: 2000 }) } catch {}
      }
    }
    await page.waitForTimeout(1000)
    await closeOverlays()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await shot('14_S-08_문항_채워진상태')
  })

  // ── S-09 공개 설정 확인 모달 (S-08 이어서) ─────────────────────────
  await safeStep('15_S-09_공개설정확인', async () => {
    await page.locator('button:has-text("저장하기")').first().click({ timeout: 3000 })
    await page.waitForTimeout(900)
    await shot('15_S-09_공개설정확인')
    await closeOverlays()
  })

  // ── S-10 임시저장 알림 ─────────────────────────
  await safeStep('16_S-10_임시저장_알림', async () => {
    await page.locator('button:has-text("임시저장")').first().click({ timeout: 3000 })
    await page.waitForTimeout(700)
    await shot('16_S-10_임시저장_알림')
    await closeOverlays()
  })

  // ── E-01 검증 오류 ─────────────────────────
  await safeStep('17_E-01_검증오류', async () => {
    await gotoNew()
    // 제목 비어있고 문항 없는 상태 → "퀴즈 제목을 입력해주세요" 첫 오류
    await page.locator('button:has-text("저장하기")').first().click({ timeout: 3000 })
    await page.waitForTimeout(600)
    await shot('17_E-01_검증오류')
    await closeOverlays()
  })

  // ── E-02 작성 취소 confirm ─────────────────────────
  await safeStep('18_E-02_작성취소_confirm', async () => {
    await gotoNew()
    await fillBasic()
    await page.locator('button:has-text("취소")').first().click({ timeout: 3000 })
    await page.waitForTimeout(600)
    await shot('18_E-02_작성취소_confirm')
  })

  console.log('')
  console.log(`[capture] 성공 ${results.ok.length} 장 / 실패 ${results.fail.length} 건`)
  if (results.fail.length) {
    console.log('[capture] 실패 항목:')
    results.fail.forEach(f => console.log(`  - ${f.name}: ${f.err}`))
  }
  console.log(`[capture] 저장 폴더: ${OUT_DIR}`)
  console.log(`[capture] 완료. 총 ${results.ok.length}장 캡쳐.`)
} catch (err) {
  console.error('[capture] 치명적 오류:', err.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
