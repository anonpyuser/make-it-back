// Renders icons/icon.svg to PNG sizes using headless Chrome.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const page = await browser.newPage();
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const png = await page.screenshot({ path: new URL(`../icons/${name}`, import.meta.url).pathname });
  // binary PNGs aren't committed; a base64 copy is, and the deploy workflow decodes it
  writeFileSync(new URL(`../icons/b64/${name}.b64`, import.meta.url), png.toString('base64'));
}
await browser.close();
console.log('icons done');
