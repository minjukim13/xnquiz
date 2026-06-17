import { chromium } from 'playwright';
import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const { browser, page } = await attachCanvasPage();
await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
const frame = await getQuizFrame(page);

async function snap(label) {
  const p = `${SHOT_DIR}/05-${label}-${stamp}.png`;
  await page.screenshot({ path: p });
  console.log(`[shot] ${label}`);
  return p;
}

console.log('frame URL:', frame.url());

// Step 1: + 문항 만들기 클릭
console.log('\n=== STEP 1: + 문항 만들기 클릭 ===');
const click1 = await frame.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const target = btns.find(b => /^\+?\s*문항\s*만들기$/.test((b.textContent || '').trim()));
  if (!target) return { ok: false, buttons: btns.slice(0, 20).map(b => b.textContent.trim().slice(0,30)) };
  target.click();
  return { ok: true };
});
console.log(click1);
await page.waitForTimeout(1200);
await snap('01-after-click');

// Probe state
const state1 = await frame.evaluate(() => {
  return {
    url: location.pathname,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent?.trim().slice(0,40)).filter(Boolean),
    typeCards: Array.from(document.querySelectorAll('[class*="type"], [class*="Type"], [class*="card"]')).slice(0,15).map(el => (el.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(t=>t && t.length<40),
    dialogs: Array.from(document.querySelectorAll('[role="dialog"], [class*="modal"]')).map(d => ({
      title: d.querySelector('h1,h2,h3')?.textContent?.trim(),
      text: (d.textContent||'').slice(0,200)
    })),
    buttons: Array.from(document.querySelectorAll('button')).slice(0,25).map(b => b.textContent?.trim().slice(0,30)).filter(Boolean)
  };
});
console.log('after click state:', JSON.stringify(state1, null, 2));

// Also capture prototype's equivalent flow
const protoCtx = await browser.newContext();
const protoPage = await protoCtx.newPage();
await protoPage.setViewportSize({ width: 1280, height: 1200 });
// Go to first quiz edit page in proto (we know there are quizzes)
await protoPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await protoPage.waitForTimeout(1500);

// Click first quiz to get its ID
const firstQuizUrl = await protoPage.evaluate(() => {
  const link = document.querySelector('a[href*="/quiz/"]');
  return link?.href || null;
});
console.log('first proto quiz link:', firstQuizUrl);

if (firstQuizUrl) {
  const m = firstQuizUrl.match(/\/quiz\/([^/]+)/);
  if (m) {
    const editUrl = `http://localhost:5173/quiz/${m[1]}/edit`;
    await protoPage.goto(editUrl, { waitUntil: 'domcontentloaded' });
    await protoPage.waitForTimeout(1500);

    // Navigate to step 2 if needed, then click 문항 추가
    await protoPage.evaluate(() => {
      const steps = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const step2 = steps.find(s => /문항\s*구성|문항\s*추가|2\s*문항/.test((s.textContent||'').trim()));
      if (step2) step2.click();
    });
    await protoPage.waitForTimeout(1000);
    await protoPage.screenshot({ path: `${SHOT_DIR}/05-proto-step2-${stamp}.png`, fullPage: true });

    const addClick = await protoPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const t = btns.find(b => /문항\s*만들기|문항\s*추가|새\s*문항/.test((b.textContent||'').trim()));
      if (!t) return { ok: false, available: btns.slice(0,15).map(b=>b.textContent.trim().slice(0,25)) };
      t.click();
      return { ok: true, text: t.textContent.trim() };
    });
    console.log('proto add click:', addClick);
    await protoPage.waitForTimeout(1500);
    await protoPage.screenshot({ path: `${SHOT_DIR}/05-proto-after-add-${stamp}.png`, fullPage: false });

    const protoState = await protoPage.evaluate(() => ({
      url: location.pathname,
      headings: Array.from(document.querySelectorAll('h1,h2,h3,[id*=title]')).map(h => h.textContent?.trim().slice(0,40)).filter(Boolean).slice(0,10),
      dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).map(d => (d.textContent||'').slice(0,300)),
      typeButtons: Array.from(document.querySelectorAll('button')).filter(b => {
        const t = (b.textContent||'').trim();
        return /객관식|주관식|단답|서술|OX|참거짓|매칭|순서/.test(t);
      }).map(b => b.textContent.trim().slice(0, 30))
    }));
    console.log('PROTO state after add:', JSON.stringify(protoState, null, 2));
  }
}

await protoCtx.close();
await browser.close();
