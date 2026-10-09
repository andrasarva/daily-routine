// Lista nézet: óriás képkártyák, felolvasás, "Kész!" gomb, haladásjelző pálya, ünneplés.

import { h, pic } from '../ui.js';
import { store } from '../store.js';
import { app } from '../app.js';
import { audioUrl, businessDate, dateKey, listProgress, norm, resolveTheme } from '../logic.js';
import { THEMES, pickRunner, rand } from '../themes.js';
import { TopBar, ParentBar } from './common.js';
import { sfx } from '../sounds.js';
import { speak } from '../speech.js';
import { confetti } from '../confetti.js';

// Újrarajzolások közt megőrzött állapot (animációkhoz)
let lastRunner = { key: '', p: 0 };
let celebrating = '';

export function ListView(childId, listId) {
  const child = app.child(childId);
  const list = app.list(listId);
  if (!child || !list) return null;

  const data = store.data;
  const date = businessDate(new Date(), store.settings.startHour);
  const theme = THEMES[resolveTheme(list, child, date)];
  document.body.dataset.theme = theme.id;

  const key = `${dateKey(date)}|${child.id}|${list.id}`;
  const prog = listProgress(data, store.completions, list, child, date);
  const { tasks, done, total } = prog;
  const pNow = total ? prog.doneCount / total : 0;

  const markDone = (task, cardEl, btn) => {
    btn.disabled = true;
    cardEl.classList.add('flipping');
    sfx(theme.sound);
    setTimeout(() => {
      // Csak most számoljuk: közben egy másik kártya is elkészülhetett (gyors dupla koppintás)
      const remaining = tasks.filter((t) => !store.isDone(child.id, t.id));
      if (!remaining.includes(task)) return;
      const willComplete = remaining.length === 1;
      if (willComplete) celebrating = key;
      store.complete(child, list, task);
      if (willComplete) {
        sfx('fanfare');
        confetti({ emojis: theme.confetti, count: 160 });
        setTimeout(() => speak(rand(theme.finish)), 600);
      } else {
        confetti({ emojis: theme.confetti, count: 40 });
        setTimeout(() => speak(rand(theme.cheers)), 500);
      }
    }, 650);
  };

  const cards = tasks.map((t, i) => {
    const isDone = done.has(norm(t.id));
    const say = () => speak(t.felolvasas || t.cim, audioUrl(t.hang));
    const card = h(`div.task-card${isDone ? '.done' : ''}`, { style: { animationDelay: `${i * 0.08}s` } });
    const btn = h('button.done-btn', { onclick: () => markDone(t, card, btn) }, '✔ Kész!');
    // A natív append a null-t "null" szövegként írná ki, ezért kiszűrjük
    card.append(...[
      h('button.task-pic', { onclick: () => { sfx('pop'); say(); card.classList.remove('wiggle'); void card.offsetWidth; card.classList.add('wiggle'); } },
        pic(t.kep || t.emoji, t.emoji || '⭐', 'pic'),
        h('span.speaker', '🔈')
      ),
      h('div.task-title', t.cim),
      isDone ? h('div.task-sticker', theme.stickers[i % theme.stickers.length]) : btn,
      isDone && app.parent
        ? h('button.undo-btn', { onclick: () => { celebrating = ''; store.undo(child, t); } }, '↩️ Visszavonás')
        : null,
    ].filter(Boolean));
    return card;
  });

  // Rács oszlopszáma a feladatok számától és a tájolástól függően
  const n = tasks.length;
  const portrait = innerHeight > innerWidth;
  const cols = portrait
    ? Math.min(Math.max(n, 1), n <= 4 ? 2 : 3)
    : n <= 5 ? Math.max(n, 1) : Math.min(5, Math.ceil(n / 2));

  // Haladásjelző pálya
  const runnerDef = pickRunner(theme, list.id);
  const startP = lastRunner.key === key ? lastRunner.p : 0;
  const runner = h('div.runner', { style: { '--p': startP } },
    h(`span.runner-emoji${runnerDef.flip ? '.flip' : ''}`, runnerDef.e));
  if (startP !== pNow) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      runner.style.setProperty('--p', pNow);
      runner.classList.add('moving');
      setTimeout(() => runner.classList.remove('moving'), 1300);
    }));
  }
  lastRunner = { key, p: pNow };

  const track = h(
    'div.track',
    h('div.road'),
    h('div.marks', tasks.map((t, i) => h(`span.mark${i < prog.doneCount ? '.on' : ''}`, { style: { '--i': (i + 1) / total } }))),
    h('div.deco', theme.trackDeco.map((d) => h('span', d))),
    runner,
    h(`div.goal${prog.complete ? '.reached' : ''}`, theme.goal)
  );

  const overlay = celebrating === key && prog.complete
    ? h(
        'div.celebrate',
        { onclick: (e) => e.target.classList.contains('celebrate') && closeCelebrate(child) },
        h(
          'div.celebrate-box',
          h('div.big-sticker', list.ikon || '⭐'),
          h('div.celebrate-goal', theme.goal, ' ', pickRunner(theme, list.id).e),
          h('h2', 'Szuper vagy!'),
          h('p', `Megkaptad a(z) „${list.nev}” matricát!`),
          h('button.btn.btn-big', { onclick: () => closeCelebrate(child) }, '🏠 Tovább')
        )
      )
    : null;

  return h(
    'div.view.list-view',
    TopBar({ back: `#/c/${encodeURIComponent(child.id)}`, title: h('span', h('span.title-icon', list.ikon || '📋'), ' ', list.nev) }),
    ParentBar(),
    h('main.task-grid', { style: { '--cols': cols, '--rows': Math.ceil(n / cols) } }, cards),
    track,
    overlay
  );
}

function closeCelebrate(child) {
  celebrating = '';
  sfx('pop');
  app.go(`#/c/${encodeURIComponent(child.id)}`);
}
