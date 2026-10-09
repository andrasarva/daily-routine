// Kapcsolat beállítása (első indításkor) – Demó mód vagy Google táblázat.

import { h, toast } from '../ui.js';
import { store, testConnection } from '../store.js';
import { app } from '../app.js';

export function SetupView() {
  const url = h('input', { type: 'url', placeholder: 'https://script.google.com/macros/s/…/exec', value: store.config?.url || '' });
  const code = h('input', { type: 'text', placeholder: 'pl. dinoszaurusz42', value: store.config?.code || '', autocomplete: 'off' });
  const msg = h('p.setup-msg');
  const btn = h('button.btn.btn-primary', { type: 'submit' }, '🔌 Kapcsolódás');

  const form = h(
    'form.setup-form',
    {
      onsubmit: async (e) => {
        e.preventDefault();
        const cfg = { mode: 'google', url: url.value.trim(), code: code.value.trim() };
        if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(cfg.url)) {
          msg.textContent = '⚠️ Az URL-nek https://script.google.com/… formájúnak kell lennie (a Web App /exec címe).';
          return;
        }
        btn.disabled = true;
        msg.textContent = '⏳ Kapcsolódás…';
        try {
          await testConnection(cfg);
          store.setConfig(cfg);
          const ok = await store.refresh();
          if (!ok) throw new Error(store.status.lastError);
          toast('✅ Sikeres kapcsolódás!');
          app.go('#/');
        } catch (err) {
          msg.textContent = `❌ ${err.message || err}`;
        } finally {
          btn.disabled = false;
        }
      },
    },
    h('label', 'Apps Script Web App URL', url),
    h('label', 'Családi kód', code),
    btn,
    msg
  );

  return h(
    'div.view.setup',
    h('div.setup-hero', h('span.bounce', '🦖'), h('span.bounce.d2', '⭐'), h('span.bounce.d3', '🚒')),
    h('h1', 'Napi Rutin'),
    h(
      'div.setup-cols',
      h(
        'div.setup-card',
        h('h2', '🎮 Kipróbálás'),
        h('p', 'Beépített mintaadatokkal, Google nélkül. Minden csak ezen az eszközön tárolódik.'),
        h('button.btn.btn-big', { onclick: () => { store.setConfig({ mode: 'demo' }); app.go('#/'); } }, 'Demó mód')
      ),
      h(
        'div.setup-card',
        h('h2', '📊 Google táblázat'),
        h('p', 'Add meg az Apps Script Web App címét és a családi kódot (lásd README).'),
        form
      )
    )
  );
}
