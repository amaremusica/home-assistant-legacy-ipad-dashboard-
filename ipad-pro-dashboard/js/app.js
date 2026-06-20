import { BUILD, loadConfig, saveConfig, exportConfig, importConfigFile, applyConfigObject, PRESET_URL, cameraList, ROOMS, SCENES, WEATHER, ENERGY, DASH_ROOMS, GATES, FRIDGE, AIR, PARCEL, GARDEN, SUN, TV, BEDS, LAUNDRY, K1C } from './config.js?v=1.2.0';
import {
  initHa, fetchStates, connectWebSocket, onStates, getState, callService,
  entityPicture, checkVersion, triggerPanelUpdate, getHaOrigin
} from './ha.js?v=1.2.0';
import {
  camCardHtml, bindCamCards, attachCamStreams, attachDashCam, stopCamStreams, resumeCamStreams,
  openCameraModal, closeCameraModal, bindCameraModal, camLabel, refreshCameras, startCamHealthCheck
} from './cameras.js?v=1.2.0';
import { renderWeatherPage } from './weather.js?v=1.2.0';
import { initDashboard, renderDashboard } from './dashboard.js?v=1.2.0';
import { loadTrash } from './trash.js?v=1.2.0';
import { initMusic, renderMaNowPlaying } from './music.js?v=1.2.0';
import { renderRoomTabs, renderRoomView, renderEnergyView, renderK1cView } from './rooms.js?v=1.2.0';
import { toast, setOnline, setTab, tickClock, esc } from './ui.js?v=1.2.0';

const GIT_PULL_MS = 30 * 60 * 1000;
const CHECK_MS = 2 * 60 * 1000;
const COPY_WAIT_MS = 6500;
const LS_PULL = 'ipad_pro_git_pull_ts';
const RELOAD_GUARD_MS = 15000;

let cfg = loadConfig();
let pollTimer = null;
let activeRoom = 'salon';

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
  for (const r of DASH_ROOMS) {
    ids.add(r.light);
    ids.add(r.temp);
    ids.add(r.hum);
  }
  for (const g of GATES) ids.add(g.id);
  ids.add(FRIDGE.fridge);
  ids.add(FRIDGE.freezer);
  Object.values(AIR).forEach((id) => ids.add(id));
  Object.values(PARCEL).forEach((id) => ids.add(id));
  Object.values(GARDEN).forEach((id) => ids.add(id));
  ids.add(SUN);
  ids.add(TV);
  BEDS.forEach((b) => ids.add(b.id));
  Object.values(LAUNDRY).forEach((id) => ids.add(id));
  Object.values(K1C).forEach((id) => ids.add(id));
  for (const r of Object.values(ROOMS)) {
    for (const s of r.sensors || []) ids.add(s.id);
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
  document.getElementById('cfg-trash').value = c.ha_trash || '';
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
  initDashboard(cfg, runScene, toggleDashLight, toggleGate);
  renderCamGrid();
  renderCamPreviews();
  initDashCam();
  loadTrash(cfg.ha_trash);
  setInterval(() => loadTrash(cfg.ha_trash), 30 * 60 * 1000);
  startCamHealthCheck();
  initMusic(cfg, () => renderMaNowPlaying());
  bindCameraModal(cfg);
  bindDashSpotify();
}

function initDashCam() {
  const cams = cameraList(cfg);
  if (!cams.length) return;
  const dash = document.getElementById('dash-cam');
  if (dash) {
    dash.querySelector('.label').textContent = `📷 ${camLabel(cams[0], cfg)}`;
    dash.onclick = () => {
      setTab('cameras');
      renderCamGrid();
      document.querySelectorAll('#tabnav .tb').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'cameras'));
    };
  }
  attachDashCam(cams[0]);
}

function runScene(id) {
  if (!id) return;
  callService('scene', 'turn_on', { entity_id: id }).then(() => toast('Scena uruchomiona'));
}

async function toggleDashLight(id, cell) {
  if (!id) return;
  const on = getState(id)?.state === 'on';
  const domain = id.startsWith('switch.') ? 'switch' : 'light';
  if (cell) cell.classList.toggle('lit', !on);
  await callService(domain, on ? 'turn_off' : 'turn_on', { entity_id: id });
}

async function toggleGate(id, btn) {
  if (!id) return;
  const on = getState(id)?.state === 'on';
  await callService('switch', on ? 'turn_off' : 'turn_on', { entity_id: id });
}

function bindDashSpotify() {
  document.getElementById('sp-play')?.addEventListener('click', () => {
    const e = getState(cfg.ha_spotify);
    const svc = e?.state === 'playing' ? 'media_pause' : 'media_play';
    callService('media_player', svc, { entity_id: cfg.ha_spotify });
  });
  document.getElementById('sp-prev')?.addEventListener('click', () =>
    callService('media_player', 'media_previous_track', { entity_id: cfg.ha_spotify })
  );
  document.getElementById('sp-next')?.addEventListener('click', () =>
    callService('media_player', 'media_next_track', { entity_id: cfg.ha_spotify })
  );
  document.getElementById('sp-vbw')?.addEventListener('click', (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    callService('media_player', 'volume_set', { entity_id: cfg.ha_spotify, volume_level: pct });
  });
}

function bindTabNav() {
  document.getElementById('tabnav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.tb');
    if (!btn) return;
    const tab = btn.dataset.tab;
    const room = btn.dataset.room;
    if (room) {
      activeRoom = room;
      setTab('rooms');
      onRoomSelect(room);
    } else {
      setTab(tab);
      if (tab === 'cameras') renderCamGrid();
      if (tab === 'weather') renderWeatherPage();
      if (tab === 'energy') renderEnergyView();
      if (tab === 'k1c') renderK1cView();
      if (tab === 'music') renderMaNowPlaying();
      if (tab === 'home' || tab === 'cameras') refreshCameras(true);
    }
    document.querySelectorAll('#tabnav .tb').forEach((b) => b.classList.toggle('active', b === btn));
  });
  document.getElementById('dash-wcard')?.addEventListener('click', () => {
    setTab('weather');
    renderWeatherPage();
    document.querySelectorAll('#tabnav .tb').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'weather'));
  });
}

function onRoomSelect(room) {
  activeRoom = room;
  renderRoomTabs(activeRoom, onRoomSelect);
  renderRoomView(activeRoom);
}

function renderAll() {
  renderDashboard(cfg);
  refreshCameras(false);
  renderRoomTabs(activeRoom, onRoomSelect);
  renderRoomView(activeRoom);
  renderMaNowPlaying();
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

document.getElementById('cfg-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveConfig({
    ha_url: document.getElementById('cfg-url').value.trim(),
    ha_token: document.getElementById('cfg-token').value.trim(),
    ha_spotify: document.getElementById('cfg-spotify').value.trim(),
    ha_ma: document.getElementById('cfg-ma').value.trim(),
    ha_cams: document.getElementById('cfg-cams').value.trim(),
    ha_cam_labels: document.getElementById('cfg-labels').value.trim(),
    ha_cam_mode: document.getElementById('cfg-cam-mode').value,
    ha_trash: document.getElementById('cfg-trash').value.trim()
  });
  document.getElementById('cfg').close();
  loadTrash(document.getElementById('cfg-trash').value.trim(), { force: true });
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

bindTabNav();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamStreams();
  else resumeCamStreams();
});
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
