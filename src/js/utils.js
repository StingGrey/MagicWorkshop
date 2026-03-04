/* All utility functions */

// --- DOM Helpers ---
export function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function setFieldVal(el, val) {
  const node = (typeof el === 'string') ? document.getElementById(el) : el;
  if (!node) return;
  node.value = (val === undefined || val === null) ? '' : val;
}

export function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

// --- Toast ---
export function showToast(msg, type = 'normal') {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// --- File Helpers ---
export function downloadBlob(b, n) {
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = n;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function blobToDataURL(blob) {
  return new Promise(r => {
    const fr = new FileReader();
    fr.onload = e => r(e.target.result);
    fr.readAsDataURL(blob);
  });
}

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// --- Binary Helpers ---
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c >>> 0;
}

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function decodeBinaryString(buffer) {
  try { return new TextDecoder('utf-8').decode(buffer); }
  catch (e) {
    try { return new TextDecoder('latin1').decode(buffer); }
    catch (err) { return ""; }
  }
}

export function extractJsonNearKeyword(str, keyword) {
  const idx = str.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return null;
  let start = idx;
  while (start > 0 && str[start] !== '{') start--;
  if (str[start] !== '{') return null;
  let depth = 0;
  const limit = Math.min(str.length, start + 20000);
  for (let i = start; i < limit; i++) {
    const ch = str[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return null;
}

// --- EXIF Coordinate Helpers ---
export function dmsRationalToDeg(dms, ref) {
  if (!dms || dms.length < 3) return 0;
  const d = dms[0][0] / dms[0][1];
  const m = dms[1][0] / dms[1][1];
  const s = dms[2][0] / dms[2][1];
  let deg = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') deg = -deg;
  return deg;
}

export function degToDmsRational(deg) {
  const absDeg = Math.abs(deg);
  const d = Math.floor(absDeg);
  const m = Math.floor((absDeg - d) * 60);
  const s = (absDeg - d - m / 60) * 3600;
  return [[d, 1], [m, 1], [Math.round(s * 10000), 10000]];
}

export function parseRational(val, scale = 1000000) {
  if (!val) return null;
  const v = String(val).trim();
  if (!v) return null;
  if (v.includes('/')) {
    const [a, b] = v.split('/');
    const num = parseFloat(a);
    const den = parseFloat(b);
    if (!isNaN(num) && !isNaN(den) && den !== 0) return [num, den];
  }
  const f = parseFloat(v);
  if (!isNaN(f)) return [Math.round(f * scale), scale];
  return null;
}

// --- Misc ---
export function updateNum(o, k, v) {
  if (v === '') delete o[k];
  else o[k] = isNaN(Number(v)) ? v : Number(v);
}
