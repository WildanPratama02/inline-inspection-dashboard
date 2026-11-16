import axios from 'axios';

// API server PSI (server/index.mjs) — sumber data dashboard PSI LV.2 dari
// database m100 milik sistem mobile-100-inspection v0.1 (tabel submissions).
const PSI_API_BASE = import.meta.env.VITE_PSI_API_BASE || ''; // kosong = same-origin (dev proxy / server static)

const LEVELS = {
  'PSI LV.1': 'lv1',
  'PSI LV.2': 'lv2',
};

// ── Fetch rows PSI dari API server (submissions + findings + photos) ──
export const fetchPsiRows = async (level = 'PSI LV.2') => {
  const levelParam = LEVELS[level] || 'lv2';
  const res = await axios.get(`${PSI_API_BASE}/api/psi/rows`, { params: { level: levelParam } });
  const rows = (res.data && res.data.rows) || [];
  // Flag asal data agar UI/export tidak perlu menebak-nebak
  rows.forEach((r) => { r.source = 'M100DB'; });
  return rows;
};

export const checkPsiApiHealth = async () => {
  const res = await axios.get(`${PSI_API_BASE}/api/psi/health`, { timeout: 5000 });
  return res.data;
};
