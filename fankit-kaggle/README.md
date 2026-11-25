# fankit-dl v2 (PC & Termux)

Pisah dua tahap supaya ringan:
1. **Scan** (butuh Chrome + `puppeteer-core`) -> menghasilkan `manifest.json`. Cukup sekali, bisa di PC.
2. **Download + kompres** (murni Node 18+, **tanpa dependensi**) -> jalan di Termux.

## Termux
    pkg update && pkg install nodejs pngquant libwebp
    termux-setup-storage
    # salin manifest.json dari PC ke folder output, mis. ~/storage/shared/coc_assets/
    node bin/fankit-dl.mjs --out ~/storage/shared/coc_assets --list-only
    node bin/fankit-dl.mjs --out ~/storage/shared/coc_assets --compress png --max-mb 20

## Scan di PC
    npm install
    node bin/fankit-dl.mjs --scan-only --out coc_assets    # hasil: coc_assets/manifest.json

(Scan langsung di Termux hanya jika Chromium terpasang, mis. `pkg install tur-repo chromium`,
lalu `npm install` dan `--chrome $PREFIX/bin/chromium`. Berat & tidak dijamin jalan.)

## Kompres
- `--compress png`  : pngquant, tetap PNG + transparan, biasanya 50-70% lebih kecil
- `--compress webp` : cwebp, ubah PNG/JPG -> WebP, biasanya lebih kecil lagi
- Original langsung diganti hasil kompres (hemat penyimpanan); jika hasil tidak lebih kecil, original dipertahankan
- Audio/file lain tidak diubah
- Hemat **kuota** hanya lewat `--ext`, `--max-mb`, dan skip otomatis (kompres terjadi setelah download)

## Skip & resume
`done.json` mencatat file yang selesai (termasuk yang terkompres), `.part` dilanjutkan dengan HTTP Range.
Jika muncul 403, link bertanda tangan kedaluwarsa: jalankan `--rescan`.
