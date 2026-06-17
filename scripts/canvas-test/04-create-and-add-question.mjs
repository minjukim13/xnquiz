import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();
const TEST_TITLE = `[QA자동화]_시나리오_${stamp}`;

const { browser, page } = await attachCanvasPage();
await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
const frame = await getQuizFrame(page);

async function snap(label) {
  const p = `${SHOT_DIR}/04-${label}-${stamp}.png`;
  await page.screenshot({ path: p });
  console.log(`[shot] ${label}`);
  return p;
}

console.log('current frame URL:', frame.url());

// Step 1: 제목 채우기
console.log('\n=== STEP 1: 제목 입력 ===');
const titleResult = await frame.evaluate((title) => {
  const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
  // Find the title input — probably first visible text input
  const visibleInputs = allInputs.filter(i => i.offsetParent !== null);
  const titleInput = visibleInputs[0];
  if (!titleInput) return { ok: false, count: allInputs.length };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(titleInput, title);
  titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  titleInput.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, value: titleInput.value, placeholder: titleInput.placeholder };
}, TEST_TITLE);
console.log('title:', titleResult);
await page.waitForTimeout(500);
await snap('01-title-filled');

// Step 2: 임시저장 클릭
console.log('\n=== STEP 2: 임시저장 클릭 ===');
const saveClick = await frame.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const saveBtn = btns.find(b => (b.textContent || '').trim() === '임시저장');
  if (!saveBtn) return { ok: false };
  saveBtn.click();
  return { ok: true };
});
console.log('save clicked:', saveClick);
await page.waitForTimeout(2500);
await snap('02-after-save');

const urlAfter = frame.url();
console.log('URL after save:', urlAfter);

// Step 3: 화면 상태 분석
const afterSave = await frame.evaluate(() => {
  return {
    url: location.pathname + location.search,
    title: document.querySelector('h1, h2')?.textContent?.trim(),
    toasts: Array.from(document.querySelectorAll('[role="status"], [class*="toast"], [class*="Toast"]')).map(t => t.textContent?.trim().slice(0, 100)).filter(Boolean),
    stepActive: Array.from(document.querySelectorAll('[class*="step"]')).map(s => ({
      text: (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      active: s.className.includes('active') || s.getAttribute('aria-current') === 'step'
    })).filter(s => s.text),
    primaryButtons: Array.from(document.querySelectorAll('button')).filter(b => {
      const c = getComputedStyle(b).backgroundColor;
      return c === 'rgb(21, 126, 244)';
    }).map(b => (b.textContent || '').trim().slice(0, 30))
  };
});
console.log('after save state:', JSON.stringify(afterSave, null, 2));

// Step 4: 스텝 2 (문항 구성)로 이동 시도
console.log('\n=== STEP 3: 스텝 2 (문항 구성) 이동 ===');
const goStep2 = await frame.evaluate(() => {
  // Try clicking step 2 indicator or "다음" button
  const steps = Array.from(document.querySelectorAll('[class*="step"]'));
  const step2 = steps.find(s => /^2/.test((s.textContent || '').trim()));
  if (step2) {
    step2.click();
    return { ok: true, method: 'step click' };
  }
  // Try button "다음" or "문항 구성"
  const btns = Array.from(document.querySelectorAll('button'));
  const next = btns.find(b => /^(다음|문항|문항 구성)/.test((b.textContent || '').trim()));
  if (next) {
    next.click();
    return { ok: true, method: 'next button', text: next.textContent.trim() };
  }
  return { ok: false };
});
console.log('go step 2:', goStep2);
await page.waitForTimeout(1500);
await snap('03-step2');

const step2State = await frame.evaluate(() => {
  return {
    url: location.pathname + location.search,
    visibleHeadings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => (h.textContent || '').trim().slice(0, 50)).filter(t => t),
    visibleButtons: Array.from(document.querySelectorAll('button')).map(b => (b.textContent || '').trim().slice(0, 30)).filter(t => t && t.length < 30),
    emptyState: Array.from(document.querySelectorAll('*')).filter(e => {
      const t = (e.textContent || '').trim();
      return t.includes('문항이 없') || t.includes('아직 문항') || t.includes('첫 문항');
    }).slice(0, 3).map(e => (e.textContent || '').trim().slice(0, 80))
  };
});
console.log('step 2 state:', JSON.stringify(step2State, null, 2));

await browser.close();
