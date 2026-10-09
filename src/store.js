// Adatréteg: helyi gyorsítótár + offline sor + (Demó vagy Google Apps Script) forrás.

import { sampleData } from './api/sampleData.js';
import { norm, todayKey, keyToDate, dateKey } from './logic.js';

const K = {
  config: 'nr.config',
  data: 'nr.data',
  completions: 'nr.completions',
  queue: 'nr.queue',
  prefs: 'nr.prefs',
};

const load = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const listeners = new Set();

export const store = {
  config: load(K.config, null), // { mode: 'demo' | 'google', url, code }
  data: load(K.data, null), // { gyerekek, listak, feladatok, beallitasok, fetchedAt }
  completions: load(K.completions, []), // [{ datum, gyerek_id, lista_id, feladat_id, idopont }]
  queue: load(K.queue, []), // [{ op, datum, gyerek_id, lista_id, feladat_id, idopont }]
  prefs: load(K.prefs, {}), // { muted }
  status: { syncing: false, lastError: '', online: navigator.onLine },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit() {
    listeners.forEach((fn) => fn());
  },

  get settings() {
    const b = this.data?.beallitasok || {};
    return {
      startHour: Number(b.nap_kezdete ?? 4) || 0,
      sfx: this.prefs.muted == null ? norm(b.hangeffektek || 'igen') !== 'nem' : !this.prefs.muted,
      speechRate: Number(b.felolvasas_sebesseg) || 0.9,
    };
  },

  today() {
    return todayKey(this.settings.startHour);
  },

  setConfig(cfg) {
    this.config = cfg;
    save(K.config, cfg);
    if (cfg?.mode === 'demo') {
      this.data = { ...structuredClone(sampleData), fetchedAt: Date.now() };
      save(K.data, this.data);
    }
    this.emit();
  },

  resetConnection() {
    this.config = null;
    this.data = null;
    this.completions = [];
    this.queue = [];
    [K.config, K.data, K.completions, K.queue].forEach((k) => localStorage.removeItem(k));
    this.emit();
  },

  setPref(key, value) {
    this.prefs = { ...this.prefs, [key]: value };
    save(K.prefs, this.prefs);
    this.emit();
  },

  isDone(childId, taskId, day = this.today()) {
    return this.completions.some(
      (c) => c.datum === day && norm(c.gyerek_id) === norm(childId) && norm(c.feladat_id) === norm(taskId)
    );
  },

  complete(child, list, task) {
    const day = this.today();
    if (this.isDone(child.id, task.id, day)) return;
    const rec = { datum: day, gyerek_id: child.id, lista_id: list.id, feladat_id: task.id, idopont: new Date().toISOString() };
    this.completions.push(rec);
    this._persistCompletions();
    this._enqueue({ op: 'complete', ...rec });
    this.emit();
  },

  undo(child, task, day = this.today()) {
    const before = this.completions.length;
    this.completions = this.completions.filter(
      (c) => !(c.datum === day && norm(c.gyerek_id) === norm(child.id) && norm(c.feladat_id) === norm(task.id))
    );
    if (this.completions.length === before) return;
    this._persistCompletions();
    this._enqueue({ op: 'undo', datum: day, gyerek_id: child.id, feladat_id: task.id, idopont: new Date().toISOString() });
    this.emit();
  },

  _persistCompletions() {
    // Csak az elmúlt ~5 hét kell a matricatáblához
    const limit = dateKey(new Date(keyToDate(this.today()).getTime() - 35 * 86400000));
    this.completions = this.completions.filter((c) => c.datum >= limit);
    save(K.completions, this.completions);
  },

  _enqueue(op) {
    if (this.config?.mode !== 'google') return; // Demó módban minden helyben marad
    this.queue.push(op);
    save(K.queue, this.queue);
    this.flush();
  },

  /** Frissítés a táblázatból. */
  async refresh() {
    if (this.config?.mode === 'demo') {
      // A demó adatok mindig a kódból jönnek (így az új mintaadatok is látszanak)
      this.data = { ...structuredClone(sampleData), fetchedAt: Date.now() };
      save(K.data, this.data);
      this.emit();
      return true;
    }
    if (this.config?.mode !== 'google') return false;
    this.status.syncing = true;
    this.emit();
    try {
      await this.flush();
      const since = dateKey(new Date(keyToDate(this.today()).getTime() - 35 * 86400000));
      const res = await apiGet(this.config, { action: 'data', since });
      this.data = { ...res.data, fetchedAt: Date.now() };
      save(K.data, this.data);
      // Szerver állapot + a még el nem küldött helyi műveletek
      let comps = res.elvegzett || [];
      for (const op of this.queue) comps = applyOp(comps, op);
      this.completions = comps;
      this._persistCompletions();
      this.status.lastError = '';
      return true;
    } catch (e) {
      this.status.lastError = String(e.message || e);
      return false;
    } finally {
      this.status.syncing = false;
      this.emit();
    }
  },

  _flushing: null,
  /** Sorban álló műveletek elküldése. */
  async flush() {
    if (this.config?.mode !== 'google' || !this.queue.length) return;
    if (this._flushing) return this._flushing;
    this._flushing = (async () => {
      const batch = this.queue.slice();
      try {
        await apiPost(this.config, { action: 'ops', ops: batch });
        this.queue = this.queue.slice(batch.length);
        save(K.queue, this.queue);
        this.status.lastError = '';
      } catch (e) {
        this.status.lastError = String(e.message || e);
      } finally {
        this._flushing = null;
        this.emit();
      }
    })();
    return this._flushing;
  },
};

function applyOp(comps, op) {
  const same = (c) => c.datum === op.datum && norm(c.gyerek_id) === norm(op.gyerek_id) && norm(c.feladat_id) === norm(op.feladat_id);
  if (op.op === 'complete') return comps.some(same) ? comps : [...comps, { ...op, op: undefined }];
  if (op.op === 'undo') return comps.filter((c) => !same(c));
  return comps;
}

// ---- Google Apps Script kliens ----

async function apiGet(cfg, params) {
  const u = new URL(cfg.url);
  Object.entries({ ...params, code: cfg.code }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u.toString(), { redirect: 'follow' });
  return parse(r);
}

async function apiPost(cfg, body) {
  // text/plain: így nincs CORS "preflight", amit az Apps Script nem támogat
  const r = await fetch(cfg.url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, code: cfg.code }),
  });
  return parse(r);
}

async function parse(r) {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('A szerver nem JSON-t küldött. Jó az URL, és „Bárki” számára elérhető a Web App?');
  }
  if (!json.ok) throw new Error(json.error || 'Ismeretlen hiba');
  return json;
}

/** Kapcsolat tesztelése a beállító képernyőn. */
export async function testConnection(cfg) {
  const res = await apiGet(cfg, { action: 'ping' });
  return res;
}

// Automatikus szinkron: újra online, illetve időnként
window.addEventListener('online', () => {
  store.status.online = true;
  store.flush();
  store.emit();
});
window.addEventListener('offline', () => {
  store.status.online = false;
  store.emit();
});
setInterval(() => store.flush(), 30_000);
