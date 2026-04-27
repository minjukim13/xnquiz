import { chromium } from 'playwright'

const OUT_DIR = 'C:\\Users\\김민주\\Desktop\\새폴더\\퀴즈\\screenshots'
const BASE = 'http://localhost:5173'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'ko-KR',
})
const page = await ctx.newPage()

// 07 — 12개 문항 유형 모달 + 객관식 호버 (우측 미리보기 패널 활성화)
await page.goto(`${BASE}/quiz/1/edit`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.getByRole('tab', { name: /문항 구성/ }).first().click().catch(() => {})
await page.waitForTimeout(800)
await page.getByRole('button', { name: /문항 만들기/ }).first().click()
await page.waitForTimeout(1200)
const objCard = page.locator('[role="dialog"] button').filter({ hasText: '객관식' }).first()
await objCard.hover()
await page.waitForTimeout(1500) // 미리보기 패널 렌더 대기
await page.screenshot({ path: `${OUT_DIR}\\07-question-type-modal.png`, fullPage: false })
console.log('✓ 07 question-type-modal (객관식 hover)')

// 09 — 데이터 풍부한 quiz id 8 통계 차트
await page.goto(`${BASE}/quiz/8/stats`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.getByText('퀴즈 통계', { exact: true }).first().click()
await page.waitForTimeout(2500) // recharts 애니메이션
await page.screenshot({ path: `${OUT_DIR}\\09-stats-charts.png`, fullPage: true })
console.log('✓ 09 stats-charts (quiz 8, 116명 채점 완료)')

await browser.close()
console.log('Done.')
