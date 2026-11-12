# RunMetrics Lab

Pelacak perkembangan lari (5K sampai Ultra) dan analisis beban latihan. Aplikasi 100% client-side:
semua data tersimpan di IndexedDB browser perangkatmu, tanpa backend.

## Menjalankan lokal

```bash
npm install      # menghasilkan package-lock.json, commit file ini
npm run dev      # pengembangan
npm test         # unit test (vitest)
npm run build    # hasil di dist/
npm run preview  # coba hasil build
```

Tailwind CSS dikunci di v3.4 (postcss + `tailwind.config.js`). Jangan upgrade ke v4.

## Deploy

**Vercel**: impor repo, build command `npm run build`, output directory `dist`. Tanpa konfigurasi lain.

**GitHub Pages**: di Settings → Pages pilih Source "GitHub Actions". Push ke `main`, workflow
`.github/workflows/deploy.yml` menjalankan `npm ci`, `npm test`, `npm run build`, lalu publikasi.
`base: './'` membuat aplikasi berjalan di sub-path `/nama-repo/`. Navigasi memakai state React,
jadi refresh halaman tidak menghasilkan 404.

## Pasang sebagai aplikasi (PWA)

- **Android (Chrome)**: menu ⋮ → "Instal aplikasi" atau "Tambahkan ke layar utama".
- **iOS (Safari)**: tombol Bagikan → "Tambah ke Layar Utama".

## Data hanya ada di perangkatmu

Menghapus data situs, memakai mode privat, atau mengganti perangkat berarti data hilang.
Ekspor backup secara rutin lewat menu Backup (tersedia mulai Fase 5).

## Parser FIT dan GPX

- **GPX**: `DOMParser` bawaan browser, tanpa pustaka. Hanya `trkpt` yang dibaca (`rte` dan `wpt` diabaikan).
  Titik dengan kecepatan implisit di atas 12 m/s dibuang, jeda (selisih waktu di atas 10 detik dan
  kecepatan di bawah 0,3 m/s) tidak dihitung sebagai waktu bergerak.
- **FIT**: `fit-file-parser` (versi 1.x), dimuat lewat dynamic import dan dibungkus Promise. Pembungkus
  mendukung varian callback maupun Promise. Isi file FIT diverifikasi dengan satu file nyata (Garmin,
  lari-jalan 3 km) memakai decoder independen: sport `running`, `total_timer_time` (waktu bergerak)
  lebih pendek dari waktu elapsed, hanya `enhanced_speed` dan `enhanced_altitude` yang terisi, cadence
  per kaki (rpm), posisi dalam semicircle. Yang **belum** dikonfirmasi: API pustaka (callback atau
  Promise) dan nama field keluarannya. Cek dengan `node scripts/inspect-fit.mjs lari.fit` dan catat di sini.
  Tes `fitRealShape.test.js` memakai fixture dari file nyata itu (tanpa GPS, tanggal digeser).
- Cadence dikali 2 (rpm menjadi spm) hanya bila sport `running` dan rata-rata mentah di bawah 120,
  dan hanya sekali.
- Pemilih file Android kadang menampilkan `.fit` sebagai abu-abu; file yang dipilih tetap divalidasi
  berdasarkan ekstensi.

## Struktur

- `src/tokens.js`: sumber tunggal design tokens. Tailwind membaca token ini dan juga
  mengeksposnya sebagai CSS variable (`--accent-from`, dst.) untuk SVG. Jangan menulis kode warna
  heksadesimal di komponen.
- `src/polyfills.js`: polyfill `Buffer`, harus menjadi import pertama di `src/main.jsx`.
- `src/db/runDatabase.js`: database Dexie `RunAnalyticsDB` (lima tabel di versi 1), transaksi atomik
  simpan dan hapus aktivitas, deduplikasi lewat `fingerprint`, dan pengaturan profil.
- `src/utils/dateUtils.js`: tanggal lokal (bukan UTC), awal minggu Senin, format pace dan durasi.
- `src/utils/fileParsers.js`, `runAnalytics.js`, `formValidation.js`, `importFile.js`: parser, analitik
  dasar (pace, TRIMP, sRPE, EF), validasi form, dan alur impor satu file.
- `src/components/`: `RunFileUploader`, `ManualRunModal`, `ProfileSettings`.
- `src/components/ui/`: komponen dasar (GlassCard, ProgressRing, SemiGauge, PillTabs, StatChip,
  ThinProgressBar, BottomNav, GradientDefs).
- `local-plans/` (di `.gitignore`): file program latihan pribadi, tidak ikut repo dan build.
