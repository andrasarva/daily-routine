// Közös elemek: felső sáv, szülői sáv, matrica cellák.

import { h, longPress, toast } from '../ui.js';
import { store } from '../store.js';
import { app } from '../app.js';
import { sfx } from '../sounds.js';

/** Felső sáv: vissza gomb, cím, rejtett szülői lakat (3 mp nyomva tartás). */
export function TopBar({ back, title, right }) {
  const lock = longPress(
    h('button.lock', { 'aria-label': 'Szülői mód' }, h('span.lock-ring'), app.parent ? '🔓' : '🔒'),
    app.parent ? 600 : 3000,
    () => app.setParent(!app.parent)
  );
  return h(
    'header.topbar',
    back ? h('button.btn-round.back', { onclick: () => { sfx('pop'); app.go(back); }, 'aria-label': 'Vissza' }, '⬅️') : h('span.spacer-round'),
    h('div.title', title),
    right || null,
    lock
  );
}

/** Szülői mód eszköztár. */
export function ParentBar() {
  if (!app.parent) return null;
  const s = store.status;
  const sync = store.config?.mode === 'demo'
    ? '🎮 Demó mód'
    : s.syncing ? '⏳ Szinkron…'
    : store.queue.length ? `📤 ${store.queue.length} küldésre vár${s.online ? '' : ' (offline)'}`
    : s.lastError ? `⚠️ ${s.lastError}`
    : '✅ Szinkronban';

  return h(
    'div.parentbar',
    h('strong', '👨‍👩‍👦 Szülői mód'),
    h('span.sync', sync),
    h(
      'button.pbtn',
      { onclick: () => store.setPref('muted', store.settings.sfx) },
      store.settings.sfx ? '🔊 Hangeffektek: be' : '🔇 Hangeffektek: ki'
    ),
    h(
      'button.pbtn',
      {
        onclick: async () => {
          const ok = await store.refresh();
          toast(ok ? '🔄 Frissítve a táblázatból' : `⚠️ ${store.status.lastError}`);
        },
      },
      '🔄 Frissítés'
    ),
    h(
      'button.pbtn',
      {
        onclick: () => {
          if (confirm('Biztosan új kapcsolatot állítasz be? (A helyi adatok törlődnek ezen az eszközön.)')) {
            store.resetConnection();
            app.setParent(false);
            app.go('#/');
          }
        },
      },
      '⚙️ Kapcsolat'
    ),
    h('button.pbtn.exit', { onclick: () => app.setParent(false) }, '✖ Kilépés')
  );
}

export function dayLabel(date) {
  return ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'][date.getDay()];
}
