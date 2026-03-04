/* Info panel / image inspector */
import ExifReader from 'exifreader';
import pako from 'pako';
import { state } from '../state.js';
import { getT } from '../i18n.js';
import { escapeHtml, showToast, formatBytes } from '../utils.js';
import { extractPngChunks, decodePngTextChunk, decodePngITXtChunk } from '../parsers/png.js';
import { handleWebUiTag } from '../parsers/sd-parser.js';

export { ExifReader };

// ===== DataReader for Stealth Watermark =====
class DataReader {
  constructor(data) {
    this.data = data;
    this.index = 0;
  }
  readBit() { return this.data[this.index++]; }
  readNBits(n) {
    let bits = [];
    for (let i = 0; i < n; i++) bits.push(this.readBit());
    return bits;
  }
  readByte() {
    let byte = 0;
    for (let i = 0; i < 8; i++) byte |= this.readBit() << (7 - i);
    return byte;
  }
  readNBytes(n) {
    let bytes = [];
    for (let i = 0; i < n; i++) bytes.push(this.readByte());
    return bytes;
  }
  readInt32() {
    let bytes = this.readNBytes(4);
    return new DataView(new Uint8Array(bytes).buffer).getInt32(0, false);
  }
}

// ===== Stealth Exif Reader (NAI Hidden Watermark) =====
export async function getStealthExif(imgSrc) {
  try {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
    let img = new Image();
    img.src = imgSrc;
    await img.decode();
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    let imageData = ctx.getImageData(0, 0, img.width, img.height);
    let lowestData = [];
    for (let x = 0; x < img.width; x++) {
      for (let y = 0; y < img.height; y++) {
        let index = (y * img.width + x) * 4;
        let a = imageData.data[index + 3];
        lowestData.push(a & 1);
      }
    }
    const magic = "stealth_pngcomp";
    const reader = new DataReader(lowestData);
    const readMagic = reader.readNBytes(magic.length);
    const magicString = String.fromCharCode.apply(null, readMagic);
    if (magic === magicString) {
      const dataLength = reader.readInt32();
      const gzipData = reader.readNBytes(dataLength / 8);
      const data = pako.ungzip(new Uint8Array(gzipData));
      const jsonString = new TextDecoder().decode(new Uint8Array(data));
      const json = JSON.parse(jsonString);
      return json;
    }
  } catch (e) { console.log("Stealth exif error:", e); }
  return null;
}

// ===== JSON Tree Renderer (HTML string version for info panel) =====
export function renderJsonTree(obj, depth = 0, parentKey = '') {
  if (obj === null) return '<span class="json-null">null</span>';
  if (typeof obj === 'boolean') return `<span class="json-boolean">${obj}</span>`;
  if (typeof obj === 'number') return `<span class="json-number">${obj}</span>`;
  if (typeof obj === 'string') {
    return `<span class="json-string">"${escapeHtml(obj)}"</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '<span class="json-bracket">[]</span>';
    const items = obj.map((item, i) => `<li class="${typeof item === 'object' && item !== null ? 'json-expanded' : 'json-leaf'}"><span class="json-toggle" onclick="this.parentElement.classList.toggle('json-collapsed');this.parentElement.classList.toggle('json-expanded')"></span><span class="json-key">[${i}]</span>: ${renderJsonTree(item, depth + 1, String(i))}</li>`).join('');
    return `<span class="json-bracket">[</span><ul>${items}</ul><span class="json-bracket">]</span>`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '<span class="json-bracket">{}</span>';
    const items = keys.map(key => {
      const val = obj[key];
      const isComplex = typeof val === 'object' && val !== null;
      const shouldCollapse = key.includes('reference_image_multiple') || key.includes('reference_information_extracted_multiple');
      const expandedClass = isComplex ? (shouldCollapse ? 'json-collapsed' : 'json-expanded') : 'json-leaf';
      return `<li class="${expandedClass}"><span class="json-toggle" onclick="this.parentElement.classList.toggle('json-collapsed');this.parentElement.classList.toggle('json-expanded')"></span><span class="json-key">"${escapeHtml(key)}"</span>: ${renderJsonTree(val, depth + 1, key)}</li>`;
    }).join('');
    return `<span class="json-bracket">{</span><ul>${items}</ul><span class="json-bracket">}</span>`;
  }

  return String(obj);
}

// ===== Main Info Panel Populate Function =====
export async function populateInfoPanel(file, metaObjHint, rawChunksHint) {
  state.infoItems = [];
  state.infoExifItems = [];
  state.infoJsonData = null;
  state.infoMetaType = 'UNKNOWN';

  // === 1. File Info ===
  state.infoItems.push({ key: '文件名 / Filename', value: file.name });
  state.infoItems.push({ key: '文件大小 / Size', value: formatBytes(file.size) });

  const preview = document.getElementById('preview');
  if (preview && preview.naturalWidth) {
    state.infoItems.push({ key: '图片尺寸 / Dimensions', value: `${preview.naturalWidth} × ${preview.naturalHeight}` });
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // === 2. Read EXIF using ExifReader ===
  try {
    const exifData = await ExifReader.load(file);
    for (const [key, val] of Object.entries(exifData)) {
      if (key !== 'MakerNote' && key !== 'UserComment' && val.description !== undefined) {
        state.infoExifItems.push({ key: key, value: val.description });
      }
    }
  } catch (e) { console.log("EXIF read error:", e); }

  // === 3. Extract Metadata based on format ===
  let parsedItems = [];
  let foundMeta = false;

  if (state.fileFormat === 'png') {
    try {
      const chunks = extractPngChunks(buffer);
      const textChunks = chunks
        .filter(c => c.name === 'tEXt' || c.name === 'iTXt')
        .map(c => {
          if (c.name === 'iTXt') return decodePngITXtChunk(c.data);
          else return decodePngTextChunk(c.data);
        });

      if (textChunks.length === 0) {
        const stealthData = await getStealthExif(preview.src);
        if (stealthData) {
          state.infoMetaType = 'NOVELAI (Stealth)';
          state.infoJsonData = stealthData;
          for (const [k, v] of Object.entries(stealthData)) {
            parsedItems.push({ keyword: k, text: typeof v === 'object' ? JSON.stringify(v) : String(v) });
          }
          foundMeta = true;
        }
      } else if (textChunks.length === 1 && textChunks[0].keyword.toLowerCase() === 'parameters') {
        state.infoMetaType = 'SD-WEBUI';
        parsedItems = handleWebUiTag(textChunks[0].text);
        parsedItems.push({ keyword: '完整生成信息 / Full', text: textChunks[0].text });
        foundMeta = true;
      } else {
        state.infoMetaType = 'NOVELAI';
        for (const chunk of textChunks) {
          parsedItems.push({ keyword: chunk.keyword, text: chunk.text });
          if (chunk.keyword === 'Comment') {
            try { state.infoJsonData = JSON.parse(chunk.text); } catch (e) { }
          }
        }
        foundMeta = true;
      }
    } catch (e) { console.log("PNG chunk error:", e); }

  } else if (state.fileFormat === 'jpeg') {
    try {
      const exifData = await ExifReader.load(file);
      if (exifData.UserComment && exifData.UserComment.value) {
        let userComment = String.fromCodePoint(...exifData.UserComment.value).replace(/\x00/g, '').slice(7);
        if (userComment) {
          state.infoMetaType = 'SD-WEBUI (JPEG)';
          parsedItems = handleWebUiTag(userComment);
          parsedItems.push({ keyword: '完整生成信息 / Full', text: userComment });
          foundMeta = true;
        }
      }
    } catch (e) { console.log("JPEG EXIF error:", e); }

    if (!foundMeta) {
      const stealthData = await getStealthExif(preview.src);
      if (stealthData) {
        state.infoMetaType = 'NOVELAI (Stealth)';
        state.infoJsonData = stealthData;
        for (const [k, v] of Object.entries(stealthData)) {
          parsedItems.push({ keyword: k, text: typeof v === 'object' ? JSON.stringify(v) : String(v) });
        }
        foundMeta = true;
      }
    }
  } else if (file.type === 'image/webp' || file.type === 'image/avif') {
    try {
      const exifData = await ExifReader.load(file);
      if (exifData.UserComment && exifData.UserComment.value) {
        let userComment = String.fromCodePoint(...exifData.UserComment.value).replace(/\x00/g, '').slice(7);
        if (userComment) {
          state.infoMetaType = 'WebP/AVIF';
          parsedItems = handleWebUiTag(userComment);
          parsedItems.push({ keyword: '完整生成信息', text: userComment });
          foundMeta = true;
        }
      }
    } catch (e) { console.log("WebP EXIF error:", e); }
  }

  // === 4. Add parsed items to infoItems ===
  if (foundMeta) {
    state.infoItems.push({ key: '元数据类型 / Type', value: state.infoMetaType });
    for (const item of parsedItems) {
      state.infoItems.push({ key: item.keyword, value: item.text });
    }
  } else {
    state.infoItems.push({ key: '提示 / Notice', value: getT('infoNoData') });
  }

  renderInfoPanel();
  document.getElementById('btnCopyAll').disabled = false;
}

// ===== Render Info Panel =====
export function renderInfoPanel() {
  const fileEl = document.getElementById('infoFileContent');
  const fileItems = state.infoItems.slice(0, 4);
  fileEl.innerHTML = fileItems.map(item => `
    <div class="info-row">
      <span class="info-row-key">${escapeHtml(item.key)}</span>
      <span class="info-row-value">${escapeHtml(String(item.value))}</span>
    </div>
  `).join('');

  const genEl = document.getElementById('infoGenContent');
  const genItems = state.infoItems.slice(4);

  if (genItems.length > 0) {
    genEl.innerHTML = genItems.map(item => {
      const val = String(item.value);
      const isLongText = val.length > 80 || val.includes('\n');
      const trimmedVal = val.trim();
      const looksLikeJson = (trimmedVal.startsWith('{') && trimmedVal.endsWith('}')) ||
        (trimmedVal.startsWith('[') && trimmedVal.endsWith(']'));

      if (looksLikeJson) {
        try {
          const parsed = JSON.parse(trimmedVal);
          return `
            <div class="info-prompt-block">
              <div class="info-prompt-label">${escapeHtml(item.key)} 🌳</div>
              <div class="json-tree">${renderJsonTree(parsed)}</div>
            </div>
          `;
        } catch (e) { }
      }

      if (isLongText) {
        return `
          <div class="info-prompt-block">
            <div class="info-prompt-label">${escapeHtml(item.key)}</div>
            <div style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(val)}</div>
          </div>
        `;
      } else {
        return `
          <div class="info-row">
            <span class="info-row-key">${escapeHtml(item.key)}</span>
            <span class="info-row-value">${escapeHtml(val)}</span>
          </div>
        `;
      }
    }).join('');
  } else {
    genEl.innerHTML = `<div class="info-empty">${getT('infoNoData')}</div>`;
  }

  const fullEl = document.getElementById('infoFullContent');
  const fullItem = state.infoItems.find(item =>
    item.key.includes('完整') ||
    item.key.includes('Full') ||
    item.key === 'Description' ||
    item.key === 'Comment'
  );

  if (fullItem) {
    try {
      const parsed = JSON.parse(fullItem.value);
      fullEl.innerHTML = `<div class="json-tree">${renderJsonTree(parsed)}</div>`;
    } catch (e) {
      fullEl.innerHTML = `<pre class="info-pre">${escapeHtml(fullItem.value)}</pre>`;
    }
  } else if (state.infoJsonData) {
    fullEl.innerHTML = `<div class="json-tree">${renderJsonTree(state.infoJsonData)}</div>`;
  } else {
    const allData = {};
    state.infoItems.forEach(item => allData[item.key] = item.value);
    if (Object.keys(allData).length > 4) {
      fullEl.innerHTML = `<div class="json-tree">${renderJsonTree(allData)}</div>`;
    } else {
      fullEl.innerHTML = `<div class="info-empty">${getT('infoEmpty')}</div>`;
    }
  }

  const exifEl = document.getElementById('infoExifContent');
  if (state.infoExifItems.length > 0) {
    exifEl.innerHTML = state.infoExifItems.map(item => `
      <div class="info-row">
        <span class="info-row-key">${escapeHtml(item.key)}</span>
        <span class="info-row-value" title="${escapeHtml(String(item.value))}">${escapeHtml(String(item.value))}</span>
      </div>
    `).join('');
  } else {
    exifEl.innerHTML = `<div class="info-empty">${getT('infoEmpty')}</div>`;
  }
}

export function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(getT('toastCopied'), 'success');
  });
}

export function copyAllInfo() {
  let text = '=== Image Info ===\n';
  state.infoItems.forEach(item => text += `${item.key}: ${item.value}\n`);
  text += '\n=== EXIF ===\n';
  state.infoExifItems.forEach(item => text += `${item.key}: ${item.value}\n`);

  navigator.clipboard.writeText(text).then(() => {
    showToast(getT('toastCopied'), 'success');
  });
}
