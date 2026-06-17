import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:9222');
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    console.log('PAGE:', p.url());
    for (const f of p.frames()) {
      console.log('  FRAME:', f.url());
    }
  }
}
await browser.close();
