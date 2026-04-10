/**
 * 재촬영: feature03 (업로드 모달) + feature06 (엑셀 채점 모달)
 */

import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5176'
const OUT = './screenshots'

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ── feature03: 문항 일괄 업로드 모달 ──────────────────────────
  console.log('[재촬영] feature03 — 업로드 모달')
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/question-banks/bank1`)
    // 문항 목록이 뜰 때까지 기다리기
    await page.waitForSelector('h1', { timeout: 10000 })
    await page.waitForTimeout(1200)

    // 업로드 버튼 찾아서 클릭
    const btn = await page.locator('button').filter({ hasText: '일괄 업로드' }).first()
    await btn.waitFor({ state: 'visible', timeout: 5000 })
    await btn.click()
    await page.waitForTimeout(800)

    await page.screenshot({ path: `${OUT}/feature03_upload_modal.png` })
    console.log('  ✓ feature03_upload_modal.png')
    await ctx.close()
  }

  // ── feature06: 엑셀 일괄 채점 모달 ────────────────────────────
  console.log('[재촬영] feature06 — 엑셀 채점 모달')
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/quiz/1/grade`)
    await page.waitForSelector('h1, h2', { timeout: 10000 })
    await page.waitForTimeout(1500)

    // 먼저 페이지 상태 스크린샷 (모달 시도 전)
    await page.screenshot({ path: `${OUT}/feature06_grading_base.png` })
    console.log('  ✓ feature06_grading_base.png')

    // 엑셀 일괄 채점 버튼 시도
    try {
      const excelBtn = page.locator('button').filter({ hasText: '엑셀 일괄 채점' }).first()
      const count = await excelBtn.count()
      if (count > 0) {
        await excelBtn.scrollIntoViewIfNeeded()
        await excelBtn.click()
        await page.waitForTimeout(800)
        await page.screenshot({ path: `${OUT}/feature06_excel_grading_modal.png` })
        console.log('  ✓ feature06_excel_grading_modal.png (모달 열림)')
      } else {
        // 문항을 먼저 클릭해야 하는 경우: 첫 번째 문항 클릭
        const firstQ = page.locator('[data-question-index], .cursor-pointer').first()
        if (await firstQ.count() > 0) {
          await firstQ.click()
          await page.waitForTimeout(500)
          const btn2 = page.locator('button').filter({ hasText: '엑셀 일괄 채점' }).first()
          if (await btn2.count() > 0) {
            await btn2.click()
            await page.waitForTimeout(800)
          }
        }
        await page.screenshot({ path: `${OUT}/feature06_excel_grading_modal.png` })
        console.log('  ✓ feature06_excel_grading_modal.png')
      }
    } catch (e) {
      console.log(`  ! 모달 클릭 실패 (${e.message.split('\n')[0]}) — base 화면 복사`)
      await page.screenshot({ path: `${OUT}/feature06_excel_grading_modal.png` })
    }
    await ctx.close()
  }

  await browser.close()
  console.log('\n재촬영 완료')
}

main().catch(e => {
  console.error('오류:', e.message.split('\n')[0])
  process.exit(1)
})
