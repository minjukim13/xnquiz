import { chromium } from 'playwright'
import { pathToFileURL } from 'url'

const HTML_PATH = 'C:\\Users\\김민주\\Desktop\\새폴더\\퀴즈\\slides_draft.html'
const OUT_DIR = 'C:\\Users\\김민주\\Desktop\\새폴더\\퀴즈'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()
await page.goto(pathToFileURL(HTML_PATH).href, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const slides = await page.locator('.slide').all()
for (let i = 0; i < slides.length; i++) {
  await slides[i].screenshot({ path: `${OUT_DIR}\\slide-preview-${i + 1}.png` })
  console.log(`✓ slide-preview-${i + 1}.png`)
}
await browser.close()
