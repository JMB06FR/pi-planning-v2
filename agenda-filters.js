(function(root){
  'use strict';
  const text = value => String(value || '').trim();
  const canonical = value => text(value).toUpperCase();
  const participant = row => text(row.team || row.product);
  const start = time => {const match = text(time).match(/(\d{1,2}):(\d{2})/);return match ? +match[1]*60 + +match[2] : Infinity;};
  function filter(rows, state) {
    const words = text(state.query).toLowerCase().split(/\s+/).filter(Boolean);
    const streams = (state.streams || []).map(canonical);
    const relevantStreams = new Set(rows.filter(r => participant(r) === state.product && (!state.day || r.day === state.day)).map(r => canonical(r.vs)));
    return rows.filter(row => {
      const vs = canonical(row.vs), all = vs === 'ALL' || canonical(row.product) === 'ALL';
      if (!state.includeShared && all) return false;
      if (state.day && row.day !== state.day) return false;
      if (state.type && row.type !== state.type) return false;
      if (streams.length && !streams.includes(vs) && !(all && state.includeShared)) return false;
      if (state.product && participant(row) !== state.product) {
        const shared = all || row.type === 'Plenary' && relevantStreams.has(vs);
        if (!state.includeShared || !shared) return false;
      }
      const haystack = ['team','product','purpose','location','vs','type','time','day'].map(f=>text(row[f])).join(' ').toLowerCase();
      return words.every(word => haystack.includes(word));
    }).sort((a,b)=>text(a.day).localeCompare(text(b.day)) || start(a.time)-start(b.time));
  }
  const api = {filter, participant, canonical, start};
  root.AgendaFilters=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(globalThis);
