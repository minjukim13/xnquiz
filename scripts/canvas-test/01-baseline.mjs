import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';

const { browser, page } = await attachCanvasPage();
console.log('[ok] attached to:', page.url());

await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);

const frame = await getQuizFrame(page);
console.log('[ok] frame url:', frame.url());

const stamp = ts();

const fullPath = `${SHOT_DIR}/01-baseline-full-${stamp}.png`;
await page.screenshot({ path: fullPath, fullPage: false });
console.log('[shot] full viewport ->', fullPath);

const summary = await frame.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button')).slice(0, 30).map(b => ({
    text: (b.textContent || '').trim().slice(0, 40),
    classes: b.className.slice(0, 80),
    bg: getComputedStyle(b).backgroundColor,
    color: getComputedStyle(b).color
  })).filter(b => b.text);

  const headers = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => ({
    tag: h.tagName,
    text: (h.textContent || '').trim().slice(0, 60)
  }));

  return {
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim() || null,
    headers,
    buttons,
    bodyClass: document.body.className,
    htmlSnippet: document.body.innerHTML.length
  };
});

console.log('\n=== Canvas Dev 현재 화면 요약 ===');
console.log(JSON.stringify(summary, null, 2));

await browser.close();
