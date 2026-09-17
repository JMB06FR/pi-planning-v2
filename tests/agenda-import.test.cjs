const assert = require('node:assert/strict');
const {mapAgenda, normalizeTime, unzip} = require('../excel-import.js');
const fixture = {cells:{
  E10:'DAY 1', B11:'08:55 - 9:45', C11:'PLM,R&D,MON', D11:'Auditorium', E11:'All', F11:'Overall Plenary',
  B13:'10:00 - 11:30', C13:'PLM', D13:'1C', E13:'VS PLM', F13:'VS Plenary',
  C14:'R&D ', D14:'2C', E14:'VS R&D',
  B43:'11:30-16:00', C43:'MTA', D43:'13B', E43:'Product A', F43:'Breakouts VS MTA',
  C44:'MTA', D44:'4A', E44:'Product B',
  B45:'13:00 - 14:00', C45:'PLM,R&D', E45:'All', F45:'Lunch',
  C58:'PLM,R&D', E60:'DAY 2',
  B61:'09:00 - 09:30', C61:'MTA', D61:'13B', E61:'MTA', F61:'Planning Adjustment',
  B108:'from 18:00', C108:'PLM,R&D', D108:'Cafe', E108:'ALL', F108:'Drinks'
},merges:['B13:B14','F13:F14','F43:F44']};
const result = mapAgenda(fixture), row = n => result.rows.find(r => r.sourceRow === n);
assert.equal(result.rows.length, 8);
assert.equal(row(11).vs, 'ALL');
assert.equal(row(11).time, '08:55-09:45');
assert.equal(row(14).time, '10:00-11:30');
assert.equal(row(14).purpose, 'VS Plenary');
assert.equal(row(44).time, '11:30-16:00');
assert.equal(row(44).type, 'Breakout');
assert.equal(row(45).location, '');
assert.equal(row(61).day, 'Day 2');
assert.equal(row(108).time, 'from 18:00');
assert.equal(row(108).type, 'Break');
assert.deepEqual(result.warnings, []);
const broken = structuredClone(fixture);
broken.merges = broken.merges.filter(r => r !== 'F43:F44');
broken.cells.F44 = 'Different breakout';
broken.cells.C61 = 'TUE';
const warnings = mapAgenda(broken).warnings;
assert.ok(warnings.some(w => w.includes('row 44: missing time')));
assert.ok(warnings.some(w => w.includes('row 61: unrecognised')));
assert.equal(normalizeTime('9:00 – 12:00'), '09:00-12:00');
assert.throws(() => mapAgenda({cells:{},merges:[]}), /No sessions/);
assert.rejects(() => unzip(new ArrayBuffer(4)), /valid/).then(() => console.log('Agenda mapping regression tests passed.'));
