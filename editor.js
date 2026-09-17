'use strict';
const fields = ['time', 'location', 'product', 'team', 'vs', 'type'];
const draftKey = 'pi-planning-v2-agenda-draft-v1';
let rows = [];
let ready = false;
const $ = id => document.getElementById(id);
function status(message) { $('status').textContent = message; }
function normalize(data) {
  if (!Array.isArray(data)) throw new Error('The agenda must be a list of sessions.');
  return data.map((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Row ${i + 1} is not a session.`);
    const result = {};
    for (const field of fields) {
      if (typeof row[field] !== 'string') throw new Error(`Row ${i + 1}: missing or invalid ${field}.`);
      result[field] = row[field];
    }
    return result;
  });
}
function save() {
  try { localStorage.setItem(draftKey, JSON.stringify(rows)); status(`${rows.length} sessions. Draft saved in this browser; not published.`); }
  catch { status('Draft could not be saved in this browser. Download it before leaving this page.'); }
}
function render() {
  $('rows').replaceChildren();
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    fields.forEach(field => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.value = row[field]; input.required = true;
      input.setAttribute('aria-label', `Session ${i + 1}: ${field}`);
      input.addEventListener('input', () => { row[field] = input.value; save(); });
      td.append(input); tr.append(td);
    });
    const actions = document.createElement('td');
    for (const [label, action] of [
      ['Duplicate', () => rows.splice(i + 1, 0, {...row})],
      ['Delete', () => { if (confirm(`Delete session ${i + 1} (${row.team || 'new session'})?`)) rows.splice(i, 1); }]
    ]) {
      const button = document.createElement('button'); button.textContent = label;
      button.setAttribute('aria-label', `${label} session ${i + 1}`);
      button.onclick = () => { action(); save(); render(); }; actions.append(button);
    }
    tr.append(actions); $('rows').append(tr);
  });
  ready = true;
  for (const id of ['add', 'csv', 'download', 'reset']) $(id).disabled = false;
}
function validate() {
  if (!rows.length) throw new Error('Add at least one session before exporting.');
  rows.forEach((row, i) => {
    fields.forEach(field => { if (!row[field].trim()) throw new Error(`Session ${i + 1}: fill in ${field}.`); });
    const match = row.time.trim().match(/^([01]\d|2[0-3]):([0-5]\d)\s*[-–]\s*([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match || (+match[1] * 60 + +match[2]) >= (+match[3] * 60 + +match[4])) throw new Error(`Session ${i + 1}: use a valid time range, e.g. 09:00-12:00, with the end after the start.`);
  });
}
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const delimiter = text.split(/\r?\n/)[0].includes(';') ? ';' : ',';
  const records = []; let record = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === delimiter || c === '\n' || c === '\r') {
      record.push(cell); cell = ''; closed = false;
      if (c !== delimiter) { if (record.some(v => v.trim())) records.push(record); record = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else {
      if (closed || c === '"') throw new Error('Invalid CSV quoting. Export as CSV UTF-8 and try again.');
      cell += c;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quote.');
  record.push(cell); if (record.some(v => v.trim())) records.push(record);
  const headers = (records.shift() || []).map(v => v.trim().toLowerCase());
  if (headers.length !== fields.length || new Set(headers).size !== fields.length || fields.some(f => !headers.includes(f))) throw new Error(`CSV must contain these six columns: ${fields.join(', ')}.`);
  return normalize(records.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${i + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((h, j) => [h, values[j]]));
  }));
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(`${name} downloaded. Your published agenda has not changed. See the publishing instructions below.`);
}
$('add').onclick = () => { rows.push({time:'09:00-12:00', location:'', product:'', team:'', vs:'', type:'Breakout'}); save(); render(); $('rows').lastElementChild.querySelector('input').focus(); };
$('download').onclick = () => { try { validate(); download('rooms.json', JSON.stringify(rows, null, 2) + '\n', 'application/json'); } catch (e) { status(e.message); } };
$('csv').onclick = () => {
  try {
    validate();
    // Prevent spreadsheet formula execution when opening an exported CSV.
    const quote = value => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
    download('agenda.csv', '\uFEFF' + [fields, ...rows.map(r => fields.map(f => r[f]))].map(r => r.map(quote).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  } catch (e) { status(e.message); }
};
$('import').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.');
    const text = await file.text();
    const imported = file.name.toLowerCase().endsWith('.json') ? normalize(JSON.parse(text)) : parseCSV(text);
    if (!imported.length) throw new Error('The imported file has no sessions.');
    if (ready && !confirm('Replace the current draft with the imported sessions?')) return;
    rows = imported; save(); render();
  } catch (e) { status(`Import failed: ${e.message}`); }
  finally { event.target.value = ''; }
};
async function loadPublished() {
  const response = await fetch('rooms.json', {cache:'no-store'});
  if (!response.ok) throw new Error(`Could not load the published agenda (${response.status}).`);
  return normalize(await response.json());
}
$('reset').onclick = async () => {
  if (!confirm('Discard your draft and reload the published agenda?')) return;
  try { const published = await loadPublished(); rows = published; save(); render(); }
  catch (e) { status(e.message); }
};
async function init() {
  try {
    let draft;
    try { draft = localStorage.getItem(draftKey); } catch { /* Loading the published agenda still works. */ }
    if (draft) {
      try { rows = normalize(JSON.parse(draft)); render(); status('Restored your browser draft. It may differ from the published agenda.'); return; }
      catch { status('Saved draft could not be read. Loading the published agenda.'); }
    }
    rows = await loadPublished(); render(); status(`${rows.length} published sessions loaded. Changes are saved as a browser draft.`);
  } catch (e) { status(`${e.message} You can still import a CSV or JSON file.`); }
}
init();
