import { chromium } from 'playwright';
import { attachCanvasPage, getQuizFrame, ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const PROTO_URL = 'http://localhost:5173/';
const stamp = ts();

const browser = await chromium.connectOverCDP('http://localhost:9222');

// 1. Canvas Dev
const ctxs = browser.contexts();
let canvasPage = null;
for (const c of ctxs) {
  for (const p of c.pages()) {
    if (/external_tools\/283/.test(p.url())) { canvasPage = p; break; }
  }
  if (canvasPage) break;
}
await canvasPage.bringToFront();
await canvasPage.waitForTimeout(800);

const canvasFrame = await (async () => {
  for (const f of canvasPage.frames()) {
    if (f.url().includes('/xn-quiz/')) return f;
  }
})();

const devShot = `${SHOT_DIR}/02-dev-quiz-list-${stamp}.png`;
await canvasPage.screenshot({ path: devShot });
console.log('[shot] canvas dev ->', devShot);

const devData = await canvasFrame.evaluate(() => {
  const grab = (el) => el ? {
    text: (el.textContent || '').trim().slice(0, 80),
    cls: el.className,
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
    rect: el.getBoundingClientRect().toJSON()
  } : null;
  return {
    headerArea: Array.from(document.querySelectorAll('h1,h2,h3')).map(grab),
    primaryActions: Array.from(document.querySelectorAll('button')).filter(b => {
      const c = b.className;
      return c.includes('primary') || c.includes('Primary');
    }).map(grab),
    secondaryActions: Array.from(document.querySelectorAll('button')).filter(b => {
      const c = b.className;
      return c.includes('secondary') || c.includes('outline');
    }).map(grab),
    emptyState: (() => {
      const cand = Array.from(document.querySelectorAll('*')).find(e => {
        const t = (e.textContent || '').trim();
        return t === '시험이 없습니다.' || t.startsWith('시험이 없');
      });
      return grab(cand);
    })(),
    filters: Array.from(document.querySelectorAll('button')).filter(b => {
      const t = (b.textContent || '').trim();
      return /^전체 (주차|차시)$|^최근/.test(t);
    }).map(grab),
    bodyBg: getComputedStyle(document.body).backgroundColor
  };
});

// 2. Prototype
const protoCtx = await browser.newContext();
const protoPage = await protoCtx.newPage();
await protoPage.setViewportSize({ width: 1280, height: 800 });
await protoPage.goto(PROTO_URL, { waitUntil: 'domcontentloaded' });
await protoPage.waitForTimeout(1500);

const protoShot = `${SHOT_DIR}/02-proto-quiz-list-${stamp}.png`;
await protoPage.screenshot({ path: protoShot });
console.log('[shot] prototype ->', protoShot);

const protoData = await protoPage.evaluate(() => {
  const grab = (el) => el ? {
    text: (el.textContent || '').trim().slice(0, 80),
    cls: el.className,
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
    rect: el.getBoundingClientRect().toJSON()
  } : null;
  const allBtns = Array.from(document.querySelectorAll('button'));
  return {
    headerArea: Array.from(document.querySelectorAll('h1,h2,h3')).map(grab),
    allButtons: allBtns.slice(0, 20).map(grab),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    emptyState: (() => {
      const cand = Array.from(document.querySelectorAll('*')).find(e => {
        const t = (e.textContent || '').trim();
        return t.includes('시험이 없') || t.includes('퀴즈가 없') || t.includes('아직 생성된');
      });
      return grab(cand);
    })()
  };
});

console.log('\n=== CANVAS DEV ===');
console.log(JSON.stringify(devData, null, 2));
console.log('\n=== PROTOTYPE ===');
console.log(JSON.stringify(protoData, null, 2));

await protoCtx.close();
await browser.close();
