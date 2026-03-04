/* PNG chunk parsing and writing */
import { crc32 } from '../utils.js';

export function extractPngChunks(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  let pos = 8; // Skip PNG signature
  while (pos < bytes.length) {
    const length = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.slice(pos + 8, pos + 8 + length);
    chunks.push({ name: type, data: data });
    pos += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function decodePngTextChunk(data) {
  let nullPos = 0;
  while (nullPos < data.length && data[nullPos] !== 0) nullPos++;
  const keyword = new TextDecoder().decode(data.slice(0, nullPos));
  const text = new TextDecoder().decode(data.slice(nullPos + 1));
  return { keyword, text };
}

export function decodePngITXtChunk(data) {
  let dataFiltered = Array.from(data).filter(x => x !== 0);
  let header = new TextDecoder().decode(new Uint8Array(dataFiltered.slice(0, 11)));
  if (header === "Description") {
    let txt = new TextDecoder().decode(new Uint8Array(dataFiltered.slice(11)));
    return { keyword: "Description", text: txt };
  } else {
    let txt = new TextDecoder().decode(new Uint8Array(dataFiltered));
    return { keyword: "iTXt", text: txt };
  }
}

export async function parsePngText(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const latin1Dec = new TextDecoder('latin1');
  const utf8Dec = new TextDecoder('utf-8');
  let pos = 8;
  const out = {};

  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.slice(pos + 4, pos + 8));
    const data = bytes.slice(pos + 8, pos + 8 + len);

    if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      const z = data.indexOf(0);
      if (z > -1) {
        let k = latin1Dec.decode(data.slice(0, z));
        let v = "";
        if (type === 'tEXt') v = utf8Dec.decode(data.slice(z + 1));
        else if (type === 'zTXt') {
          if (data[z + 1] === 0) {
            try {
              const ds = new DecompressionStream("deflate");
              const writer = ds.writable.getWriter();
              writer.write(data.slice(z + 2));
              writer.close();
              const output = await new Response(ds.readable).arrayBuffer();
              v = utf8Dec.decode(output);
            } catch (e) { }
          }
        }
        else {
          let p = z + 3;
          const langEnd = data.indexOf(0, p); p = (langEnd > -1) ? langEnd + 1 : p;
          const transEnd = data.indexOf(0, p); p = (transEnd > -1) ? transEnd + 1 : p;
          v = utf8Dec.decode(data.slice(p));
        }
        out[k] = v;
      }
    }
    pos += len + 12;
  }
  return out;
}

export function makePngITXt(k, v) {
  const enc = new TextEncoder();
  const kBytes = new Uint8Array([...k].map(c => c.charCodeAt(0)));
  const vBytes = enc.encode(v);
  const headLen = kBytes.length + 5;
  const chunk = new Uint8Array(4 + 4 + headLen + vBytes.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, headLen + vBytes.length);
  chunk.set([0x69, 0x54, 0x58, 0x74], 4);
  chunk.set(kBytes, 8);
  for (let i = 0; i < 5; i++) chunk[8 + kBytes.length + i] = 0;
  chunk.set(vBytes, 8 + headLen);
  view.setUint32(chunk.length - 4, crc32(chunk.slice(4, chunk.length - 4)));
  return chunk;
}

export function insertPngChunks(buffer, map) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const latin1Dec = new TextDecoder('latin1');
  const parts = [];
  const skipKeys = new Set(Object.keys(map));
  parts.push(bytes.slice(0, 8));
  let pos = 8;
  let iend = null;

  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.slice(pos + 4, pos + 8));
    const end = pos + 8 + len + 4;
    const full = bytes.slice(pos, end);
    let skip = false;
    if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      const data = bytes.slice(pos + 8, pos + 8 + len);
      const z = data.indexOf(0);
      if (z > -1) {
        const k = latin1Dec.decode(data.slice(0, z));
        if (skipKeys.has(k)) skip = true;
      }
    }
    if (type === 'IEND') { iend = full; break; }
    else if (!skip) parts.push(full);
    pos = end;
  }

  for (const [k, v] of Object.entries(map)) { if (v) parts.push(makePngITXt(k, v)); }
  if (iend) parts.push(iend);

  let size = 0; parts.forEach(p => size += p.length);
  const res = new Uint8Array(size);
  let off = 0;
  parts.forEach(p => { res.set(p, off); off += p.length; });
  return new Blob([res], { type: 'image/png' });
}
