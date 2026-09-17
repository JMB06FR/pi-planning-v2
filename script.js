'use strict';
let roomsData = [];
const $ = id => document.getElementById(id);
function options(id, values, label) {
  const select = $(id); select.replaceChildren(new Option(label, ''));
  for (const value of [...new Set(values.filter(Boolean))].sort()) select.add(new Option(value, value));
}
async function loadRooms() {
  try {
    const preview = new URLSearchParams(location.search).get('draft') === '1';
    if (preview) {
      const draft = localStorage.getItem('pi-planning-v2-agenda-draft-v1');
      if (!draft) throw new Error('No saved draft found. Open the editor and import or edit an agenda first.');
      roomsData = JSON.parse(draft);
      $('notice').hidden = false; $('notice').textContent = 'DRAFT PREVIEW — these changes are not published.';
    } else {
      const response = await fetch('rooms.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Could not load the agenda. Please refresh and try again.');
      roomsData = await response.json();
    }
    if (!Array.isArray(roomsData) || roomsData.some(r => !r || typeof r !== 'object')) throw new Error('The agenda format is invalid.');
    options('dayFilter', roomsData.map(r => r.day), 'Both days');
    $('dayControl').hidden = !roomsData.some(r => r.day);
    options('vsFilter', roomsData.map(r => r.vs).filter(v => v !== 'ALL'), 'All value streams');
    options('teamFilter', roomsData.map(r => r.team || r.product), 'All participants / products');
    const quarters = [...new Set(roomsData.map(r => (r.purpose || '').match(/\b\d{2}Q[1-4]\b/)?.[0]).filter(Boolean))];
    if (quarters.length === 1) $('title').textContent = `PI ${quarters[0]} Planning Agenda`;
    else if (roomsData.some(r => r.day)) $('title').textContent = 'PI Planning Agenda';
    applyFilters();
  } catch (error) { $('rooms-container').textContent = error.message; }
}
function renderRooms(rooms) {
  const container = $('rooms-container'); container.replaceChildren();
  const sorted = [...rooms].sort((a,b) => (a.day || '').localeCompare(b.day || '') || start(a.time) - start(b.time));
  for (const room of sorted) {
    const card = document.createElement('article'); card.className = 'room-card';
    const heading = document.createElement('h2'); heading.textContent = room.purpose || room.team || room.product; card.append(heading);
    const details = [['Day','day'],['Time','time'],['Room','location'],['Participants / product','product'],['Team','team'],['Value stream','vs'],['Type','type']];
    for (const [label, field] of details) {
      if (!room[field] && ['day','team'].includes(field)) continue;
      const line = document.createElement('p'), title = document.createElement('strong');
      title.textContent = label + ': '; line.append(title, document.createTextNode(room[field] || 'Not specified')); card.append(line);
    }
    container.append(card);
  }
  if (!rooms.length) container.textContent = 'No sessions match your search.';
  $('count').textContent = `${rooms.length} sessions`;
}
function start(time) { const m = String(time || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : Infinity; }
function applyFilters() {
  const search = $('searchInput').value.trim().toLowerCase();
  const day = $('dayFilter').value, vs = $('vsFilter').value, team = $('teamFilter').value;
  renderRooms(roomsData.filter(room =>
    (!day || room.day === day) && (!vs || room.vs === vs || room.vs === 'ALL') &&
    (!team || (room.team || room.product) === team || (room.product || '').toUpperCase() === 'ALL') &&
    ['team','product','purpose','location','vs','type','time','day'].some(field => String(room[field] || '').toLowerCase().includes(search))
  ));
}
$('searchInput').addEventListener('input', applyFilters);
for (const id of ['teamFilter','dayFilter','vsFilter']) $(id).addEventListener('change', applyFilters);
loadRooms();
