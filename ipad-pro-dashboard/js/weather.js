import { getState, callService } from './ha.js?v=1.1.3';
import { WEATHER } from './config.js?v=1.1.3';
import { esc } from './ui.js?v=1.1.3';

const ICONS = {
  'clear-night': '🌙', cloudy: '☁️', exceptional: '⚠️', fog: '🌫️', hail: '🌨️',
  lightning: '⛈️', 'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️',
  rainy: '🌧️', snowy: '❄️', 'snowy-rainy': '🌨️', sunny: '☀️', windy: '💨'
};

export async function loadForecast() {
  try {
    const resp = await callService('weather', 'get_forecasts', {
      entity_id: WEATHER,
      type: 'daily'
    });
    const key = Object.keys(resp || {})[0];
    return resp?.[key]?.forecast || resp?.forecast || [];
  } catch {
    const w = getState(WEATHER);
    return w?.attributes?.forecast || [];
  }
}

export async function renderWeatherPage() {
  const hero = document.getElementById('weather-hero');
  const daily = document.getElementById('weather-daily');
  if (!hero || !daily) return;

  const w = getState(WEATHER);
  if (!w) {
    hero.innerHTML = '<p class="muted">Brak danych pogody</p>';
    return;
  }
  const a = w.attributes || {};
  const icon = ICONS[w.state] || '🌤️';
  hero.innerHTML = `
    <div class="wh-left anim-in">
      <div class="wh-icon">${icon}</div>
      <div>
        <div class="wh-temp">${a.temperature != null ? Math.round(a.temperature) : '--'}°</div>
        <div class="wh-cond">${esc(w.state)}</div>
        <div class="wh-feels">Odczuwalna ${a.apparent_temperature != null ? Math.round(a.apparent_temperature) : '--'}° · wilg. ${a.humidity ?? '--'}%</div>
      </div>
    </div>
    <div class="wh-stats anim-in delay-1">
      <div class="wh-stat glass"><span>Wiatr</span><b>${a.wind_speed ?? '--'} km/h</b></div>
      <div class="wh-stat glass"><span>Ciśnienie</span><b>${a.pressure ?? '--'} hPa</b></div>
    </div>`;

  daily.innerHTML = '<p class="muted">Ładowanie prognozy…</p>';
  const forecast = await loadForecast();
  if (!forecast.length) {
    daily.innerHTML = '<p class="muted">Brak prognozy</p>';
    return;
  }
  daily.innerHTML = forecast.slice(0, 7).map((d, i) => {
    const day = d.datetime ? new Date(d.datetime).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }) : `D${i + 1}`;
    const ic = ICONS[d.condition] || '🌤️';
    return `<div class="wd-row glass anim-in delay-${Math.min(i + 1, 4)}">
      <span class="wd-d">${esc(day)}</span>
      <span class="wd-i">${ic}</span>
      <span class="wd-p">${d.precipitation ?? 0} mm</span>
      <div class="wd-bar"><i style="left:${d.templow ?? 0}%;right:${100 - (d.temperature ?? 20)}%"></i></div>
      <span class="wd-lo">${d.templow != null ? Math.round(d.templow) : '--'}°</span>
      <span class="wd-hi">${d.temperature != null ? Math.round(d.temperature) : '--'}°</span>
    </div>`;
  }).join('');
}

export function renderHomeWeather() {
  const w = getState(WEATHER);
  if (!w) return;
  const a = w.attributes || {};
  document.getElementById('w-temp').textContent = a.temperature != null ? Math.round(a.temperature) : '--';
  document.getElementById('w-cond').textContent = w.state || '—';
  const feels = a.apparent_temperature ?? a.temperature;
  document.getElementById('w-feels').textContent = `Odczuwalna ${feels != null ? Math.round(feels) : '--'}°`;
  const iconEl = document.getElementById('w-icon');
  if (iconEl) iconEl.textContent = ICONS[w.state] || '🌤️';
}
