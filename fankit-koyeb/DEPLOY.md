# Deploy ke Koyeb

1. Push folder ini ke repo GitHub (mis. `fankit-koyeb`).
2. Koyeb Dashboard → Create Service → GitHub → pilih repo.
3. Builder: Dockerfile (auto-detect).
4. Port: 8080.
5. Health check: matikan atau set path `/` dengan timeout besar (scan butuh beberapa menit).
6. Deploy. Tunggu log "Serving!".
7. Buka URL service → download `manifest.json` (biasanya di `/manifest.json`).
8. Hapus service setelah selesai (biar tidak terus jalan).

# Termux (setelah manifest didapat)
pkg install nodejs pngquant libwebp
termux-setup-storage
mkdir -p ~/storage/shared/coc_assets
# salin manifest.json ke ~/storage/shared/coc_assets/
cd ~/fankit-dl
node bin/fankit-dl.mjs --out ~/storage/shared/coc_assets --list-only
node bin/fankit-dl.mjs --out ~/storage/shared/coc_assets --compress png --max-mb 20
