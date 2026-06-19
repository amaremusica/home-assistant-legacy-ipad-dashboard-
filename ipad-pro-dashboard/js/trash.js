/** Kalendarz śmieci — jak legacy iPad (calendar.trash) */
import { fetchCalendar } from './ha.js?v=1.1.5';

const REFRESH_MS = 30 * 60 * 1000;
let lastFetch = 0;
let cached = null;

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function trashStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function trashEnd() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 22);
}

function evStart(ev) {
  return ev?.start?.dateTime || ev?.start?.date || ev?.dateTime || ev?.date || null;
}

function trashType(sum) {
  const s = String(sum || '').toLowerCase();
  if (/bio|zielon|biodegrad|traw|ogrod|ogród|brązow|brazow/.test(s)) {
    return { label: 'Bio / zielone', color: '#16a34a' };
  }
  if (/plastik|tworzyw|metal|żółt|zolt|segreg/.test(s)) {
    return { label: 'Plastik / metal', color: '#ca8a04' };
  }
  if (/papier|niebiesk|makulat/.test(s)) {
    return { label: 'Papier', color: '#2563eb' };
  }
  if (/szk/.test(s)) {
    return { label: 'Szkło', color: '#0d9488' };
  }
  if (/zmieszan|komunaln|czarn|resztkow/.test(s)) {
    return { label: 'Zmieszane', color: '#64748b' };
  }
  let lbl = String(sum || 'Wywóz')
    .replace(/odbiór odpadów:?/i, '')
    .replace(/\s*-\s*\d.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (lbl.length > 24) lbl = `${lbl.slice(0, 23)}…`;
  return { label: lbl || 'Wywóz', color: '#64748b' };
}

function applyTrash(when, what, color, soon) {
  const wEl = document.getElementById('trash-when');
  const tEl = document.getElementById('trash-what');
  const ic = document.getElementById('trash-ic');
  const card = document.getElementById('trash-card');
  if (wEl) {
    wEl.textContent = when;
    wEl.classList.toggle('soon', !!soon);
  }
  if (tEl) tEl.textContent = what;
  if (ic) ic.style.stroke = color;
  if (card) card.style.setProperty('--trash-accent', color);
}

export async function loadTrash(entityId) {
  if (!entityId) {
    applyTrash('--', 'Ustaw kalendarz w ☰', '#94a3b8', false);
    return;
  }
  const now = Date.now();
  if (now - lastFetch < REFRESH_MS && cached) {
    applyTrash(cached.when, cached.what, cached.color, cached.soon);
    return;
  }

  applyTrash('--', 'sprawdzam…', '#94a3b8', false);
  try {
    const data = await fetchCalendar(entityId, trashStart(), trashEnd());
    lastFetch = Date.now();
    if (!data?.length) {
      cached = { when: 'Brak', what: 'najbliższe 3 tyg.', color: '#94a3b8', soon: false };
      applyTrash(cached.when, cached.what, cached.color, false);
      return;
    }
    const today = trashStart();
    let best = null;
    let bestT = null;
    for (const ev of data) {
      const stStr = evStart(ev);
      if (!stStr) continue;
      const t = new Date(String(stStr).replace(' ', 'T'));
      if (Number.isNaN(t.getTime()) || t < today - 86400000) continue;
      if (bestT === null || t < bestT) {
        bestT = t;
        best = ev;
      }
    }
    if (!best || !bestT) {
      cached = { when: 'Brak', what: 'najbliższe 3 tyg.', color: '#94a3b8', soon: false };
      applyTrash(cached.when, cached.what, cached.color, false);
      return;
    }
    const bt = new Date(bestT);
    const sd = new Date(bt.getFullYear(), bt.getMonth(), bt.getDate());
    const days = Math.round((sd - today) / 86400000);
    const dni = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
    let whenTxt = days <= 0 ? 'Dziś' : days === 1 ? 'Jutro' : `${dni[bt.getDay()]} ${pad2(bt.getDate())}.${pad2(bt.getMonth() + 1)}`;
    const ty = trashType(best.summary || best.message || best.description);
    cached = { when: whenTxt, what: ty.label, color: ty.color, soon: days <= 1 };
    applyTrash(cached.when, cached.what, cached.color, cached.soon);
  } catch (e) {
    const msg = String(e?.message || '');
    applyTrash(
      '--',
      msg === '404' ? 'Zła encja (☰)' : msg === '401' ? 'Brak uprawnień' : 'Błąd kalendarza',
      '#ef4444',
      false
    );
  }
}
