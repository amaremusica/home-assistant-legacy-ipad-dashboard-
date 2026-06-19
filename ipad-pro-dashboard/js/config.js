export const BUILD = '1.1.3';

export const CFG_KEYS = [
  'ha_url', 'ha_token', 'ha_spotify', 'ha_ma', 'ha_cams', 'ha_cam_labels', 'ha_cam_mode',
  'ha_scene_eve', 'ha_scene_leave', 'ha_scene_off', 'ha_motion', 'ha_tv', 'theme', 'accent'
];

/** Domyślne encje — zgodne z dashboardem Lovelace użytkownika */
const DEFAULTS = {
  ha_spotify: 'media_player.spotify_marcin_solowiow',
  ha_ma: 'media_player.wolomin',
  ha_cams: 'camera.front,camera.tyl',
  ha_cam_labels: 'camera.front:Front,camera.tyl:Tył',
  ha_cam_mode: 'mjpeg',
  ha_scene_eve: '',
  ha_scene_leave: '',
  ha_scene_off: '',
  ha_motion: 'binary_sensor.czujnik_garderoba',
  ha_tv: 'media_player.samsung_q70aa_85_tv_qe85q70aatxxh',
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
  o._exported = new Date().toISOString();
  const blob = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ipad-pro-panel-config.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Zastosuj obiekt JSON (import pliku lub preset z /local/) */
export function applyConfigObject(o) {
  if (!o || typeof o !== 'object') throw new Error('invalid');
  for (const k of CFG_KEYS) {
    if (o[k] !== undefined && o[k] !== null) saveConfig({ [k]: String(o[k]) });
  }
  return loadConfig();
}

export function importConfigFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        resolve(applyConfigObject(JSON.parse(r.result)));
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(new Error('read'));
    r.readAsText(file);
  });
}

export const PRESET_URL = '/local/ipad-pro/ipad-pro-config.json';

export function cameraList(cfg) {
  return (cfg.ha_cams || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pokoje i encje — z Lovelace YAML */
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
  kuchnia: {
    label: 'Kuchnia',
    lights: [
      { id: 'light.swiatlo_kuchnia_swiatlo_2', name: 'Blat' },
      { id: 'light.swiatlo_kuchnia_swiatlo_3', name: 'Sufit' },
      { id: 'light.led_kuchnia', name: 'LED' },
      { id: 'light.led_kuchnia_i', name: 'LED i' }
    ]
  },
  sypialnia: {
    label: 'Sypialnia',
    lights: [
      { id: 'light.swiatlo_sypialnia_swiatlo', name: 'Sypialnia' },
      { id: 'switch.marcin_sypialnia', name: 'Marcin' },
      { id: 'switch.marzenka_sypialnia', name: 'Marzenka' }
    ]
  },
  lazienka_dol: {
    label: 'Łazienka dół',
    lights: [
      { id: 'light.swiatlo_lazienka_swiatlo', name: 'Łaz. 1' },
      { id: 'light.swiatlo_lazienka_swiatlo_2', name: 'Łaz. 2' },
      { id: 'light.swiatlo_lazienka_swiatlo_3', name: 'Łaz. 3' }
    ]
  },
  lazienka_gora: {
    label: 'Łazienka góra',
    lights: [
      { id: 'light.lazienka_gora_swiatlo_swiatlo', name: 'Góra 1' },
      { id: 'light.lazienka_gora_swiatlo_swiatlo_2', name: 'Góra 2' },
      { id: 'light.lazienka_gora_swiatlo_swiatlo_3', name: 'Góra 3' }
    ]
  },
  wiatrolap: {
    label: 'Wiatrołap',
    lights: [
      { id: 'light.wiatrolap_gorne_swiatlo', name: 'Górne 1' },
      { id: 'light.wiatrolap_gorne_swiatlo_2', name: 'Górne 2' }
    ]
  },
  garderoba: {
    label: 'Garderoba',
    lights: [
      { id: 'light.swiatlo_garderoba_swiatlo', name: 'Garderoba 1' },
      { id: 'light.swiatlo_garderoba_swiatlo_2', name: 'Garderoba 2' },
      { id: 'light.swiatlo_garderoba_swiatlo_3', name: 'Garderoba 3' },
      { id: 'light.swiatlo_szafa', name: 'Szafa' }
    ]
  },
  schody: {
    label: 'Schody',
    lights: [{ id: 'switch.schody_dol', name: 'Schody dół' }]
  },
  ogrod: {
    label: 'Ogród',
    lights: [{ id: 'switch.smart_switch_b78c', name: 'Brama' }]
  }
};

export const SCENES = [
  { key: 'ha_scene_eve', label: 'Wieczór', icon: '🌅' },
  { key: 'ha_scene_leave', label: 'Wychodzę', icon: '🚪' },
  { key: 'ha_scene_off', label: 'Wyłącz', icon: '🌙' }
];

export const WEATHER = 'weather.forecast_dom';
export const SUN = 'sun.sun';

export const ENERGY = {
  p1: 'sensor.zamel_mew_01_electricity_meter_power_active_phase_1',
  p2: 'sensor.zamel_mew_01_electricity_meter_power_active_phase_2',
  p3: 'sensor.zamel_mew_01_electricity_meter_power_active_phase_3',
  total: 'sensor.pobor_mocy_3_fazy',
  v1: 'sensor.zamel_mew_01_electricity_meter_voltage_phase_1',
  v2: 'sensor.zamel_mew_01_electricity_meter_voltage_phase_2',
  v3: 'sensor.zamel_mew_01_electricity_meter_voltage_phase_3',
  kwh: 'sensor.zamel_mew_01_electricity_meter_total_forward_active_energy'
};

export const AIR = {
  index: 'sensor.parcel_locker_wol02bapp_polish_air_quality_index',
  pm25: 'sensor.parcel_locker_wol02bapp_pm_2_5',
  pm10: 'sensor.parcel_locker_wol02bapp_pm_10'
};

export const FRIDGE = {
  fridge: 'sensor.lodowka_fridge_temperature',
  freezer: 'sensor.lodowka_freezer_temperature'
};

/** Pokoje na ekranie Dom (jak legacy iPad) */
export const DASH_ROOMS = [
  { key: 'salon', label: 'Salon', icon: '🛋️', light: 'light.swiatlo_salon_swiatlo', temp: 'sensor.termometr_salon_temperatura', hum: 'sensor.termometr_salon_wilgotnosc' },
  { key: 'syp', label: 'Sypialnia', icon: '🛏️', light: 'light.swiatlo_sypialnia_swiatlo', temp: 'sensor.termometr_sypialnia_temperatura', hum: 'sensor.termometr_sypialnia_wilgotnosc' },
  { key: 'laz', label: 'Łazienka', icon: '🛁', light: 'light.swiatlo_lazienka_swiatlo', temp: 'sensor.termometr_lazienka_temperatura', hum: 'sensor.termometr_lazienka_wilgotnosc' },
  { key: 'gar', label: 'Garderoba', icon: '🧥', light: 'light.swiatlo_garderoba_swiatlo', temp: 'sensor.temperatura_garderoba_temperatura', hum: 'sensor.temperatura_garderoba_wilgotnosc' },
  { key: 'ogr', label: 'Ogród', icon: '🌳', light: 'light.wiatrolap_gorne_swiatlo', temp: 'sensor.termometr_ogrod_temperatura', hum: 'sensor.termometr_ogrod_wilgotnosc' }
];

export const GATES = [
  { key: 'brama', id: 'switch.smart_switch_b78c', label: 'Brama', icon: '🔒', cls: 'sc-rose', onLabel: 'Otwarta', offLabel: 'Zamknięta' },
  { key: 'furtka', id: 'switch.furtka', label: 'Furtka', icon: '🚪', cls: 'sc-emerald', onLabel: 'Otwarta', offLabel: 'Zamknięta' }
];

export const K1C = {
  camera: 'camera.k1c_creality_printer_camera',
  status: 'sensor.k1c_creality_print_status',
  progress: 'sensor.k1c_creality_print_progress'
};

export const MA_SPEAKERS = [
  { id: 'media_player.wolomin', name: 'Wołomin' },
  { id: 'media_player.salon', name: 'Salon' },
  { id: 'media_player.lewy', name: 'Lewy' }
];

export const CAM_MODES = [
  { id: 'auto', label: 'Auto (WebRTC→HLS→MJPEG)' },
  { id: 'webrtc', label: 'WebRTC 4K' },
  { id: '4k', label: 'HLS HD/4K' },
  { id: 'mjpeg', label: 'MJPEG' }
];
