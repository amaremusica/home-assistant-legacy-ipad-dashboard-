/** Home Assistant REST + WebSocket */
let cfg = null;
let ws = null;
let wsId = 1;
let pending = new Map();
const states = new Map();
const listeners = new Set();

export function getStates() {
  return states;
}

export function getState(id) {
  return states.get(id);
}

export function onStates(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(states);
}

export function initHa(config) {
  cfg = config;
}

/** URL HA z poprawnym portem (np. :8123) gdy zapisany bez niego */
export function getHaOrigin() {
  let url = (cfg?.ha_url || '').trim().replace(/\/$/, '');
  if (!url && typeof window !== 'undefined' && window.location.pathname.includes('/local/')) {
    return window.location.origin;
  }
  if (url && typeof window !== 'undefined') {
    try {
      const page = new URL(window.location.href);
      const ha = new URL(url.includes('://') ? url : `${page.protocol}//${url}`);
      if (ha.hostname === page.hostname) {
        if (page.port && !ha.port) ha.port = page.port;
        return ha.origin;
      }
    } catch {
      /* ignore */
    }
  }
  return url;
}

function base() {
  return getHaOrigin();
}

function headers() {
  return {
    Authorization: `Bearer ${cfg.ha_token}`,
    'Content-Type': 'application/json'
  };
}

export async function apiGet(path) {
  const r = await fetch(`${base()}/api/${path}`, { headers: headers() });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function callService(domain, service, data = {}) {
  const r = await fetch(`${base()}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(String(r.status));
  try {
    return await r.json();
  } catch {
    return null;
  }
}

export async function fetchStates(filterIds) {
  const q = filterIds?.length ? `?filter_entity_id=${filterIds.join(',')}` : '';
  const list = await apiGet(`states${q}`);
  for (const e of list) states.set(e.entity_id, e);
  emit();
  return list;
}

export function wsSend(msg) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('ws'));
      return;
    }
    const id = wsId++;
    msg.id = id;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}

export function connectWebSocket() {
  return new Promise((resolve, reject) => {
    if (ws) {
      try { ws.close(); } catch { /* ignore */ }
    }
    const url = base().replace(/^http/, 'ws') + '/api/websocket';
    ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: cfg.ha_token }));
        return;
      }
      if (msg.type === 'auth_ok') {
        ws.send(JSON.stringify({ id: wsId++, type: 'subscribe_events', event_type: 'state_changed' }));
        resolve();
        return;
      }
      if (msg.type === 'auth_invalid') {
        reject(new Error('auth'));
        return;
      }
      if (msg.type === 'event' && msg.event?.data?.entity_id) {
        const e = msg.event.data.new_state;
        if (e) {
          states.set(e.entity_id, e);
          emit();
        }
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.success === false) rej(new Error(msg.error?.message || 'ws err'));
        else res(msg.result);
      }
    };
    ws.onerror = () => reject(new Error('ws'));
    ws.onclose = () => {
      setTimeout(() => connectWebSocket().catch(() => {}), 5000);
    };
  });
}

export async function browseMedia(entityId, mediaContentType = '', mediaContentId = '') {
  return wsSend({
    type: 'media_player/browse_media',
    entity_id: entityId,
    media_content_type: mediaContentType,
    media_content_id: mediaContentId
  });
}

export async function maSearch(query) {
  return callService('music_assistant', 'search', { name: query, limit: 20, media_type: 'all' });
}

export function getBase() {
  return base();
}

export function cameraSnapshotUrl(entityId, width, height) {
  let extra = '';
  if (width && height) extra += `&width=${width}&height=${height}`;
  return `${base()}/api/camera_proxy/${entityId}?token=${encodeURIComponent(cfg.ha_token)}${extra}&_=${Date.now()}`;
}

export function cameraStreamUrl(entityId) {
  return `${base()}/api/camera_proxy_stream/${entityId}?token=${encodeURIComponent(cfg.ha_token)}`;
}

export function entityPicture(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return base() + path;
}

export async function checkVersion() {
  try {
    const r = await fetch(`${base()}/local/ipad-pro/version.json?nocache=${Date.now()}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.version || null;
  } catch {
    return null;
  }
}

export async function triggerPanelUpdate() {
  try {
    await callService('shell_command', 'update_ipad_pro_panel', {});
    return;
  } catch {
    /* fallback dla starej konfiguracji */
  }
  try {
    await callService('shell_command2', 'update_ipad_pro_panel', {});
  } catch {
    throw new Error('shell_command');
  }
}
