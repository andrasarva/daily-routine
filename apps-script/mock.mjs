// Code.gs futtatása Node-ban, mockolt SpreadsheetApp-pal (Google fiók nélkül).
//   npm test           → önálló tesztek
//   npm run mock:gas   → helyi "Apps Script" szerver: http://localhost:8787/exec
//     (az appban: localStorage nr.config = {"mode":"google","url":"http://localhost:8787/exec","code":"<kiírt kód>"})
import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import assert from 'node:assert/strict';

const mode = process.argv[2] || 'test';
const codePath = new URL('./Code.gs', import.meta.url);

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  cells(fn) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) fn(this.r - 1 + i, this.c - 1 + j, i, j); }
  getValues() {
    const out = Array.from({ length: this.nr }, () => Array(this.nc).fill(''));
    this.cells((R, C, i, j) => { out[i][j] = this.sh.cells[R]?.[C] ?? ''; });
    return out;
  }
  setValues(v) {
    assert.equal(v.length, this.nr, 'setValues sorok száma');
    this.cells((R, C, i, j) => {
      assert.equal(v[i].length, this.nc, 'setValues oszlopok száma');
      let x = v[i][j];
      // A Sheets automatikus átalakítása, ha a cella nem szöveg formátumú
      if (!this.sh.text.has(`${R},${C}`) && typeof x === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(x)) x = new Date(x + 'T00:00:00');
        else if (/^\d{1,2}:\d{2}$/.test(x)) { const [h, m] = x.split(':'); x = new Date(1899, 11, 30, +h, +m); }
        else if (/^-?\d+(\.\d+)?$/.test(x)) x = Number(x);
      }
      (this.sh.cells[R] ||= [])[C] = x;
    });
    return this;
  }
  setNumberFormat(f) { this.cells((R, C) => (f === '@' ? this.sh.text.add(`${R},${C}`) : this.sh.text.delete(`${R},${C}`))); return this; }
  clearContent() { this.cells((R, C) => { if (this.sh.cells[R]) this.sh.cells[R][C] = ''; }); return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.cells = []; this.text = new Set(); }
  getName() { return this.name; }
  getMaxRows() { return 1000; }
  getLastRow() {
    for (let i = this.cells.length - 1; i >= 0; i--) if ((this.cells[i] || []).some((v) => v !== '' && v != null)) return i + 1;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.cells.map((r) => (r || []).reduce((m, v, j) => (v !== '' && v != null ? j + 1 : m), 0))); }
  getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  setFrozenRows() {}
  autoResizeColumns() {}
}

function makeSpreadsheet() {
  const sheets = [new Sheet('Munkalap1')];
  return {
    sheets,
    getName: () => 'Napi Rutin teszt',
    getSpreadsheetTimeZone: () => 'Europe/Budapest',
    getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
    getSheets: () => sheets.slice(),
    insertSheet(n) { const s = new Sheet(n); sheets.push(s); return s; },
    deleteSheet(s) { sheets.splice(sheets.indexOf(s), 1); },
  };
}

function load() {
  const ss = makeSpreadsheet();
  const props = new Map();
  const pad = (n) => String(n).padStart(2, '0');
  const ctx = {
    console,
    SpreadsheetApp: { getActive: () => ss, getUi: () => { throw new Error('nincs UI'); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }),
    },
    Utilities: {
      formatDate: (d, tz, f) => f === 'HH:mm' ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    },
    Logger: { log: (m) => ctx.logs.push(m) },
    logs: [],
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), ctx, { filename: 'Code.gs' });
  return { ctx, ss, props };
}

const call = (ctx, fn, arg) => JSON.parse(ctx[fn](arg).text);

if (mode === 'test') {
  const { ctx, ss, props } = load();

  // Kód nélkül hiba
  let r = call(ctx, 'doGet', { parameter: { action: 'ping', code: 'x' } });
  assert.equal(r.ok, false);
  assert.match(r.error, /setup/);

  ctx.setup();
  const code = props.get('CSALADI_KOD');
  assert.match(code, /^[a-z]+-[a-z0-9]{6}$/);
  assert.deepEqual(ss.sheets.map((s) => s.name), ['Gyerekek', 'Listak', 'Feladatok', 'Elvegzett', 'Beallitasok'], 'Munkalap1 törölve');
  assert.match(ctx.logs.at(-1), new RegExp(code));

  // Újrafuttatás: semmi nem változik, a kód marad
  ctx.setup();
  assert.equal(props.get('CSALADI_KOD'), code);
  assert.match(ctx.logs.at(-1), /Minden lap megvolt/);

  r = call(ctx, 'doGet', { parameter: { action: 'ping', code: 'rossz' } });
  assert.deepEqual(r, { ok: false, error: 'Hibás családi kód.' });
  r = call(ctx, 'doGet', { parameter: { action: 'ping', code: ` ${code} ` } });
  assert.equal(r.ok, true);
  assert.equal(r.verzio, 1);

  r = call(ctx, 'doGet', { parameter: { action: 'data', code, since: '2026-01-01' } });
  assert.equal(r.data.gyerekek.length, 2);
  assert.equal(r.data.listak.length, 5);
  assert.equal(r.data.feladatok.length, 22);
  assert.equal(r.data.listak[0].kezdes, '04:00');
  assert.equal(r.data.gyerekek[1].nev, 'Máté');
  assert.deepEqual(r.data.beallitasok, { nap_kezdete: '4', hangeffektek: 'igen', felolvasas_sebesseg: '0.9' });
  assert.deepEqual(r.elvegzett, []);

  // Kézzel beírt, NEM szöveg formátumú idő (pl. a felhasználó új sort ír be) → Date → "HH:mm"
  const listak = ss.getSheetByName('Listak');
  listak.getRange(7, 1, 1, 11).setNumberFormat('0').setValues([['uj', 'Új', 'napszak', '06:30', '9:05', 'minden', '', '⭐', '', '5', 'igen']]);
  r = call(ctx, 'doGet', { parameter: { action: 'data', code } });
  const uj = r.data.listak.find((l) => l.id === 'uj');
  assert.equal(uj.kezdes, '06:30');
  assert.equal(uj.vege, '09:05');
  assert.equal(uj.sorrend, '5');

  // Műveletek
  const post = (body) => call(ctx, 'doPost', { postData: { contents: JSON.stringify({ code, ...body }) } });
  const op = (o, datum, feladat_id, gyerek_id = 'bence') => ({ op: o, datum, gyerek_id, lista_id: 'reggel', feladat_id, idopont: '2026-10-09T05:00:00.000Z' });
  r = post({ action: 'ops', ops: [op('complete', '2026-10-09', 'r1'), op('complete', '2026-10-09', 'r2'), op('complete', '2026-10-09', 'r1'), op('complete', '2026-10-01', 'r1')] });
  assert.deepEqual(r, { ok: true, feldolgozva: 4 });
  r = call(ctx, 'doGet', { parameter: { action: 'data', code, since: '2026-10-05' } });
  assert.deepEqual(r.elvegzett.map((e) => e.feladat_id + '@' + e.datum), ['r1@2026-10-09', 'r2@2026-10-09'], 'duplikátum kiszűrve, since szűr');
  assert.equal(r.elvegzett[0].idopont, '2026-10-09T05:00:00.000Z');

  // Visszavonás ékezet/kisbetű függetlenül; a többi sor marad
  r = post({ action: 'ops', ops: [op('undo', '2026-10-09', 'R1', 'BENCE'), { op: 'complete', datum: 'tegnap', gyerek_id: 'x', feladat_id: 'y' }] });
  assert.equal(r.ok, true);
  r = call(ctx, 'doGet', { parameter: { action: 'data', code } });
  assert.deepEqual(r.elvegzett.map((e) => e.feladat_id + '@' + e.datum).sort(), ['r1@2026-10-01', 'r2@2026-10-09']);
  assert.equal(ss.getSheetByName('Elvegzett').getLastRow(), 3, 'a törölt sor nem marad üresen a végén');

  // Hibás kérések
  r = call(ctx, 'doPost', { postData: { contents: 'nem json' } });
  assert.equal(r.ok, false);
  r = post({ action: 'valami' });
  assert.match(r.error, /Ismeretlen/);

  // Kitörölt fejléc, de van adat → nem írunk felül semmit
  const elv = ss.getSheetByName('Elvegzett');
  elv.getRange(1, 1, 1, 5).clearContent();
  const before = JSON.stringify(elv.cells);
  r = post({ action: 'ops', ops: [op('complete', '2026-10-09', 'r3')] });
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(elv.cells), before);

  // Új kód
  ctx.newCode();
  assert.notEqual(props.get('CSALADI_KOD'), code);

  console.log('✅ Minden teszt sikeres');
} else {
  const { ctx, props } = load();
  ctx.setup();
  const code = props.get('CSALADI_KOD');
  http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const u = new URL(req.url, 'http://x');
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const out = req.method === 'POST'
        ? ctx.doPost({ postData: { contents: body } })
        : ctx.doGet({ parameter: Object.fromEntries(u.searchParams) });
      if (req.method === 'POST') console.log('POST', body);
      res.setHeader('Content-Type', 'application/json');
      res.end(out.text);
    });
  }).listen(8787, () => console.log(`mock /exec: http://localhost:8787/exec  kód: ${code}`));
}
