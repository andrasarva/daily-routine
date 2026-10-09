// Heti matricatábla: H–V, listánként egy matrica. A még hiányzók halványan látszanak.

import { h, pic } from '../ui.js';
import { store } from '../store.js';
import { app } from '../app.js';
import { businessDate, dateKey, listProgress, listsFor, resolveTheme, weekDates, DAY_LONG } from '../logic.js';
import { THEMES } from '../themes.js';
import { TopBar, ParentBar } from './common.js';
import { sfx } from '../sounds.js';
import { speak } from '../speech.js';

export function StickersView(childId) {
  const child = app.child(childId);
  if (!child) return null;
  const data = store.data;
  const today = businessDate(new Date(), store.settings.startHour);
  const theme = THEMES[resolveTheme(null, child, today)];
  document.body.dataset.theme = theme.id;

  let total = 0;
  const cols = weekDates(today).map((d, di) => {
    const future = d > today;
    const isToday = dateKey(d) === dateKey(today);
    const items = listsFor(data, child, d).map((l) => {
      const done = !future && listProgress(data, store.completions, l, child, d).complete;
      if (done) total++;
      return h(
        `button.wk-sticker${done ? '.got' : ''}`,
        {
          style: { animationDelay: `${di * 0.06}s` },
          onclick: () => { sfx('pop'); speak(done ? `${l.nev}: megvan a matrica!` : l.nev); },
        },
        l.ikon || '⭐'
      );
    });
    return h(
      `div.wk-col${isToday ? '.today' : ''}${future ? '.future' : ''}`,
      h('div.wk-col-day', DAY_LONG[d.getDay()]),
      h('div.wk-col-items', items)
    );
  });

  return h(
    'div.view.stickers-view',
    TopBar({
      back: `#/c/${encodeURIComponent(child.id)}`,
      title: h('span.hello', pic(child.avatar, '🙂', 'avatar-sm'), ` ${child.nev} matricái `, h('small', `⭐ ${total}`)),
    }),
    ParentBar(),
    h('main.week-board', cols)
  );
}
