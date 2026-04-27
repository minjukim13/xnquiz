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

await page.goto(`${BASE}/question-banks`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT_DIR}\\06-question-banks.png`, fullPage: true })
console.log('✓ 06 question-banks (재캡처)')

await browser.close()
console.log('Done.')
