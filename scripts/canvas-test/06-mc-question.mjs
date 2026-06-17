import { chromium } from 'playwright';
import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const { browser, page } = await attachCanvasPage();
await page.bringToFront();
const frame = await getQuizFrame(page);
console.log('frame:', frame.url());

async function snap(label) {
  const p = `${SHOT_DIR}/06-${label}-${stamp}.png`;
  await page.screenshot({ path: p });
  console.log(`[shot] ${label}`);
}

// Click 객관식 in the modal
console.log('\n=== STEP 1: 객관식 카드 클릭 ===');
const pickMC = await frame.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const mc = btns.find(b => /^객관식/.test((b.textContent||'').trim()));
  if (!mc) return { ok: false };
  mc.click();
  return { ok: true };
});
console.log(pickMC);
await page.waitForTimeout(1500);
await snap('01-mc-form');

const mcForm = await frame.evaluate(() => {
  const labels = Array.from(document.querySelectorAll('label')).map(l => (l.textContent||'').replace(/\s+/g,' ').trim().slice(0,60)).filter(Boolean);
  const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
    tag: i.tagName, type: i.type, placeholder: i.placeholder, label: i.closest('label')?.textContent?.trim().slice(0,40) || ''
  }));
  const buttons = Array.from(document.querySelectorAll('button')).map(b => (b.textContent||'').replace(/\s+/g,' ').trim().slice(0,30)).filter(t=>t && t.length<30);
  const sections = Array.from(document.querySelectorAll('h2,h3,[class*="section"]')).map(s => (s.textContent||'').trim().slice(0,40)).filter(Boolean).slice(0,15);
  return { url: location.pathname, labels: labels.slice(0,20), inputs: inputs.slice(0,15), buttons: buttons.slice(0,20), sections };
});
console.log('MC form:', JSON.stringify(mcForm, null, 2));

// === PROTO comparison ===
console.log('\n=== PROTO: 첫 번째 퀴즈 편집 페이지 ===');
const protoCtx = await browser.newContext();
const protoPage = await protoCtx.newPage();
await protoPage.setViewportSize({ width: 1280, height: 1200 });
await protoPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await protoPage.waitForTimeout(1200);

const firstQuiz = await protoPage.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('a[href*="/quiz/"]'));
  const m = cards[0]?.href?.match(/\/quiz\/([^/?]+)/);
  return m ? m[1] : null;
});
console.log('proto first quiz id:', firstQuiz);

if (firstQuiz) {
  await protoPage.goto(`http://localhost:5173/quiz/${firstQuiz}/edit`, { waitUntil: 'domcontentloaded' });
  await protoPage.waitForTimeout(1500);

  // navigate to step 2 (questions)
  await protoPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const step2 = tabs.find(t => /문항/.test((t.textContent||'').trim()));
    if (step2) step2.click();
  });
  await protoPage.waitForTimeout(800);

  // click 문항 추가/만들기
  const protoAdd = await protoPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const t = btns.find(b => /문항\s*추가|새\s*문항|문항\s*만들기|\+\s*문항/.test((b.textContent||'').trim()));
    if (!t) return { ok: false, all: btns.slice(0,15).map(b=>b.textContent.trim().slice(0,30)) };
    t.click();
    return { ok: true, text: t.textContent.trim() };
  });
  console.log('proto add click:', protoAdd);
  await protoPage.waitForTimeout(1500);
  await protoPage.screenshot({ path: `${SHOT_DIR}/06-proto-type-modal-${stamp}.png`, fullPage: false });

  const protoTypes = await protoPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      hasDialog: !!dialog,
      title: dialog?.querySelector('h1,h2,h3,[id*=title]')?.textContent?.trim(),
      buttons: dialog ? Array.from(dialog.querySelectorAll('button')).map(b => (b.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean) : [],
      cards: dialog ? Array.from(dialog.querySelectorAll('[role="button"], [class*="card"]')).map(c => (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean).slice(0,15) : []
    };
  });
  console.log('PROTO type modal:', JSON.stringify(protoTypes, null, 2));

  // try to click 객관식 in proto
  const pickMCProto = await protoPage.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, [role="button"]'));
    const mc = all.find(b => /^객관식/.test((b.textContent||'').trim()));
    if (!mc) return { ok: false };
    mc.click();
    return { ok: true };
  });
  console.log('proto pick MC:', pickMCProto);
  await protoPage.waitForTimeout(1500);
  await protoPage.screenshot({ path: `${SHOT_DIR}/06-proto-mc-form-${stamp}.png`, fullPage: true });

  const protoMcForm = await protoPage.evaluate(() => ({
    url: location.pathname,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent?.trim().slice(0,40)).filter(Boolean),
    labels: Array.from(document.querySelectorAll('label')).map(l => (l.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean).slice(0,20),
    buttons: Array.from(document.querySelectorAll('button')).map(b => (b.textContent||'').trim().slice(0,25)).filter(t=>t && t.length<25).slice(0,30)
  }));
  console.log('PROTO MC form:', JSON.stringify(protoMcForm, null, 2));
}

await protoCtx.close();
await browser.close();
