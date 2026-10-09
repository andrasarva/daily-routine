// Tiszta (mellékhatás nélküli) üzleti logika: napok, szűrés, témák, matricák.

/** Ékezetek eltávolítása + kisbetű, a táblázat szabad szöveges mezőihez. */
export function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** "igen" / "nem" / TRUE / FALSE / 1 / 0 / üres(=alapérték) */
export function isYes(v, dflt = true) {
  const n = norm(v);
  if (n === '') return dflt;
  return ['igen', 'i', 'yes', 'y', 'true', '1', 'x', 'ok'].includes(n);
}

const pad = (n) => String(n).padStart(2, '0');

/** Az "üzleti nap" dátuma: hajnali `startHour` előtt még az előző naphoz tartozik. */
export function businessDate(now = new Date(), startHour = 4) {
  const d = new Date(now.getTime() - startHour * 3600 * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(startHour = 4, now = new Date()) {
  return dateKey(businessDate(now, startHour));
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Hétfőtől vasárnapig a hét napjai (Date-ek) az adott üzleti naphoz. */
export function weekDates(baseDate) {
  const dow = (baseDate.getDay() + 6) % 7; // hétfő = 0
  const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export const DAY_SHORT = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']; // getDay() indexelés
export const DAY_LONG = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];

/**
 * "napok" mező értelmezése → Set(getDay() értékek).
 * Elfogad: üres / minden / hétköznap / hétvége / H,K,Sze,Cs,P,Szo,V / teljes nevek.
 */
export function parseDays(value) {
  const all = new Set([0, 1, 2, 3, 4, 5, 6]);
  const n = norm(value);
  if (!n || n === 'minden' || n === 'mindig' || n === '*' || n === 'mind') return all;
  const out = new Set();
  for (const raw of n.split(/[,;\s/]+/)) {
    const t = raw.replace(/\./g, '');
    if (!t) continue;
    if (t.startsWith('hetkoz')) { [1, 2, 3, 4, 5].forEach((d) => out.add(d)); continue; }
    if (t.startsWith('hetveg')) { [0, 6].forEach((d) => out.add(d)); continue; }
    if (t.startsWith('minden')) return all;
    if (t.startsWith('sze')) out.add(3);
    else if (t.startsWith('szo')) out.add(6);
    else if (t.startsWith('cs')) out.add(4);
    else if (t.startsWith('h')) out.add(1);
    else if (t.startsWith('k')) out.add(2);
    else if (t.startsWith('p')) out.add(5);
    else if (t.startsWith('v')) out.add(0);
  }
  return out.size ? out : all;
}

export function appliesOnDate(item, date) {
  return parseDays(item.napok).has(date.getDay());
}

/** "kinek" mező: üres = mindenki; különben gyerek id-k vagy nevek vesszővel. */
export function appliesToChild(item, child) {
  const n = norm(item.kinek);
  if (!n || n === 'mindenki' || n === '*') return true;
  if (!child) return false;
  const ids = n.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  return ids.includes(norm(child.id)) || ids.includes(norm(child.nev));
}

function parseTime(t) {
  const m = String(t ?? '').trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Igaz, ha a napszakos lista időablaka tartalmazza a mostani időpontot (éjfélen át is). */
export function isListNow(list, now = new Date()) {
  const s = parseTime(list.kezdes);
  const e = parseTime(list.vege);
  if (s == null || e == null) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return s <= e ? m >= s && m < e : m >= s || m < e;
}

const bySort = (a, b) => (Number(a.sorrend) || 0) - (Number(b.sorrend) || 0);

export function activeChildren(data) {
  return (data.gyerekek || []).filter((g) => isYes(g.aktiv)).sort(bySort);
}

/** Egy lista adott gyerekre és napra érvényes feladatai, sorrendben. */
export function tasksFor(data, list, child, date) {
  return (data.feladatok || [])
    .filter((f) => norm(f.lista_id) === norm(list.id))
    .filter((f) => isYes(f.aktiv) && appliesOnDate(f, date) && appliesToChild(f, child))
    .sort(bySort);
}

/** Az adott gyerek listái egy napon (csak azok, amelyekben van feladat). */
export function listsFor(data, child, date) {
  return (data.listak || [])
    .filter((l) => isYes(l.aktiv) && appliesOnDate(l, date) && appliesToChild(l, child))
    .filter((l) => tasksFor(data, l, child, date).length > 0)
    .sort(bySort);
}

export function isNapszak(list) {
  return norm(list.tipus).startsWith('napszak');
}

/** Elvégzett feladat-id-k halmaza egy gyerekre és napra. */
export function doneSet(completions, childId, dayKey) {
  const s = new Set();
  for (const c of completions) {
    if (c.datum === dayKey && norm(c.gyerek_id) === norm(childId)) s.add(norm(c.feladat_id));
  }
  return s;
}

export function listProgress(data, completions, list, child, date) {
  const tasks = tasksFor(data, list, child, date);
  const done = doneSet(completions, child.id, dateKey(date));
  const doneCount = tasks.filter((t) => done.has(norm(t.id))).length;
  return { tasks, done, doneCount, total: tasks.length, complete: tasks.length > 0 && doneCount === tasks.length };
}

/** Matricák egy napra: listánként egy, ha a lista teljesen kész. */
export function stickersForDay(data, completions, child, date) {
  return listsFor(data, child, date)
    .filter((l) => listProgress(data, completions, l, child, date).complete)
    .map((l) => ({ list: l, icon: l.ikon || '⭐' }));
}

/**
 * Téma feloldása: lista téma (ha meg van adva) > gyerek téma > auto (napi váltakozás).
 * Visszatérés: 'jarmu' | 'dino'
 */
export function resolveTheme(list, child, date) {
  const pick = (v) => {
    const n = norm(v);
    if (n.startsWith('jar')) return 'jarmu';
    if (n.startsWith('din')) return 'dino';
    return null; // üres vagy "auto"
  };
  const fromList = list && pick(list.tema);
  if (fromList) return fromList;
  const fromChild = child && pick(child.tema);
  if (fromChild) return fromChild;
  // auto: napi váltakozás a dátum napsorszáma alapján (gyerekenként eltolva, hogy testvéreknél is változatos legyen)
  const dayNum = Math.floor(date.getTime() / 86400000);
  const offset = child ? [...String(child.id)].reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  return (dayNum + offset) % 2 === 0 ? 'jarmu' : 'dino';
}

/** Google Drive megosztási link → közvetlenül megjeleníthető kép URL. */
export function imageUrl(src) {
  const s = String(src ?? '').trim();
  if (!s) return '';
  const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/);
  if (m && s.includes('google.com')) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  return s;
}

/** Google Drive megosztási link → letölthető hang URL. */
export function audioUrl(src) {
  const s = String(src ?? '').trim();
  if (!s) return '';
  const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{10,})/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return s;
}

/** Emoji-e az avatar/kép (rövid, nem URL szöveg)? */
export function isEmojiLike(s) {
  const t = String(s ?? '').trim();
  return t.length > 0 && t.length <= 8 && !/[/.]/.test(t);
}
