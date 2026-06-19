/** Auto-aktualizacja panelu iPad Pro z GitHub przez HA */
import { BUILD } from './config.js';
import { initHa, checkVersion, triggerPanelUpdate } from './ha.js';

const GIT_PULL_MS = 30 * 60 * 1000;
const CHECK_MS = 2 * 60 * 1000;
const COPY_WAIT_MS = 6500;
const LS_PULL = 'ipad_pro_git_pull_ts';

export function verParts(v) {
  const p = String(v || '0').replace(/^v/i, '').split('.');
  return [0, 1, 2].map((i) => parseInt(p[i], 10) || 0);
}

export function verCmp(a, b) {
  const pa = verParts(a);
  const pb = verParts(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function panelUrl(haUrl, version) {
  const base = (haUrl || '').replace(/\/$/, '');
  return `${base}/local/ipad-pro/index.html?v=${version || BUILD}&_=${Date.now()}`;
}

export function reloadPanel(haUrl, version) {
  window.location.href = panelUrl(haUrl, version);
}

function markGitPull() {
  localStorage.setItem(LS_PULL, String(Date.now()));
}

function shouldGitPull() {
  const last = parseInt(localStorage.getItem(LS_PULL) || '0', 10);
  return Date.now() - last >= GIT_PULL_MS;
}

function setVerLabel(text) {
  const el = document.getElementById('ver');
  if (el) el.textContent = text;
}

async function waitForCopy() {
  await new Promise((r) => setTimeout(r, COPY_WAIT_MS));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

const RELOAD_GUARD_MS = 15000;

function canReload() {
  const last = parseInt(sessionStorage.getItem('ipad_pro_upd_ts') || '0', 10);
  return Date.now() - last >= RELOAD_GUARD_MS;
}

function markReload() {
  sessionStorage.setItem('ipad_pro_upd_ts', String(Date.now()));
}

export async function autoUpdateOnRefresh(cfg) {
  if (!cfg?.ha_url || !cfg?.ha_token || !canReload()) return false;
  initHa(cfg);
  try {
    markGitPull();
    await withTimeout(triggerPanelUpdate(), 12000);
  } catch {
    return false;
  }
  await waitForCopy();
  const remote = await checkVersion();
  if (remote && verCmp(remote, BUILD) > 0 && canReload()) {
    markReload();
    reloadPanel(cfg.ha_url, remote);
    return true;
  }
  return false;
}

/** Ręczny ↺ lub okresowe sprawdzenie w tle */
export async function runPanelUpdate(cfg, { forcePull = false } = {}) {
  if (!cfg?.ha_url || !cfg?.ha_token) return null;
  initHa(cfg);
  if (forcePull || shouldGitPull()) {
    setVerLabel('⏳ Git…');
    markGitPull();
    try {
      await withTimeout(triggerPanelUpdate(), 12000);
    } catch {
      setVerLabel('v' + BUILD);
      throw new Error('shell_command');
    }
    setVerLabel('⏳');
    await waitForCopy();
  }
  const remote = await checkVersion();
  if (remote && verCmp(remote, BUILD) > 0 && canReload()) {
    markReload();
    reloadPanel(cfg.ha_url, remote);
    return remote;
  }
  setVerLabel('v' + BUILD);
  return null;
}

export function startAutoUpdate(cfg) {
  setInterval(async () => {
    if (document.hidden || !cfg?.ha_url || !cfg?.ha_token) return;
    try {
      await runPanelUpdate(cfg, { forcePull: false });
    } catch {
      /* brak shell_command — ignoruj w tle */
    }
  }, CHECK_MS);
}
