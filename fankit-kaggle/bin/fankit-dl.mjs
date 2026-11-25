#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';

const DEFAULT_URL =
  'https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets' +
  '?asset-type97=App+Icons-_-Banners-_-Builder+Base-_-Buildings-_-Characters' +
  '-_-Clan+Capital-_-Clan+Shields-_-Decorations-_-Hero+Equipment-_-Hero+Pets' +
  '-_-Hero+Skins-_-Home+Village-_-Icons-_-League+Icons-_-Loading+Screens' +
  '-_-Magic+Items-_-Mega+Troops-_-Music+%26+SFX-_-Obstacles-_-Resources' +
  '-_-Sceneries-_-Seasonal%2FTemporary+Units-_-Siege+Machines-_-Spells' +
  '-_-Super+Troops-_-Town+Hall%2FBuilder+Hall%2FCapital+Hall-_-Guardian' +
  '-_-Defences-_-Emotes-_-Squads';

const HELP = `fankit-dl - downloader ringan aset Supercell Fankit (PC & Termux)

  --out <folder>       folder tujuan (default: coc_assets)
  --manifest <file>    daftar aset (default: <out>/manifest.json)
  --scan-only          hanya scan halaman -> tulis manifest, tanpa download
  --rescan             abaikan manifest lama, scan ulang
  --list-only          tampilkan jumlah & total ukuran yang masih perlu diunduh
  --ext png webp       hanya ekstensi tertentu
  --max-mb <n>         lewati file > n MB
  --compress <mode>    none (default) | png (pngquant) | webp (cwebp)
  --quality <1-100>    kualitas kompres (default 85)
  --url <url>          halaman Fankit lain
  --chrome <path>      path Chrome/Chromium/Edge untuk scan (atau env CHROME_PATH)
  --show-browser       tampilkan jendela browser (PC)
`;

// ---------- args ----------
const argv = process.argv.slice(2);
const opt = { out: 'coc_assets', ext: [], url: DEFAULT_URL, compress: 'none', quality: 85 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out') opt.out = argv[++i];
  else if (a === '--manifest') opt.manifest = argv[++i];
  else if (a === '--url') opt.url = argv[++i];
  else if (a === '--chrome') opt.chrome = argv[++i];
  else if (a === '--compress') opt.compress = argv[++i];
  else if (a === '--quality') opt.quality = parseInt(argv[++i], 10);
  else if (a === '--max-mb') opt.maxMb = parseFloat(argv[++i]);
  else if (a === '--list-only') opt.listOnly = true;
  else if (a === '--scan-only') opt.scanOnly = true;
  else if (a === '--rescan') opt.rescan = true;
  else if (a === '--use-manifest') { /* kompatibilitas: manifest otomatis dipakai */ }
  else if (a === '--show-browser') opt.show = true;
  else if (a === '--ext') {
    while (argv[i + 1] && !argv[i + 1].startsWith('--')) opt.ext.push(argv[++i].replace(/^\./, '').toLowerCase());
  } else if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
}
if (!['none', 'png', 'webp'].includes(opt.compress)) { console.error('--compress harus none|png|webp'); process.exit(1); }

const IS_TERMUX = (process.env.PREFIX || '').includes('com.termux');
const human = (n) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; n = Number(n) || 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safe = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'file';
const hasCmd = (c, flag = '--version') => !spawnSync(c, [flag], { stdio: 'ignore' }).error;

// ---------- 1. scan (butuh puppeteer-core + Chrome; hanya dimuat jika dipakai) ----------
function findChrome() {
  const c = [
    opt.chrome, process.env.CHROME_PATH,
    process.env.PREFIX && `${process.env.PREFIX}/bin/chromium`,
    process.env.PREFIX && `${process.env.PREFIX}/bin/chromium-browser`,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}

function walk(o, found) {
  if (Array.isArray(o)) o.forEach((x) => walk(x, found));
  else if (o && typeof o === 'object') {
    if (o.downloadUrl) found.set(o.id ?? o.downloadUrl, o);
    Object.values(o).forEach((v) => walk(v, found));
  }
}

async function scan() {
  let puppeteer;
  try { puppeteer = (await import('puppeteer-core')).default; }
  catch { throw new Error('puppeteer-core belum terpasang. Jalankan: npm install (atau scan di PC lalu salin manifest.json).'); }
  const exe = findChrome();
  if (!exe) throw new Error('Chrome/Chromium tidak ditemukan. Pakai --chrome <path>, atau scan di PC lalu salin manifest.json ke HP.');
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: !opt.show,
    args: IS_TERMUX ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] : [],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const found = new Map();
  page.on('response', async (res) => {
    try {
      if (!res.url().includes('graphql')) return;
      if (!(res.headers()['content-type'] || '').includes('json')) return;
      walk(await res.json(), found);
    } catch {}
  });
  await page.goto(opt.url, { waitUntil: 'networkidle2', timeout: 90000 });
  let idle = 0, last = -1;
  while (idle < 6) {
    await page.keyboard.press('End');
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 50) el.scrollTop = el.scrollHeight;
      });
      const b = [...document.querySelectorAll('button')].find((x) => /load more|show more/i.test(x.textContent));
      if (b) b.click();
    });
    await sleep(1500);
    process.stdout.write(`\r  aset terdeteksi: ${found.size}`);
    idle = found.size === last ? idle + 1 : 0;
    last = found.size;
  }
  console.log();
  await browser.close();
  return [...found.values()];
}

// ---------- 2. download (skip + resume) ----------
async function remoteSize(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return Number(r.headers.get('content-length')) || null;
  } catch { return null; }
}

async function fetchTo(item, dest, expected, retries = 3) {
  const part = dest + '.part';
  for (let a = 1; a <= retries; a++) {
    try {
      const start = fs.existsSync(part) ? fs.statSync(part).size : 0;
      const res = await fetch(item.url, { headers: start ? { Range: `bytes=${start}-` } : {} });
      if (res.status === 416) { fs.unlinkSync(part); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 403 ? ' (link kedaluwarsa? jalankan --rescan)' : ''}`);
      const append = start > 0 && res.status === 206;
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part, { flags: append ? 'a' : 'w' }));
      const size = fs.statSync(part).size;
      if (expected && size !== expected) throw new Error(`ukuran tidak cocok (${size} != ${expected})`);
      fs.renameSync(part, dest);
      return { bytes: size - (append ? start : 0) };
    } catch (e) {
      if (a === retries) throw e;
      await sleep(2000 * a);
    }
  }
  throw new Error('gagal');
}

// ---------- 3. kompres ----------
function compressFile(dir, name, ext) {
  const src = path.join(dir, name), tmp = src + '.tmp', before = fs.statSync(src).size;
  let outName = name, ok = false;
  const q = Math.min(Math.max(opt.quality, 1), 100);
  if (opt.compress === 'png' && ext === 'png') {
    const r = spawnSync('pngquant', [`--quality=${Math.max(q - 25, 0)}-${q}`, '--speed', '1', '--strip', '--force', '--output', tmp, src]);
    ok = r.status === 0 && fs.existsSync(tmp);
  } else if (opt.compress === 'webp' && ['png', 'jpg', 'jpeg'].includes(ext)) {
    outName = name.replace(/\.[^.]+$/, '.webp');
    const r = spawnSync('cwebp', ['-quiet', '-q', String(q), '-alpha_q', '100', '-m', '6', src, '-o', tmp]);
    ok = r.status === 0 && fs.existsSync(tmp);
  }
  if (!ok) { fs.rmSync(tmp, { force: true }); return { name, before, after: before }; }
  const after = fs.statSync(tmp).size;
  if (after >= before) { fs.unlinkSync(tmp); return { name, before, after: before }; } // tidak lebih kecil -> biarkan
  fs.renameSync(tmp, path.join(dir, outName));
  if (outName !== name) fs.unlinkSync(src);
  return { name: outName, before, after };
}

// ---------- main ----------
fs.mkdirSync(opt.out, { recursive: true });
const mfPath = opt.manifest || path.join(opt.out, 'manifest.json');
const donePath = path.join(opt.out, 'done.json');
let items;

if (fs.existsSync(mfPath) && !opt.rescan && !opt.scanOnly) {
  items = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  console.log(`Memuat ${items.length} aset dari ${mfPath}`);
} else {
  console.log('Memindai halaman Fankit...');
  const raw = await scan();
  if (!raw.length) { console.error('Tidak ada aset terdeteksi. Coba --show-browser (PC).'); process.exit(1); }
  const used = new Set();
  items = raw.map((a) => {
    const ext = String(a.extension || '').replace(/^\./, '').toLowerCase();
    let name = safe(a.filename || a.title || a.id);
    if (ext && !name.toLowerCase().endsWith('.' + ext)) name += '.' + ext;
    if (used.has(name)) name = name.replace(/(\.[^.]*)?$/, `_${a.id}$1`);
    used.add(name);
    return { id: a.id, name, url: a.downloadUrl, size: a.size ? Number(a.size) : null, ext };
  });
  fs.writeFileSync(mfPath, JSON.stringify(items, null, 2));
  console.log(`Manifest disimpan: ${mfPath} (${items.length} aset)`);
  if (opt.scanOnly) process.exit(0);
}

if (opt.ext.length) items = items.filter((i) => opt.ext.includes(i.ext));
if (opt.maxMb) items = items.filter((i) => !i.size || i.size <= opt.maxMb * 1048576);

const done = fs.existsSync(donePath) ? JSON.parse(fs.readFileSync(donePath, 'utf8')) : {};
const key = (i) => String(i.id ?? i.name);
const isDone = (i) => done[key(i)] && fs.existsSync(path.join(opt.out, done[key(i)].name));
const todo = items.filter((i) => !isDone(i));

console.log(`\nTotal aset       : ${items.length} (${human(items.reduce((s, i) => s + (i.size || 0), 0))})`);
console.log(`Sudah selesai    : ${items.length - todo.length}`);
console.log(`Perlu didownload : ${todo.length} (${human(todo.reduce((s, i) => s + (i.size || 0), 0))})`);
if (opt.listOnly) process.exit(0);

if (opt.compress === 'png' && !hasCmd('pngquant')) { console.error('pngquant belum ada. Termux: pkg install pngquant'); process.exit(1); }
if (opt.compress === 'webp' && !hasCmd('cwebp', '-version')) { console.error('cwebp belum ada. Termux: pkg install libwebp'); process.exit(1); }

let ok = 0, skip = 0, fail = 0, bytes = 0, saved = 0;
for (const [idx, it] of items.entries()) {
  const tag = `[${idx + 1}/${items.length}]`;
  if (isDone(it)) { skip++; console.log(`${tag} skip     ${it.name}`); continue; }
  try {
    const dest = path.join(opt.out, it.name);
    const expected = it.size || (await remoteSize(it.url));
    if (fs.existsSync(dest) && expected && fs.statSync(dest).size !== expected) fs.unlinkSync(dest);
    if (!fs.existsSync(dest)) bytes += (await fetchTo(it, dest, expected)).bytes;
    const r = compressFile(opt.out, it.name, it.ext);
    saved += r.before - r.after;
    done[key(it)] = { name: r.name, bytes: r.after };
    fs.writeFileSync(donePath, JSON.stringify(done));
    ok++;
    const note = r.after < r.before ? ` (${human(r.before)} -> ${human(r.after)})` : '';
    console.log(`${tag} ok       ${r.name}${note}`);
  } catch (e) {
    fail++;
    console.log(`${tag} gagal    ${it.name}: ${e.message}`);
  }
}
console.log(`\nSelesai. baru: ${ok}, dilewati: ${skip}, gagal: ${fail}`);
console.log(`Kuota terpakai: ${human(bytes)} | Hemat penyimpanan dari kompres: ${human(saved)}`);
if (fail) console.log('Jalankan lagi untuk mencoba ulang yang gagal (yang sudah selesai dilewati).');
