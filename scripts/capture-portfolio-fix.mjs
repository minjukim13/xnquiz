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

// 02 — 문항 구성 탭으로 이동
await page.goto(`${BASE}/quiz/1/edit`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const tab = page.getByRole('tab', { name: /문항 구성/ }).first()
if (await tab.isVisible().catch(() => false)) {
  await tab.click()
} else {
  await page.getByText('문항 구성', { exact: true }).first().click().catch(() => {})
}
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT_DIR}\\02-quiz-edit.png`, fullPage: true })
console.log('✓ 02 quiz-edit (문항 구성 탭)')

// 03 — open 퀴즈(id=3) preview
await page.goto(`${BASE}/quiz/3/attempt?preview=true`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT_DIR}\\03-quiz-attempt.png`, fullPage: true })
console.log('✓ 03 quiz-attempt (preview)')

// 05 — 결과 통계 viewport 캡처 (차트 영역만)
await page.goto(`${BASE}/quiz/1/stats`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT_DIR}\\05-stats.png`, fullPage: false })
console.log('✓ 05 stats (viewport)')

await browser.close()
console.log('Done.')
