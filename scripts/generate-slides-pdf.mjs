import { chromium } from 'playwright'
import { pathToFileURL } from 'url'

const HTML_PATH = 'C:\\Users\\김민주\\Desktop\\새폴더\\퀴즈\\slides_draft.html'
const PDF_PATH  = 'C:\\Users\\김민주\\Desktop\\새폴더\\퀴즈\\portfolio_slides_draft.pdf'

const browser = await chromium.launch()
const ctx = await browser.newContext({ deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(pathToFileURL(HTML_PATH).href, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000) // 폰트/이미지 로드 안정화
await page.pdf({
  path: PDF_PATH,
  width: '1280px',
  height: '720px',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
})
await browser.close()
console.log(`✓ PDF 생성: ${PDF_PATH}`)
