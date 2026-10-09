/**
 * Napi Rutin – Google Apps Script backend.
 *
 * A táblázathoz kötött script (Bővítmények → Apps Script). Telepítés: lásd README.
 *
 * API (Web App, /exec):
 *   GET  ?action=ping&code=…              → { ok, nev, verzio }
 *   GET  ?action=data&since=YYYY-MM-DD&code=… → { ok, data: { gyerekek, listak, feladatok, beallitasok }, elvegzett }
 *   POST {"action":"ops","ops":[…],"code":…} (text/plain) → { ok, feldolgozva }
 * Hiba esetén: { ok: false, error }
 */

const VERSION = 1;
const CODE_PROP = 'CSALADI_KOD';

const SHEETS = {
  gyerekek: { name: 'Gyerekek', header: ['id', 'nev', 'avatar', 'tema', 'sorrend', 'aktiv'] },
  listak: { name: 'Listak', header: ['id', 'nev', 'tipus', 'kezdes', 'vege', 'napok', 'kinek', 'ikon', 'tema', 'sorrend', 'aktiv'] },
  feladatok: { name: 'Feladatok', header: ['id', 'lista_id', 'sorrend', 'cim', 'kep', 'emoji', 'napok', 'kinek', 'felolvasas', 'hang', 'aktiv'] },
  elvegzett: { name: 'Elvegzett', header: ['datum', 'gyerek_id', 'lista_id', 'feladat_id', 'idopont'] },
  beallitasok: { name: 'Beallitasok', header: ['kulcs', 'ertek'] },
};

// ---------- Web App belépési pontok ----------

function doGet(e) {
  return respond(() => {
    const p = (e && e.parameter) || {};
    checkCode(p.code);
    if (p.action === 'ping') return { nev: SpreadsheetApp.getActive().getName(), verzio: VERSION };
    if (p.action === 'data') return readAll(p.since);
    throw new Error('Ismeretlen művelet: ' + p.action);
  });
}

function doPost(e) {
  return respond(() => {
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error('Hibás kérés (nem JSON).');
    }
    checkCode(body.code);
    if (body.action === 'ops') return applyOpsToSheet(Array.isArray(body.ops) ? body.ops : []);
    throw new Error('Ismeretlen művelet: ' + body.action);
  });
}

function respond(fn) {
  let out;
  try {
    out = Object.assign({ ok: true }, fn());
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function checkCode(code) {
  const saved = PropertiesService.getScriptProperties().getProperty(CODE_PROP);
  if (!saved) throw new Error('Még nincs családi kód. Futtasd a setup() függvényt az Apps Script szerkesztőben.');
  if (String(code || '').trim() !== saved) throw new Error('Hibás családi kód.');
}

// ---------- Olvasás ----------

function readAll(since) {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const settings = {};
  for (const r of readSheet(ss, SHEETS.beallitasok, tz)) {
    if (r.kulcs) settings[r.kulcs] = r.ertek;
  }
  const done = readSheet(ss, SHEETS.elvegzett, tz).filter((r) => r.datum && (!since || r.datum >= since));
  return {
    data: {
      gyerekek: readSheet(ss, SHEETS.gyerekek, tz),
      listak: readSheet(ss, SHEETS.listak, tz),
      feladatok: readSheet(ss, SHEETS.feladatok, tz),
      beallitasok: settings,
    },
    elvegzett: done,
  };
}

function getSheet(ss, def) {
  const sh = ss.getSheetByName(def.name);
  if (!sh) throw new Error('Hiányzik a(z) „' + def.name + '” lap. Futtasd a setup() függvényt.');
  return sh;
}

function readSheet(ss, def, tz) {
  return rowsToObjects(getSheet(ss, def).getDataRange().getValues(), tz);
}

/** Első sor = fejléc; az üres sorokat kihagyja. Minden érték szöveg lesz. */
function rowsToObjects(values, tz) {
  if (!values.length) return [];
  const header = values[0].map((h) => String(h).trim().toLowerCase());
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every((v) => v === '' || v == null)) continue;
    const o = {};
    header.forEach((h, j) => {
      if (h) o[h] = cellText(row[j], tz);
    });
    out.push(o);
  }
  return out;
}

/** A Sheets a "06:00"-t és a dátumokat Date-té alakíthatja – visszaírjuk szöveggé. */
function cellText(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    const timeOnly = v.getFullYear() < 1901; // időpont cella (1899-12-30 alapú)
    return Utilities.formatDate(v, tz || 'Europe/Budapest', timeOnly ? 'HH:mm' : 'yyyy-MM-dd');
  }
  if (typeof v === 'boolean') return v ? 'igen' : 'nem';
  if (v == null) return '';
  return String(v).trim();
}

// ---------- Írás (elvégzett / visszavonás) ----------

function applyOpsToSheet(ops) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = getSheet(ss, SHEETS.elvegzett);
    const values = sh.getDataRange().getValues();
    let header = values[0].map((h) => String(h).trim().toLowerCase());
    if (!header.includes('datum')) {
      // Üres lapra visszaírjuk a fejlécet; ha van benne adat, inkább nem nyúlunk hozzá
      if (sh.getLastRow() > 0) throw new Error('Az „Elvegzett” lap első sora nem fejléc (datum, gyerek_id, …).');
      header = SHEETS.elvegzett.header;
      sh.getRange(1, 1, 1, header.length).setValues([header]);
    }
    const res = applyOps(rowsToObjects(values, ss.getSpreadsheetTimeZone()), ops);
    if (res.changed) {
      const last = sh.getLastRow();
      if (last > 1) sh.getRange(2, 1, last - 1, header.length).clearContent();
      if (res.rows.length) {
        sh.getRange(2, 1, res.rows.length, header.length)
          .setNumberFormat('@') // maradjon szöveg a dátum
          .setValues(res.rows.map((r) => header.map((h) => (r[h] == null ? '' : r[h]))));
      }
    }
    return { feldolgozva: ops.length };
  } finally {
    lock.releaseLock();
  }
}

/** Tiszta függvény: a műveletek alkalmazása az Elvegzett sorokra (ugyanaz a logika, mint az appban). */
function applyOps(rows, ops) {
  const key = (r) => [String(r.datum), norm(r.gyerek_id), norm(r.feladat_id)].join('|');
  let changed = false;
  for (const op of ops) {
    if (!op || !/^\d{4}-\d{2}-\d{2}$/.test(String(op.datum)) || !op.gyerek_id || !op.feladat_id) continue;
    const k = key(op);
    if (op.op === 'complete') {
      if (rows.some((r) => key(r) === k)) continue;
      rows.push({
        datum: String(op.datum),
        gyerek_id: String(op.gyerek_id),
        lista_id: String(op.lista_id || ''),
        feladat_id: String(op.feladat_id),
        idopont: String(op.idopont || new Date().toISOString()),
      });
      changed = true;
    } else if (op.op === 'undo') {
      const before = rows.length;
      rows = rows.filter((r) => key(r) !== k);
      if (rows.length !== before) changed = true;
    }
  }
  return { rows, changed };
}

function norm(s) {
  return String(s == null ? '' : s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// ---------- Beállítás (a szerkesztőből vagy a "Napi Rutin" menüből) ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🦖 Napi Rutin')
    .addItem('Lapok létrehozása (setup)', 'setup')
    .addItem('Családi kód megjelenítése', 'showCode')
    .addItem('Új családi kód', 'newCode')
    .addToUi();
}

/**
 * Létrehozza a hiányzó lapokat fejléccel és mintaadatokkal, és ha még nincs, családi kódot generál.
 * A meglévő lapokhoz nem nyúl, így bármikor újra futtatható.
 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const created = [];
  for (const key of Object.keys(SHEETS)) {
    const def = SHEETS[key];
    if (ss.getSheetByName(def.name)) continue;
    const sh = ss.insertSheet(def.name);
    const rows = [def.header].concat(sampleRows(key, def.header));
    const cols = def.header.length;
    sh.getRange(1, 1, sh.getMaxRows(), cols).setNumberFormat('@'); // "06:00", dátumok: maradjanak szövegek
    sh.getRange(1, 1, rows.length, cols).setValues(rows);
    sh.getRange(1, 1, 1, cols).setFontWeight('bold').setBackground('#ffd166');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, cols);
    created.push(def.name);
  }
  // Az új táblázat üres alap lapja ("Munkalap1" / "Sheet1") felesleges
  if (created.length) {
    for (const sh of ss.getSheets()) {
      const isOurs = Object.keys(SHEETS).some((k) => SHEETS[k].name === sh.getName());
      if (!isOurs && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
    }
  }
  const code = ensureCode();
  notify(
    (created.length ? 'Létrehozott lapok: ' + created.join(', ') + '.\n' : 'Minden lap megvolt már, nem változott semmi.\n') +
      'Családi kód: ' + code + '\n\nEzt kell majd beírni a tableten az app első indításakor.'
  );
}

function showCode() {
  const code = PropertiesService.getScriptProperties().getProperty(CODE_PROP);
  notify(code ? 'Családi kód: ' + code : 'Még nincs családi kód. Futtasd a setup() függvényt.');
}

/** Új kódot generál (pl. ha illetéktelen kezekbe került). A tableten is újra be kell majd írni. */
function newCode() {
  const code = randomCode();
  PropertiesService.getScriptProperties().setProperty(CODE_PROP, code);
  notify('Új családi kód: ' + code + '\n\nA tableten a szülői módban: ⚙️ Kapcsolat → add meg újra.');
}

function ensureCode() {
  const props = PropertiesService.getScriptProperties();
  let code = props.getProperty(CODE_PROP);
  if (!code) {
    code = randomCode();
    props.setProperty(CODE_PROP, code);
  }
  return code;
}

function randomCode() {
  const words = ['dino', 'tuzolto', 'traktor', 'busz', 'raketa', 'mozdony', 'tojas', 'vulkan'];
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let tail = '';
  for (let i = 0; i < 6; i++) tail += chars[Math.floor(Math.random() * chars.length)];
  return words[Math.floor(Math.random() * words.length)] + '-' + tail;
}

function notify(msg) {
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg); // csak a táblázat menüjéből futtatva van felület
  } catch (err) {
    /* a szerkesztőből futtatva: a Végrehajtási naplóban látszik */
  }
}

// ---------- Mintaadatok (ugyanazok, mint a Demó módban: src/api/sampleData.js) ----------

function sampleRows(key, header) {
  if (key === 'beallitasok') {
    return Object.keys(SAMPLE.beallitasok).map((k) => [k, SAMPLE.beallitasok[k]]);
  }
  return (SAMPLE[key] || []).map((o) => header.map((h) => (o[h] == null ? '' : String(o[h]))));
}

const SAMPLE = {
  gyerekek: [
    { id: 'bence', nev: 'Bence', avatar: '🦁', tema: 'auto', sorrend: 1, aktiv: 'igen' },
    { id: 'mate', nev: 'Máté', avatar: '🐻', tema: 'dino', sorrend: 2, aktiv: 'igen' },
  ],
  listak: [
    { id: 'reggel', nev: 'Reggel', tipus: 'napszak', kezdes: '04:00', vege: '11:00', napok: 'minden', kinek: '', ikon: '🌞', tema: '', sorrend: 1, aktiv: 'igen' },
    { id: 'delutan', nev: 'Délután', tipus: 'napszak', kezdes: '11:00', vege: '17:30', napok: 'minden', kinek: '', ikon: '🍎', tema: '', sorrend: 2, aktiv: 'igen' },
    { id: 'este', nev: 'Este', tipus: 'napszak', kezdes: '17:30', vege: '04:00', napok: 'minden', kinek: '', ikon: '🌙', tema: '', sorrend: 3, aktiv: 'igen' },
    { id: 'ovi', nev: 'Oviba indulás', tipus: 'alkalmi', kezdes: '', vege: '', napok: 'hétköznap', kinek: '', ikon: '🎒', tema: 'jarmu', sorrend: 10, aktiv: 'igen' },
    { id: 'furdes', nev: 'Fürdés', tipus: 'alkalmi', kezdes: '', vege: '', napok: 'minden', kinek: '', ikon: '🛁', tema: '', sorrend: 11, aktiv: 'igen' },
  ],
  feladatok: [
    { id: 'r1', lista_id: 'reggel', sorrend: 1, cim: 'Pisilés', kep: '', emoji: '🚽', napok: 'minden', kinek: '', felolvasas: 'Először pisiljünk!', hang: '', aktiv: 'igen' },
    { id: 'r2', lista_id: 'reggel', sorrend: 2, cim: 'Kézmosás', kep: '', emoji: '🧼', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'r3', lista_id: 'reggel', sorrend: 3, cim: 'Reggeli', kep: '', emoji: '🥣', napok: 'minden', kinek: '', felolvasas: 'Jó étvágyat a reggelihez!', hang: '', aktiv: 'igen' },
    { id: 'r4', lista_id: 'reggel', sorrend: 4, cim: 'Fogmosás', kep: '', emoji: '🪥', napok: 'minden', kinek: '', felolvasas: 'Most mossunk fogat!', hang: '', aktiv: 'igen' },
    { id: 'r5', lista_id: 'reggel', sorrend: 5, cim: 'Öltözés', kep: '', emoji: '👕', napok: 'minden', kinek: '', felolvasas: 'Öltözzünk fel!', hang: '', aktiv: 'igen' },

    { id: 'd1', lista_id: 'delutan', sorrend: 1, cim: 'Ebéd', kep: '', emoji: '🍽️', napok: 'hétvége', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'd2', lista_id: 'delutan', sorrend: 2, cim: 'Csendes pihenő', kep: '', emoji: '😴', napok: 'hétvége', kinek: 'bence', felolvasas: 'Egy kis pihenő jön.', hang: '', aktiv: 'igen' },
    { id: 'd3', lista_id: 'delutan', sorrend: 3, cim: 'Uzsonna', kep: '', emoji: '🍎', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'd4', lista_id: 'delutan', sorrend: 4, cim: 'Játékok elpakolása', kep: '', emoji: '🧸', napok: 'minden', kinek: '', felolvasas: 'Pakoljuk el a játékokat!', hang: '', aktiv: 'igen' },

    { id: 'e1', lista_id: 'este', sorrend: 1, cim: 'Vacsora', kep: '', emoji: '🍝', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'e2', lista_id: 'este', sorrend: 2, cim: 'Pizsama', kep: '', emoji: '🩳', napok: 'minden', kinek: '', felolvasas: 'Vegyük fel a pizsamát!', hang: '', aktiv: 'igen' },
    { id: 'e3', lista_id: 'este', sorrend: 3, cim: 'Fogmosás', kep: '', emoji: '🪥', napok: 'minden', kinek: '', felolvasas: 'Esti fogmosás!', hang: '', aktiv: 'igen' },
    { id: 'e4', lista_id: 'este', sorrend: 4, cim: 'Mese', kep: '', emoji: '📖', napok: 'minden', kinek: '', felolvasas: 'Mesét olvasunk!', hang: '', aktiv: 'igen' },
    { id: 'e5', lista_id: 'este', sorrend: 5, cim: 'Puszi, alvás', kep: '', emoji: '😘', napok: 'minden', kinek: '', felolvasas: 'Puszi, és jó éjszakát!', hang: '', aktiv: 'igen' },

    { id: 'o1', lista_id: 'ovi', sorrend: 1, cim: 'Cipő', kep: '', emoji: '👟', napok: 'minden', kinek: '', felolvasas: 'Vegyük fel a cipőt!', hang: '', aktiv: 'igen' },
    { id: 'o2', lista_id: 'ovi', sorrend: 2, cim: 'Kabát', kep: '', emoji: '🧥', napok: 'minden', kinek: '', felolvasas: 'Jöhet a kabát!', hang: '', aktiv: 'igen' },
    { id: 'o3', lista_id: 'ovi', sorrend: 3, cim: 'Táska', kep: '', emoji: '🎒', napok: 'minden', kinek: '', felolvasas: 'Hol a táska?', hang: '', aktiv: 'igen' },
    { id: 'o4', lista_id: 'ovi', sorrend: 4, cim: 'Indulás!', kep: '', emoji: '🚗', napok: 'minden', kinek: '', felolvasas: 'Indulunk az oviba!', hang: '', aktiv: 'igen' },

    { id: 'f1', lista_id: 'furdes', sorrend: 1, cim: 'Vetkőzés', kep: '', emoji: '🧦', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'f2', lista_id: 'furdes', sorrend: 2, cim: 'Be a kádba', kep: '', emoji: '🛁', napok: 'minden', kinek: '', felolvasas: 'Csobbanás a kádba!', hang: '', aktiv: 'igen' },
    { id: 'f3', lista_id: 'furdes', sorrend: 3, cim: 'Hajmosás', kep: '', emoji: '🧴', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'f4', lista_id: 'furdes', sorrend: 4, cim: 'Törölközés', kep: '', emoji: '🧺', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
  ],
  beallitasok: {
    nap_kezdete: '4',
    hangeffektek: 'igen',
    felolvasas_sebesseg: '0.9',
  },
};
