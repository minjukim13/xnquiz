import { attachCanvasPage } from './connect.mjs';

const { browser, page } = await attachCanvasPage();
await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(2000);

console.log('=== All frames ===');
const frames = page.frames();
for (let i = 0; i < frames.length; i++) {
  const f = frames[i];
  const url = f.url();
  let title = '';
  try {
    title = await f.title();
  } catch {}
  console.log(`[${i}] ${url.slice(0, 120)} | title=${title.slice(0, 40)}`);
}

console.log('\n=== Top-level iframes ===');
const iframes = await page.$$('iframe');
for (let i = 0; i < iframes.length; i++) {
  const el = iframes[i];
  const src = await el.getAttribute('src');
  const id = await el.getAttribute('id');
  const name = await el.getAttribute('name');
  console.log(`[${i}] src=${(src||'').slice(0,100)} id=${id} name=${name}`);
}

await browser.close();
