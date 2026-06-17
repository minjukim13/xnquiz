import { chromium } from 'playwright';
import { ts } from './connect.mjs';
import path from 'path';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const handoffUrl = 'file:///' + path.resolve('c:/Users/김민주/Desktop/xnquiz/dist-singlefile/index.html').replace(/\\/g, '/');

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(handoffUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

await page.screenshot({ path: `${SHOT_DIR}/10-handoff-${stamp}.png`, fullPage: false });
console.log('[shot] handoff captured');

const state = await page.evaluate(() => {
  const aside = document.querySelector('aside');
  const roleToggle = Array.from(document.querySelectorAll('button')).filter(b => /^(교수자|학생)$/.test((b.textContent||'').trim()));
  const primaryBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
    const c = getComputedStyle(el).backgroundColor;
    return c.includes('21, 126, 244');
  });
  return {
    asideExists: !!aside,
    roleToggleCount: roleToggle.length,
    h1: document.querySelector('h1')?.textContent?.trim(),
    primaryButtonText: primaryBtn ? (primaryBtn.textContent||'').trim().slice(0,30) : null,
    primaryButtonBg: primaryBtn ? getComputedStyle(primaryBtn).backgroundColor : null
  };
});

console.log('=== 핸드오프 (dist-singlefile) 검증 ===');
console.log(JSON.stringify(state, null, 2));

await ctx.close();
await browser.close();
