/**
 * 보고자료 배포 스크립트
 * 사용: npm run deploy-report
 *
 * 1. report-deploy/index.html에 최신 HTML 복사
 * 2. Vercel 배포 (xnquiz-report.vercel.app)
 * 3. gh-pages 브랜치 업데이트 (GitHub Pages)
 */
import { execSync } from 'child_process'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const HTML = resolve(ROOT, 'XNQuizzes_구현현황_보고.html')
const DEPLOY_DIR = resolve(ROOT, 'report-deploy')

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts })
}

async function main() {
  console.log('\n=== 보고자료 배포 시작 ===\n')

  // 1. 파일 복사
  if (!existsSync(HTML)) {
    console.error('XNQuizzes_구현현황_보고.html 파일을 찾을 수 없습니다.')
    process.exit(1)
  }
  mkdirSync(DEPLOY_DIR, { recursive: true })
  copyFileSync(HTML, resolve(DEPLOY_DIR, 'index.html'))
  console.log('[1/3] index.html 복사 완료\n')

  // 2. Vercel 배포
  console.log('[2/3] Vercel 배포 중...')
  try {
    run('npx vercel --yes --prod', { cwd: DEPLOY_DIR })
    run('npx vercel alias set report-deploy-aayu6me4d-minjukim-2988s-projects.vercel.app xnquiz-report.vercel.app', { cwd: DEPLOY_DIR })
  } catch (e) {
    console.log('  Vercel 배포 실패 (계속 진행):', e.message?.split('\n')[0])
  }

  // 3. gh-pages 브랜치 업데이트
  console.log('\n[3/3] GitHub Pages 업데이트 중...')
  try {
    // 현재 브랜치 저장
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim()

    // stash 현재 변경사항
    const hasChanges = execSync('git status --porcelain', { cwd: ROOT }).toString().trim()
    if (hasChanges) run('git stash --include-untracked')

    // gh-pages로 전환해서 업데이트
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

    // 원래 브랜치 복귀
    run(`git checkout -f ${currentBranch}`)
    if (hasChanges) run('git stash pop')
  } catch (e) {
    console.log('  GitHub Pages 업데이트 실패:', e.message?.split('\n')[0])
    // 안전하게 main으로 복귀 시도
    try { run('git checkout -f main') } catch {}
    try { run('git stash pop') } catch {}
  }

  console.log('\n=== 배포 완료 ===')
  console.log('  Vercel:  https://xnquiz-report.vercel.app')
  console.log('  GitHub:  https://minjukim13.github.io/xnquiz/')
  console.log('')
}

main().catch(e => {
  console.error('오류:', e.message)
  process.exit(1)
})
