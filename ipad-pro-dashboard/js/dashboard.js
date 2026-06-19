/** Ekran Dom — układ 3 kolumny jak legacy iPad, nowoczesny styl */
import { getState, callService, entityPicture } from './ha.js?v=1.1.4';
import { WEATHER, ENERGY, AIR, SCENES, DASH_ROOMS, GATES, FRIDGE } from './config.js?v=1.1.4';
import { esc } from './ui.js?v=1.1.4';

const WICON = {
  'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️', lightning: '⛈️',
  'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️', rainy: '🌧️',
  snowy: '❄️', sunny: '☀️', windy: '💨', exceptional: '⚠️', 'snowy-rainy': '🌨️'
};

const AQ_LABELS = ['Bardzo dobry', 'Dobry', 'Umiarkowany', 'Dostateczny', 'Zły', 'Bardzo zły'];

function fmt(v, d = 1) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? (d ? n.toFixed(d) : String(Math.round(n))) : '--';
}

function tx(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

export function initDashboard(cfg, onScene, onRoomLight, onGate) {
  const rooms = document.getElementById('dash-rooms');
  if (rooms && !rooms.dataset.ready) {
    rooms.innerHTML = DASH_ROOMS.map((r) => `
      <div class="rcell glass" data-room="${r.key}" id="rc-${r.key}">
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
      return `<button type="button" class="scenebtn" data-scene="${esc(id)}" ${id ? '' : 'disabled'}>${s.icon} ${s.label}</button>`;
    }).join('');
    scenes.querySelectorAll('.scenebtn').forEach((btn) => {
      btn.addEventListener('click', () => onScene(btn.dataset.scene));
    });
    scenes.dataset.ready = '1';
  }

  const gates = document.getElementById('dash-gates');
  if (gates && !gates.dataset.ready) {
    gates.innerHTML = GATES.map((g) => `
      <button type="button" class="statecard glass ${g.cls}" data-switch="${esc(g.id)}" id="sc-${g.key}">
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
  renderDashAir();
  renderDashRooms();
  renderDashEnergy();
  renderDashFridge();
  renderDashSpotify(cfg);
  renderDashGates();
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
  if (icon) icon.textContent = WICON[w.state] || '🌤️';
  const sun = a.sunrise && a.sunset
    ? `☀️ ${new Date(a.sunrise).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} · 🌙 ${new Date(a.sunset).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    : '';
  tx('wd-sun', sun);
}

function renderDashAir() {
  const pm = parseFloat(getState(AIR.pm25)?.state);
  const aqi = parseFloat(getState(AIR.index)?.state);
  let pct = 50;
  let lab = '--';
  if (Number.isFinite(pm)) {
    pct = Math.max(8, Math.min(92, 100 - pm * 4));
    lab = pm <= 13 ? 'Bardzo dobry' : pm <= 25 ? 'Dobry' : pm <= 50 ? 'Umiarkowany' : 'Słaby';
  } else if (Number.isFinite(aqi)) {
    pct = Math.max(8, Math.min(92, 100 - aqi * 8));
    lab = AQ_LABELS[Math.min(AQ_LABELS.length - 1, Math.floor(aqi))] || '--';
  }
  tx('gauge-pct', Number.isFinite(pm) ? `${Math.round(pm)}` : (Number.isFinite(aqi) ? `${Math.round(aqi * 10)}%` : '--'));
  tx('gauge-lab', lab);
  const arc = document.getElementById('gauge-arc');
  if (arc) arc.setAttribute('stroke-dashoffset', String(327 - (327 * pct) / 100));
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

function renderDashSpotify(cfg) {
  const e = getState(cfg.ha_spotify || cfg.ha_ma);
  if (!e?.attributes) {
    tx('sp-t', 'Nic nie gra');
    tx('sp-a', '—');
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
