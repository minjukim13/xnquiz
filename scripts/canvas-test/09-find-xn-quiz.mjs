import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const found = await page.evaluate(() => {
  const out = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (el.children.length > 0) continue;
    const t = (el.textContent || '').trim();
    if (t === 'XN Quiz') {
      let path = el.tagName;
      let cur = el.parentElement;
      let depth = 0;
      while (cur && depth < 6) {
        path = cur.tagName + (cur.id ? '#'+cur.id : '') + (cur.className ? '.'+cur.className.slice(0,40) : '') + ' > ' + path;
        cur = cur.parentElement;
        depth++;
      }
      out.push({ path, rect: el.getBoundingClientRect().toJSON() });
    }
  }
  return out;
});
console.log(JSON.stringify(found, null, 2));

await ctx.close();
await browser.close();
