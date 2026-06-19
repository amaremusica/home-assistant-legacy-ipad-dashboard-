import { BUILD, loadConfig, saveConfig, exportConfig, importConfigFile, applyConfigObject, PRESET_URL, cameraList, ROOMS, SCENES, WEATHER, ENERGY } from './config.js?v=1.1.3';
import {
  initHa, fetchStates, connectWebSocket, onStates, getState, callService,
  browseMedia, maSearch, entityPicture, checkVersion, triggerPanelUpdate, getHaOrigin
} from './ha.js?v=1.1.3';
import {
  camCardHtml, bindCamCards, attachCamStreams, stopCamStreams, resumeCamStreams,
  openCameraModal, closeCameraModal, bindCameraModal
} from './cameras.js?v=1.1.3';
import { renderHomeWeather, renderWeatherPage } from './weather.js?v=1.1.3';
import { toast, setOnline, setTab, bindDock, tickClock, esc, lazyImages } from './ui.js?v=1.1.3';

const GIT_PULL_MS = 30 * 60 * 1000;
const CHECK_MS = 2 * 60 * 1000;
const COPY_WAIT_MS = 6500;
const LS_PULL = 'ipad_pro_git_pull_ts';
const RELOAD_GUARD_MS = 15000;

let cfg = loadConfig();
let pollTimer = null;
let activeRoom = 'salon';
let mediaEntity = '';
let progressTimer = null;

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
);

function hideBootStatus() {
  document.getElementById('boot-status')?.classList.add('hidden');
}

function ensureHaUrl(c) {
  if (c.ha_url) {
    c.ha_url = c.ha_url.trim().replace(/\/$/, '');
    return c;
  }
  if (window.location.pathname.includes('/local/')) {
    c.ha_url = window.location.origin;
  }
  return c;
}

function verParts(v) {
  const p = String(v || '0').replace(/^v/i, '').split('.');
  return [0, 1, 2].map((i) => parseInt(p[i], 10) || 0);
}

function verCmp(a, b) {
  const pa = verParts(a);
  const pb = verParts(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function panelUrl(version) {
  const base = (getHaOrigin() || window.location.origin).replace(/\/$/, '');
  return `${base}/local/ipad-pro/index.html?v=${version || BUILD}&_=${Date.now()}`;
}

function reloadPanel(version) {
  window.location.href = panelUrl(version);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

function canReload() {
  const last = parseInt(sessionStorage.getItem('ipad_pro_upd_ts') || '0', 10);
  return Date.now() - last >= RELOAD_GUARD_MS;
}

function markReload() {
  sessionStorage.setItem('ipad_pro_upd_ts', String(Date.now()));
}

async function waitForCopy() {
  await new Promise((r) => setTimeout(r, COPY_WAIT_MS));
}

async function autoUpdateOnRefresh(c) {
  if (!c?.ha_url || !c?.ha_token || !canReload()) return false;
  initHa(c);
  try {
    localStorage.setItem(LS_PULL, String(Date.now()));
    await withTimeout(triggerPanelUpdate(), 12000);
  } catch {
    return false;
  }
  await waitForCopy();
  const remote = await checkVersion();
  if (remote && verCmp(remote, BUILD) > 0 && canReload()) {
    markReload();
    reloadPanel(remote);
    return true;
  }
  return false;
}

async function runPanelUpdate(c, { forcePull = false } = {}) {
  if (!c?.ha_url || !c?.ha_token) return null;
  initHa(c);
  const last = parseInt(localStorage.getItem(LS_PULL) || '0', 10);
  if (forcePull || Date.now() - last >= GIT_PULL_MS) {
    const verEl = document.getElementById('ver');
    if (verEl) verEl.textContent = '⏳ Git…';
    localStorage.setItem(LS_PULL, String(Date.now()));
    try {
      await withTimeout(triggerPanelUpdate(), 12000);
    } catch {
      if (verEl) verEl.textContent = 'v' + BUILD;
      throw new Error('shell_command');
    }
    if (verEl) verEl.textContent = '⏳';
    await waitForCopy();
  }
  const remote = await checkVersion();
  if (remote && verCmp(remote, BUILD) > 0 && canReload()) {
    markReload();
    reloadPanel(remote);
    return remote;
  }
  const verEl = document.getElementById('ver');
  if (verEl) verEl.textContent = 'v' + BUILD;
  return null;
}

function startAutoUpdate(c) {
  setInterval(async () => {
    if (document.hidden || !c?.ha_url || !c?.ha_token) return;
    try {
      await runPanelUpdate(c, { forcePull: false });
    } catch {
      /* brak shell_command — ignoruj w tle */
    }
  }, CHECK_MS);
}

function allEntityIds() {
  const ids = new Set([WEATHER, cfg.ha_spotify, cfg.ha_ma, cfg.ha_motion].filter(Boolean));
  for (const c of cameraList(cfg)) ids.add(c);
  for (const r of Object.values(ROOMS)) {
    for (const l of r.lights) ids.add(l.id);
  }
  for (const s of SCENES) {
    const id = cfg[s.key];
    if (id) ids.add(id);
  }
  Object.values(ENERGY).forEach((id) => ids.add(id));
  return [...ids];
}

function fillConfigForm(c) {
  document.getElementById('cfg-url').value = c.ha_url || '';
  document.getElementById('cfg-token').value = c.ha_token || '';
  document.getElementById('cfg-spotify').value = c.ha_spotify || '';
  document.getElementById('cfg-ma').value = c.ha_ma || '';
  document.getElementById('cfg-cams').value = c.ha_cams || '';
  document.getElementById('cfg-labels').value = c.ha_cam_labels || '';
  document.getElementById('cfg-cam-mode').value = c.ha_cam_mode || 'auto';
}

function showConfig() {
  cfg = loadConfig();
  fillConfigForm(cfg);
  document.getElementById('cfg').showModal();
}

async function loadPresetFromHa() {
  const urlInput = document.getElementById('cfg-url').value.trim();
  const path = PRESET_URL + '?nocache=' + Date.now();
  const url = urlInput ? urlInput.replace(/\/$/, '') + path : path;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const o = await r.json();
    cfg = applyConfigObject(o);
    fillConfigForm(cfg);
    toast('Preset wczytany — uzupełnij URL i token jeśli puste');
  } catch {
    toast('Brak pliku /local/ipad-pro/ipad-pro-config.json — zrób git pull + update');
  }
}

function pickImportFile() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files?.[0];
    if (!f) return;
    try {
      cfg = await importConfigFile(f);
      fillConfigForm(cfg);
      toast('JSON zaimportowany — sprawdij pola i Połącz');
    } catch {
      toast('Nieprawidłowy plik JSON');
    }
  };
  inp.click();
}

async function connect() {
  cfg = ensureHaUrl(loadConfig());
  hideBootStatus();
  if (!cfg.ha_url || !cfg.ha_token) {
    fillConfigForm(cfg);
    showConfig();
    return;
  }
  initHa(cfg);
  mediaEntity = cfg.ha_ma || cfg.ha_spotify;
  document.getElementById('ver').textContent = 'v' + BUILD;
  document.getElementById('app').classList.remove('hidden');

  try {
    await fetchStates(allEntityIds());
    await connectWebSocket();
    setOnline(true);
    toast('Połączono · WebSocket aktywny');
  } catch {
    setOnline(false);
    toast('Błąd połączenia — sprawdź URL i token');
    showConfig();
    return;
  }

  renderAll();
  onStates(renderAll);
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => fetchStates(allEntityIds()).catch(() => setOnline(false)), 45000);
  renderCamPreviews();
  loadMusicHome();
  bindProgress();
  bindCameraModal(cfg);
}

function renderAll() {
  renderHomeWeather();
  renderEnergy();
  renderScenes();
  renderRoom(document.getElementById('room-salon'), ROOMS.salon);
  renderRoomTabs();
  renderRoom(document.getElementById('room-grid'), ROOMS[activeRoom]);
  renderNowPlaying();
}

function renderEnergy() {
  const fmt = (id) => {
    const v = parseFloat(getState(id)?.state);
    return Number.isFinite(v) ? Math.round(v) : '--';
  };
  const p1 = document.getElementById('en-p1');
  const p2 = document.getElementById('en-p2');
  const p3 = document.getElementById('en-p3');
  if (p1) p1.textContent = fmt(ENERGY.p1);
  if (p2) p2.textContent = fmt(ENERGY.p2);
  if (p3) p3.textContent = fmt(ENERGY.p3);
}

function renderScenes() {
  const el = document.getElementById('quick-scenes');
  if (!el) return;
  el.innerHTML = SCENES.map((s) => {
    const id = cfg[s.key];
    return `<button type="button" class="scene-btn" data-scene="${esc(id)}" ${id ? '' : 'disabled'}>${s.icon} ${s.label}</button>`;
  }).join('');
  el.querySelectorAll('.scene-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scene;
      if (!id) return;
      callService('scene', 'turn_on', { entity_id: id }).then(() => toast('Scena uruchomiona'));
    });
  });
}

function renderCamPreviews() {
  const el = document.getElementById('cam-preview');
  const cams = cameraList(cfg).slice(0, 2);
  if (!el || !cams.length) return;
  const key = cams.join('|');
  if (el.dataset.camKey === key && el.children.length) {
    attachCamStreams(el);
    return;
  }
  stopCamStreams();
  el.dataset.camKey = key;
  el.innerHTML = cams.map((c) => camCardHtml(c, cfg)).join('');
  bindCamCards(el, (id) => openCameraModal(id, cfg));
  attachCamStreams(el);
}

function renderCamGrid() {
  const el = document.getElementById('cam-grid');
  const cams = cameraList(cfg);
  if (!el) return;
  const key = cams.join('|');
  if (el.dataset.camKey === key && el.children.length) {
    attachCamStreams(el);
    return;
  }
  el.dataset.camKey = key;
  el.innerHTML = cams.map((c) => camCardHtml(c, cfg)).join('');
  bindCamCards(el, (id) => openCameraModal(id, cfg));
  attachCamStreams(el);
}

function renderRoom(container, room) {
  if (!container || !room) return;
  container.innerHTML = room.lights
    .map((l) => {
      const st = getState(l.id)?.state || 'off';
      const on = st === 'on';
      return `<button type="button" class="light-tile${on ? ' on' : ''}" data-light="${esc(l.id)}">
        <div>💡</div>
        <div class="name">${esc(l.name)}</div>
        <div class="state">${on ? 'on' : 'off'}</div>
      </button>`;
    })
    .join('');
  container.querySelectorAll('.light-tile').forEach((tile) => {
    tile.addEventListener('click', () => toggleLight(tile.dataset.light, tile));
  });
}

async function toggleLight(id, tile) {
  const on = getState(id)?.state === 'on';
  const domain = id.startsWith('switch.') ? 'switch' : 'light';
  tile.classList.toggle('on', !on);
  tile.querySelector('.state').textContent = on ? 'off' : 'on';
  await callService(domain, on ? 'turn_off' : 'turn_on', { entity_id: id });
}

function renderRoomTabs() {
  const el = document.getElementById('room-tabs');
  if (!el) return;
  el.innerHTML = Object.entries(ROOMS)
    .map(([k, r]) => `<button type="button" class="room-tab${k === activeRoom ? ' active' : ''}" data-room="${k}">${esc(r.label)}</button>`)
    .join('');
  el.querySelectorAll('.room-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeRoom = tab.dataset.room;
      renderRoomTabs();
      renderRoom(document.getElementById('room-grid'), ROOMS[activeRoom]);
    });
  });
}

async function loadMusicHome() {
  const el = document.getElementById('music-home');
  const eid = cfg.ha_spotify;
  if (!el || !eid) {
    el.innerHTML = '<p class="muted">Skonfiguruj encję Spotify w ☰</p>';
    return;
  }
  el.innerHTML = '<p class="muted">Ładowanie…</p>';
  try {
    const root = await browseMedia(eid, '', '');
    const cats = (root?.children || []).slice(0, 6);
    let html = '';
    for (const cat of cats) {
      const data = await browseMedia(eid, cat.media_content_type, cat.media_content_id);
      const items = (data?.children || []).slice(0, 12);
      if (!items.length) continue;
      html += `<h3 class="section-title">${esc(cat.title)}</h3><div class="music-row">`;
      html += items
        .map((item) => {
          const thumb = item.thumbnail
            ? `<img data-src="${esc(entityPicture(item.thumbnail))}" src="${PLACEHOLDER}" alt="">`
            : '<div class="ph">♪</div>';
          return `<div class="music-card" data-uri="${esc(item.media_content_id)}" data-type="${esc(item.media_content_type || 'playlist')}">${thumb}<div class="t">${esc(item.title)}</div></div>`;
        })
        .join('');
      html += '</div>';
    }
    el.innerHTML = html || '<p class="muted">Brak propozycji</p>';
    lazyImages(el);
    el.querySelectorAll('.music-card').forEach((card) => {
      card.addEventListener('click', () => playMedia(card.dataset.type, card.dataset.uri));
    });
  } catch {
    el.innerHTML = '<p class="muted">Nie udało się wczytać Spotify</p>';
  }
}

async function playMedia(type, uri) {
  if (!uri || !cfg.ha_spotify) return;
  await callService('media_player', 'play_media', {
    entity_id: cfg.ha_spotify,
    media_content_type: type || 'playlist',
    media_content_id: uri
  });
  toast('Odtwarzam…');
  setTimeout(renderNowPlaying, 800);
}

async function searchMa() {
  const q = document.getElementById('ma-query')?.value?.trim();
  const el = document.getElementById('ma-results');
  if (!q || !el) return;
  el.innerHTML = '<p class="muted">Szukam…</p>';
  try {
    const resp = await maSearch(q);
    const tracks = resp?.tracks || resp?.[0]?.tracks || [];
    if (!tracks.length) {
      el.innerHTML = '<p class="muted">Brak wyników</p>';
      return;
    }
    el.innerHTML = tracks
      .slice(0, 15)
      .map(
        (t, i) => `<div class="ma-row" data-i="${i}">
      ${t.image_url ? `<img data-src="${esc(t.image_url)}" src="${PLACEHOLDER}" alt="">` : '<div class="ph">♪</div>'}
      <div class="meta"><div class="t">${esc(t.name)}</div><div class="s">${esc((t.artists || []).map((a) => a.name).join(', '))}</div></div>
      <button type="button" class="btn primary ma-play">▶</button></div>`
      )
      .join('');
    window._maTracks = tracks;
    lazyImages(el);
    el.querySelectorAll('.ma-row').forEach((row) => {
      row.addEventListener('click', () => playMaTrack(+row.dataset.i));
    });
  } catch {
    el.innerHTML = '<p class="muted">Błąd MA — sprawdź integrację w HA</p>';
  }
}

async function playMaTrack(idx) {
  const t = window._maTracks?.[idx];
  const player = cfg.ha_ma || cfg.ha_spotify;
  if (!t?.uri || !player) return;
  await callService('music_assistant', 'play_media', {
    entity_id: player,
    media_id: t.uri,
    media_type: 'track'
  });
  toast('Odtwarzam przez MA');
  setTimeout(renderNowPlaying, 800);
}

function renderNowPlaying() {
  const e = getState(mediaEntity);
  const title = document.getElementById('np-title');
  const artist = document.getElementById('np-artist');
  const art = document.getElementById('np-art');
  const bar = document.getElementById('np-bar');
  const playBtn = document.getElementById('np-play');
  if (!e?.attributes) {
    title.textContent = 'Nic nie gra';
    artist.textContent = '—';
    art.style.backgroundImage = '';
    bar.style.width = '0%';
    playBtn.textContent = '▶';
    return;
  }
  const a = e.attributes;
  title.textContent = a.media_title || '—';
  artist.textContent = a.media_artist || a.media_album_name || '—';
  if (a.entity_picture) art.style.backgroundImage = `url("${entityPicture(a.entity_picture)}")`;
  playBtn.textContent = e.state === 'playing' ? '⏸' : '▶';
  const dur = a.media_duration || 0;
  const pos = a.media_position || 0;
  bar.style.width = dur > 0 ? `${(pos / dur) * 100}%` : '0%';
}

function bindProgress() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(renderNowPlaying, 1000);
}

function bindMusicChips() {
  document.getElementById('music-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#music-chips .chip').forEach((c) => c.classList.remove('on'));
    chip.classList.add('on');
    const mode = chip.dataset.music;
    document.getElementById('music-home').classList.toggle('hidden', mode !== 'home');
    document.getElementById('music-search').classList.toggle('hidden', mode !== 'search');
  });
}

function bindMediaControls() {
  document.getElementById('np-play')?.addEventListener('click', () => {
    const e = getState(mediaEntity);
    const svc = e?.state === 'playing' ? 'media_pause' : 'media_play';
    callService('media_player', svc, { entity_id: mediaEntity });
  });
  document.getElementById('np-prev')?.addEventListener('click', () =>
    callService('media_player', 'media_previous_track', { entity_id: mediaEntity })
  );
  document.getElementById('np-next')?.addEventListener('click', () =>
    callService('media_player', 'media_next_track', { entity_id: mediaEntity })
  );
}

document.getElementById('cfg-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveConfig({
    ha_url: document.getElementById('cfg-url').value.trim(),
    ha_token: document.getElementById('cfg-token').value.trim(),
    ha_spotify: document.getElementById('cfg-spotify').value.trim(),
    ha_ma: document.getElementById('cfg-ma').value.trim(),
    ha_cams: document.getElementById('cfg-cams').value.trim(),
    ha_cam_labels: document.getElementById('cfg-labels').value.trim(),
    ha_cam_mode: document.getElementById('cfg-cam-mode').value
  });
  document.getElementById('cfg').close();
  connect();
});

document.getElementById('btn-menu')?.addEventListener('click', showConfig);
document.getElementById('cfg-export')?.addEventListener('click', exportConfig);
document.getElementById('cfg-import')?.addEventListener('click', pickImportFile);
document.getElementById('cfg-preset')?.addEventListener('click', loadPresetFromHa);
document.getElementById('btn-refresh')?.addEventListener('click', async () => {
  cfg = loadConfig();
  toast('Aktualizuję panel…');
  try {
    const remote = await runPanelUpdate(cfg, { forcePull: true });
    if (!remote) toast('Panel aktualny');
  } catch {
    toast('Brak shell_command.update_ipad_pro_panel — dodaj do configuration.yaml i zrestartuj HA');
  }
});

document.getElementById('hero-weather-tap')?.addEventListener('click', () => {
  setTab('weather');
  renderWeatherPage();
});

document.getElementById('ma-search-btn')?.addEventListener('click', searchMa);
document.getElementById('ma-query')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchMa();
});

bindDock((tab) => {
  if (tab === 'cameras') renderCamGrid();
  if (tab === 'weather') renderWeatherPage();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamStreams();
  else resumeCamStreams();
});
bindMusicChips();
bindMediaControls();
tickClock();
setInterval(tickClock, 30000);

async function boot() {
  cfg = loadConfig();
  connect();
  if (cfg.ha_url && cfg.ha_token) {
    startAutoUpdate(cfg);
    autoUpdateOnRefresh(cfg).catch(() => {});
  }
}

boot();
