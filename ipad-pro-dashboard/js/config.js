export const BUILD = '1.1.0';

export const CFG_KEYS = [
  'ha_url', 'ha_token', 'ha_spotify', 'ha_ma', 'ha_cams', 'ha_cam_labels', 'ha_cam_mode',
  'ha_scene_eve', 'ha_scene_leave', 'ha_scene_off', 'ha_motion', 'theme', 'accent'
];

const DEFAULTS = {
  ha_spotify: 'media_player.spotify_marcin_solowiow',
  ha_ma: '',
  ha_cams: 'camera.front,camera.tyl',
  ha_cam_labels: 'camera.front:Front,camera.tyl:Tyl',
  ha_cam_mode: 'auto',
  ha_scene_eve: '',
  ha_scene_leave: '',
  ha_scene_off: '',
  ha_motion: 'binary_sensor.hobeian_zg_204z',
  theme: 'dark',
  accent: 'emerald'
};

export function loadConfig() {
  const cfg = { ...DEFAULTS };
  for (const k of CFG_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null && v !== '') cfg[k] = v;
  }
  return cfg;
}

export function saveConfig(partial) {
  for (const [k, v] of Object.entries(partial)) {
    if (v == null || v === '') localStorage.removeItem(k);
    else localStorage.setItem(k, String(v));
  }
}

export function exportConfig() {
  const o = {};
  for (const k of CFG_KEYS) {
    const v = localStorage.getItem(k);
    if (v) o[k] = v;
  }
  const blob = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ipad-pro-panel-config.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function cameraList(cfg) {
  return (cfg.ha_cams || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const ROOMS = {
  salon: {
    label: 'Salon',
    lights: [
      { id: 'light.swiatlo_salon_swiatlo', name: 'Salon 1' },
      { id: 'light.swiatlo_salon_swiatlo_2', name: 'Salon 2' },
      { id: 'light.swiatlo_salon_swiatlo_3', name: 'Salon 3' },
      { id: 'light.led_salon_okno', name: 'LED okno' },
      { id: 'light.led_tv_2', name: 'LED TV' }
    ]
  },
  sypialnia: {
    label: 'Sypialnia',
    lights: [{ id: 'light.swiatlo_sypialnia_swiatlo', name: 'Sypialnia' }]
  },
  kuchnia: {
    label: 'Kuchnia',
    lights: [
      { id: 'light.swiatlo_kuchnia_swiatlo_2', name: 'Blat' },
      { id: 'light.swiatlo_kuchnia_swiatlo_3', name: 'Sufit' },
      { id: 'light.led_kuchnia', name: 'LED' },
      { id: 'light.led_kuchnia_i', name: 'LED i' }
    ]
  },
  lazienki: {
    label: 'Łazienki',
    lights: [
      { id: 'light.lazienka_gora_swiatlo_swiatlo', name: 'Góra 1' },
      { id: 'light.swiatlo_lazienka_swiatlo', name: 'Parter' }
    ]
  },
  ogrod: {
    label: 'Ogród',
    lights: [{ id: 'light.wiatrolap_gorne_swiatlo', name: 'Wiatrołap' }]
  }
};

export const SCENES = [
  { key: 'ha_scene_eve', label: 'Wieczór', icon: '🌅' },
  { key: 'ha_scene_leave', label: 'Wychodzę', icon: '🚪' },
  { key: 'ha_scene_off', label: 'Wyłącz', icon: '🌙' }
];

export const WEATHER = 'weather.forecast_dom';

export const ENERGY = {
  p1: 'sensor.zamel_mew_01_electricity_meter_power_active_phase_1',
  p2: 'sensor.zamel_mew_01_electricity_meter_power_active_phase_2',
  p3: 'sensor.zamel_mew_01_electricity_meter_power_active_phase_3',
  total: 'sensor.zamel_mew_01_electricity_meter_total_forward_active_energy'
};

export const CAM_MODES = [
  { id: 'auto', label: 'Auto (WebRTC→HLS→MJPEG)' },
  { id: 'webrtc', label: 'WebRTC 4K' },
  { id: '4k', label: 'HLS HD/4K' },
  { id: 'mjpeg', label: 'MJPEG' }
];
