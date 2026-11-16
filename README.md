# Inline Inspection Dashboard

Dashboard inspeksi internal (React + Vite + Tailwind CSS v4) untuk tab **PSI LV.2**, **PSI LV.1**, **CFA**, **3rd Party T1QM**, dan **DLL.** dengan KPI, chart defect, foto defect, dan ekspor PDF.

## Sumber Data

| Tab | Sumber |
| --- | --- |
| PSI LV.2 | PostgreSQL sistem **mobile-100-inspection v0.1** (DB `m100`, tabel `submissions`) via API server lokal |
| 3rd Party T1QM, PSI LV.1, CFA, DLL. | Google Spreadsheet (tidak berubah) |

- Tab **PSI LV.2** tidak lagi dibaca dari Google Sheets — datanya query langsung dari PostgreSQL melalui API server Node kecil (`server/index.mjs`).
- **Fallback**: jika API/PSI DB tidak tersedia, tab PSI LV.2 otomatis kembali membaca dari Google Sheets lama sehingga dashboard tetap hidup.

## Setup

```bash
npm install
```

Buat file `.env` di root project (dari kredensial sistem mobile-100-inspection v0.1, **tidak di-commit**):

```env
# PostgreSQL mobile-100-inspection (pengguna dengan hak CREATE/etc untuk runtime API)
DATABASE_URL=postgres://<user>:<password>@127.0.0.1:5432/m100
# Folder foto defect yang di-serve /photos (dari .env sistem mobile-100-inspection)
PHOTO_DIR=path\ke\photo_dir
PSI_API_PORT=3011
PSI_API_CACHE_SECONDS=60
```

## Menjalankan

### Development

```bash
npm run psi-server   # API + foto PSI di http://localhost:3011
npm run dev          # dashboard di http://localhost:5173
```

Dev server Vite mem-proxy `/api/psi` dan `/photos` ke `PSI_API_PORT` (default `3011`), sehingga tabel PSI LV.2 tampil dari DB saat development.

### Production

```bash
npm run build
npm run psi-server   # menyajikan dist/ + endpoint API/foto pada PSI_API_PORT
```

> **Penting**: untuk production sekarang gunakan `npm run psi-server` (bukan `npm start` / `serve -s dist`), karena static server polos tidak bisa menyajikan endpoint `/api/psi` dan `/photos`.

## API Server (`server/index.mjs`)

| Endpoint | Deskripsi |
| --- | --- |
| `GET /api/psi/health` | Cek ketersediaan server, DB, dan `PHOTO_DIR` |
| `GET /api/psi/rows?level=lv2\|lv1\|all` | Data submissions dari DB `m100`, ter-cache 60 detik |
| `GET /photos/<object_key>` | Foto defect dari `PHOTO_DIR` (anti path traversal) |
| `/*` (statis) | Melayani hasil build `dist/` |

- PS API hanya **read-only** terhadap DB (query `submissions`, `submission_findings`, `submission_photos`).
- Row DB dipetakan ke format sheet dashboard: tanggal `DD/MM/YYYY`, KPI per inspector, slot defect 1–25 (defect/classification/qty), severity (minor/major/critical), 1 foto per slot, dan `status_po` PASS/FAIL.
- NBSP (`U+00A0`) di teks DB otomatis dinormalisasi ke spasi biasa.

## Struktur Penting

```
server/index.mjs                    # API server PSI (Node + pg)
src/services/psiApiService.js       # fetch PSI rows & health check dari frontend
src/services/googleSheetService.js  # Google Sheets + merge/fallback PSI LV.2
src/pages/Dashboard.jsx             # state, filter tanggal, resolve type
src/components/DashboardContentView.jsx  # KPI, tabel defect, foto, PDF export
vite.config.js                      # proxy dev /api/psi & /photos
```

## Catatan

- File `.env` berada di `.gitignore`; konfigurasi server PSI di-override lewat `PSI_API_PORT` / `PSI_API_CACHE_SECONDS`.
- Port dev default: Vite di `5173`, API PSI di `3011`. Keduanya dapat diubah via env.
