import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.resolve(__dirname, '..', 'screenshots');

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Helper: navigate and wait for idle
  async function capture(url, name, opts = {}) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 15000 });
    if (opts.wait) await page.waitForTimeout(opts.wait);
    if (opts.action) await opts.action(page);
    await page.screenshot({
      path: path.join(screenshotDir, `${name}.png`),
      fullPage: opts.fullPage || false,
    });
    console.log(`  ✓ ${name}.png`);
  }

  console.log('Capturing screenshots...\n');

  // 1. 퀴즈 목록 (교수자 뷰)
  await capture('/', '01_quiz_list', { wait: 500 });

  // 2. 퀴즈 생성
  await capture('/quiz/new', '02_quiz_create', { wait: 500 });

  // 3. 퀴즈 편집 (id=1)
  await capture('/quiz/1/edit', '03_quiz_edit', { wait: 500 });

  // 4. 퀴즈 편집 - 스크롤하여 문항 목록 보이기
  await capture('/quiz/1/edit', '03b_quiz_edit_questions', {
    wait: 500,
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 600));
      await p.waitForTimeout(300);
    }
  });

  // 5. 퀴즈 응시 (open 상태 퀴즈 3 미리보기)
  await capture('/quiz/3/attempt?preview=true', '04_quiz_attempt', { wait: 500 });

  // 6. 채점 대시보드
  await capture('/quiz/1/grade', '05_grading_dashboard', { wait: 500 });

  // 7. 채점 대시보드 스크롤
  await capture('/quiz/1/grade', '05b_grading_detail', {
    wait: 500,
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 600));
      await p.waitForTimeout(300);
    }
  });

  // 8. 통계
  await capture('/quiz/1/stats', '06_quiz_stats', { wait: 1000 });

  // 9. 통계 스크롤
  await capture('/quiz/1/stats', '06b_quiz_stats_detail', {
    wait: 500,
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 800));
      await p.waitForTimeout(300);
    }
  });

  // 10. 문제은행 목록
  await capture('/question-banks', '07_question_bank_list', { wait: 500 });

  // 11. 문제은행 상세 (bank1)
  await capture('/question-banks/bank1', '08_question_bank_detail', { wait: 500 });

  // 12. 통계 - 퀴즈 통계 탭
  await capture('/quiz/1/stats', '06c_quiz_stats_chart', {
    wait: 500,
    action: async (p) => {
      // '퀴즈 통계' 탭 클릭
      const tabs = await p.$$('button, [role="tab"]');
      for (const tab of tabs) {
        const text = await tab.textContent();
        if (text.includes('퀴즈 통계')) {
          await tab.click();
          await p.waitForTimeout(800);
          break;
        }
      }
    }
  });

  // 13. 응시 화면 스크롤 - 문항 여러개 보이기
  await capture('/quiz/3/attempt?preview=true', '04b_quiz_attempt_scroll', {
    wait: 500,
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 500));
      await p.waitForTimeout(300);
    }
  });

  console.log('\nAll screenshots captured!');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
