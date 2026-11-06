// 真实游戏截图 + 实机录像采集脚本
// 用法: NODE_PATH=<global node_modules> node capture-game.mjs
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/马清雄/AppData/Roaming/npm/node_modules/');
const puppeteer = require('puppeteer');

const ROOT = path.resolve('.');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'taptap-assets');
const PORT = 8931;
const W = 1920, H = 1080;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      let file = path.join(DIST, p);
      if (!existsSync(file)) file = path.join(DIST, 'index.html');
      try {
        const buf = await readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      } catch { res.writeHead(404); res.end(); }
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(path.join(OUT, 'raw'), { recursive: true });
  const srv = await serve();
  const browser = await puppeteer.launch({ headless: 'new', args: [`--window-size=${W},${H}`, '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
  await sleep(3000);

  // 主菜单
  await page.screenshot({ path: path.join(OUT, 'raw', 'menu.png') });
  console.log('menu captured');

  // 开始游戏 → 角色选择
  await page.evaluate(() => { document.querySelector('.menu-actions .btn.primary')?.click(); });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, 'raw', 'select.png') });

  // 进入韭菜田
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => x.textContent.includes('进入韭菜田'));
    b?.click();
  });
  console.log('battle starting...');
  await sleep(4000);

  // ---- 开启实机录像（CDP screencast）----
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async (ev) => {
    const { data, sessionId, metadata } = ev;
    frames.push({ data, ts: metadata.timestamp ?? Date.now() / 1000 });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

  // ---- 战斗自动化 ----
  const shotTimes = [10, 24, 40, 58, 76]; // 秒
  const t0 = Date.now();
  const held = new Set();
  const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  let upgradesHandled = 0;
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const loop = setInterval(async () => {
    const t = (Date.now() - t0) / 1000;
    // 处理升级三选一
    page.evaluate(() => {
      const cards = document.querySelectorAll('.upgrade .card');
      if (cards.length && !document.querySelector('.upgrade .card.picked')) {
        cards[Math.floor(Math.random() * cards.length)].click();
      }
    }).catch(() => {});
    // 移动
    if (Math.random() < 0.4 || held.size === 0) {
      (async () => {
        for (const k of KEYS) { if (held.has(k)) { await page.keyboard.up(k).catch(() => {}); held.delete(k); } }
        const n = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) { const k = rand(KEYS); if (!held.has(k)) { held.add(k); await page.keyboard.down(k).catch(() => {}); } }
      })().catch(() => {});
    }
    // 大招
    if (Math.random() < 0.02) page.keyboard.press('Space').catch(() => {});
    // 定点截图
    const idx = shotTimes.findIndex((s) => Math.abs(t - s) < 0.25);
    if (idx >= 0) {
      const name = `shot${idx + 1}`;
      await page.screenshot({ path: path.join(OUT, 'raw', `${name}.png`) }).catch(() => {});
      console.log(`captured ${name} at t=${t.toFixed(1)}s`);
    }
    if (t > 82) clearInterval(loop);
  }, 250);

  await sleep(84000);
  await cdp.send('Page.stopScreencast').catch(() => {});
  for (const k of held) await page.keyboard.up(k).catch(() => {});
  console.log(`total frames: ${frames.length}, upgrades handled ~${upgradesHandled}`);

  // 写帧
  await mkdir(path.join(OUT, 'frames'), { recursive: true });
  let i = 0;
  for (const f of frames) {
    await writeFile(path.join(OUT, 'frames', `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    i++;
  }
  // 时间戳文件供 ffmpeg 参考
  const ts = frames.map((f) => f.ts);
  await writeFile(path.join(OUT, 'frames', 'timestamps.json'), JSON.stringify({ start: ts[0], end: ts[ts.length - 1], count: frames.length }));

  await browser.close();
  srv.close();
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
