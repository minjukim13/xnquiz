import { chromium } from 'playwright';
import { ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 1200 });
await page.goto('http://localhost:5173/quiz/new', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

await page.screenshot({ path: `${SHOT_DIR}/03c-proto-create-page-${stamp}.png`, fullPage: true });
console.log('proto create page captured');

const data = await page.evaluate(() => {
  const h1 = document.querySelector('h1')?.textContent?.trim() || null;
  // Find all primary action buttons (top right)
  const buttons = Array.from(document.querySelectorAll('button, a[role="button"]')).map(b => ({
    tag: b.tagName,
    text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
    cls: b.className.slice(0, 100)
  })).filter(b => b.text);

  // Find sections / step indicator
  const sections = Array.from(document.querySelectorAll('h2, h3, [class*="section"]'))
    .slice(0, 20)
    .map(s => (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50))
    .filter(t => t);

  // Find fields
  const fields = Array.from(document.querySelectorAll('label')).map(l => (l.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)).filter(t => t);

  return { h1, buttons: buttons.slice(0, 20), sections: sections.slice(0, 30), fields: fields.slice(0, 20) };
});

console.log('\n=== PROTO /quiz/new ===');
console.log(JSON.stringify(data, null, 2));

await ctx.close();
await browser.close();
