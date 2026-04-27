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

await page.goto(`${BASE}/quiz/8/stats`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.getByText('퀴즈 통계', { exact: true }).first().click()
await page.waitForTimeout(4500) // recharts 재마운트 대기
await page.screenshot({ path: `${OUT_DIR}\\09-stats-charts.png`, fullPage: true })
console.log('✓ 09 stats-charts (quiz 8, 120명 채점 완료)')

await browser.close()
console.log('Done.')
