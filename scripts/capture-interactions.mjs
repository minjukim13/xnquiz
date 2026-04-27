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

// 07 — 문항 유형 선택 모달 (12개 유형)
await page.goto(`${BASE}/quiz/1/edit`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.getByRole('tab', { name: /문항 구성/ }).first().click().catch(() => {})
await page.waitForTimeout(1000)
await page.getByRole('button', { name: /문항 만들기/ }).first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT_DIR}\\07-question-type-modal.png`, fullPage: false })
console.log('✓ 07 question-type-modal')

// 08 — 퀴즈 생성 (빈 상태)
await page.goto(`${BASE}/quiz/new`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT_DIR}\\08-quiz-create.png`, fullPage: true })
console.log('✓ 08 quiz-create')

await browser.close()
console.log('Done.')
