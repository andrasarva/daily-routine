// Apró DOM segédek – keretrendszer nélkül.

import { imageUrl, isEmojiLike } from './logic.js';

/** h('div.card#id', { onclick, style, ... }, ...children) */
export function h(sel, props, ...children) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [, tag = 'div', rest = ''] = sel.match(/^([a-z0-9-]*)(.*)$/i) || [];
  const el = document.createElement(tag || 'div');
  for (const part of rest.match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Kép vagy emoji megjelenítése (képhiba esetén az emoji jön). */
export function pic(src, fallbackEmoji = '⭐', cls = 'pic') {
  const s = String(src ?? '').trim();
  if (!s || isEmojiLike(s)) {
    return h(`span.${cls}.emoji`, s || fallbackEmoji);
  }
  const img = h(`img.${cls}`, { src: imageUrl(s), alt: '', draggable: 'false', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(h(`span.${cls}.emoji`, fallbackEmoji)));
  return img;
}

/**
 * Hosszú nyomás (pl. szülői mód 3 mp). Az elemen `pressing` osztály van, amíg nyomják,
 * a CSS ezzel animálhat egy kitöltődő kört.
 */
export function longPress(el, ms, onDone) {
  let t = null;
  const start = (e) => {
    e.preventDefault();
    el.classList.add('pressing');
    el.style.setProperty('--press-ms', `${ms}ms`);
    t = setTimeout(() => {
      el.classList.remove('pressing');
      t = null;
      onDone();
    }, ms);
  };
  const cancel = () => {
    el.classList.remove('pressing');
    if (t) clearTimeout(t);
    t = null;
  };
  el.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, cancel));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return el;
}

export function toast(msg, ms = 2500) {
  const el = h('div.toast', msg);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, ms);
}
