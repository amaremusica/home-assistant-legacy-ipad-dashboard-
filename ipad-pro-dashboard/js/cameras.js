/**
 * Kamery iPad Pro — MJPEG na kafelkach (jak legacy iPad), WebRTC/HLS w modalu
 */
import { wsSend, cameraSnapshotUrl, cameraStreamUrl, getState, getBase } from './ha.js';

const QUALITY = { full: { w: 3840, h: 2160 } };
const MJPEG_TIMEOUT = 18000;

let activePlayer = null;
let pinchState = null;
const camLive = new Map();
const camTimers = new Map();

export function camSnapshot(entityId, tier = 'grid') {
  if (tier === 'full') {
    const q = QUALITY.full;
    return cameraSnapshotUrl(entityId, q.w, q.h);
  }
  return camSnapUrl(entityId);
}

export function camSnapUrl(entityId) {
  const ent = getState(entityId);
  const pic = ent?.attributes?.entity_picture;
  if (pic) {
    const base = pic.startsWith('http') ? pic : getBase() + pic;
    return base + (base.includes('?') ? '&' : '?') + '_=' + Date.now();
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
  for (const part of raw.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const i = p.indexOf(':');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    else out[p] = p;
  }
  return out;
}

function clearCamTimer(entityId) {
  const t = camTimers.get(entityId);
  if (t) {
    clearTimeout(t);
    camTimers.delete(entityId);
  }
}

function setCamErr(img, on) {
  img.classList.toggle('cam-err', on);
}

function isImgLive(img, entityId) {
  const mode = camLive.get(entityId);
  if ((mode === 'mjpeg' || mode === 'snap') && img.naturalWidth > 0) return true;
  return img.naturalWidth > 0 && !!img.getAttribute('src');
}

function snapRefresh(img, entityId, force) {
  if (!force && camLive.get(entityId) === 'mjpeg' && img.naturalWidth > 0) return;
  const url = camSnapUrl(entityId);
  if (!url) return;
  const pre = new Image();
  pre.onload = () => {
    if (document.hidden) return;
    if (!force && camLive.get(entityId) === 'mjpeg' && img.naturalWidth > 0) return;
    img.src = url;
    setCamErr(img, false);
    camLive.set(entityId, 'snap');
  };
  pre.onerror = () => setCamErr(img, true);
  pre.src = url;
}

function startMjpeg(img, entityId) {
  if (document.hidden) return;
  if (camLive.get(entityId) === 'mjpeg' && img.naturalWidth > 0) return;
  const url = cameraStreamUrl(entityId);
  if (!url) return;
  if (camLive.get(entityId) === 'mjpeg' && img.getAttribute('src') === url && img.naturalWidth > 0) return;

  clearCamTimer(entityId);
  camTimers.set(
    entityId,
    setTimeout(() => {
      camTimers.delete(entityId);
      if (camLive.get(entityId) === 'mjpeg' && img.naturalWidth > 0) return;
      snapRefresh(img, entityId, true);
    }, MJPEG_TIMEOUT)
  );

  img.onerror = () => {
    clearCamTimer(entityId);
    img.onerror = null;
    if (camLive.get(entityId) !== 'mjpeg') snapRefresh(img, entityId, true);
  };
  img.onload = () => {
    clearCamTimer(entityId);
    setCamErr(img, false);
    camLive.set(entityId, 'mjpeg');
  };
  img.src = url;
  camLive.set(entityId, 'mjpeg');
}

function startCardStream(img, entityId) {
  if (isImgLive(img, entityId)) return;
  snapRefresh(img, entityId, false);
  setTimeout(() => {
    if (document.hidden || isImgLive(img, entityId)) return;
    startMjpeg(img, entityId);
  }, 350);
}

export function attachCamStreams(root) {
  if (!root || document.hidden) return;
  root.querySelectorAll('.cam-card[data-cam]').forEach((card) => {
    const entityId = card.dataset.cam;
    const img = card.querySelector('.cam-thumb');
    if (!entityId || !img) return;
    if (isImgLive(img, entityId)) return;
    startCardStream(img, entityId);
  });
}

export function stopCamStreams() {
  camTimers.forEach((t) => clearTimeout(t));
  camTimers.clear();
  document.querySelectorAll('.cam-thumb').forEach((img) => {
    img.onload = null;
    img.onerror = null;
  });
  camLive.clear();
}

export function resumeCamStreams() {
  attachCamStreams(document.getElementById('cam-preview'));
  const grid = document.getElementById('cam-grid');
  if (grid?.offsetParent) attachCamStreams(grid);
}

export function camCardHtml(entityId, cfg) {
  const label = camLabel(entityId, cfg);
  return `<article class="cam-card anim-card" data-cam="${entityId}">
    <div class="cam-viewport">
      <img class="cam-thumb" alt="" decoding="async">
      <span class="cam-live"><i></i>LIVE</span>
    </div>
    <span class="label">${label}</span>
  </article>`;
}

export function bindCamCards(root, onOpen) {
  root.querySelectorAll('.cam-card').forEach((card) => {
    card.addEventListener('click', () => onOpen(card.dataset.cam));
  });
}

class CameraPlayer {
  constructor(entityId, videoEl, statusEl) {
    this.entityId = entityId;
    this.video = videoEl;
    this.statusEl = statusEl;
    this.pc = null;
    this.mode = 'idle';
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  async start(preferred = 'auto') {
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
    const ent = getState(this.entityId);
    const fst = ent?.attributes?.frontend_stream_type;
    if (fst === 'hls') return false;

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
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

      const result = await wsSend({
        type: 'camera/webrtc/offer',
        entity_id: this.entityId,
        offer: offer.sdp
      });

      if (!result?.answer) throw new Error('no answer');
      await pc.setRemoteDescription({ type: 'answer', sdp: result.answer });
      this.pc = pc;
      this.mode = 'webrtc';
      this.setStatus('WebRTC · 4K');
      return true;
    } catch {
      if (this.pc) this.pc.close();
      this.pc = null;
      return false;
    }
  }

  async tryHls() {
    try {
      const result = await wsSend({
        type: 'camera/stream',
        entity_id: this.entityId,
        format: 'hls'
      });
      const path = result?.url || result?.path;
      if (!path) return false;
      const full = path.startsWith('http') ? path : getBase() + (path.startsWith('/') ? path : `/${path}`);
      this.video.srcObject = null;
      this.video.src = full;
      await this.video.play();
      this.mode = 'hls';
      this.setStatus('HLS · HD/4K');
      return true;
    } catch {
      return false;
    }
  }

  startMjpeg() {
    this.video.srcObject = null;
    this.video.src = cameraStreamUrl(this.entityId);
    this.video.play().catch(() => {});
    this.mode = 'mjpeg';
    this.setStatus('MJPEG · stream');
  }

  async stop() {
    if (this.pc) {
      try { this.pc.close(); } catch { /* ignore */ }
      this.pc = null;
    }
    this.video.srcObject = null;
    this.video.removeAttribute('src');
    this.video.load();
    this.mode = 'idle';
  }
}

export async function openCameraModal(entityId, cfg) {
  const dlg = document.getElementById('cam-modal');
  const video = document.getElementById('cam-video');
  const snap = document.getElementById('cam-snap');
  const label = document.getElementById('cam-modal-label');
  const status = document.getElementById('cam-modal-status');
  const viewport = document.getElementById('cam-viewport');
  const quality = cfg.ha_cam_mode || 'auto';

  if (activePlayer) await activePlayer.stop();
  label.textContent = camLabel(entityId, cfg);
  video.hidden = false;
  snap.hidden = true;
  snap.src = camSnapshot(entityId, 'full');
  viewport.style.transform = 'scale(1)';

  activePlayer = new CameraPlayer(entityId, video, status);
  dlg.showModal();
  dlg.classList.add('open');

  await activePlayer.start(quality);
}

export async function closeCameraModal() {
  const dlg = document.getElementById('cam-modal');
  const video = document.getElementById('cam-video');
  if (activePlayer) await activePlayer.stop();
  activePlayer = null;
  video.srcObject = null;
  video.removeAttribute('src');
  dlg.classList.remove('open');
  dlg.close();
}

export function bindCameraModal(cfg) {
  document.getElementById('cam-close')?.addEventListener('click', closeCameraModal);
  document.getElementById('cam-mode-webrtc')?.addEventListener('click', async () => {
    if (activePlayer) await activePlayer.start('webrtc');
  });
  document.getElementById('cam-mode-hls')?.addEventListener('click', async () => {
    if (activePlayer) await activePlayer.start('4k');
  });
  document.getElementById('cam-mode-mjpeg')?.addEventListener('click', async () => {
    if (activePlayer) await activePlayer.start('mjpeg');
  });

  const viewport = document.getElementById('cam-viewport');
  if (!viewport) return;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinchState = {
        d: Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        ),
        scale: getViewportScale(viewport)
      };
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!pinchState || e.touches.length !== 2) return;
    const d = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );
    const scale = Math.min(3, Math.max(1, pinchState.scale * (d / pinchState.d)));
    viewport.style.transform = `scale(${scale})`;
  }, { passive: true });

  viewport.addEventListener('touchend', () => { pinchState = null; });
}

function getViewportScale(el) {
  const m = (el.style.transform || '').match(/scale\(([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}
