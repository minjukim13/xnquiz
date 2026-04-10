/**
 * feature03 단독 재촬영 — 긴 대기 + 특정 요소 체크
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5176'
const OUT = './screenshots'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/question-banks/bank1`)

  // React lazy loading이 완료될 때까지 대기
  // "일괄 업로드" 버튼이 DOM에 나타날 때까지 기다리기
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('button')]
    return btns.some(b => b.textContent.includes('일괄 업로드'))
  }, { timeout: 15000 })

  await page.waitForTimeout(500)

  // 버튼 클릭 전 페이지 상태 확인
  const title = await page.locator('h1').first().textContent().catch(() => '(없음)')
  console.log('  페이지 제목:', title)

  await page.screenshot({ path: `${OUT}/feature03_page_before_click.png` })
  console.log('  ✓ feature03_page_before_click.png')

  // 업로드 버튼 클릭
  await page.locator('button').filter({ hasText: '일괄 업로드' }).first().click()
  await page.waitForTimeout(1000)

  await page.screenshot({ path: `${OUT}/feature03_upload_modal.png` })
  console.log('  ✓ feature03_upload_modal.png')

  await browser.close()
  console.log('\n완료')
}

main().catch(e => {
  console.error('오류:', e.message.split('\n')[0])
  process.exit(1)
})
