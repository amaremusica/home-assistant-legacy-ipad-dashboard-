/**
 * Music Assistant — Discover UI (jak MA web / legacy iPad)
 */
import { getState, callService, browseMedia, entityPicture } from './ha.js?v=1.2.3';
import { MA_SPEAKERS } from './config.js?v=1.2.3';
import { esc, lazyImages } from './ui.js?v=1.2.3';

let cfg = null;
let activePlayer = '';
let maPollTimer = null;
let discoverItems = [];
let radioItems = [];

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');

export function initMusic(config, onNowPlaying) {
  cfg = config;
  activePlayer = localStorage.getItem('ha_ma_player') || cfg.ha_ma || MA_SPEAKERS[0]?.id || '';
  bindMusicNav(onNowPlaying);
  renderPlayers();
  loadDiscover();
}

function bindMusicNav(onNowPlaying) {
  document.getElementById('music-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.ma-chip');
    if (!chip) return;
    document.querySelectorAll('#music-chips .ma-chip').forEach((c) => c.classList.remove('on'));
    chip.classList.add('on');
    const mode = chip.dataset.music;
    document.querySelectorAll('.ma-panel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== mode));
    if (mode === 'discover') loadDiscover();
    if (mode === 'search') document.getElementById('ma-query')?.focus();
    if (mode === 'radio') loadRadio();
    if (mode === 'library') loadLibrary();
    if (mode === 'spotify') loadSpotifyBrowse();
  });

  document.getElementById('ma-search-btn')?.addEventListener('click', () => searchMa());
  document.getElementById('ma-query')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchMa();
  });

  ['np-prev', 'np-play', 'np-next'].forEach((id, i) => {
    document.getElementById(id)?.addEventListener('click', () => {
      const ent = activePlayer || cfg.ha_ma;
      if (!ent) return;
      const svc = ['media_previous_track', null, 'media_next_track'][i];
      if (svc === null) {
        const st = getState(ent)?.state;
        callService('media_player', st === 'playing' ? 'media_pause' : 'media_play', { entity_id: ent });
      } else callService('media_player', svc, { entity_id: ent });
      setTimeout(onNowPlaying, 400);
    });
  });

  document.getElementById('np-vol')?.addEventListener('click', (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ent = activePlayer || cfg.ha_ma;
    if (ent) callService('media_player', 'volume_set', { entity_id: ent, volume_level: pct });
  });

  if (maPollTimer) clearInterval(maPollTimer);
  maPollTimer = setInterval(onNowPlaying, 1000);
}

export function renderMaNowPlaying() {
  const ent = activePlayer || cfg.ha_ma || cfg.ha_spotify;
  const e = getState(ent);
  const title = document.getElementById('np-title');
  const artist = document.getElementById('np-artist');
  const art = document.getElementById('np-art');
  const bar = document.getElementById('np-bar');
  const playBtn = document.getElementById('np-play');
  const volBar = document.getElementById('np-vol-fill');
  const volTxt = document.getElementById('np-vol-txt');
  const eq = document.getElementById('np-eq');

  if (!e?.attributes) {
    if (title) title.textContent = 'Nic nie gra';
    if (artist) artist.textContent = 'Wybierz utwór';
    if (art) art.style.backgroundImage = '';
    if (bar) bar.style.width = '0%';
    if (playBtn) playBtn.textContent = '▶';
    if (eq) eq.classList.remove('playing');
    return ent;
  }

  const a = e.attributes;
  if (title) title.textContent = a.media_title || '—';
  if (artist) artist.textContent = a.media_artist || a.media_album_name || '—';
  if (art && a.entity_picture) art.style.backgroundImage = `url("${entityPicture(a.entity_picture)}")`;
  if (playBtn) playBtn.textContent = e.state === 'playing' ? '⏸' : '▶';
  if (eq) eq.classList.toggle('playing', e.state === 'playing');
  const dur = a.media_duration || 0;
  const pos = a.media_position || 0;
  if (bar) bar.style.width = dur > 0 ? `${(pos / dur) * 100}%` : '0%';
  const vol = Math.round((a.volume_level || 0) * 100);
  if (volBar) volBar.style.width = `${vol}%`;
  if (volTxt) volTxt.textContent = `${vol}%`;
  return ent;
}

function renderPlayers() {
  const el = document.getElementById('ma-players');
  if (!el) return;
  const players = discoverMaPlayers();
  if (!activePlayer && players[0]) activePlayer = players[0].id;
  el.innerHTML = players.map((p) => {
    const st = getState(p.id);
    const playing = st?.state === 'playing';
    const track = st?.attributes?.media_title;
    return `<button type="button" class="ma-player${p.id === activePlayer ? ' on' : ''}${playing ? ' playing' : ''}" data-player="${esc(p.id)}">
      <span class="ma-player-name">${esc(p.name)}</span>
      ${track ? `<span class="ma-player-track">${esc(track)}</span>` : ''}
    </button>`;
  }).join('');
  el.querySelectorAll('.ma-player').forEach((btn) => {
    btn.addEventListener('click', () => {
      activePlayer = btn.dataset.player;
      localStorage.setItem('ha_ma_player', activePlayer);
      renderPlayers();
    });
  });
}

function discoverMaPlayers() {
  const out = [];
  const seen = new Set();
  if (cfg.ha_ma) {
    out.push({ id: cfg.ha_ma, name: getState(cfg.ha_ma)?.attributes?.friendly_name || 'Głośnik MA' });
    seen.add(cfg.ha_ma);
  }
  for (const p of MA_SPEAKERS) {
    if (!seen.has(p.id)) {
      out.push(p);
      seen.add(p.id);
    }
  }
  return out.length ? out : [{ id: 'media_player.wolomin', name: 'Wołomin' }];
}

async function maPlay(item, type = 'track', radio = false) {
  const player = activePlayer || cfg.ha_ma;
  if (!player || !item) return;
  const mediaId = item.uri || item.media_content_id || item.item_id || item.media_id;
  if (!mediaId) return;
  await callService('music_assistant', 'play_media', {
    entity_id: player,
    media_id: mediaId,
    media_type: type,
    enqueue: 'play',
    radio_mode: !!radio
  });
}

function pickItems(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp.items) return resp.items;
  const sr = resp.service_response || resp;
  if (sr?.items) return sr.items;
  for (const v of Object.values(sr || {})) {
    if (v?.items) return v.items;
    if (Array.isArray(v)) return v;
  }
  return [];
}

export async function loadDiscover() {
  const el = document.getElementById('ma-discover-grid');
  if (!el) return;
  el.innerHTML = '<p class="ma-muted">Ładowanie Discover…</p>';
  try {
    const [recent, radios, favRadio] = await Promise.all([
      callService('music_assistant', 'get_library', { media_type: 'track', order_by: 'last_played', limit: 12 }).catch(() => null),
      callService('music_assistant', 'get_library', { media_type: 'radio', limit: 16 }).catch(() => null),
      callService('music_assistant', 'get_library', { media_type: 'radio', favorite: true, limit: 8 }).catch(() => null)
    ]);
    const recentItems = pickItems(recent).slice(0, 8);
    radioItems = pickItems(favRadio).length ? pickItems(favRadio) : pickItems(radios).slice(0, 12);
    discoverItems = recentItems;

    let html = '';
    if (recentItems.length) {
      const hero = recentItems[0];
      const img = hero.image_url || hero.thumbnail;
      html += `<div class="ma-hero" data-i="0">
        ${img ? `<img src="${esc(img)}" alt="">` : '<div class="ma-hero-ph">♪</div>'}
        <div class="ma-hero-meta">
          <div class="ma-hero-label">Top picks for you</div>
          <div class="ma-hero-title">${esc(hero.name || hero.title || '—')}</div>
          <div class="ma-hero-sub">${esc((hero.artists || []).map((a) => a.name).join(', ') || 'Ostatnio grane')}</div>
          <button type="button" class="ma-play-btn" data-i="0">▶ Odtwórz</button>
        </div>
      </div>`;
      html += '<div class="ma-grid">';
      recentItems.slice(1, 7).forEach((item, i) => {
        const thumb = item.image_url || item.thumbnail;
        html += `<div class="ma-tile" data-i="${i + 1}">
          ${thumb ? `<img src="${esc(thumb)}" alt="">` : '<div class="ma-tile-ph">♪</div>'}
          <div class="ma-tile-t">${esc(item.name || item.title || '—')}</div>
        </div>`;
      });
      html += '</div>';
    }

    if (radioItems.length) {
      html += '<h3 class="ma-sec-title">Trending stations</h3><div class="ma-stations">';
      radioItems.slice(0, 10).forEach((item, i) => {
        const thumb = item.image_url || item.thumbnail;
        html += `<div class="ma-station" data-radio="${i}">
          ${thumb ? `<img src="${esc(thumb)}" alt="">` : '<div class="ma-station-ph">📻</div>'}
          <div class="ma-station-t">${esc(item.name || item.title || 'Radio')}</div>
        </div>`;
      });
      html += '</div>';
    }

    el.innerHTML = html || '<p class="ma-muted">Brak treści MA — sprawdź integrację</p>';
    el.querySelector('.ma-hero')?.addEventListener('click', (e) => {
      if (e.target.closest('.ma-play-btn') || e.target.closest('.ma-hero')) {
        maPlay(discoverItems[0], discoverItems[0].media_type || 'track');
      }
    });
    el.querySelectorAll('.ma-tile').forEach((tile) => {
      tile.addEventListener('click', () => maPlay(discoverItems[+tile.dataset.i], discoverItems[+tile.dataset.i]?.media_type || 'track'));
    });
    el.querySelectorAll('.ma-station').forEach((tile) => {
      tile.addEventListener('click', () => maPlay(radioItems[+tile.dataset.radio], 'radio', true));
    });
  } catch {
    el.innerHTML = '<p class="ma-muted">Błąd Music Assistant</p>';
  }
}

async function loadRadio() {
  const el = document.getElementById('ma-radio-list');
  if (!el) return;
  el.innerHTML = '<p class="ma-muted">Ładowanie stacji…</p>';
  try {
    const resp = await callService('music_assistant', 'get_library', { media_type: 'radio', limit: 40 });
    radioItems = pickItems(resp);
    el.innerHTML = radioItems.map((item, i) => {
      const thumb = item.image_url || item.thumbnail;
      return `<div class="ma-row" data-radio="${i}">
        ${thumb ? `<img src="${esc(thumb)}" alt="">` : '<div class="ph">📻</div>'}
        <div class="meta"><div class="t">${esc(item.name || item.title || 'Radio')}</div><div class="s">Stacja radiowa</div></div>
        <button type="button" class="btn primary sm">▶</button>
      </div>`;
    }).join('') || '<p class="ma-muted">Brak stacji</p>';
    el.querySelectorAll('.ma-row').forEach((row) => {
      row.addEventListener('click', () => maPlay(radioItems[+row.dataset.radio], 'radio', true));
    });
  } catch {
    el.innerHTML = '<p class="ma-muted">Błąd ładowania radia</p>';
  }
}

async function loadLibrary() {
  const el = document.getElementById('ma-lib-list');
  if (!el) return;
  el.innerHTML = '<p class="ma-muted">Ładowanie biblioteki…</p>';
  try {
    const [recent, fav] = await Promise.all([
      callService('music_assistant', 'get_library', { media_type: 'track', order_by: 'last_played', limit: 20 }),
      callService('music_assistant', 'get_library', { media_type: 'track', favorite: true, limit: 20 })
    ]);
    const items = [...pickItems(recent), ...pickItems(fav)];
    window._maLibItems = items;
    el.innerHTML = items.slice(0, 24).map((item, i) => {
      const thumb = item.image_url || item.thumbnail;
      return `<div class="ma-row" data-i="${i}">
        ${thumb ? `<img src="${esc(thumb)}" alt="">` : '<div class="ph">♪</div>'}
        <div class="meta"><div class="t">${esc(item.name || item.title || '—')}</div><div class="s">${esc((item.artists || []).map((a) => a.name).join(', '))}</div></div>
        <button type="button" class="btn primary sm">▶</button>
      </div>`;
    }).join('') || '<p class="ma-muted">Pusta biblioteka</p>';
    el.querySelectorAll('.ma-row').forEach((row) => {
      row.addEventListener('click', () => maPlay(window._maLibItems[+row.dataset.i], 'track'));
    });
  } catch {
    el.innerHTML = '<p class="ma-muted">Błąd biblioteki</p>';
  }
}

async function loadSpotifyBrowse() {
  const el = document.getElementById('ma-spotify-feed');
  if (!el || !cfg.ha_spotify) {
    if (el) el.innerHTML = '<p class="ma-muted">Skonfiguruj Spotify w ☰</p>';
    return;
  }
  el.innerHTML = '<p class="ma-muted">Ładowanie Spotify…</p>';
  try {
    const root = await browseMedia(cfg.ha_spotify, '', '');
    const cats = (root?.children || []).slice(0, 5);
    let html = '';
    for (const cat of cats) {
      const data = await browseMedia(cfg.ha_spotify, cat.media_content_type, cat.media_content_id);
      const items = (data?.children || []).slice(0, 10);
      if (!items.length) continue;
      html += `<h3 class="ma-sec-title">${esc(cat.title)}</h3><div class="ma-sp-row">`;
      html += items.map((item) => {
        const thumb = item.thumbnail ? entityPicture(item.thumbnail) : '';
        return `<div class="ma-sp-card" data-uri="${esc(item.media_content_id)}" data-type="${esc(item.media_content_type || 'playlist')}">
          ${thumb ? `<img data-src="${esc(thumb)}" src="${PLACEHOLDER}" alt="">` : '<div class="ph">♪</div>'}
          <div class="t">${esc(item.title)}</div>
        </div>`;
      }).join('');
      html += '</div>';
    }
    el.innerHTML = html || '<p class="ma-muted">Brak propozycji Spotify</p>';
    lazyImages(el);
    el.querySelectorAll('.ma-sp-card').forEach((card) => {
      card.addEventListener('click', () => {
        callService('media_player', 'play_media', {
          entity_id: cfg.ha_spotify,
          media_content_type: card.dataset.type,
          media_content_id: card.dataset.uri
        });
      });
    });
  } catch {
    el.innerHTML = '<p class="ma-muted">Błąd Spotify</p>';
  }
}

async function searchMa() {
  const q = document.getElementById('ma-query')?.value?.trim();
  const el = document.getElementById('ma-search-results');
  if (!q || !el) return;
  el.innerHTML = '<p class="ma-muted">Szukam…</p>';
  try {
    const resp = await callService('music_assistant', 'search', { name: q, limit: 20, media_type: 'all' });
    const tracks = resp?.tracks || resp?.service_response?.tracks || [];
    window._maSearchItems = tracks;
    el.innerHTML = tracks.slice(0, 20).map((t, i) => `
      <div class="ma-row" data-i="${i}">
        ${t.image_url ? `<img src="${esc(t.image_url)}" alt="">` : '<div class="ph">♪</div>'}
        <div class="meta"><div class="t">${esc(t.name)}</div><div class="s">${esc((t.artists || []).map((a) => a.name).join(', '))}</div></div>
        <button type="button" class="btn primary sm">▶</button>
      </div>`).join('') || '<p class="ma-muted">Brak wyników</p>';
    el.querySelectorAll('.ma-row').forEach((row) => {
      row.addEventListener('click', () => maPlay(window._maSearchItems[+row.dataset.i], 'track'));
    });
  } catch {
    el.innerHTML = '<p class="ma-muted">Błąd wyszukiwania</p>';
  }
}
