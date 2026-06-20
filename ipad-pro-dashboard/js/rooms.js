/** Widoki pokoi — światła + czujniki + dodatki jak legacy iPad */
import { getState, callService } from './ha.js?v=1.2.0';
import { ROOMS, TV, BEDS, LAUNDRY, K1C } from './config.js?v=1.2.0';
import { esc } from './ui.js?v=1.2.0';

function fmt(v, d = 1) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(d) : '--';
}

export function renderRoomTabs(activeRoom, onSelect) {
  const el = document.getElementById('room-tabs');
  if (!el) return;
  el.innerHTML = Object.entries(ROOMS)
    .map(([k, r]) => `<button type="button" class="room-tab${k === activeRoom ? ' active' : ''}" data-room="${k}">${esc(r.label)}</button>`)
    .join('');
  el.querySelectorAll('.room-tab').forEach((tab) => {
    tab.addEventListener('click', () => onSelect(tab.dataset.room));
  });
}

export function renderRoomView(roomKey) {
  const container = document.getElementById('room-grid');
  const extra = document.getElementById('room-extra');
  const room = ROOMS[roomKey];
  if (!container || !room) return;

  container.innerHTML = room.lights.map((l) => {
    const st = getState(l.id)?.state || 'off';
    const on = st === 'on';
    return `<button type="button" class="light-tile tile${on ? ' on' : ''}" data-light="${esc(l.id)}">
      <div>💡</div>
      <div class="name">${esc(l.name)}</div>
      <div class="state">${on ? 'on' : 'off'}</div>
    </button>`;
  }).join('');

  container.querySelectorAll('.light-tile').forEach((tile) => {
    tile.addEventListener('click', () => toggleLight(tile.dataset.light, tile));
  });

  let extraHtml = '';
  if (room.sensors?.length) {
    extraHtml += '<div class="room-sensors tile">';
    for (const s of room.sensors) {
      const val = getState(s.id)?.state;
      extraHtml += `<div class="rs"><span class="rs-l">${esc(s.label)}</span><b>${esc(fmt(val, s.dec ?? 1))}${s.unit || ''}</b></div>`;
    }
    extraHtml += '</div>';
  }

  if (roomKey === 'salon' && TV) {
    const tv = getState(TV);
    const a = tv?.attributes || {};
    extraHtml += `<div class="room-media tile">
      <div class="rm-h">📺 TV</div>
      <div class="rm-t">${esc(a.media_title || tv?.state || '—')}</div>
      <div class="rm-ctrl">
        <button type="button" data-tv="prev">⏮</button>
        <button type="button" data-tv="pp">${tv?.state === 'playing' ? '⏸' : '▶'}</button>
        <button type="button" data-tv="next">⏭</button>
      </div>
    </div>`;
  }

  if (roomKey === 'sypialnia' && BEDS?.length) {
    extraHtml += '<div class="room-beds">';
    for (const b of BEDS) {
      const on = getState(b.id)?.state === 'on';
      extraHtml += `<button type="button" class="bed-tile tile${on ? ' on' : ''}" data-bed="${esc(b.id)}">
        <span>${esc(b.icon || '🛏️')}</span><span>${esc(b.name)}</span><span class="bed-st">${on ? 'ON' : 'OFF'}</span>
      </button>`;
    }
    extraHtml += '</div>';
  }

  if (roomKey === 'kuchnia') {
    extraHtml += `<div class="room-sensors tile">
      <div class="rs"><span class="rs-l">Lodówka</span><b>${fmt(getState('sensor.lodowka_fridge_temperature')?.state, 1)}°</b></div>
      <div class="rs"><span class="rs-l">Zamrażarka</span><b>${fmt(getState('sensor.lodowka_freezer_temperature')?.state, 1)}°</b></div>
    </div>`;
  }

  if (roomKey === 'lazienka_dol' && LAUNDRY) {
    extraHtml += `<div class="room-sensors tile">
      <div class="rs"><span class="rs-l">Pralka</span><b>${esc(getState(LAUNDRY.washer)?.state || '--')}</b></div>
      <div class="rs"><span class="rs-l">Suszarka</span><b>${esc(getState(LAUNDRY.dryer)?.state || '--')}</b></div>
    </div>`;
  }

  if (extra) {
    extra.innerHTML = extraHtml;
    extra.querySelectorAll('[data-tv]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.tv;
        const svc = act === 'pp' ? (getState(TV)?.state === 'playing' ? 'media_pause' : 'media_play') : act === 'prev' ? 'media_previous_track' : 'media_next_track';
        callService('media_player', svc, { entity_id: TV });
      });
    });
    extra.querySelectorAll('[data-bed]').forEach((btn) => {
      btn.addEventListener('click', () => toggleSwitch(btn.dataset.bed, btn));
    });
  }
}

async function toggleLight(id, tile) {
  const on = getState(id)?.state === 'on';
  const domain = id.startsWith('switch.') ? 'switch' : 'light';
  tile.classList.toggle('on', !on);
  tile.querySelector('.state').textContent = on ? 'off' : 'on';
  await callService(domain, on ? 'turn_off' : 'turn_on', { entity_id: id });
}

async function toggleSwitch(id, btn) {
  const on = getState(id)?.state === 'on';
  btn.classList.toggle('on', !on);
  await callService('switch', on ? 'turn_off' : 'turn_on', { entity_id: id });
}

export function renderEnergyView() {
  const el = document.getElementById('energy-page');
  if (!el) return;
  const ids = [
    ['total', 'sensor.pobor_mocy_3_fazy', 'W'],
    ['p1', 'sensor.zamel_mew_01_electricity_meter_power_active_phase_1', 'W'],
    ['p2', 'sensor.zamel_mew_01_electricity_meter_power_active_phase_2', 'W'],
    ['p3', 'sensor.zamel_mew_01_electricity_meter_power_active_phase_3', 'W'],
    ['v1', 'sensor.zamel_mew_01_electricity_meter_voltage_phase_1', 'V'],
    ['v2', 'sensor.zamel_mew_01_electricity_meter_voltage_phase_2', 'V'],
    ['v3', 'sensor.zamel_mew_01_electricity_meter_voltage_phase_3', 'V'],
    ['kwh', 'sensor.zamel_mew_01_electricity_meter_total_forward_active_energy', 'kWh']
  ];
  el.innerHTML = ids.map(([k, id, u]) => {
    const v = getState(id)?.state;
    return `<div class="en-tile tile"><span>${k.toUpperCase()}</span><b>${fmt(v, k === 'kwh' ? 2 : 0)}</b><small>${u}</small></div>`;
  }).join('');
}

export function renderK1cView() {
  const el = document.getElementById('k1c-page');
  if (!el) return;
  const st = getState(K1C.status)?.state || '--';
  const prog = getState(K1C.progress)?.state || '--';
  el.innerHTML = `
    <div class="k1c-card tile">
      <div class="k1c-st">${esc(st)}</div>
      <div class="k1c-prog">${esc(prog)}%</div>
      <div class="k1c-ctrl">
        <button type="button" class="btn ghost" data-k1c="pause">⏸ Pauza</button>
        <button type="button" class="btn ghost" data-k1c="resume">▶ Wznów</button>
        <button type="button" class="btn ghost" data-k1c="stop">⏹ Stop</button>
      </div>
    </div>`;
  el.querySelectorAll('[data-k1c]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const map = { pause: 'button.k1c_creality_pause_print', resume: 'button.k1c_creality_resume_print', stop: 'button.k1c_creality_stop_print' };
      callService('button', 'press', { entity_id: map[btn.dataset.k1c] });
    });
  });
}
