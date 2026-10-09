import './styles.css';
import { store } from './store.js';
import { app } from './app.js';
import { h } from './ui.js';
import { activeChildren } from './logic.js';
import { setSfxEnabled, unlockAudio } from './sounds.js';
import { setSpeechRate, stopSpeaking } from './speech.js';
import { SetupView } from './views/setup.js';
import { PickerView } from './views/picker.js';
import { ChildHomeView } from './views/childHome.js';
import { ListView } from './views/list.js';
import { StickersView } from './views/stickers.js';

const root = document.getElementById('app');
let wakeLock = null;
let lastRoute = '';

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  // #/c/:child, #/c/:child/l/:list, #/c/:child/matricak
  if (parts[0] === 'c' && parts[1]) {
    if (parts[2] === 'l' && parts[3]) return { name: 'list', child: parts[1], list: parts[3] };
    if (parts[2] === 'matricak') return { name: 'stickers', child: parts[1] };
    return { name: 'child', child: parts[1] };
  }
  return { name: 'picker' };
}

function render() {
  const s = store.settings;
  setSfxEnabled(s.sfx);
  setSpeechRate(s.speechRate);

  const r = route();
  const routeKey = location.hash;
  if (routeKey !== lastRoute) {
    stopSpeaking();
    lastRoute = routeKey;
  }

  let view = null;
  if (!store.config) {
    if (root.querySelector('.setup')) return; // ne töröljük a félig kitöltött űrlapot
    view = SetupView();
  } else if (!store.data) {
    view = h('div.view.loading', h('div.bounce.big', '🦖'), h('p', 'Betöltés…'),
      store.status.lastError ? h('p.err', `⚠️ ${store.status.lastError}`) : null);
  } else {
    if (r.name === 'picker') {
      const kids = activeChildren(store.data);
      if (kids.length === 1 && !app.parent) {
        // Egy gyereknél nincs szükség választóra
        location.replace(`#/c/${encodeURIComponent(kids[0].id)}`);
        return;
      }
      delete document.body.dataset.theme;
      view = PickerView();
    } else if (r.name === 'child') view = ChildHomeView(r.child);
    else if (r.name === 'list') view = ListView(r.child, r.list);
    else if (r.name === 'stickers') view = StickersView(r.child);
    if (!view) {
      // Ismeretlen gyerek/lista (pl. törölték a táblázatból)
      location.replace('#/');
      return;
    }
  }

  root.replaceChildren(view);
  updateWakeLock(r.name === 'list');
}

async function updateWakeLock(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* nem támogatott */
  }
}

app.render = render;
store.subscribe(render);
window.addEventListener('hashchange', render);

// Az első érintés feloldja a hangot (böngésző szabály)
window.addEventListener('pointerdown', unlockAudio, { once: true });

// Ha visszatérünk az apphoz (vagy 5 percnél régebbiek az adatok): frissítés
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!store.data || Date.now() - (store.data.fetchedAt || 0) > 5 * 60 * 1000) store.refresh();
  else store.flush();
  if (route().name === 'list') { wakeLock = null; updateWakeLock(true); }
});

// Percenként újrarajzolás: napszakváltás, hajnali napváltás
setInterval(() => {
  if (!document.querySelector('.celebrate')) render();
}, 60 * 1000);

// Tájolásváltáskor (álló/fekvő) új rácselrendezés
let resizeT = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(render, 200);
});

// ?demo a címben: azonnal Demó mód (gyors kipróbáláshoz)
if (!store.config && new URLSearchParams(location.search).has('demo')) store.setConfig({ mode: 'demo' });

render();
if (store.config) store.refresh();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
