import { chromium } from 'playwright';
import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();
const TEST_TITLE = `[QA자동화]_시나리오01_${stamp}`;

const { browser, page } = await attachCanvasPage();
await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(800);
const frame = await getQuizFrame(page);

async function snap(label) {
  const p = `${SHOT_DIR}/03-s1-${label}-${stamp}.png`;
  await page.screenshot({ path: p });
  console.log(`[shot] ${label} -> ${p}`);
}

async function probe(label) {
  return await frame.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], .xn-modal, .modal, [class*="Dialog"], [class*="Modal"]');
    const visible = !!dialog && getComputedStyle(dialog).display !== 'none';
    return {
      hasDialog: !!dialog,
      dialogVisible: visible,
      dialogClass: dialog?.className || null,
      dialogTitle: dialog?.querySelector('h1,h2,h3,[class*="Title"]')?.textContent?.trim() || null,
      dialogText: (dialog?.textContent || '').slice(0, 400),
      inputs: dialog ? Array.from(dialog.querySelectorAll('input, textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        placeholder: el.placeholder,
        label: el.closest('label')?.textContent?.trim() || el.getAttribute('aria-label') || ''
      })) : [],
      buttons: dialog ? Array.from(dialog.querySelectorAll('button')).map(b => ({
        text: (b.textContent || '').trim().slice(0, 30),
        disabled: b.disabled,
        cls: b.className.slice(0, 80)
      })) : []
    };
  });
}

console.log('\n=== STEP 1: 초기 상태 (헤더 새 시험 버튼 확인) ===');
console.log(JSON.stringify(await probe(), null, 2));
await snap('01-before-click');

console.log('\n=== STEP 2: "새 시험" 헤더 버튼 클릭 ===');
const clickResult = await frame.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const newQuizBtn = btns.find(b => {
    const t = (b.textContent || '').trim();
    return t === '새 시험' || t === '+ 새 시험' || t.endsWith('새 시험');
  });
  if (!newQuizBtn) return { clicked: false, reason: 'button not found' };
  newQuizBtn.click();
  return { clicked: true, text: newQuizBtn.textContent.trim() };
});
console.log('click result:', clickResult);
await page.waitForTimeout(1500);
await snap('02-after-click');

console.log('\n=== STEP 3: 모달 상태 캡쳐 ===');
const modalInfo = await probe('modal');
console.log(JSON.stringify(modalInfo, null, 2));

if (modalInfo.hasDialog) {
  console.log('\n=== STEP 4: 모달에 제목 입력 시도 ===');
  const titleFill = await frame.evaluate((title) => {
    const dialog = document.querySelector('[role="dialog"], .xn-modal, .modal, [class*="Dialog"], [class*="Modal"]');
    if (!dialog) return { ok: false, reason: 'no dialog' };
    const titleInput = dialog.querySelector('input[type="text"], input:not([type]), textarea');
    if (!titleInput) return { ok: false, reason: 'no input' };
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(titleInput, title);
    else titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, placeholder: titleInput.placeholder, value: titleInput.value };
  }, TEST_TITLE);
  console.log('title fill:', titleFill);
  await page.waitForTimeout(500);
  await snap('03-after-title-fill');

  console.log('\n=== STEP 5: 모달 내 "다음" 또는 "만들기" 버튼 클릭 ===');
  const submitResult = await frame.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], .xn-modal, .modal, [class*="Dialog"], [class*="Modal"]');
    if (!dialog) return { ok: false };
    const btns = Array.from(dialog.querySelectorAll('button'));
    const submit = btns.find(b => {
      const t = (b.textContent || '').trim();
      return /^(다음|만들기|생성|저장|확인)$/.test(t) && !b.disabled;
    });
    if (!submit) return { ok: false, available: btns.map(b => b.textContent.trim()) };
    submit.click();
    return { ok: true, clicked: submit.textContent.trim() };
  });
  console.log('submit click:', submitResult);
  await page.waitForTimeout(2000);
  await snap('04-after-submit');

  console.log('\n=== STEP 6: 다음 화면 / 후속 모달 상태 ===');
  const after = await probe('after-submit');
  console.log(JSON.stringify(after, null, 2));

  const urlAfter = await frame.evaluate(() => location.href);
  console.log('frame URL after:', urlAfter);
}

console.log('\n=== STEP 7: 프로토타입에서 동일 동작 ===');
const protoCtx = await browser.newContext();
const protoPage = await protoCtx.newPage();
await protoPage.setViewportSize({ width: 1280, height: 800 });
await protoPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await protoPage.waitForTimeout(1200);

// Find and click the prototype's "새 퀴즈" button
const protoClick = await protoPage.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const newBtn = btns.find(b => {
    const t = (b.textContent || '').trim();
    return /새 ?퀴즈$/.test(t) || /새 ?시험$/.test(t);
  });
  if (!newBtn) return { clicked: false };
  newBtn.click();
  return { clicked: true, text: newBtn.textContent.trim() };
});
console.log('proto click:', protoClick);
await protoPage.waitForTimeout(1200);
const protoShot = `${SHOT_DIR}/03-s1-proto-modal-${stamp}.png`;
await protoPage.screenshot({ path: protoShot });
console.log('[shot] proto modal ->', protoShot);

const protoModal = await protoPage.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return { hasDialog: false };
  return {
    hasDialog: true,
    title: dialog.querySelector('h1,h2,h3,[id*="title"]')?.textContent?.trim() || null,
    text: (dialog.textContent || '').slice(0, 500),
    inputs: Array.from(dialog.querySelectorAll('input, textarea')).map(el => ({
      type: el.type, placeholder: el.placeholder, name: el.name
    })),
    buttons: Array.from(dialog.querySelectorAll('button')).map(b => ({
      text: (b.textContent || '').trim().slice(0, 30), disabled: b.disabled
    }))
  };
});
console.log('\n=== PROTO MODAL ===');
console.log(JSON.stringify(protoModal, null, 2));

await protoCtx.close();
await browser.close();
console.log('\n=== DONE ===');
