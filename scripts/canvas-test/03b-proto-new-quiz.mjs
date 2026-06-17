import { chromium } from 'playwright';
import { ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// Show every button text to find the right one
const allBtns = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map(b => ({
    text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
    aria: b.getAttribute('aria-label')
  })).filter(x => x.text || x.aria);
});
console.log('proto buttons (first 15):');
allBtns.slice(0, 15).forEach((b, i) => console.log(`  [${i}] "${b.text}" aria="${b.aria||''}"`));

// Try to click the new quiz button (more lenient match)
const clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const newBtn = btns.find(b => /새\s*퀴즈/.test((b.textContent || '').trim()));
  if (!newBtn) return false;
  newBtn.click();
  return true;
});
console.log('proto new quiz clicked:', clicked);
await page.waitForTimeout(1500);

await page.screenshot({ path: `${SHOT_DIR}/03b-proto-after-click-${stamp}.png`, fullPage: false });
console.log('shot saved');

const currentUrl = page.url();
console.log('proto URL after click:', currentUrl);

// Check if it's a route change (page) or modal
const state = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    url: location.pathname,
    hasDialog: !!dialog,
    dialogTitle: dialog?.querySelector('[id*="title"],h1,h2,h3')?.textContent?.trim() || null,
    pageH1: document.querySelector('h1')?.textContent?.trim() || null,
    pageH2: document.querySelector('h2')?.textContent?.trim() || null,
    primaryButtons: Array.from(document.querySelectorAll('button')).filter(b => {
      const c = getComputedStyle(b).backgroundColor;
      return c.includes('rgb(49') || c.includes('oklch') && c.includes('0.625');
    }).slice(0, 5).map(b => (b.textContent || '').trim().slice(0, 30))
  };
});
console.log('state after click:', state);

await ctx.close();
await browser.close();
