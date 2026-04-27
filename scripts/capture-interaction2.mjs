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

await page.goto(`${BASE}/quiz/1/edit`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.getByRole('tab', { name: /문항 구성/ }).first().click().catch(() => {})
await page.waitForTimeout(800)
await page.getByRole('button', { name: /문항 만들기/ }).first().click()
await page.waitForTimeout(1200)
// dialog 안의 첫 번째 카드 버튼(객관식) 클릭
await page.locator('[role="dialog"] button').filter({ hasText: '객관식' }).first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT_DIR}\\08-question-edit.png`, fullPage: false })
console.log('✓ 08 question-edit (객관식 편집)')

await browser.close()
console.log('Done.')
