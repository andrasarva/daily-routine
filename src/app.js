// Közös állapot és navigáció a nézetek számára.

import { store } from './store.js';

export const app = {
  parent: false,
  _parentTimer: null,
  render: () => {},

  go(hash) {
    if (location.hash === hash) this.render();
    else location.hash = hash;
  },

  setParent(on) {
    this.parent = on;
    clearTimeout(this._parentTimer);
    if (on) this._parentTimer = setTimeout(() => this.setParent(false), 3 * 60 * 1000); // 3 perc után kilép
    document.body.classList.toggle('parent-mode', on);
    this.render();
  },

  child(id) {
    return (store.data?.gyerekek || []).find((g) => String(g.id) === String(id));
  },
  list(id) {
    return (store.data?.listak || []).find((l) => String(l.id) === String(id));
  },
};
