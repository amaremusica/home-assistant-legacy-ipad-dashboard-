import { BUILD, loadConfig, saveConfig, exportConfig, cameraList, ROOMS, SCENES, WEATHER, ENERGY } from './config.js';
import {
  initHa, fetchStates, connectWebSocket, onStates, getState, callService,
  browseMedia, maSearch, entityPicture, checkVersion, triggerPanelUpdate
} from './ha.js';
import {
  camCardHtml, bindCamCards, startThumbnailRefresh, openCameraModal, closeCameraModal, bindCameraModal
} from './cameras.js';
import { renderHomeWeather, renderWeatherPage } from './weather.js';
import { toast, setOnline, setTab, bindDock, tickClock, esc, lazyImages } from './ui.js';

let cfg = loadConfig();
let pollTimer = null;
let camRefreshTimer = null;
let activeRoom = 'salon';
let mediaEntity = '';
let progressTimer = null;

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
);

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

function showConfig() {
  const dlg = document.getElementById('cfg');
  document.getElementById('cfg-url').value = cfg.ha_url || '';
  document.getElementById('cfg-token').value = cfg.ha_token || '';
  document.getElementById('cfg-spotify').value = cfg.ha_spotify || '';
  document.getElementById('cfg-ma').value = cfg.ha_ma || '';
  document.getElementById('cfg-cams').value = cfg.ha_cams || '';
  document.getElementById('cfg-labels').value = cfg.ha_cam_labels || '';
  document.getElementById('cfg-cam-mode').value = cfg.ha_cam_mode || 'auto';
  dlg.showModal();
}

async function connect() {
  cfg = loadConfig();
  if (!cfg.ha_url || !cfg.ha_token) {
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
  if (camRefreshTimer) clearInterval(camRefreshTimer);
  camRefreshTimer = startThumbnailRefresh(cfg, 3500);
  loadMusicHome();
  bindProgress();
  bindCameraModal(cfg);
}

function renderAll() {
  renderHomeWeather();
  renderEnergy();
  renderScenes();
  renderCamPreviews();
  renderRoom(document.getElementById('room-salon'), ROOMS.salon);
  renderRoomTabs();
  renderRoom(document.getElementById('room-grid'), ROOMS[activeRoom]);
  renderCamGrid();
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
  el.innerHTML = cams.map((c) => camCardHtml(c, cfg, 'preview')).join('');
  bindCamCards(el, (id) => openCameraModal(id, cfg));
}

function renderCamGrid() {
  const el = document.getElementById('cam-grid');
  const cams = cameraList(cfg);
  if (!el) return;
  el.innerHTML = cams.map((c) => camCardHtml(c, cfg, 'grid')).join('');
  bindCamCards(el, (id) => openCameraModal(id, cfg));
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
document.getElementById('btn-refresh')?.addEventListener('click', async () => {
  toast('Aktualizuję panel…');
  try {
    await triggerPanelUpdate();
    const remote = await checkVersion();
    if (remote && remote !== BUILD) {
      location.href = `${cfg.ha_url.replace(/\/$/, '')}/local/ipad-pro/index.html?v=${remote}&_=${Date.now()}`;
    } else toast('Panel aktualny');
  } catch {
    toast('Brak shell_command2.update_ipad_pro_panel w HA');
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
bindMusicChips();
bindMediaControls();
tickClock();
setInterval(tickClock, 30000);
connect();
