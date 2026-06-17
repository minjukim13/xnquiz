import { chromium } from 'playwright';

const CDP_URL = 'http://localhost:9222';
const CANVAS_URL_MATCH = /external_tools\/283/;

export async function attachCanvasPage() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  let page = null;

  for (const ctx of contexts) {
    for (const p of ctx.pages()) {
      if (CANVAS_URL_MATCH.test(p.url())) {
        page = p;
        break;
      }
    }
    if (page) break;
  }

  if (!page) {
    throw new Error('Canvas xnquiz tab not found. Open https://cnvs-dev.xinics.kr/courses/32269/external_tools/283');
  }

  return { browser, page };
}

export async function getQuizFrame(page) {
  await page.waitForLoadState('domcontentloaded');
  for (let i = 0; i < 10; i++) {
    const frames = page.frames();
    for (const f of frames) {
      const url = f.url();
      // Match either /xn-quiz/ or /quiz/<uuid>/... but NOT the outer Canvas LMS frame
      const isXnQuiz = url.includes('/xn-quiz/') ||
        (url.includes('cnvs-dev.xinics.kr/quiz/') && !url.includes('/courses/'));
      if (isXnQuiz) {
        try {
          await f.waitForLoadState('domcontentloaded', { timeout: 3000 });
        } catch {}
        return f;
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error('xn-quiz frame not found');
}

export function ts() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
}
