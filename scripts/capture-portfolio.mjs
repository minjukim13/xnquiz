import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'

const OUT_DIR = 'C:\\Users\\김민주\\Desktop\\새폴더\\퀴즈\\screenshots'
const BASE = 'http://localhost:5173'

const shots = [
  { name: '01-quiz-list',   url: '/',             role: 'PROFESSOR', wait: 1500, label: '퀴즈 목록 (메인)' },
  { name: '02-quiz-edit',   url: '/quiz/1/edit',  role: 'PROFESSOR', wait: 2000, label: '퀴즈 편집 (12개 문항 유형)' },
  { name: '03-quiz-attempt',url: '/quiz/1/attempt?preview=true',role: 'PROFESSOR', wait: 2500, label: '학생 응시 미리보기 (타이머)' },
  { name: '04-grading',     url: '/quiz/1/grade', role: 'PROFESSOR', wait: 2000, label: '채점 대시보드' },
  { name: '05-stats',       url: '/quiz/1/stats', role: 'PROFESSOR', wait: 2000, label: '결과 통계' },
  { name: '06-question-banks', url: '/question-banks', role: 'PROFESSOR', wait: 1500, label: '문제은행 목록' },
]

await mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'ko-KR',
})
const page = await ctx.newPage()

// 첫 진입으로 origin 확보 후 localStorage 세팅 (role/lti 흔적 제거)
await page.goto(BASE, { waitUntil: 'networkidle' })

for (const s of shots) {
  await page.evaluate((role) => {
    localStorage.setItem('xnq_role', role)
    localStorage.removeItem('xnq_lti_active')
    localStorage.removeItem('xnq_lti_role')
    localStorage.removeItem('xnq_lti_section')
  }, s.role)

  await page.goto(BASE + s.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(s.wait)

  // 응시 화면이 시작 버튼/모달이면 클릭 시도
  if (s.url.endsWith('/attempt')) {
    const startBtn = page.getByRole('button', { name: /시작|응시 시작|퀴즈 시작/ }).first()
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click().catch(() => {})
      await page.waitForTimeout(1500)
    }
  }

  const out = path.join(OUT_DIR, `${s.name}.png`)
  await page.screenshot({ path: out, fullPage: true })
  console.log(`✓ ${s.label} → ${out}`)
}

await browser.close()
console.log('\nDone.')
