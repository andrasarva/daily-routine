// Gyerek kezdőképernyő: a mostani napszak listája nagyban, a többi lista, heti matricák.

import { h, pic } from '../ui.js';
import { store } from '../store.js';
import { app } from '../app.js';
import {
  activeChildren, businessDate, dateKey, isListNow, isNapszak, listProgress, listsFor, norm,
  resolveTheme, stickersForDay, weekDates, DAY_SHORT,
} from '../logic.js';
import { THEMES } from '../themes.js';
import { TopBar, ParentBar, dayLabel } from './common.js';
import { sfx } from '../sounds.js';
import { speak } from '../speech.js';

export function ChildHomeView(childId) {
  const child = app.child(childId);
  if (!child) return null;
  const data = store.data;
  const date = businessDate(new Date(), store.settings.startHour);
  const theme = THEMES[resolveTheme(null, child, date)];
  document.body.dataset.theme = theme.id;

  const lists = listsFor(data, child, date);
  const nowList = lists.find((l) => isNapszak(l) && isListNow(l));
  const others = lists.filter((l) => l !== nowList);

  const card = (list, hero = false) => {
    const p = listProgress(data, store.completions, list, child, date);
    const open = () => {
      sfx('whoosh');
      speak(list.nev);
      app.go(`#/c/${encodeURIComponent(child.id)}/l/${encodeURIComponent(list.id)}`);
    };
    return h(
      `button.list-card${hero ? '.hero' : ''}${p.complete ? '.complete' : ''}`,
      { onclick: open },
      h('div.list-icon', list.ikon || '📋'),
      h('div.list-name', list.nev),
      h(
        'div.dots',
        p.tasks.map((t) => h(`span.dot${p.done.has(norm(t.id)) ? '.on' : ''}`))
      ),
      p.complete ? h('div.stamp', '✅') : hero ? h('div.go-badge', 'Kezdjük! ▶') : null
    );
  };

  // Heti mini matricatábla
  const week = weekDates(date).map((d) => {
    const st = stickersForDay(data, store.completions, child, d);
    const isToday = dateKey(d) === dateKey(date);
    return h(
      `div.wk-cell${isToday ? '.today' : ''}${d > date ? '.future' : ''}`,
      h('div.wk-day', DAY_SHORT[d.getDay()]),
      h('div.wk-st', st.map((s) => h('span', s.icon)))
    );
  });

  const multiKid = activeChildren(data).length > 1;

  return h(
    'div.view.child-home',
    TopBar({
      back: multiKid ? '#/' : null,
      title: h('span.hello', pic(child.avatar, '🙂', 'avatar-sm'), ` Szia ${child.nev}! `, h('small', dayLabel(date))),
    }),
    ParentBar(),
    h(
      'main.home-grid',
      h(
        'section.lists',
        nowList ? card(nowList, true) : null,
        h('div.list-row', others.map((l) => card(l))),
        !lists.length ? h('div.empty', '🎉 Ma nincs feladat!') : null
      ),
      h(
        'aside.week-mini',
        { onclick: () => { sfx('pop'); app.go(`#/c/${encodeURIComponent(child.id)}/matricak`); } },
        h('div.week-title', '⭐ Matricáim'),
        h('div.wk-grid', week)
      )
    )
  );
}
