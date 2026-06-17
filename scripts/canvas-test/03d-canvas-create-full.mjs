import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const { browser, page } = await attachCanvasPage();
await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
const frame = await getQuizFrame(page);

// Canvas Dev should still be on the new quiz page from previous run
const urlNow = frame.url();
console.log('current frame URL:', urlNow);

// Full screenshot — Canvas LMS embeds, so we screenshot the page (not just viewport)
await page.screenshot({ path: `${SHOT_DIR}/03d-dev-create-full-${stamp}.png`, fullPage: true });

const data = await frame.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('h2, h3, [class*="section-title"], [class*="card-title"]'))
    .slice(0, 30)
    .map(s => (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60))
    .filter(t => t);

  const fields = Array.from(document.querySelectorAll('label'))
    .map(l => (l.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60))
    .filter(t => t);

  const stepLabels = Array.from(document.querySelectorAll('[class*="step"]'))
    .slice(0, 10)
    .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50))
    .filter(t => t);

  const buttons = Array.from(document.querySelectorAll('button'))
    .slice(0, 30)
    .map(b => ({
      text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      bg: getComputedStyle(b).backgroundColor,
      disabled: b.disabled
    }))
    .filter(b => b.text);

  const toggles = Array.from(document.querySelectorAll('[role="switch"], [class*="switch"], [class*="toggle"]')).slice(0, 20).map(t => ({
    label: t.closest('label')?.textContent?.trim() || t.parentElement?.textContent?.trim()?.slice(0, 50) || '',
    state: t.getAttribute('aria-checked')
  })).filter(t => t.label);

  return {
    title: document.querySelector('h1, h2')?.textContent?.trim(),
    sections, fields: fields.slice(0, 30), stepLabels, buttons, toggles
  };
});

console.log('\n=== CANVAS DEV 새 시험 화면 ===');
console.log(JSON.stringify(data, null, 2));

await browser.close();
