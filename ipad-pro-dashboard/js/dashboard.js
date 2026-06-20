/** Ekran Dom — układ jak legacy iPad 4 */
import { getState, callService, entityPicture, fetchCalendar } from './ha.js?v=1.2.0';
import {
  WEATHER, ENERGY, AIR, SCENES, DASH_ROOMS, GATES, FRIDGE,
  PARCEL, GARDEN, RUN_CAL, SUN
} from './config.js?v=1.2.0';
import { esc } from './ui.js?v=1.2.0';
import { weatherSvgInner, wSvgSmall } from './weather-svg.js?v=1.2.0';

let fcData = null;
let fcLast = 0;

const WICON = {
  'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️', lightning: '⛈️',
  'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️', rainy: '🌧️',
  snowy: '❄️', sunny: '☀️', windy: '💨', exceptional: '⚠️', 'snowy-rainy': '🌨️'
};

const AQ_LABELS = ['Bardzo dobry', 'Dobry', 'Umiarkowany', 'Dostateczny', 'Zły', 'Bardzo zły'];
const FC_ICONS = { sunny: '☀️', cloudy: '☁️', rainy: '🌧️', 'partlycloudy': '⛅', snowy: '❄️' };

let runBusy = false;
let runLast = 0;

function fmt(v, d = 1) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? (d ? n.toFixed(d) : String(Math.round(n))) : '--';
}

function tx(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function aqBadge(aqi) {
  const n = parseFloat(aqi);
  if (!Number.isFinite(n)) return { label: '--', cls: '' };
  const label = AQ_LABELS[Math.min(AQ_LABELS.length - 1, Math.floor(n))] || '--';
  const cls = n <= 1 ? 'aq-g' : n <= 3 ? 'aq-m' : 'aq-b';
  return { label, cls };
}

export function initDashboard(cfg, onScene, onRoomLight, onGate) {
  const rooms = document.getElementById('dash-rooms');
  if (rooms && !rooms.dataset.ready) {
    rooms.innerHTML = DASH_ROOMS.map((r) => `
      <div class="rcell tile" data-room="${r.key}" id="rc-${r.key}">
        <div class="rcell-h"><span class="rcell-name">${esc(r.label)}</span>
          <button type="button" class="rbulb" data-light="${esc(r.light)}" aria-label="Światło">💡</button></div>
        <div class="ricon">${r.icon}</div>
        <div class="rtval"><span id="rt-${r.key}">--</span>°</div>
        <div class="rthum"><span id="rh-${r.key}">--</span>%</div>
      </div>`).join('');
    rooms.querySelectorAll('.rbulb').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRoomLight(btn.dataset.light, btn.closest('.rcell'));
      });
    });
    rooms.dataset.ready = '1';
  }

  const scenes = document.getElementById('dash-scenes');
  if (scenes && !scenes.dataset.ready) {
    scenes.innerHTML = SCENES.map((s) => {
      const id = cfg[s.key];
      return `<button type="button" class="scenebtn tile" data-scene="${esc(id)}" ${id ? '' : 'disabled'}>${s.icon} ${s.label}</button>`;
    }).join('');
    scenes.querySelectorAll('.scenebtn').forEach((btn) => {
      btn.addEventListener('click', () => onScene(btn.dataset.scene));
    });
    scenes.dataset.ready = '1';
  }

  const gates = document.getElementById('dash-gates');
  if (gates && !gates.dataset.ready) {
    gates.innerHTML = GATES.map((g) => `
      <button type="button" class="statecard tile ${g.cls}" data-switch="${esc(g.id)}" id="sc-${g.key}">
        <span class="scico">${g.icon}</span>
        <span class="scname">${esc(g.label)}</span>
        <span class="scstate" id="ss-${g.key}">--</span>
      </button>`).join('');
    gates.querySelectorAll('.statecard').forEach((btn) => {
      btn.addEventListener('click', () => onGate(btn.dataset.switch, btn));
    });
    gates.dataset.ready = '1';
  }
}

export function renderDashboard(cfg) {
  renderDashWeather();
  loadForecast().then(() => renderMiniForecast());
  renderDashAir();
  renderDashRooms();
  renderDashEnergy();
  renderDashFridge();
  renderDashSpotify(cfg);
  renderDashGates();
  renderDashBottom();
  loadRunToday();
}

function renderDashWeather() {
  const w = getState(WEATHER);
  if (!w) return;
  const a = w.attributes || {};
  const cond = w.state || '—';
  tx('wd-cond', cond.charAt(0).toUpperCase() + cond.slice(1));
  tx('wd-temp', fmt(a.temperature, 1));
  tx('wd-pres', fmt(a.pressure, 0));
  tx('wd-hum', fmt(a.humidity, 0));
  tx('wd-wind', fmt(a.wind_speed, 1));
  const icon = document.getElementById('wd-icon');
  const svg = document.getElementById('wsvg');
  if (svg) svg.innerHTML = weatherSvgInner(w.state);
  else if (icon) icon.textContent = WICON[w.state] || '🌤️';

  const aqi = getState(AIR.index)?.state;
  const badge = aqBadge(aqi);
  const waq = document.getElementById('wd-aq');
  if (waq) waq.innerHTML = badge.label !== '--' ? `<span class="aqb ${badge.cls}">${badge.label}</span>` : '';

  const sun = getState(SUN)?.attributes || {};
  const sr = sun.next_rising ? new Date(sun.next_rising).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '--';
  const ss = sun.next_setting ? new Date(sun.next_setting).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '--';
  tx('wd-sun', sr !== '--' || ss !== '--' ? `☀️ ${sr} · 🌙 ${ss}` : '');

  renderMiniForecast(a);
}

async function loadForecast() {
  const now = Date.now();
  if (fcData && now - fcLast < 900000) return fcData;
  try {
    const resp = await callService('weather', 'get_forecasts', { type: 'daily', entity_id: WEATHER });
    const sr = resp?.service_response || resp;
    for (const k of Object.keys(sr || {})) {
      if (sr[k]?.forecast?.length) {
        fcData = sr[k].forecast;
        fcLast = Date.now();
        return fcData;
      }
    }
  } catch { /* fallback below */ }
  const w = getState(WEATHER);
  if (w?.attributes?.forecast?.length) {
    fcData = w.attributes.forecast;
    fcLast = Date.now();
  }
  return fcData;
}

function renderMiniForecast(attrs) {
  const box = document.getElementById('wfc');
  if (!box) return;
  const fc = fcData || attrs?.forecast;
  if (!Array.isArray(fc) || !fc.length) {
    box.innerHTML = '';
    return;
  }
  const dni = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
  box.innerHTML = fc.slice(0, 5).map((d, i) => {
    const dt = d.datetime ? new Date(d.datetime) : null;
    const day = dt ? dni[dt.getDay()] : `+${i}`;
    const cond = d.condition || 'cloudy';
    const hi = fmt(d.temperature, 0);
    const lo = fmt(d.templow, 0);
    const pp = d.precipitation_probability != null ? `${Math.round(d.precipitation_probability)}%` : '';
    return `<div class="wfd"><div class="wdn">${day}</div><svg class="wfi" viewBox="0 0 36 36">${wSvgSmall(cond)}</svg><div class="wft">${hi}<span class="wflo">${lo}°</span></div>${pp ? `<div class="wfp">${pp}</div>` : ''}</div>`;
  }).join('');
}

function renderDashAir() {
  const pm = parseFloat(getState(AIR.pm25)?.state);
  const pm10 = parseFloat(getState(AIR.pm10)?.state);
  const pm25n = parseFloat(getState(AIR.pm25n)?.state);
  const pm10n = parseFloat(getState(AIR.pm10n)?.state);
  const aqi = parseFloat(getState(AIR.index)?.state);

  let pct = 50;
  let lab = '--';
  if (Number.isFinite(pm25n)) {
    pct = Math.max(8, Math.min(92, pm25n));
    lab = pm25n <= 50 ? 'Bardzo dobry' : pm25n <= 100 ? 'Dobry' : pm25n <= 150 ? 'Umiarkowany' : 'Słaby';
  } else if (Number.isFinite(pm)) {
    pct = Math.max(8, Math.min(92, 100 - pm * 4));
    lab = pm <= 13 ? 'Bardzo dobry' : pm <= 25 ? 'Dobry' : pm <= 50 ? 'Umiarkowany' : 'Słaby';
  } else if (Number.isFinite(aqi)) {
    pct = Math.max(8, Math.min(92, 100 - aqi * 8));
    lab = AQ_LABELS[Math.min(AQ_LABELS.length - 1, Math.floor(aqi))] || '--';
  }

  tx('gauge-pct', Number.isFinite(pm25n) ? `${Math.round(pm25n)}%` : Number.isFinite(pm) ? `${Math.round(pm)}` : '--');
  tx('gauge-lab', lab);
  const arc = document.getElementById('gauge-arc');
  if (arc) arc.setAttribute('stroke-dashoffset', String(327 - (327 * pct) / 100));
}

function renderDashBottom() {
  tx('pm25', fmt(getState(AIR.pm25)?.state, 1));
  tx('pm10', fmt(getState(AIR.pm10)?.state, 1));
  tx('pm25n', fmt(getState(AIR.pm25n)?.state, 0));
  tx('pm10n', fmt(getState(AIR.pm10n)?.state, 0));

  const badge = aqBadge(getState(AIR.index)?.state);
  const waq2 = document.getElementById('waq2');
  if (waq2) waq2.innerHTML = badge.label !== '--' ? `<span class="aqb ${badge.cls}">Indeks PL: ${badge.label}</span>` : '';

  tx('pk-t', fmt(getState(PARCEL.temp)?.state, 1));
  tx('pk-h', fmt(getState(PARCEL.hum)?.state, 0));
  tx('pk-p', fmt(getState(PARCEL.pres)?.state, 0));
  tx('og-t', fmt(getState(GARDEN.temp)?.state, 1));
  tx('og-h', fmt(getState(GARDEN.hum)?.state, 0));
  tx('og-p', fmt(getState(GARDEN.pres)?.state, 0));
}

function renderDashRooms() {
  for (const r of DASH_ROOMS) {
    tx(`rt-${r.key}`, fmt(getState(r.temp)?.state, 1));
    tx(`rh-${r.key}`, fmt(getState(r.hum)?.state, 0));
    const cell = document.getElementById(`rc-${r.key}`);
    const on = getState(r.light)?.state === 'on';
    if (cell) cell.classList.toggle('lit', on);
  }
}

function renderDashEnergy() {
  const total = parseFloat(getState(ENERGY.total)?.state);
  tx('e-now', Number.isFinite(total) ? String(Math.round(total)) : '--');
  const phases = [ENERGY.p1, ENERGY.p2, ENERGY.p3];
  const vals = phases.map((id) => parseFloat(getState(id)?.state) || 0);
  const max = Math.max(1, ...vals);
  phases.forEach((id, i) => {
    tx(`e-pp${i + 1}`, fmt(getState(id)?.state, 0));
    const bar = document.getElementById(`e-b${i + 1}`);
    if (bar) bar.style.width = `${Math.min(100, (vals[i] / max) * 100)}%`;
  });
}

function renderDashFridge() {
  tx('ft2', fmt(getState(FRIDGE.fridge)?.state, 1));
  tx('fzt', fmt(getState(FRIDGE.freezer)?.state, 1));
}

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function renderDashSpotify(cfg) {
  const e = getState(cfg.ha_spotify || cfg.ha_ma);
  if (!e?.attributes) {
    tx('sp-t', 'Nic nie gra');
    tx('sp-a', '—');
    tx('sp-pos', '0:00');
    tx('sp-dur', '0:00');
    return;
  }
  const a = e.attributes;
  tx('sp-t', a.media_title || '—');
  tx('sp-a', a.media_artist || a.media_album_name || '—');
  const art = document.getElementById('sp-art');
  if (art && a.entity_picture) art.style.backgroundImage = `url("${entityPicture(a.entity_picture)}")`;
  const dur = a.media_duration || 0;
  const pos = a.media_position || 0;
  const bar = document.getElementById('sp-pf');
  if (bar) bar.style.width = dur > 0 ? `${(pos / dur) * 100}%` : '0%';
  tx('sp-pos', fmtTime(pos));
  tx('sp-dur', fmtTime(dur));
  const vol = Math.round((a.volume_level || 0) * 100);
  tx('sp-vv', `${vol}%`);
  const vb = document.getElementById('sp-vb');
  if (vb) vb.style.width = `${vol}%`;
  const wave = document.getElementById('sp-wave');
  if (wave) wave.classList.toggle('playing', e.state === 'playing');
  const play = document.getElementById('sp-play');
  if (play) play.textContent = e.state === 'playing' ? '⏸' : '▶';
}

function renderDashGates() {
  for (const g of GATES) {
    const st = getState(g.id)?.state;
    const el = document.getElementById(`ss-${g.key}`);
    const card = document.getElementById(`sc-${g.key}`);
    if (el) el.textContent = st === 'on' ? g.onLabel : g.offLabel;
    if (card) card.classList.toggle('on', st === 'on');
  }
}

async function loadRunToday() {
  const body = document.getElementById('run-body');
  if (!body || runBusy) return;
  const now = Date.now();
  if (now - runLast < 15 * 60 * 1000 && body.dataset.loaded) return;
  runBusy = true;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const data = await fetchCalendar(RUN_CAL, start, end);
    runLast = Date.now();
    body.dataset.loaded = '1';
    const dateEl = document.getElementById('run-date');
    if (dateEl) dateEl.textContent = start.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
    if (!data?.length) {
      body.innerHTML = '<div class="run-empty">Brak treningu dziś</div>';
      return;
    }
    body.innerHTML = data.slice(0, 3).map((ev) => {
      const sum = esc(ev.summary || ev.title || 'Bieg');
      const st = ev.start?.dateTime || ev.start?.date || '';
      const t = st ? new Date(String(st).replace(' ', 'T')).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="run-ev"><span class="run-sum">${sum}</span>${t ? `<span class="run-time">${t}</span>` : ''}</div>`;
    }).join('');
  } catch {
    if (!body.dataset.loaded) body.innerHTML = '<div class="run-empty">Plan niedostępny</div>';
  } finally {
    runBusy = false;
  }
}
