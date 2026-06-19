/**
 * Kamery — płynny MJPEG na kafelkach (EZVIZ), WebRTC/HLS w modalu
 */
import { wsSend, cameraSnapshotUrl, cameraStreamUrl, getState, getBase } from './ha.js?v=1.1.5';

const QUALITY = { full: { w: 3840, h: 2160 } };

let activePlayer = null;
let pinchState = null;
const camLive = new Map();

export function camSnapshot(entityId, tier = 'grid') {
  if (tier === 'full') {
    const q = QUALITY.full;
    return cameraSnapshotUrl(entityId, q.w, q.h);
  }
  return cameraSnapshotUrl(entityId);
}

export function camLabel(entityId, cfg) {
  const map = parseCamLabels(cfg?.ha_cam_labels);
  return map[entityId] || entityId.split('.').pop().replace(/_/g, ' ');
}

function parseCamLabels(raw) {
  const out = {};
  if (!raw) return out;
  for (const part of (raw || '').split(',')) {
    const p = part.trim();
    if (!p) continue;
    const i = p.indexOf(':');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    else out[p] = p;
  }
  return out;
}

function streamUrl(entityId) {
  return cameraStreamUrl(entityId);
}

function isLive(entityId, img) {
  return camLive.get(entityId) === 'mjpeg' && img?.src && img.naturalWidth > 0;
}

function startMjpegOnCard(card, entityId) {
  if (document.hidden || !entityId) return;
  const img = card.querySelector('.cam-stream');
  if (!img) return;
  const url = streamUrl(entityId);
  if (!url) return;
  if (isLive(entityId, img) && img.src.startsWith(url.split('?')[0])) return;

  const off = card.querySelector('.cam-off');
  img.onload = () => {
    camLive.set(entityId, 'mjpeg');
    img.classList.remove('cam-err');
    if (off) off.style.display = 'none';
  };
  img.onerror = () => {
    if (off) off.style.display = 'flex';
    img.classList.add('cam-err');
  };
  if (img.src !== url) img.src = url;
  else if (img.complete && img.naturalWidth > 0) camLive.set(entityId, 'mjpeg');
}

export function attachCamStreams(root) {
  if (!root || document.hidden) return;
  root.querySelectorAll('[data-cam]').forEach((card) => startMjpegOnCard(card, card.dataset.cam));
}

export function attachDashCam(entityId) {
  const card = document.getElementById('dash-cam');
  if (!card || !entityId) return;
  card.dataset.cam = entityId;
  startMjpegOnCard(card, entityId);
}

export function stopCamStreams() {
  camLive.clear();
}

export function resumeCamStreams() {
  attachCamStreams(document.getElementById('cam-grid'));
  attachCamStreams(document.getElementById('cam-preview'));
  const dash = document.getElementById('dash-cam');
  if (dash?.dataset.cam) startMjpegOnCard(dash, dash.dataset.cam);
}

export function camCardHtml(entityId, cfg, { dash = false } = {}) {
  const label = camLabel(entityId, cfg);
  const cls = dash ? 'camcard glass' : 'cam-card anim-card';
  return `<article class="${cls}" data-cam="${entityId}">
    <div class="cam-viewport">
      <img class="cam-stream" alt="">
      <div class="cam-off">brak obrazu</div>
      <span class="cam-live"><i></i>LIVE</span>
    </div>
    <span class="label">${label}</span>
  </article>`;
}

export function bindCamCards(root, onOpen) {
  root.querySelectorAll('[data-cam]').forEach((card) => {
    card.addEventListener('click', () => onOpen(card.dataset.cam));
  });
}

class CameraPlayer {
  constructor(entityId, videoEl, statusEl) {
    this.entityId = entityId;
    this.video = videoEl;
    this.statusEl = statusEl;
    this.pc = null;
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  async start(preferred = 'mjpeg') {
    await this.stop();
    this.setStatus('Łączenie…');
    if (preferred === 'mjpeg') {
      this.startMjpeg();
      return;
    }
    if ((preferred === 'auto' || preferred === 'webrtc') && (await this.tryWebRtc())) return;
    if ((preferred === 'auto' || preferred === '4k' || preferred === 'hls') && (await this.tryHls())) return;
    this.startMjpeg();
  }

  async tryWebRtc() {
    if (typeof RTCPeerConnection === 'undefined') return false;
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.ontrack = (ev) => {
        this.video.src = '';
        this.video.srcObject = ev.streams[0];
        this.video.play().catch(() => {});
      };
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        wsSend({
          type: 'camera/webrtc/candidate',
          entity_id: this.entityId,
          candidate: ev.candidate.candidate,
          sdp_mid: ev.candidate.sdpMid,
          sdp_m_line_index: ev.candidate.sdpMLineIndex
        }).catch(() => {});
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const result = await wsSend({ type: 'camera/webrtc/offer', entity_id: this.entityId, offer: offer.sdp });
      if (!result?.answer) throw new Error('no answer');
      await pc.setRemoteDescription({ type: 'answer', sdp: result.answer });
      this.pc = pc;
      this.setStatus('WebRTC');
      return true;
    } catch {
      if (this.pc) this.pc.close();
      this.pc = null;
      return false;
    }
  }

  async tryHls() {
    try {
      const result = await wsSend({ type: 'camera/stream', entity_id: this.entityId, format: 'hls' });
      const path = result?.url || result?.path;
      if (!path) return false;
      const full = path.startsWith('http') ? path : getBase() + (path.startsWith('/') ? path : `/${path}`);
      this.video.srcObject = null;
      this.video.src = full;
      await this.video.play();
      this.setStatus('HLS');
      return true;
    } catch {
      return false;
    }
  }

  startMjpeg() {
    this.video.srcObject = null;
    this.video.src = streamUrl(this.entityId);
    this.video.play().catch(() => {});
    this.setStatus('MJPEG · live');
  }

  async stop() {
    if (this.pc) {
      try { this.pc.close(); } catch { /* ignore */ }
      this.pc = null;
    }
    this.video.srcObject = null;
    this.video.removeAttribute('src');
    this.video.load();
  }
}

export async function openCameraModal(entityId, cfg) {
  const dlg = document.getElementById('cam-modal');
  const video = document.getElementById('cam-video');
  const label = document.getElementById('cam-modal-label');
  const status = document.getElementById('cam-modal-status');
  const viewport = document.getElementById('cam-viewport');
  const mode = cfg.ha_cam_mode || 'mjpeg';

  if (activePlayer) await activePlayer.stop();
  label.textContent = camLabel(entityId, cfg);
  viewport.style.transform = 'scale(1)';
  activePlayer = new CameraPlayer(entityId, video, status);
  dlg.showModal();
  dlg.classList.add('open');
  await activePlayer.start(mode);
}

export async function closeCameraModal() {
  const dlg = document.getElementById('cam-modal');
  const video = document.getElementById('cam-video');
  if (activePlayer) await activePlayer.stop();
  activePlayer = null;
  video.removeAttribute('src');
  dlg.classList.remove('open');
  dlg.close();
}

export function bindCameraModal(cfg) {
  document.getElementById('cam-close')?.addEventListener('click', closeCameraModal);
  document.getElementById('cam-mode-webrtc')?.addEventListener('click', () => activePlayer?.start('webrtc'));
  document.getElementById('cam-mode-hls')?.addEventListener('click', () => activePlayer?.start('4k'));
  document.getElementById('cam-mode-mjpeg')?.addEventListener('click', () => activePlayer?.start('mjpeg'));

  const viewport = document.getElementById('cam-viewport');
  if (!viewport) return;
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinchState = {
        d: Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY),
        scale: getViewportScale(viewport)
      };
    }
  }, { passive: true });
  viewport.addEventListener('touchmove', (e) => {
    if (!pinchState || e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    viewport.style.transform = `scale(${Math.min(3, Math.max(1, pinchState.scale * (d / pinchState.d)))})`;
  }, { passive: true });
  viewport.addEventListener('touchend', () => { pinchState = null; });
}

function getViewportScale(el) {
  const m = (el.style.transform || '').match(/scale\(([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}
