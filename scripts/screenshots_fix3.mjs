/**
 * feature03 — CSS transition disable 후 캡처
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5176'
const OUT = './screenshots'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/question-banks/bank1`)

  // 버튼이 DOM에 나타날 때까지 대기
  await page.waitForFunction(() => {
    return [...document.querySelectorAll('button')]
      .some(b => b.textContent.includes('일괄 업로드'))
  }, { timeout: 15000 })
  await page.waitForTimeout(500)

  // CSS 트랜지션 비활성화 (애니메이션 없이 즉시 표시)
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' })

  // 클릭
  await page.locator('button').filter({ hasText: '일괄 업로드' }).first().click()

  // 여러 타이밍에서 캡처 시도
  for (const ms of [100, 300, 600, 1200]) {
    await page.waitForTimeout(ms === 100 ? 100 : ms - [0, 100, 300, 600][([100, 300, 600, 1200].indexOf(ms))])
    const img = await page.screenshot()
    const size = img.length
    console.log(`  ${ms}ms 후 캡처 크기: ${size} bytes`)
    if (size > 10000) {
      require('fs').writeFileSync(`${OUT}/feature03_upload_modal.png`, img)
      console.log(`  ✓ feature03_upload_modal.png (${ms}ms에서 저장)`)
      break
    }
  }

  // DOM 상태 확인
  const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 200))
  console.log('  DOM 상태:', bodyHTML)

  await browser.close()
}

main().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1) })
