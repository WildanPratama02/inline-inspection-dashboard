// PSI Dashboard API server
// Membaca database m100 (tabel submissions + submission_findings + submission_photos)
// dari sistem mobile-100-inspection v0.1, lalu men-serve data untuk tab PSI LV.2.
//
// Endpoint:
//   GET /api/psi/rows?level=lvl2|lvl1|all  → rows siap pakai untuk dashboard
//   GET /api/psi/health                    → cek status server & DB
//   GET /photos/<object_key>               → file foto defect dari PHOTO_DIR
//   (static)                               → dist/ build frontend (production)
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Kolom `date` PostgreSQL (oid 1082) secara default di-parsi node-postgres
// menjadi JS Date local-midnight, sehingga toISOString() di zona UTC+X
// menggeser tanggal mundur 1 hari (mis. 2026-11-03 → "02/11/2026").
// Kembalikan string mentah 'YYYY-MM-DD' agar tidak ada pergeseran timezone.
pg.types.setTypeParser(1082, (v) => v);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ── Env loader (.env sederhana, tanpa dependensi dotenv) ──
const envVars = {};
try {
  const envFile = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !match[1].startsWith('#')) envVars[match[1]] = match[2];
  }
} catch { /* .env tidak ada — pakai process.env */ }
const env = (key, fallback) => envVars[key] || process.env[key] || fallback;

const DATABASE_URL = env('DATABASE_URL', '');
const PHOTO_DIR = path.resolve(env('PHOTO_DIR', ''));
const PORT = parseInt(env('PSI_API_PORT', '3011'), 10);
const CACHE_SECONDS = parseInt(env('PSI_API_CACHE_SECONDS', '60'), 10);

if (!DATABASE_URL) {
  console.error('[psi-api] DATABASE_URL tidak ditemukan. Isi .env lebih dulu.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 5,
  // Menjalankan query khusus baca pada user m100_app.
});

// ── Query utama: submissions + findings + photos ──
const FETCH_SQL = `
  WITH s AS (
    SELECT
      s.id, s.sealed_at, s.received_at, s.inspection_date, s.app_version,
      s.username, s.level, s.factory, s.cell, s.po, s.article, s.model,
      s.destination, s.order_qty, s.podd, s.crd,
      s.partial_no, s.partial_qty,
      s.qty_rework, s.qty_rework_approved, s.qty_bgrade_inspections,
      s.qty_inspection, s.qty_a_grade, s.qty_b_grade, s.qty_defect, s.qty_no_defect,
      s.rft, s.defect_rate, s.counting_rule
    FROM submissions s
    WHERE ($1 = '' OR s.level = $1)
      AND s.inspection_date >= $2
      AND s.inspection_date <= $3
    ORDER BY s.inspection_date ASC, s.display_no ASC
  ),
  f AS (
    SELECT
      s.id AS submission_id, s.inspection_date,
      f.id AS finding_id, f.defect_id, f.defect_name, f.severity, f.qty
    FROM s
    JOIN submission_findings f ON f.submission_id = s.id
  ),
  p AS (
    SELECT sp.submission_id, sp.defect_id, sp.object_key
    FROM submission_photos sp
  )
  SELECT
    s.*,
    COALESCE(
      (SELECT json_agg(f.*) FROM f WHERE f.submission_id = s.id),
      '[]'::json
    ) AS findings,
    COALESCE(
      (SELECT json_agg(json_build_object('defect_id', p.defect_id, 'object_key', p.object_key))
       FROM p WHERE p.submission_id = s.id),
      '[]'::json
    ) AS photos
  FROM s
`;

// ── Utility ──
function pad2(n) { return String(n).padStart(2, '0'); }
function dateToSlash(dd) { // ISO → DD/MM/YYYY (konsisten dgn format sheet lain)
  if (!dd) return '';
  if (dd instanceof Date) {
    // Fallback: gunakan komponen lokal, bukan UTC
    return `${pad2(dd.getDate())}/${pad2(dd.getMonth() + 1)}/${dd.getFullYear()}`;
  }
  const d = String(dd).slice(0, 10);
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function formatDateOrDash(dd) { return dd ? dateToSlash(dd) : '-'; }
const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v)) || 0;
// DB m100 menyimpan U+00A0 (non-breaking space) pada beberapa kolom teks —
// normalisasi ke spasi biasa supaya konsisten dengan data dari Google Sheets.
const cleanText = (v) => String(v || '').replace(/\u00A0/g, ' ').trim();

// ├── Mapping 1 baris DB (submissions + findings + photos) → kolom dashboard ──//
function mapRowToDashboard(row) {
  const isLv2 = String(row.level).toUpperCase() === 'PSI LV.2';

  // Findings → slot defect 1..25 (urutan sesuai unique constraint secara stabil)
  const findings = (row.findings || []).slice().sort((a, b) =>
    String(a.defect_id).localeCompare(String(b.defect_id)) || a.finding_id - b.finding_id);
  const photoMap = new Map((row.photos || []).map(p => [String(p.defect_id), p.object_key]));

  let totalMinor = 0, totalMajor = 0, totalCritical = 0;
  const slots = {};
  findings.slice(0, 25).forEach((f, i) => {
    const slot = i + 1;
    const qty = toNumber(f.qty);
    const sev = String(f.severity || '').toUpperCase();
    if (sev === 'MINOR') totalMinor += qty;
    else if (sev === 'MAJOR') totalMajor += qty;
    else if (sev === 'CRITICAL') totalCritical += qty;
    slots[`defect_name_${slot}`] = String(f.defect_name || '');
    slots[`classification_${slot}`] = sev;
    slots[`qty_defect_${slot}`] = qty;
    // Layout sheet: 1 slot defect punya maksimal 3 kolom foto (link{n}).
    // m100 hanya menyimpan 1 foto per defect — taruh di kolom pertama slot.
    const objectKey = photoMap.get(String(f.defect_id));
    if (objectKey) slots[`link${(slot - 1) * 3 + 1}`] = `/photos/${objectKey}`;
  });

  // RFT DB disimpan desimal 0..1 (mis. 0.9) → tampil "90.0%" seperti sheet.
  const rftPct = toNumber(row.rft) * 100;
  const defectRatePct = toNumber(row.defect_rate) * 100;

  return {
    // kunci ini untuk referensi (opsional dipakai di luar dashboard)
    submission_id: row.id,
    display_no: row.display_no,
    level: String(row.level).trim().toUpperCase(), // 'PSI LV.2'

    date: dateToSlash(row.inspection_date),
    factory: cleanText(row.factory),
    cell: cleanText(row.cell),
    model: cleanText(row.model),
    article: cleanText(row.article),
    po: cleanText(row.po),
    partial: row.partial_no ? String(row.partial_no) : '',
    destination: cleanText(row.destination),
    crd: formatDateOrDash(row.crd),
    podd: formatDateOrDash(row.podd),
    finish_production: '',

    qty_order: toNumber(row.order_qty),
    qty_inspection: toNumber(row.qty_inspection),
    qty_rework: toNumber(row.qty_rework),
    qty_rework_approved: toNumber(row.qty_rework_approved),
    qty_bgrade_inspections: toNumber(row.qty_bgrade_inspections),
    sample_lot: '',
    type_inspection: String(row.level).trim().toUpperCase(), // 'PSI LV.2'

    total_a_grade: toNumber(row.qty_a_grade),
    b_grade: toNumber(row.qty_b_grade),
    total_defect: toNumber(row.qty_defect),
    defect_rate: defectRatePct.toFixed(2),
    rft: `${rftPct.toFixed(1)}%`,
    counting_rule: row.counting_rule || '',

    total_minor: totalMinor,
    total_major: totalMajor,
    total_critical: totalCritical,

    inspector: cleanText(row.username) || '-',
    psi_name: cleanText(row.username) || '-',
    psi_lv2_name: isLv2 ? (cleanText(row.username) || '-') : '-',
    status_po: isLv2 ? (toNumber(row.qty_defect) === 0 ? 'PASS' : 'FAIL') : '',

    ...slots,
  };
}

// ── Cache sederhana (mengurangi beban Postgres saat banyak yang membuka dashboard) ──
let cache = { at: 0, ttl: 0, payload: null };
async function fetchPsiRows() {
  const now = Date.now();
  if (cache.payload && now - cache.at < cache.ttl) return cache.payload;

  const client = await pool.connect();
  try {
    const res = await client.query(FETCH_SQL, ['', '1970-01-01', '2999-12-31']);
    const rows = res.rows.map(mapRowToDashboard);
    cache = { at: now, ttl: CACHE_SECONDS * 1000, payload: rows };
    return rows;
  } finally {
    client.release();
  }
}

// ── Static files ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
function tryServe(pathname, res) {
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(DIST, safe === '/' ? 'index.html' : safe);
  if (!file.startsWith(DIST)) return false;
  try {
    if (fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
      return true;
    }
  } catch { /* not found */ }
  return false;
}

// Kirim satu file foto dari PHOTO_DIR
function servePhoto(urlPath, res) {
  const objectKey = decodeURIComponent(urlPath.replace(/^\/photos\//, '')).replace(/\\/g, '/');
  if (!objectKey || objectKey.includes('..')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Bad request');
    return;
  }
  const full = path.join(PHOTO_DIR, objectKey);
  if (!full.startsWith(PHOTO_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Photo not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(full).pipe(res);
}

// ── HTTP server ──
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // CORS terbuka (frontend boleh di host yang beda)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

  try {
    // 1) API data PSI
    if (pathname === '/api/psi/rows') {
      const level = (url.searchParams.get('level') || 'lv2').toLowerCase();
      const where = level === 'all' ? '' : level === 'lv1' ? 'PSI lv.1' : level === 'lv2' ? 'PSI lv.2' : '';
      const rows = await fetchPsiRows();
      const filtered = where ? rows.filter(r => r.level === where.toUpperCase()) : rows;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, level: where || 'all', rows: filtered }));
      return;
    }
    if (pathname === '/api/psi/health') {
      const client = await pool.connect();
      try { await client.query('SELECT 1'); } finally { client.release(); }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, db: true, photoDir: fs.existsSync(PHOTO_DIR) }));
      return;
    }

    // 2) Foto defect
    if (pathname.startsWith('/photos/')) { servePhoto(pathname, res); return; }

    // 3) Static dist (production: jalankan server ini, bukan `serve`)
    if (tryServe(pathname, res)) return;
    // SPA fallback → index.html
    if (tryServe('/index.html', res)) return;

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  } catch (err) {
    console.error('[psi-api]', err);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`[psi-api] PSI dashboard API aktif di http://localhost:${PORT}`);
  console.log(`[psi-api] DB: ${DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`[psi-api] PHOTO_DIR: ${PHOTO_DIR}`);
});
