import { chromium } from 'playwright';
import { ts } from './connect.mjs';

const SHOT_DIR = 'C:/Users/김민주/Downloads/QUIZ참고/Canvas_Dev_테스트/screenshots';
const stamp = ts();

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 1200 });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// Read quizzes from localStorage or fetch from page data
const firstQuizId = await page.evaluate(() => {
  // Try localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.includes('quiz')) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (Array.isArray(v) && v[0]?.id) return v[0].id;
        if (v.quizzes && v.quizzes[0]?.id) return v.quizzes[0].id;
      } catch {}
    }
  }
  return null;
});
console.log('first quiz id from localStorage:', firstQuizId);

// Fallback — navigate to /quiz/new with proto's own data
const targetUrl = firstQuizId ? `http://localhost:5173/quiz/${firstQuizId}/edit` : 'http://localhost:5173/quiz/new';
console.log('navigating to:', targetUrl);
await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const protoEditPage = await page.evaluate(() => ({
  url: location.pathname,
  h1: document.querySelector('h1')?.textContent?.trim(),
  buttons: Array.from(document.querySelectorAll('button')).slice(0, 30).map(b => (b.textContent||'').trim().slice(0,30)).filter(t => t && t.length < 30),
  steps: Array.from(document.querySelectorAll('[role="tab"], [class*="step"]')).map(s => (s.textContent||'').trim().slice(0,40)).filter(Boolean)
}));
console.log('proto edit page:', JSON.stringify(protoEditPage, null, 2));

// Navigate to step 2 / 문항 구성
const goStep2 = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, [role="tab"]'));
  const target = all.find(el => /^2\s*문항|문항\s*구성/.test((el.textContent||'').trim()));
  if (!target) return { ok: false };
  target.click();
  return { ok: true, text: target.textContent.trim() };
});
console.log('go step 2:', goStep2);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SHOT_DIR}/07-proto-step2-${stamp}.png`, fullPage: true });

const step2State = await page.evaluate(() => ({
  url: location.pathname,
  buttons: Array.from(document.querySelectorAll('button')).slice(0, 30).map(b => (b.textContent||'').trim().slice(0,30)).filter(t => t && t.length < 30),
  addCandidates: Array.from(document.querySelectorAll('button')).filter(b => /문항\s*추가|새\s*문항|문항\s*만들기|\+\s*문항/.test((b.textContent||'').trim())).map(b => b.textContent.trim())
}));
console.log('step 2 state:', JSON.stringify(step2State, null, 2));

// Try clicking 문항 추가
const addClick = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const t = btns.find(b => /문항\s*추가|문항\s*만들기/.test((b.textContent||'').trim()));
  if (!t) return { ok: false };
  t.click();
  return { ok: true, text: t.textContent.trim() };
});
console.log('add click:', addClick);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT_DIR}/07-proto-type-modal-${stamp}.png`, fullPage: false });

const typeModal = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    hasDialog: !!dialog,
    title: dialog?.querySelector('[id*="title"], h2')?.textContent?.trim(),
    types: dialog ? Array.from(dialog.querySelectorAll('button, [role="button"], [class*="card"]'))
      .map(c => (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,40))
      .filter(t => t && t.length < 40) : [],
    dialogText: dialog ? (dialog.textContent||'').slice(0, 500) : null
  };
});
console.log('PROTO type modal:', JSON.stringify(typeModal, null, 2));

// Click 객관식
const pickMC = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, [role="button"]'));
  const mc = all.find(b => /^객관식/.test((b.textContent||'').trim()));
  if (!mc) return { ok: false };
  mc.click();
  return { ok: true };
});
console.log('pick MC:', pickMC);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT_DIR}/07-proto-mc-form-${stamp}.png`, fullPage: false });

const mcForm = await page.evaluate(() => ({
  url: location.pathname,
  dialogTitle: document.querySelector('[role="dialog"] [id*="title"], [role="dialog"] h2')?.textContent?.trim(),
  labels: Array.from(document.querySelectorAll('[role="dialog"] label, label')).map(l => (l.textContent||'').replace(/\s+/g,' ').trim().slice(0,50)).filter(Boolean).slice(0,15),
  placeholders: Array.from(document.querySelectorAll('[role="dialog"] input, [role="dialog"] textarea')).map(i => i.placeholder).filter(Boolean),
  buttons: Array.from(document.querySelectorAll('[role="dialog"] button, button')).slice(0, 20).map(b => (b.textContent||'').trim().slice(0,30)).filter(Boolean)
}));
console.log('PROTO MC form:', JSON.stringify(mcForm, null, 2));

await ctx.close();
await browser.close();
