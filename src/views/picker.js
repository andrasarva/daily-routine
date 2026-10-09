// "Ki jön most?" – gyerekválasztó nagy avatarokkal.

import { h, pic } from '../ui.js';
import { store } from '../store.js';
import { app } from '../app.js';
import { activeChildren, businessDate, stickersForDay } from '../logic.js';
import { TopBar, ParentBar, dayLabel } from './common.js';
import { sfx } from '../sounds.js';
import { speak } from '../speech.js';

export function PickerView() {
  const data = store.data;
  const kids = activeChildren(data);
  const date = businessDate(new Date(), store.settings.startHour);

  const cards = kids.map((k, i) => {
    const stickers = stickersForDay(data, store.completions, k, date);
    return h(
      'button.kid-card',
      {
        style: { animationDelay: `${i * 0.12}s` },
        onclick: () => {
          sfx('pop');
          speak(`Szia ${k.nev}!`);
          app.go(`#/c/${encodeURIComponent(k.id)}`);
        },
      },
      h('div.kid-avatar', pic(k.avatar, '🙂', 'avatar')),
      h('div.kid-name', k.nev),
      h('div.kid-stickers', stickers.length ? stickers.map((s) => h('span', s.icon)) : h('span.faded', '⭐'))
    );
  });

  return h(
    'div.view.picker',
    TopBar({ title: `${dayLabel(date)} – Ki jön most?` }),
    ParentBar(),
    kids.length
      ? h('main.kid-grid', cards)
      : h('main.empty', h('p', '😕 Nincs még gyerek a táblázatban.'), h('p', 'Add hozzá a „Gyerekek” lapon, majd a szülői módban nyomj Frissítést.'))
  );
}
