/* Metadata editor logic */
import { state } from '../state.js';
import { getT, refreshDynamicUI } from '../i18n.js';
import { setFieldVal, pickFirst, showToast, downloadBlob, updateNum } from '../utils.js';
import { insertPngChunks } from '../parsers/png.js';
import { piexif } from '../parsers/jpeg.js';
import { parseSDString_V2, extractComfyPrompts } from '../parsers/sd-parser.js';

export function extractDataFromObj(obj) {
  const getStr = (val) => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      if (val.base_caption) return val.base_caption;
      try { return JSON.stringify(val); } catch (e) { return ""; }
    }
    return "";
  };
  let p = getStr(obj.prompt) || getStr(obj.v4_prompt?.caption) || "";
  let n = getStr(obj.uc) || getStr(obj.negative_prompt) || getStr(obj.v4_negative_prompt?.caption) || "";
  let chars = [];
  let charList = obj.char_captions || (obj.v4_prompt?.caption?.char_captions) || (obj.prompt?.char_captions);
  let negCharList = (obj.v4_negative_prompt?.caption?.char_captions) || (obj.negative_prompt?.char_captions);
  if (charList && Array.isArray(charList)) {
    charList.forEach((char, idx) => {
      const posTxt = getStr(char.char_caption);
      let negTxt = "";
      if (negCharList && negCharList[idx]) negTxt = getStr(negCharList[idx].char_caption);
      else if (char.uc) negTxt = getStr(char.uc);
      let x = 0.5, y = 0.5;
      if (char.centers && char.centers[0]) { x = char.centers[0].x || 0.5; y = char.centers[0].y || 0.5; }
      chars.push({ text: posTxt, uc: negTxt, x, y });
    });
  }
  if (obj && typeof obj === 'object') {
    const comfy = extractComfyPrompts(obj);
    if (comfy.found) {
      state.isComfy = true;
      if (!p && comfy.prompt) p = comfy.prompt;
      if (!n && comfy.negative) n = comfy.negative;
    }
  }
  return { prompt: p, negative: n, chars: chars };
}

export function fillFormFromData(obj, rawTexts) {
  const o = obj || {};
  state.isComfy = false;
  state.originalData = extractDataFromObj(o);
  if (o.actual_prompts) {
    state.hasActual = true;
    document.getElementById('btnToggleActual').style.display = "inline-block";
    state.actualData = extractDataFromObj(o.actual_prompts);
  } else {
    state.hasActual = false;
    document.getElementById('btnToggleActual').style.display = "none";
  }
  renderUI(state.originalData);
  setFieldVal('fieldSteps', pickFirst(o.steps, o.Steps));
  setFieldVal('fieldCfg', pickFirst(o.cfg_rescale, o["CFG scale"], o.scale));
  setFieldVal('fieldSeed', pickFirst(o.seed, o.Seed));
  setFieldVal('fieldNSamples', pickFirst(o.n_samples));
  setFieldVal('fieldNoise', pickFirst(o.noise_schedule, o.Sampler, o.sampler));
  const sw = pickFirst(o.software, rawTexts && rawTexts["Software"], state.isSD ? "Stable Diffusion" : "NovelAI");
  setFieldVal('fieldSoftware', sw);
  const src = pickFirst(o.source, rawTexts && rawTexts["Source"], state.isSD ? (o.Model || "Unknown Model") : "Stable Diffusion");
  setFieldVal('fieldSource', src);
  const cStr = (rawTexts && rawTexts["Comment"]) || "";
  if (cStr && !cStr.startsWith('{')) setFieldVal('fieldComment', cStr);
  else setFieldVal('fieldComment', pickFirst(o.comment));
  setFieldVal('fieldTitle', pickFirst(rawTexts && rawTexts["Title"], o.title));
}

export function renderUI(data) {
  setFieldVal('fieldPrompt', data.prompt || "");
  setFieldVal('fieldNegative', data.negative || "");
  const charListEl = document.getElementById('charList');
  charListEl.innerHTML = '';
  if (data.chars && data.chars.length > 0) {
    data.chars.forEach(c => addCharToUI(c.text, c.uc, c.x, c.y));
  }
  refreshDynamicUI();
}

export function addCharToUI(text = "", uc = "", x = 0.5, y = 0.5) {
  const div = document.createElement('div');
  div.className = 'char-item';
  div.innerHTML = `
    <div class="char-item-header" style="display:flex; justify-content:space-between; margin-bottom:5px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-weight:600; color:var(--accent);">${getT('charLabel')}</span>
        <button class="btn-toggle-uc" onclick="toggleCharUC(this)" style="font-size:10px; cursor:pointer;">${getT('charToggleNeg')}</button>
      </div>
      <button class="btn-remove-char" onclick="this.closest('.char-item').remove()" style="color:red; background:none; border:none; cursor:pointer;">${getT('charRemove')}</button>
    </div>
    <textarea class="char-text" placeholder="Pos Tag..." style="min-height:40px;">${text}</textarea>
    <textarea class="char-uc-area" placeholder="Neg Tag..." style="display:none; min-height:40px; border-color:red;">${uc}</textarea>
    <div class="char-coords" style="margin-top:5px; font-size:11px; display:flex; gap:5px; align-items:center;">
      <span>${getT('charCenter')}</span>
      X:<input type="number" step="0.01" class="char-x" value="${x}" style="width:50px; padding:2px;">
      Y:<input type="number" step="0.01" class="char-y" value="${y}" style="width:50px; padding:2px;">
    </div>
  `;
  document.getElementById('charList').appendChild(div);
}

export function toggleCharUC(btn) {
  const item = btn.closest('.char-item');
  const posArea = item.querySelector('.char-text');
  const negArea = item.querySelector('.char-uc-area');
  if (negArea.style.display === 'none') {
    posArea.style.display = 'none'; negArea.style.display = 'block';
    btn.classList.add('active'); btn.textContent = getT('charTogglePos');
  } else {
    negArea.style.display = 'none'; posArea.style.display = 'block';
    btn.classList.remove('active'); btn.textContent = getT('charToggleNeg');
  }
}

export function toggleActualPrompt() {
  if (!state.hasActual) return;
  state.isShowingActual = !state.isShowingActual;
  const btn = document.getElementById('btnToggleActual');
  if (state.isShowingActual) {
    renderUI(state.actualData || {});
    btn.style.background = "var(--accent)"; btn.style.color = "#fff";
    document.body.classList.add('actual-mode');
  } else {
    renderUI(state.originalData || {});
    btn.style.background = "none"; btn.style.color = "var(--accent)";
    document.body.classList.remove('actual-mode');
  }
}

/* --- RAW DATA LOGIC --- */
export function toggleRawData() {
  const rawContainer = document.getElementById('rawContainer');
  const rawArrow = document.getElementById('rawArrow');
  if (rawContainer.classList.contains('show')) {
    rawContainer.classList.remove('show'); rawArrow.textContent = '\u25BC';
  } else {
    rawContainer.classList.add('show'); rawArrow.textContent = '\u25B2'; updateRawView();
  }
}

export function updateRawView() {
  const treeView = document.getElementById('treeView');
  const rawEditor = document.getElementById('rawEditor');
  treeView.innerHTML = '';
  if (!state.pngCommentObj) { treeView.innerHTML = '// No Data'; rawEditor.value = ""; return; }
  try { treeView.appendChild(createJsonTree(state.pngCommentObj)); } catch (e) { }
  rawEditor.value = JSON.stringify(state.pngCommentObj, null, 2);
}

export function toggleRawEdit() {
  const treeView = document.getElementById('treeView');
  const rawEditor = document.getElementById('rawEditor');
  const btnRawEdit = document.getElementById('btnRawEdit');
  const btnRawSave = document.getElementById('btnRawSave');

  if (rawEditor.style.display === 'block') {
    rawEditor.style.display = 'none'; treeView.style.display = 'block';
    btnRawEdit.textContent = 'Edit'; btnRawSave.style.display = 'none';
  } else {
    treeView.style.display = 'none'; rawEditor.style.display = 'block';
    btnRawEdit.textContent = 'Cancel'; btnRawSave.style.display = 'inline-block';
  }
}

export function saveRawData() {
  try {
    const n = JSON.parse(document.getElementById('rawEditor').value);
    state.pngCommentObj = n;
    if (state.isSD) fillFormFromData(n, {});
    else fillFormFromData(n, { "Comment": JSON.stringify(n) });
    updateRawView();
    toggleRawEdit();
    showToast("Synced!", "success");
  } catch (e) { showToast("JSON Error", "error"); }
}

export function createJsonTree(data) {
  if (data === null) { const s = document.createElement('span'); s.className = 'j-null'; s.textContent = 'null'; return s; }
  if (typeof data === 'boolean') { const s = document.createElement('span'); s.className = 'j-bool'; s.textContent = data; return s; }
  if (typeof data === 'number') { const s = document.createElement('span'); s.className = 'j-num'; s.textContent = data; return s; }
  if (typeof data === 'string') { const s = document.createElement('span'); s.className = 'j-str'; s.textContent = `"${data}"`; return s; }
  if (Array.isArray(data)) {
    if (data.length === 0) { const s = document.createElement('span'); s.textContent = '[]'; return s; }
    const details = document.createElement('details'); details.open = true;
    const summary = document.createElement('summary'); summary.textContent = `Array [${data.length}]`; details.appendChild(summary);
    data.forEach((item, index) => { const div = document.createElement('div'); div.style.paddingLeft = '12px'; const idxSpan = document.createElement('span'); idxSpan.style.color = '#888'; idxSpan.textContent = index + ': '; div.appendChild(idxSpan); div.appendChild(createJsonTree(item)); details.appendChild(div); });
    return details;
  }
  if (typeof data === 'object') {
    if (Object.keys(data).length === 0) { const s = document.createElement('span'); s.textContent = '{}'; return s; }
    const details = document.createElement('details'); details.open = true;
    const summary = document.createElement('summary'); summary.textContent = 'Object'; details.appendChild(summary);
    for (const key in data) { const div = document.createElement('div'); div.style.paddingLeft = '12px'; const keySpan = document.createElement('span'); keySpan.className = 'j-key'; keySpan.textContent = key + ': '; div.appendChild(keySpan); div.appendChild(createJsonTree(data[key])); details.appendChild(div); }
    return details;
  }
  return document.createElement('span');
}

/* --- SAVE METADATA --- */
export function saveMetadata() {
  if (!state.fileBuffer) return;

  if (state.fileFormat === 'png') {
    let cObj = state.pngCommentObj ? { ...state.pngCommentObj } : {};

    if (state.isSD) {
      const getVal = (id) => document.getElementById(id).value;
      if (getVal('fieldPrompt')) cObj["prompt"] = getVal('fieldPrompt');
      if (getVal('fieldNegative')) cObj["negative_prompt"] = getVal('fieldNegative');
      updateNum(cObj, 'Steps', getVal('fieldSteps'));
      updateNum(cObj, 'CFG scale', getVal('fieldCfg'));
      updateNum(cObj, 'Seed', getVal('fieldSeed'));
      if (getVal('fieldNoise')) cObj["Sampler"] = getVal('fieldNoise'); else delete cObj["Sampler"];

      let out = cObj["prompt"] + "\nNegative prompt: " + cObj["negative_prompt"] + "\n";
      const skip = ["prompt", "negative_prompt"]; let params = [];
      Object.keys(cObj).forEach(k => { if (!skip.includes(k) && cObj[k] !== null) params.push(`${k}: ${cObj[k]}`); });
      out += params.join(", ");

      const blob = insertPngChunks(state.fileBuffer, { "parameters": out });
      downloadBlob(blob, "meta_edited.png");
      showToast(getT('toastSaved'), 'success');
    } else {
      const getVal = (id) => document.getElementById(id).value;
      if (getVal('fieldPrompt')) cObj.prompt = getVal('fieldPrompt');
      if (getVal('fieldNegative')) cObj.uc = getVal('fieldNegative');
      updateNum(cObj, 'steps', getVal('fieldSteps'));
      updateNum(cObj, 'cfg_rescale', getVal('fieldCfg'));
      updateNum(cObj, 'seed', getVal('fieldSeed'));
      updateNum(cObj, 'n_samples', getVal('fieldNSamples'));
      if (getVal('fieldNoise')) cObj.noise_schedule = getVal('fieldNoise'); else delete cObj.noise_schedule;
      if (getVal('fieldComment')) cObj.comment = getVal('fieldComment'); else delete cObj.comment;

      let newPosChars = [], newNegChars = [];
      document.querySelectorAll('.char-item').forEach(item => {
        const txt = item.querySelector('.char-text').value, uc = item.querySelector('.char-uc-area').value;
        const x = parseFloat(item.querySelector('.char-x').value) || 0, y = parseFloat(item.querySelector('.char-y').value) || 0;
        const centers = [{ x, y }];
        if (txt) newPosChars.push({ char_caption: txt, centers });
        if (uc) newNegChars.push({ char_caption: uc, centers });
      });

      if (cObj.v4_prompt) {
        if (!cObj.v4_prompt.caption) cObj.v4_prompt.caption = {};
        if (getVal('fieldPrompt')) cObj.v4_prompt.caption.base_caption = getVal('fieldPrompt');
        if (newPosChars.length) cObj.v4_prompt.caption.char_captions = newPosChars;
        else delete cObj.v4_prompt.caption.char_captions;
      }
      if (cObj.v4_negative_prompt) {
        if (!cObj.v4_negative_prompt.caption) cObj.v4_negative_prompt.caption = {};
        if (getVal('fieldNegative')) cObj.v4_negative_prompt.caption.base_caption = getVal('fieldNegative');
        if (newNegChars.length) cObj.v4_negative_prompt.caption.char_captions = newNegChars;
        else delete cObj.v4_negative_prompt.caption.char_captions;
      }

      let finalC = JSON.stringify(cObj);
      const blob = insertPngChunks(state.fileBuffer, {
        "Title": getVal('fieldTitle'),
        "Description": getVal('fieldPrompt'),
        "Software": getVal('fieldSoftware'),
        "Source": getVal('fieldSource'),
        "Comment": finalC
      });
      downloadBlob(blob, "meta_edited.png");
      showToast(getT('toastSaved'), 'success');
    }
  } else if (state.fileFormat === 'jpeg') {
    try {
      const reader = new FileReader();
      reader.onload = function (e) {
        const binStr = e.target.result;
        try {
          const piexifObj = piexif.load(binStr);
          let outStr = "";
          if (state.isSD) {
            const getVal = (id) => document.getElementById(id).value;
            let p = getVal('fieldPrompt') || "";
            let n = getVal('fieldNegative') || "";
            let s = getVal('fieldSteps') || "";
            outStr = p + "\nNegative prompt: " + n + "\nSteps: " + s;
          } else {
            outStr = JSON.stringify(state.pngCommentObj || {});
          }

          piexifObj["Exif"][piexif.ExifIFD.UserComment] = [
            85, 78, 73, 67, 79, 68, 69, 0,
            ...outStr.split('').map(c => c.charCodeAt(0))
          ];

          const newBytes = piexif.dump(piexifObj);
          const newBin = piexif.insert(newBytes, binStr);
          const arr = new Uint8Array(newBin.length);
          for (let i = 0; i < newBin.length; i++) arr[i] = newBin.charCodeAt(i);
          downloadBlob(new Blob([arr], { type: "image/jpeg" }), "meta_edited.jpg");
          showToast(getT('toastSaved'), 'success');
        } catch (err) { console.error(err); showToast("JPEG Error", "error"); }
      };
      reader.readAsBinaryString(new Blob([state.fileBuffer]));
    } catch (e) { showToast("JPEG Error", "error"); }
  }
}

/* --- CLEAR LOGIC --- */
export function clearMetaOnly() {
  if (!state.fileBuffer) return;
  showToast("Cleaning...", "normal");
  state.pngCommentObj = null;
  state.originalData = {};
  state.actualData = {};
  state.isSD = false;
  state.isComfy = false;
  state.hasActual = false;
  state.isShowingActual = false;
  document.getElementById('btnToggleActual').style.display = 'none';
  ['fieldTitle', 'fieldPrompt', 'fieldNegative', 'fieldSteps', 'fieldCfg', 'fieldSeed', 'fieldNoise', 'fieldSoftware', 'fieldSource', 'fieldComment', 'fieldNSamples'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('charList').innerHTML = '';
  document.getElementById('treeView').innerHTML = '';
  document.getElementById('rawEditor').value = '';
  updateRawView();
  if (state.fileFormat === 'png') {
    const cleaned = insertPngChunks(state.fileBuffer, { "parameters": "", "Comment": "", "Title": "", "Description": "", "Software": "", "Source": "" });
    downloadBlob(cleaned, "meta_clean.png");
    showToast(getT('toastCleaned'), "success");
    return;
  }
  if (state.fileFormat === 'jpeg') {
    const reader = new FileReader();
    reader.onload = function (e) {
      const binStr = e.target.result;
      try {
        const piexifObj = piexif.load(binStr);
        piexifObj["Exif"] = piexifObj["Exif"] || {};
        delete piexifObj["Exif"][piexif.ExifIFD.UserComment];
        const newBytes = piexif.dump(piexifObj);
        const newBin = piexif.insert(newBytes, binStr);
        const arr = new Uint8Array(newBin.length);
        for (let i = 0; i < newBin.length; i++) arr[i] = newBin.charCodeAt(i);
        downloadBlob(new Blob([arr], { type: "image/jpeg" }), "meta_clean.jpg");
        showToast(getT('toastCleaned'), "success");
      } catch (err) { console.error(err); showToast("JPEG Error", "error"); }
    };
    reader.readAsBinaryString(new Blob([state.fileBuffer]));
  }
}

export function clearAllData() {
  if (!state.currentFile) return;
  showToast("Cleaning...", "normal");
  state.pngCommentObj = null;
  state.originalData = {};
  state.actualData = {};
  ['fieldTitle', 'fieldPrompt', 'fieldNegative', 'fieldSteps', 'fieldCfg', 'fieldSeed', 'fieldNoise', 'fieldSoftware', 'fieldSource', 'fieldComment', 'fieldNSamples'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('charList').innerHTML = '';
  document.getElementById('treeView').innerHTML = '';
  document.getElementById('rawEditor').value = '';
  ['exifMake', 'exifModel', 'exifSoftware', 'exifDateTime', 'exifExposure', 'exifFNumber', 'exifISO', 'exifFocal', 'exifUserComment', 'exifLat', 'exifLong', 'exifAlt'].forEach(id => document.getElementById(id).value = '');

  const img = new Image();
  img.onload = () => {
    const cvs = document.getElementById('workCanvas');
    const ctx = cvs.getContext('2d');
    cvs.width = img.width; cvs.height = img.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(img, 0, 0);
    const mime = state.fileFormat === 'png' ? 'image/png' : 'image/jpeg';
    cvs.toBlob(async b => {
      state.fileBuffer = await b.arrayBuffer();
      showToast(getT('toastCleaned'), "success");
    }, mime);
  };
  img.src = URL.createObjectURL(new Blob([state.fileBuffer]));
}
