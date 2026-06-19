export function toast(msg, ms = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function setOnline(ok) {
  const pill = document.getElementById('status-pill');
  const txt = document.getElementById('status-text');
  if (pill) pill.classList.toggle('online', ok);
  if (txt) txt.textContent = ok ? 'online' : 'offline';
}

export function setTab(name) {
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.dataset.view === name);
  });
  document.querySelectorAll('.dock-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  if (document.startViewTransition) {
    document.startViewTransition?.(() => {});
  }
}

export function bindDock(onTab) {
  document.getElementById('dock')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.dock-btn');
    if (!btn) return;
    const tab = btn.dataset.tab;
    setTab(tab);
    onTab?.(tab);
  });
}

export function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function lazyImages(root) {
  if (!('IntersectionObserver' in window)) return;
  const imgs = root.querySelectorAll('img[data-src]');
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const img = en.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        io.unobserve(img);
      }
    },
    { rootMargin: '80px' }
  );
  imgs.forEach((img) => io.observe(img));
}
