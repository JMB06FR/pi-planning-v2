'use strict';
const $ = id => document.getElementById(id);
const state = {day:'', streams:[], type:'', product:'', query:'', includeShared:true};
let roomsData = [];
const palette = {
  PLM:['#2363ad','#eaf2fc'], 'R&D':['#7145a2','#f2ecf8'], MON:['#08766b','#e5f5ef'],
  TLM:['#a35c08','#fff3df'], MTA:['#a54266','#fbeaf0'], 'EXP RW':['#316b89','#e7f3fa'], ALL:['#465970','#edf2f6']
};
function element(tag, className, content) {
  const node = document.createElement(tag); if(className) node.className=className;
  if(content!==undefined) node.textContent=content;
  return node;
}
function tint(node, stream) {
  const colors=palette[AgendaFilters.canonical(stream)] || ['#58687a','#edf2f6'];
  node.style.setProperty('--stream',colors[0]);node.style.setProperty('--tint',colors[1]);
}
function pin() {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({width:'15',height:'15',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','aria-hidden':'true'}))svg.setAttribute(key,value);
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z');
  const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx','12');circle.setAttribute('cy','10');circle.setAttribute('r','2.5');svg.append(path,circle);return svg;
}
function populateProducts() {
  const previous=state.product;
  const values=[...new Set(roomsData.filter(r=>(!state.day || r.day===state.day) && (!state.streams.length || state.streams.includes(AgendaFilters.canonical(r.vs))) && r.type==='Breakout').map(AgendaFilters.participant).filter(Boolean))].sort();
  $('productFilter').replaceChildren(new Option('All products & teams',''));
  for(const value of values)$('productFilter').add(new Option(value,value));
  state.product=values.includes(previous)?previous:'';$('productFilter').value=state.product;
}
function initialiseControls() {
  const days=[...new Set(roomsData.map(r=>r.day).filter(Boolean))].sort();
  if(days.length) state.day=days[0];
  $('dayTabs').replaceChildren();
  for(const day of ['',...days]) {
    const button=element('button','',day || 'Both days');button.type='button';button.dataset.day=day;
    button.addEventListener('click',()=>{state.day=day;populateProducts();render();});$('dayTabs').append(button);
  }
  $('dayTabs').hidden=!days.length;
  $('typeFilter').replaceChildren(new Option('All session types',''));
  for(const type of [...new Set(roomsData.map(r=>r.type).filter(Boolean))].sort())$('typeFilter').add(new Option(type,type));
  $('streamFilters').replaceChildren();
  for(const stream of ['',...[...new Set(roomsData.map(r=>AgendaFilters.canonical(r.vs)).filter(s=>s && s!=='ALL'))].sort()]) {
    const button=element('button','stream-chip',stream || 'All streams');button.type='button';button.dataset.stream=stream;tint(button,stream);
    button.addEventListener('click',()=>{state.streams=stream?(state.streams.includes(stream)?state.streams.filter(v=>v!==stream):[...state.streams,stream]):[];populateProducts();render();});$('streamFilters').append(button);
  }
  populateProducts();
}
function clearFilters() {
  Object.assign(state,{day:'',streams:[],type:'',product:'',query:'',includeShared:true});
  $('searchInput').value='';$('typeFilter').value='';$('includeShared').checked=true;populateProducts();render();
}
function activeFilters() {
  const container=$('activeFilters');container.replaceChildren();
  const chip=(label,remove)=>{const button=element('button','',label+' ×');button.type='button';button.setAttribute('aria-label','Remove filter: '+label);button.onclick=()=>{remove();populateProducts();render();$('searchInput').focus();};container.append(button);};
  if(state.day)chip(state.day,()=>state.day='');
  state.streams.forEach(stream=>chip(stream,()=>state.streams=state.streams.filter(s=>s!==stream)));
  if(state.query.trim())chip('Search: '+state.query.trim(),()=>{state.query='';$('searchInput').value='';});
  if(state.type)chip(state.type,()=>{state.type='';$('typeFilter').value='';});
  if(state.product)chip(state.product,()=>state.product='');
  if(!state.includeShared)chip('Shared sessions excluded',()=>{state.includeShared=true;$('includeShared').checked=true;});
}
function card(row) {
  const article=element('article','room-card');tint(article,row.vs);
  const top=element('div','card-top');top.append(element('span','badge',row.vs==='ALL'?'ALL STREAMS':row.vs || 'UNASSIGNED'),element('span','session-type',row.type || 'Session'));
  const title=row.type==='Breakout'?(row.product || row.team || row.purpose):(row.purpose || row.product || row.team);
  article.append(top,element('h3','',title || 'Session'));
  const description=row.type==='Breakout'?row.purpose:row.product;
  if(description && description!==title)article.append(element('p','purpose',description));
  if(row.team && row.team!==row.product && row.team!==title)article.append(element('p','team',row.team));
  const bottom=element('div','card-bottom'),location=element('span','room-location');location.append(pin(),element('span','',row.location || 'Room not specified'));
  bottom.append(location,element('span','card-day',row.day || ''));article.append(bottom);return article;
}
function render() {
  for(const button of $('dayTabs').children)button.setAttribute('aria-pressed',String(button.dataset.day===state.day));
  for(const button of $('streamFilters').children)button.setAttribute('aria-pressed',String(button.dataset.stream?state.streams.includes(button.dataset.stream):!state.streams.length));
  activeFilters();
  const rows=AgendaFilters.filter(roomsData,state),container=$('rooms-container');container.replaceChildren();
  $('agendaTitle').textContent=state.day?state.day+' · Your agenda':'Your agenda';
  $('count').textContent=`${rows.length} of ${roomsData.length} sessions${state.streams.length?' · '+state.streams.join(' + '):''}`;
  $('clearFilters').disabled=!(state.day || state.streams.length || state.type || state.product || state.query || !state.includeShared);
  if(!rows.length) {
    const empty=element('div','empty-state');empty.append(element('h3','','No sessions match yet'),element('p','','Try fewer search words or remove a filter to see more sessions.'));
    const reset=element('button','clear-button','Clear all filters');reset.type='button';reset.onclick=clearFilters;empty.append(reset);container.append(empty);return;
  }
  let currentDay=null,currentTime=null,cards;
  for(const row of rows) {
    if(row.day!==currentDay){currentDay=row.day;currentTime=null;container.append(element('h3','day-heading',currentDay || 'Programme'));}
    if(row.time!==currentTime){
      currentTime=row.time;const group=element('section','time-group');const heading=element('h4','time-heading');
      const match=String(row.time || '').match(/^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/);
      if(match)heading.append(element('strong','',match[1]),element('span','','until '+match[2]));else heading.textContent=row.time || 'Time not specified';
      cards=element('div','cards');group.append(heading,cards);container.append(group);
    }
    cards.append(card(row));
  }
}
async function loadRooms() {
  try {
    const preview=new URLSearchParams(location.search).get('draft')==='1';
    if(preview){const draft=localStorage.getItem('pi-planning-v2-agenda-draft-v1');if(!draft)throw Error('No saved draft found. Open Edit agenda to create one.');roomsData=JSON.parse(draft);$('notice').hidden=false;$('notice').textContent='Draft preview · These changes are not published.';}
    else {const response=await fetch('rooms.json',{cache:'no-store'});if(!response.ok)throw Error('The agenda could not be loaded. Please refresh to try again.');roomsData=await response.json();}
    if(!Array.isArray(roomsData) || roomsData.some(r=>!r || typeof r!=='object'))throw Error('The agenda format is invalid.');
    roomsData=roomsData.map(r=>Object.fromEntries(['day','time','vs','location','product','purpose','type','team'].map(key=>[key,String(r[key] || '')])));
    const quarters=[...new Set(roomsData.map(r=>r.purpose.match(/\b\d{2}Q[1-4]\b/)?.[0]).filter(Boolean))];
    $('title').textContent=quarters.length===1?`PI ${quarters[0]} Planning`:'PI Planning';document.title=$('title').textContent+' · Agenda';
    const days=new Set(roomsData.map(r=>r.day).filter(Boolean)).size;$('total').textContent=`${days?days+' days · ':''}${roomsData.length} sessions`;
    initialiseControls();render();
  }catch(error){$('total').textContent='Agenda unavailable';$('count').textContent='';const box=element('div','empty-state');box.append(element('h3','','Unable to load the agenda'),element('p','',error.message));$('rooms-container').replaceChildren(box);}
}
$('searchInput').addEventListener('input',()=>{state.query=$('searchInput').value;render();});
$('typeFilter').addEventListener('change',()=>{state.type=$('typeFilter').value;render();});
$('productFilter').addEventListener('change',()=>{state.product=$('productFilter').value;render();});
$('includeShared').addEventListener('change',()=>{state.includeShared=$('includeShared').checked;render();});
$('clearFilters').onclick=clearFilters;
document.addEventListener('keydown',event=>{if(event.key==='/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable){event.preventDefault();$('searchInput').focus();}});
loadRooms();
