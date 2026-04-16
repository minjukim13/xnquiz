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

  async function capture(name) {
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotDir, `${name}.png`),
      fullPage: false,
    });
    console.log(`  OK ${name}.png`);
  }

  console.log('Capturing modal screenshots...\n');

  // === 문제은행 상세 → 일괄 업로드 버튼 클릭 ===
  await page.goto(`${BASE}/question-banks/bank1`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // "일괄 업로드" 버튼 클릭
  const uploadBtn = await page.locator('button:has-text("일괄 업로드")');
  if (await uploadBtn.count() > 0) {
    await uploadBtn.click();
    await page.waitForTimeout(500);
    await capture('modal_bulk_upload');
    // 모달 닫기
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    console.log('  SKIP: 일괄 업로드 버튼 없음');
  }

  // === 문제은행 목록 → 가져오기 버튼 ===
  await page.goto(`${BASE}/question-banks`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  const importBtn = await page.locator('button:has-text("가져오기")');
  if (await importBtn.count() > 0) {
    await importBtn.click();
    await page.waitForTimeout(500);
    await capture('modal_import');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    console.log('  SKIP: 가져오기 버튼 없음');
  }

  // === 퀴즈 편집 → 문제은행에서 추가 버튼 ===
  await page.goto(`${BASE}/quiz/1/edit`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  const bankAddBtn = await page.locator('button:has-text("문제은행에서 추가")');
  if (await bankAddBtn.count() > 0) {
    await bankAddBtn.click();
    await page.waitForTimeout(500);
    await capture('modal_question_bank_add');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    console.log('  SKIP: 문제은행에서 추가 버튼 없음');
  }

  // === 채점 대시보드 → 엑셀 일괄 채점 버튼 ===
  await page.goto(`${BASE}/quiz/1/grade`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  const excelGradeBtn = await page.locator('button:has-text("엑셀 일괄 채점")');
  if (await excelGradeBtn.count() > 0) {
    await excelGradeBtn.click();
    await page.waitForTimeout(500);
    await capture('modal_excel_grading');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    console.log('  SKIP: 엑셀 일괄 채점 버튼 없음');
  }

  // === 퀴즈 편집 → 퀴즈 설정 모달 (존재한다면) ===
  await page.goto(`${BASE}/quiz/1/edit`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // "문항 만들기" 버튼이 있으면 클릭
  const createQBtn = await page.locator('button:has-text("문항 만들기")');
  if (await createQBtn.count() > 0) {
    await createQBtn.click();
    await page.waitForTimeout(500);
    await capture('modal_create_question');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // === 퀴즈 목록 → 퀴즈 카드 더보기 메뉴 ===
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // 퀴즈 목록 스크롤해서 전체 보이기
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await capture('01b_quiz_list_full');

  console.log('\nModal screenshots captured!');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
