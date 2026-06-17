import { chromium } from 'playwright';
import { ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Force reload to bypass cache
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.screenshot({ path: `${SHOT_DIR}/08-proto-quiz-list-after-${stamp}.png`, fullPage: false });

const state = await page.evaluate(() => {
  const primary = Array.from(document.querySelectorAll('button, a')).filter(el => {
    const c = getComputedStyle(el).backgroundColor;
    return c.includes('rgb(21') || c.includes('21, 126, 244');
  }).slice(0, 3).map(b => ({ text: (b.textContent||'').trim().slice(0,20), bg: getComputedStyle(b).backgroundColor }));

  const aside = document.querySelector('aside');
  const navLinks = document.querySelectorAll('aside a');
  const roleToggle = Array.from(document.querySelectorAll('button')).filter(b => /^(교수자|학생)$/.test((b.textContent||'').trim()));
  const logo = Array.from(document.querySelectorAll('*')).find(el => (el.textContent||'').trim() === 'XN Quiz');

  return {
    asideExists: !!aside,
    navLinkCount: navLinks.length,
    roleToggleCount: roleToggle.length,
    xnQuizLogoExists: !!logo,
    primaryButtonsFound: primary.length,
    primaryButtons: primary
  };
});

console.log('=== 프로토타입 변경 검증 ===');
console.log(JSON.stringify(state, null, 2));
console.log('\n예상값: asideExists=false, navLinkCount=0, roleToggleCount=0, xnQuizLogoExists=false, primaryButtons bg=rgb(21,126,244)');

await ctx.close();
await browser.close();
