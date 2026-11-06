// 渲染商店素材（图标 / 横版宣传图 / 方图宣传图）
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/马清雄/AppData/Roaming/npm/node_modules/');
const puppeteer = require('puppeteer');

const OUT = path.resolve('taptap-assets');
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto(pathToFileURL(path.resolve('tools/render-materials.html')).href);
await page.waitForFunction('window.RENDER_DONE === true');

for (const [id, name] of [['icon', 'icon_512.png'], ['banner', 'banner_16x9.png'], ['square', 'promo_1x1.png'], ['coverv', 'cover_vertical.png']]) {
  const el = await page.$(`#${id}`);
  await el.screenshot({ path: path.join(OUT, name) });
  console.log('saved', name);
}
await browser.close();
