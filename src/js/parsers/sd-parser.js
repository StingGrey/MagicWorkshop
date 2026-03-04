/* SD WebUI & ComfyUI metadata parsing */
import { sdFields } from '../state.js';
import { decodeBinaryString, extractJsonNearKeyword } from '../utils.js';

export function parseSDString_V2(text) {
  if (!text) return {};
  const lines = text.split('\n');
  let prompt = "", negative = "", params = "", phase = 0;
  for (let line of lines) {
    let tLine = line.trim();
    if (!tLine) continue;
    if (tLine.startsWith("Negative prompt:")) { negative += tLine.substring(16).trim(); phase = 1; continue; }
    if (tLine.startsWith("Steps:")) { params = tLine; phase = 2; continue; }
    if (phase === 0) prompt += line + "\n";
    else if (phase === 1) negative += line + "\n";
    else if (phase === 2) params += line + " ";
  }
  const data = {};
  data["prompt"] = prompt.trim();
  data["negative_prompt"] = negative.trim();
  if (params) {
    const parts = params.split(/,\s+(?=[a-zA-Z0-9\s]+:)/);
    parts.forEach(p => {
      let sep = p.indexOf(':');
      if (sep > -1) data[p.slice(0, sep).trim()] = p.slice(sep + 1).trim();
    });
  }
  sdFields.forEach(f => { if (!data.hasOwnProperty(f)) data[f] = null; });
  return data;
}

export function sniffSdDataFromBinary(buffer) {
  const raw = decodeBinaryString(buffer);
  if (!raw) return null;
  const clean = raw.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' ');
  const jsonChunk = extractJsonNearKeyword(clean, '"prompt"') || extractJsonNearKeyword(clean, '"negative_prompt"');
  if (jsonChunk) {
    try { return { obj: JSON.parse(jsonChunk), source: 'json-chunk' }; }
    catch (e) { }
  }
  const lower = clean.toLowerCase();
  const negIdx = lower.indexOf("negative prompt:");
  const stepsIdx = lower.indexOf("steps:");
  if (negIdx !== -1 && stepsIdx !== -1 && stepsIdx > negIdx) {
    const start = Math.max(0, clean.lastIndexOf('\n', negIdx - 1) - 2000);
    const end = Math.min(clean.length, stepsIdx + 1200);
    return { text: clean.slice(start, end).trim(), source: 'text-chunk' };
  }
  return null;
}

export function handleWebUiTag(paramText) {
  let [prompts, otherParas] = paramText.split("Steps: ");
  let promptSplit = prompts.split("Negative prompt: ");
  let negativePrompt = promptSplit.length > 1 ? promptSplit[1] : "";
  return [
    { keyword: "提示词 / Prompt", text: promptSplit[0].trim() },
    { keyword: "负面提示词 / Negative", text: negativePrompt.trim() },
    { keyword: "其他参数 / Parameters", text: otherParas ? "Steps: " + otherParas : "" }
  ];
}

export function extractComfyPrompts(obj) {
  const texts = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.class_type && o.inputs && typeof o.inputs.text === 'string') {
      texts.push({ text: o.inputs.text, source: o.class_type });
    }
    Object.values(o).forEach(v => { if (typeof v === 'object') walk(v); });
  };
  walk(obj);
  if (texts.length === 0) return {};
  const negKeywords = /(negative prompt|worst quality|low quality|bad quality|watermark|signature|jpeg artifacts|ugly|deformed|bad anatomy|extra fingers|censor)/i;
  const pos = [], neg = [];
  texts.forEach(t => { if (negKeywords.test(t.text)) neg.push(t); else pos.push(t); });
  const prompt = pos.length ? pos.sort((a, b) => b.text.length - a.text.length)[0].text : texts[0].text;
  const negative = neg.length ? neg.sort((a, b) => b.text.length - a.text.length)[0].text : (pos.length > 1 ? pos[1].text : "");
  return { prompt, negative, found: true };
}
