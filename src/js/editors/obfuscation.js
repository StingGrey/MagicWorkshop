/* Obfuscation logic - Gilbert curve pixel scrambling */
import { state, OBF_HISTORY_KEY } from '../state.js';
import { getT } from '../i18n.js';
import { showToast, downloadBlob } from '../utils.js';
import { insertPngChunks } from '../parsers/png.js';

export function gilbert2d(width, height) {
  const coords = [];
  if (width >= height) gen2d(0, 0, width, 0, 0, height, coords);
  else gen2d(0, 0, 0, height, width, 0, coords);
  return coords;
}

function gen2d(x, y, ax, ay, bx, by, coords) {
  const w = Math.abs(ax + ay), h = Math.abs(bx + by);
  const dax = Math.sign(ax), day = Math.sign(ay), dbx = Math.sign(bx), dby = Math.sign(by);
  if (h === 1) { for (let i = 0; i < w; i++) { coords.push([x, y]); x += dax; y += day; } return; }
  if (w === 1) { for (let i = 0; i < h; i++) { coords.push([x, y]); x += dbx; y += dby; } return; }
  let ax2 = Math.floor(ax / 2), ay2 = Math.floor(ay / 2), bx2 = Math.floor(bx / 2), by2 = Math.floor(by / 2);
  const w2 = Math.abs(ax2 + ay2), h2 = Math.abs(bx2 + by2);
  if (2 * w > 3 * h) {
    if ((w2 % 2) && (w > 2)) { ax2 += dax; ay2 += day; }
    gen2d(x, y, ax2, ay2, bx, by, coords);
    gen2d(x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by, coords);
  } else {
    if ((h2 % 2) && (h > 2)) { bx2 += dbx; by2 += dby; }
    gen2d(x, y, bx2, by2, ax2, ay2, coords);
    gen2d(x + bx2, y + by2, ax, ay, bx - bx2, by - by2, coords);
    gen2d(x + (ax - dax) + (bx2 - dbx), y + (ay - day) + (by2 - dby), -bx2, -by2, -(ax - ax2), -(ay - ay2), coords);
  }
}

export function runObfuscation(encrypt) {
  const img = document.getElementById('preview');
  if (!img.src || img.style.display === 'none') {
    if (document.getElementById('workCanvas').style.display !== 'block') return;
  }

  document.getElementById('obfStatus').textContent = "Processing... ✨";

  requestAnimationFrame(() => {
    const cvs = document.getElementById('workCanvas');
    const ctx = cvs.getContext('2d');
    if (img.style.display !== 'none') {
      cvs.width = img.naturalWidth;
      cvs.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      img.style.display = 'none';
      cvs.style.display = 'block';
    }

    const w = cvs.width, h = cvs.height;
    const d1 = ctx.getImageData(0, 0, w, h);
    const d2 = new ImageData(w, h);
    const curve = gilbert2d(w, h);
    const total = w * h;

    const pass = document.getElementById('obfPass').value;
    let off = 0;
    if (pass) {
      let hash = 5381;
      for (let i = 0; i < pass.length; i++) hash = ((hash << 5) + hash + pass.charCodeAt(i)) >>> 0;
      const ratio = 0.1 + (hash % 80000) / 100000;
      off = Math.round(ratio * total);
    } else {
      off = Math.round((Math.sqrt(5) - 1) / 2 * total);
    }

    for (let i = 0; i < total; i++) {
      const p1 = curve[i], p2 = curve[(i + off) % total];
      const i1 = 4 * (p1[0] + p1[1] * w), i2 = 4 * (p2[0] + p2[1] * w);
      if (encrypt) d2.data.set(d1.data.slice(i1, i1 + 4), i2);
      else d2.data.set(d1.data.slice(i2, i2 + 4), i1);
    }

    ctx.putImageData(d2, 0, 0);
    document.getElementById('obfStatus').textContent = "";
    showToast(encrypt ? getT('toastObfDone') : getT('toastRestored'), 'success');
    document.getElementById('btnSaveObf').disabled = false;
    document.getElementById('btnReloadObf').style.display = 'block';

    try {
      const dataUrl = cvs.toDataURL('image/png', 0.6);
      saveToObfHistory(dataUrl, state.currentFile?.name || 'processed.png');
    } catch (e) { console.error('History save error:', e); }
  });
}

export function saveObfuscated() {
  const cvs = document.getElementById('workCanvas');
  const mime = state.fileFormat === 'png' ? 'image/png' : 'image/jpeg';

  cvs.toBlob(async blob => {
    let finalBlob = blob;

    if (state.fileFormat === 'png' && state.pngCommentObj) {
      try {
        const buf = await blob.arrayBuffer();
        let cObj = { ...state.pngCommentObj };

        if (state.isSD) {
          const getVal = (id) => document.getElementById(id).value;
          if (getVal('fieldPrompt')) cObj["prompt"] = getVal('fieldPrompt');
          let out = cObj["prompt"] + "\nNegative prompt: " + (cObj["negative_prompt"] || "") + "\n";
          finalBlob = insertPngChunks(buf, { "parameters": out });
        } else {
          finalBlob = insertPngChunks(buf, { "Comment": JSON.stringify(cObj) });
        }
        showToast(getT('toastSaved'), 'success');
      } catch (e) { console.error("Meta inject failed", e); }
    }

    downloadBlob(finalBlob, "magic_result." + (state.fileFormat || 'png'));
  }, mime);
}

export function reloadFromCanvas() {
  const cvs = document.getElementById('workCanvas');
  cvs.toBlob(blob => {
    blob.name = "obfuscated." + (state.fileFormat || 'png');
    // We need to call loadFile which is in app.js - use window global
    if (window._loadFile) window._loadFile(blob);
  }, state.fileFormat === 'png' ? 'image/png' : 'image/jpeg');
}

/* --- OBFUSCATION HISTORY --- */
export function saveToObfHistory(dataUrl, filename) {
  try {
    let history = JSON.parse(localStorage.getItem(OBF_HISTORY_KEY) || '[]');
    history.unshift({ dataUrl, filename, time: Date.now() });
    if (history.length > 12) history = history.slice(0, 12);
    localStorage.setItem(OBF_HISTORY_KEY, JSON.stringify(history));
    renderObfHistory();
  } catch (e) { console.error('History save failed:', e); }
}

export function renderObfHistory() {
  const container = document.getElementById('obfHistory');
  if (!container) return;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(OBF_HISTORY_KEY) || '[]'); } catch (e) { }

  if (history.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:11px; padding:20px 0; grid-column: 1/-1;">暂无记录</div>';
    return;
  }

  container.innerHTML = history.map((item, i) => `
    <div style="cursor:pointer; border-radius:8px; overflow:hidden; border:2px solid var(--border-input); transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent-pink)'" onmouseout="this.style.borderColor='var(--border-input)'" onclick="loadFromHistory(${i})">
      <img src="${item.dataUrl}" style="width:100%; aspect-ratio:1; object-fit:cover;" alt="history"/>
    </div>
  `).join('');
}

export function loadFromHistory(index) {
  try {
    const history = JSON.parse(localStorage.getItem(OBF_HISTORY_KEY) || '[]');
    if (history[index]) {
      fetch(history[index].dataUrl)
        .then(res => res.blob())
        .then(blob => {
          blob.name = history[index].filename || 'history.png';
          if (window._loadFile) window._loadFile(blob);
          showToast('已加载历史图片', 'success');
        });
    }
  } catch (e) { console.error(e); }
}

export function clearObfHistory() {
  localStorage.removeItem(OBF_HISTORY_KEY);
  renderObfHistory();
  showToast('历史已清空', 'success');
}
