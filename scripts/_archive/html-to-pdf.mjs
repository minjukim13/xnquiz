/**
 * HTML 보고자료 → PDF 변환
 * 사용: node scripts/html-to-pdf.mjs
 */
import { chromium } from '@playwright/test'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HTML_PATH = resolve(__dirname, '..', 'XNQuizzes_구현현황_보고.html')
const PDF_PATH = resolve(__dirname, '..', 'XNQuizzes_구현현황_보고.pdf')

async function main() {
  console.log('PDF 변환 시작...')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`file:///${HTML_PATH.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  await browser.close()

  const { statSync } = await import('fs')
  const size = statSync(PDF_PATH).size
  console.log(`PDF 생성 완료: ${PDF_PATH}`)
  console.log(`파일 크기: ${(size / 1024).toFixed(0)} KB`)
}

main().catch(e => {
  console.error('오류:', e.message)
  process.exit(1)
})
