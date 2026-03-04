/* ═══════════════════════════════════════════════════════════════════════════
   ✨ Magic Workshop - App Entry Point
   Wires all modules together and sets up event listeners
═══════════════════════════════════════════════════════════════════════════ */

import { state } from './state.js';
import { changeLanguage, getT } from './i18n.js';
import { showToast, blobToDataURL } from './utils.js';
import { parsePngText } from './parsers/png.js';
import { piexif, JPEG_SD_UserComment_V2, loadJpegExifData } from './parsers/jpeg.js';
import { parseSDString_V2, sniffSdDataFromBinary } from './parsers/sd-parser.js';
import { fillFormFromData, saveMetadata, clearMetaOnly, clearAllData, addCharToUI,
         toggleCharUC, toggleActualPrompt, toggleRawData, toggleRawEdit,
         saveRawData, updateRawView } from './editors/meta-editor.js';
import { populateInfoPanel, copyAllInfo, copyText } from './editors/info-inspector.js';
import { saveExif, clearExif, applyDateFromPicker } from './editors/exif-editor.js';
import { runObfuscation, saveObfuscated, reloadFromCanvas, renderObfHistory,
         clearObfHistory, loadFromHistory } from './editors/obfuscation.js';
import { switchTab, initTabSlider, toggleTheme } from './ui.js';

/* --- FILE LOADING LOGIC --- */
async function loadFile(file) {
  state.currentFile = file;
  document.getElementById('fileInfoText').innerHTML = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  const buf = await file.arrayBuffer();
  state.fileBuffer = buf;
  const bytes = new Uint8Array(buf);

  // Detect Type
  if (bytes[0] === 0x89 && bytes[1] === 0x50) state.fileFormat = 'png';
  else if (bytes[0] === 0xFF && bytes[1] === 0xD8) state.fileFormat = 'jpeg';
  else state.fileFormat = 'unknown';

  document.getElementById('fileTypeBadge').textContent = state.fileFormat.toUpperCase();
  document.getElementById('fileTypeBadge').style.display = 'inline-block';

  document.getElementById('btnApplyMeta').disabled = false;
  document.getElementById('btnClearMeta').disabled = false;
  document.getElementById('btnClearAll').disabled = false;
  document.getElementById('btnApplyExif').disabled = state.fileFormat !== 'jpeg';
  document.getElementById('btnClearExif').disabled = state.fileFormat !== 'jpeg';

  // Visual Preview
  const url = URL.createObjectURL(file);
  const img = document.getElementById('preview');
  img.src = url;
  img.style.display = 'block';
  document.getElementById('workCanvas').style.display = 'none';
  document.getElementById('previewPlaceholder').style.display = 'none';

  // Reset States
  document.getElementById('btnEncrypt').disabled = false;
  document.getElementById('btnDecrypt').disabled = false;
  document.getElementById('btnReloadObf').style.display = 'none';

  // Parse Metadata
  parseMetadata(bytes);

  // Auto Obfuscation Check
  const autoMode = document.querySelector('input[name="autoObf"]:checked')?.value;
  if (autoMode === 'encrypt' || autoMode === 'decrypt') {
    img.onload = () => {
      setTimeout(() => {
        runObfuscation(autoMode === 'encrypt');
      }, 100);
    };
  }
}

// Expose loadFile globally for obfuscation module
window._loadFile = loadFile;

/* --- METADATA PARSING --- */
async function parseMetadata(bytes) {
  // Reset Form
  ['fieldTitle', 'fieldPrompt', 'fieldNegative', 'fieldSteps', 'fieldCfg', 'fieldSeed', 'fieldNoise', 'fieldSoftware', 'fieldSource', 'fieldComment', 'fieldNSamples'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('charList').innerHTML = '';
  document.getElementById('treeView').innerHTML = '';
  document.getElementById('rawEditor').value = '';
  state.pngCommentObj = null;
  state.isSD = false;
  state.isComfy = false;
  state.hasActual = false;
  state.isShowingActual = false;
  document.getElementById('btnToggleActual').style.display = 'none';

  if (state.fileFormat === 'png') {
    try {
      const texts = await parsePngText(bytes.buffer);
      let foundData = false;

      // 1. Try "parameters" (SD WebUI)
      let paramKey = Object.keys(texts).find(k => k.toLowerCase() === 'parameters');
      if (paramKey) {
        state.isSD = true;
        state.pngCommentObj = parseSDString_V2(texts[paramKey]);
        state.originalData = { ...state.pngCommentObj };
        state.hasActual = false;
        document.getElementById('btnToggleActual').style.display = 'none';
        fillFormFromData(state.pngCommentObj, texts);
        foundData = true;
      }

      // 2. Try JSON (NovelAI / Comfy)
      if (!foundData) {
        for (let key in texts) {
          let val = (texts[key] || '').trim();
          if (val.startsWith('{') || key === 'Comment') {
            try {
              let obj = JSON.parse(val);
              state.pngCommentObj = obj;
              state.isSD = false;
              fillFormFromData(state.pngCommentObj, texts);
              foundData = true;
              break;
            } catch (e) { }
          }
        }
      }

      if (!foundData && Object.keys(texts).length > 0) {
        state.pngCommentObj = texts;
        state.isSD = false;
        fillFormFromData(state.pngCommentObj, texts);
        foundData = true;
      }

      if (!foundData) {
        const sniff = sniffSdDataFromBinary(bytes.buffer);
        if (sniff) {
          state.isSD = true;
          state.pngCommentObj = sniff.obj ? sniff.obj : parseSDString_V2(sniff.text);
          fillFormFromData(state.pngCommentObj, sniff.raw || {});
          foundData = true;
        }
      }

      if (foundData) {
        updateRawView();
        showToast(getT('toastMetaFound'), 'success');
        populateInfoPanel(state.currentFile, state.pngCommentObj, texts);
      }
      else { showToast(getT('toastNoMeta'), 'warn'); }
    } catch (e) { console.error(e); }

  } else if (state.fileFormat === 'jpeg') {
    try {
      const dataUrl = await blobToDataURL(new Blob([bytes]));
      const piexifObj = piexif.load(dataUrl);
      loadJpegExifData(piexifObj);

      // UserComment (SD)
      const uc = JPEG_SD_UserComment_V2(piexifObj);
      if (uc) {
        let sdPayload = null;
        if (typeof uc === 'string') sdPayload = { text: uc };
        else sdPayload = { obj: uc.obj || uc, raw: uc.raw || {} };

        if (sdPayload) {
          state.isSD = true;
          state.pngCommentObj = sdPayload.obj ? sdPayload.obj : parseSDString_V2(sdPayload.text);
          fillFormFromData(state.pngCommentObj, sdPayload.raw || {});
          updateRawView();
          showToast(getT('toastMetaFound'), 'success');
          populateInfoPanel(state.currentFile, state.pngCommentObj, sdPayload.raw || {});
          return;
        }
      }

      const sniff = sniffSdDataFromBinary(bytes.buffer);
      if (sniff) {
        state.isSD = true;
        state.pngCommentObj = sniff.obj ? sniff.obj : parseSDString_V2(sniff.text);
        fillFormFromData(state.pngCommentObj, sniff.raw || {});
        updateRawView();
        showToast(getT('toastMetaFound'), 'success');
        populateInfoPanel(state.currentFile, state.pngCommentObj, sniff.raw || {});
      } else {
        showToast(getT('toastJPEGFound'), 'success');
        populateInfoPanel(state.currentFile, {}, {});
      }
    } catch (e) { }
  }
}

/* --- EXPOSE FUNCTIONS TO WINDOW (for onclick handlers in HTML) --- */
window.changeLanguage = changeLanguage;
window.toggleTheme = toggleTheme;
window.switchTab = switchTab;
window.toggleActualPrompt = toggleActualPrompt;
window.toggleCharUC = toggleCharUC;
window.toggleRawData = toggleRawData;
window.toggleRawEdit = toggleRawEdit;
window.saveRawData = saveRawData;
window.runObfuscation = runObfuscation;
window.saveObfuscated = saveObfuscated;
window.reloadFromCanvas = reloadFromCanvas;
window.clearObfHistory = clearObfHistory;
window.loadFromHistory = loadFromHistory;
window.copyAllInfo = copyAllInfo;
window.copyText = copyText;
window.applyDateFromPicker = applyDateFromPicker;

/* --- DOM EVENT LISTENERS --- */
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => { fileInput.value = ''; });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.transform = "scale(1.02)"; });
dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.style.transform = "scale(1)"; });
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.style.transform = "scale(1)"; if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e => { if (e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ''; } });

document.getElementById('btnApplyMeta').addEventListener('click', saveMetadata);
document.getElementById('btnApplyExif').addEventListener('click', saveExif);
document.getElementById('btnClearMeta').addEventListener('click', clearMetaOnly);
document.getElementById('btnClearExif').addEventListener('click', clearExif);
document.getElementById('btnClearAll').addEventListener('click', clearAllData);
document.getElementById('btnAddChar').addEventListener('click', () => { addCharToUI("", "", 0.5, 0.5); });

/* --- INITIALIZATION --- */
changeLanguage('zh-CN');
setTimeout(initTabSlider, 100);
window.addEventListener('resize', initTabSlider);
document.addEventListener('DOMContentLoaded', renderObfHistory);
// Also render immediately in case DOM is already ready
renderObfHistory();
