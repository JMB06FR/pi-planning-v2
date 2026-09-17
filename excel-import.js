/* Read the EMA Agenda template locally. No workbook data leaves the browser. */
(function (root) {
  'use strict';
  const limits = {entries: 2000, bytes: 30 * 1024 * 1024, rows: 10000};
  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer);
    if (bytes.length < 22) throw new Error('Not a valid .xlsx workbook.');
    let end = bytes.length - 22;
    while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
    if (end < Math.max(0, bytes.length - 65557)) throw new Error('Not a valid .xlsx ZIP archive.');
    const count = view.getUint16(end + 10, true);
    if (count > limits.entries || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Unsupported or oversized workbook archive.');
    let offset = view.getUint32(end + 16, true), total = 0;
    const entries = new Map();
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid workbook archive directory.');
      const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
      const compressed = view.getUint32(offset + 20, true), size = view.getUint32(offset + 24, true);
      const length = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
      const start = view.getUint32(offset + 42, true);
      if (offset + 46 + length + extra + comment > end) throw new Error('Invalid workbook entry.');
      const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + length));
      total += size;
      if (flags & 1) throw new Error('Password-protected workbooks are not supported. Save an unencrypted .xlsx copy.');
      if (total > limits.bytes) throw new Error('Workbook is too large after decompression.');
      entries.set(name, {method, compressed, size, start});
      offset += 46 + length + extra + comment;
    }
    return async name => {
      const entry = entries.get(name);
      if (!entry) throw new Error(`Workbook part is missing: ${name}.`);
      const {method, compressed, size, start} = entry;
      if (start + 30 > bytes.length || view.getUint32(start, true) !== 0x04034b50) throw new Error('Invalid workbook entry header.');
      const dataStart = start + 30 + view.getUint16(start + 26, true) + view.getUint16(start + 28, true);
      if (dataStart + compressed > bytes.length) throw new Error('Truncated workbook entry.');
      const data = bytes.slice(dataStart, dataStart + compressed);
      let output;
      if (method === 0) output = data;
      else if (method === 8) {
        let decompressor;
        try { decompressor = new DecompressionStream('deflate-raw'); }
        catch { throw new Error('Excel import requires a browser with deflate-raw support. Update your browser, or import CSV instead.'); }
        const reader = new Blob([data]).stream().pipeThrough(decompressor).getReader();
        const chunks = []; let length = 0;
        while (true) {
          const {value, done} = await reader.read(); if (done) break;
          length += value.length;
          if (length > size || length > limits.bytes) { await reader.cancel(); throw new Error('Workbook decompression limit exceeded.'); }
          chunks.push(value);
        }
        output = new Uint8Array(length); let position = 0;
        for (const chunk of chunks) { output.set(chunk, position); position += chunk.length; }
      } else throw new Error('Unsupported workbook compression. Save as a standard .xlsx file.');
      if (output.length !== size) throw new Error('Workbook entry size mismatch.');
      return new TextDecoder().decode(output);
    };
  }
  const nodes = (parent, name) => Array.from(parent.getElementsByTagNameNS('*', name));
  function xml(text) {
    if (/<!DOCTYPE/i.test(text)) throw new Error('Unsupported XML document type.');
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (nodes(doc, 'parsererror').length) throw new Error('Invalid workbook XML.');
    return doc;
  }
  function partPath(target) {
    const parts = (target.startsWith('/') ? target.slice(1) : 'xl/' + target).split('/');
    const normalized = [];
    for (const part of parts) { if (part === '..') normalized.pop(); else if (part && part !== '.') normalized.push(part); }
    return normalized.join('/');
  }
  async function readSheet(buffer) {
    const read = await unzip(buffer);
    const workbook = xml(await read('xl/workbook.xml'));
    const relationships = nodes(xml(await read('xl/_rels/workbook.xml.rels')), 'Relationship');
    const sheet = nodes(workbook, 'sheet').find(s => s.getAttribute('name').trim().toLowerCase() === 'agenda');
    if (!sheet) throw new Error('No sheet named Agenda found.');
    const id = sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const relationship = relationships.find(r => r.getAttribute('Id') === id);
    if (!relationship || relationship.getAttribute('TargetMode') === 'External') throw new Error('Agenda sheet relationship is invalid.');
    const shared = relationships.find(r => /\/sharedStrings$/.test(r.getAttribute('Type')));
    const strings = shared ? nodes(xml(await read(partPath(shared.getAttribute('Target')))), 'si').map(s => nodes(s, 't').map(t => t.textContent).join('')) : [];
    const sheetXML = xml(await read(partPath(relationship.getAttribute('Target'))));
    const cells = {}; const formulaCells = [];
    for (const c of nodes(sheetXML, 'c')) {
      const ref = c.getAttribute('r');
      if (!/^[B-F]\d+$/.test(ref)) continue;
      const value = nodes(c, 'v')[0]?.textContent || '';
      const type = c.getAttribute('t');
      cells[ref] = type === 's' ? strings[Number(value)] ?? '' : type === 'inlineStr' ? nodes(c, 't').map(t => t.textContent).join('') : value;
      if (nodes(c, 'f').length) formulaCells.push(ref);
    }
    return {cells, merges: nodes(sheetXML, 'mergeCell').map(m => m.getAttribute('ref')), formulaCells};
  }
  function canonicalVS(value) { return String(value || '').trim().replace(/^VS\s+/i, '').replace(/\s+/g, ' ').toUpperCase(); }
  function normalizeTime(value) {
    return String(value || '').trim().replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => h.padStart(2, '0') + ':' + m).replace(/\s*[-–—]\s*/g, '-');
  }
  function issues(rows) {
    const output = [];
    const known = ['PLM','R&D','MON','TLM','MTA','EXP RW','ALL'];
    for (const [index, row] of rows.entries()) {
      const label = row.sourceRow ? `Excel row ${row.sourceRow}` : `Session ${index + 1}`;
      for (const [field, title] of [['time','time'],['vs','value stream'],['location','room'],['product','participants / product'],['purpose','purpose']]) {
        if (field === 'location' && row.type === 'Break') continue;
        if (!row[field]?.trim()) output.push(`${label}: missing ${title}.`);
      }
      if (row.vs && !known.includes(canonicalVS(row.vs))) output.push(`${label}: unrecognised value stream “${row.vs}”; check column C.`);
      const participantVS = canonicalVS(row.product);
      if (row.type === 'Plenary' && known.includes(participantVS) && participantVS !== 'ALL' && row.vs && participantVS !== canonicalVS(row.vs)) output.push(`${label}: value stream “${row.vs}” differs from participants “${row.product}”.`);
      if (row.type === 'Session') output.push(`${label}: check the session type; it could not be classified automatically.`);
    }
    return output;
  }
  function mapAgenda({cells, merges, formulaCells = []}) {
    const expanded = {...cells};
    for (const range of merges) {
      const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range); if (!match) continue;
      const [, startCol, startRow, endCol, endRow] = match;
      if (startCol !== endCol || !['B','C','D','E','F'].includes(startCol)) continue;
      if (+endRow > limits.rows) throw new Error('Agenda extends beyond 10,000 rows.');
      for (let row = +startRow; row <= +endRow; row++) expanded[startCol + row] = cells[startCol + startRow] || '';
    }
    const last = Math.max(0, ...Object.keys(cells).map(ref => +(ref.match(/\d+$/)?.[0] || 0)));
    if (last > limits.rows) throw new Error('Agenda extends beyond 10,000 rows.');
    const rows = []; let day = ''; const usedFormulaCells = [];
    const purposeGroup = row => merges.find(range => { const m = /^F(\d+):F(\d+)$/.exec(range); return m && row >= +m[1] && row <= +m[2]; });
    for (let r = 1; r <= last; r++) {
      const text = col => String(expanded[col + r] || '').replace(/\u00a0/g, ' ').trim();
      const marker = /^DAY\s*([12])$/i.exec(text('E'));
      if (marker) { day = 'Day ' + marker[1]; continue; }
      if (r < 11) continue;
      // Separator rows may still have a value-stream list; they are not sessions.
      if (!text('E') && !text('F') && !text('D')) continue;
      const purpose = text('F'), participants = text('E');
      let type = 'Session';
      if (/break[\s-]*outs?/i.test(purpose)) type = 'Breakout';
      else if (/coffee|lunch|drinks|\bbreak\b/i.test(purpose)) type = 'Break';
      else if (/plenary|plan review|management review|planning adjustment|risks.*impediments/i.test(purpose)) type = 'Plenary';
      const streams = text('C').split(/[,;\n]+/).map(canonicalVS).filter(Boolean);
      // A continuation can fall just outside the time merge (e.g. the user's row 44).
      // Inherit only from the immediately preceding session within the SAME merged purpose.
      const previous = rows.at(-1);
      const inheritedTime = !text('B') && previous?.sourceRow === r - 1 && previous.day === day && purposeGroup(r) && purposeGroup(r) === purposeGroup(r - 1) ? previous.time : '';
      rows.push({day, time:normalizeTime(text('B') || inheritedTime), vs:new Set(streams).size > 1 ? 'ALL' : streams[0] || '', location:text('D'), product:participants, team:'', purpose, type, sourceRow:r});
      for (const ref of formulaCells) if (+ref.match(/\d+$/)[0] === r) usedFormulaCells.push(ref);
    }
    if (!rows.length) throw new Error('No sessions found in Agenda from row 11.');
    const warnings = issues(rows);
    if (rows.some(r => !r.day)) warnings.push('Some sessions have no DAY 1 / DAY 2 heading; assign their day before publishing.');
    if (usedFormulaCells.length) warnings.push(`Formula cells (${usedFormulaCells.join(', ')}) use Excel’s saved values. Recalculate and save in Excel before importing.`);
    return {rows, warnings};
  }
  const api = {unzip, readSheet, mapAgenda, issues, normalizeTime, importWorkbook:async buffer => mapAgenda(await readSheet(buffer))};
  root.AgendaExcel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
