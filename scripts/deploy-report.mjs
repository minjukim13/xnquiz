/**
 * 보고자료 PDF 생성 + GitHub Pages 배포
 * 사용: npm run deploy-report
 *
 * 1. HTML → PDF 변환 (Playwright)
 * 2. gh-pages 브랜치 업데이트 (GitHub Pages)
 */
import { execSync } from 'child_process'
import { copyFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const HTML = resolve(ROOT, 'XNQuizzes_구현현황_보고.html')

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts })
}

async function main() {
  console.log('\n=== 보고자료 배포 시작 ===\n')

  if (!existsSync(HTML)) {
    console.error('XNQuizzes_구현현황_보고.html 파일을 찾을 수 없습니다.')
    process.exit(1)
  }

  // 1. PDF 생성
  console.log('[1/2] PDF 생성 중...')
  run('node scripts/html-to-pdf.mjs')
  console.log('')

  // 2. gh-pages 브랜치 업데이트
  console.log('[2/2] GitHub Pages 업데이트 중...')
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim()
    const hasChanges = execSync('git status --porcelain', { cwd: ROOT }).toString().trim()
    if (hasChanges) run('git stash --include-untracked')

    run('git checkout gh-pages')
    copyFileSync(HTML, resolve(ROOT, 'index.html'))
    run('git add index.html')

    try {
      run('git commit -m "docs: 보고자료 업데이트"')
      run('git push origin gh-pages')
      console.log('  GitHub Pages 업데이트 완료')
    } catch {
      console.log('  변경사항 없음 (이미 최신)')
    }

    run(`git checkout -f ${currentBranch}`)
    if (hasChanges) run('git stash pop')
  } catch (e) {
    console.log('  GitHub Pages 업데이트 실패:', e.message?.split('\n')[0])
    try { run('git checkout -f main') } catch {}
    try { run('git stash pop') } catch {}
  }

  console.log('\n=== 완료 ===')
  console.log('  PDF:     XNQuizzes_구현현황_보고.pdf')
  console.log('  GitHub:  https://minjukim13.github.io/xnquiz/')
  console.log('')
}

main().catch(e => {
  console.error('오류:', e.message)
  process.exit(1)
})
