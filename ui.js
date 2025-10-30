// ===== ui.js (clean, without sign picker) =====

// Tiny DOM helper (safe if already defined elsewhere)
window.qs = window.qs || function(sel, root){ return (root||document).querySelector(sel); };

// --- Status helpers (use global normalizeStatus) ---
function statusLabel(s){
  const n = window.normalizeStatus ? window.normalizeStatus(s) : (s||'new');
  return n==='done' ? 'Εκτελέστηκε' : (n==='old' ? 'Παλιά Φθορά' : 'Νέα Φθορά');
}
function statusClass(s){
  const n = window.normalizeStatus ? window.normalizeStatus(s) : (s||'new');
  return n==='done' ? 'status--done' : (n==='old' ? 'status--old' : 'status--new');
}
function statusColor(s){
  const n = window.normalizeStatus ? window.normalizeStatus(s) : (s||'new');
  // Colors match app.css badges
  return n==='done' ? '#22c55e' : (n==='old' ? '#fde047' : '#fb923c');
}

// Category emoji (for marker label to match bottom buttons)
function categoryEmoji(cat){
  const map = {
    'Πινακίδες':'🛑',
    'Ασφαλτικά':'🛣️',
    'Ρείθρα':'🧹',
    'Βλάστηση':'🌿',
    'Στηθαία':'🛡️',
    'Κιγκλιδώματα':'🚧',
    'Διαγραμμίσεις':'➖',
    'Δέντρα':'🌳',
    'Φωτιστικά':'💡',
    'Γενικά Προβλήματα':'⚠️'
  };
  return map[cat] || '•';
}

// Visual defaults per category (fallback bg+label)
function categoryVisual(cat){
  const map = {
    'Πινακίδες':         { bg:'#ef4444', label:'🛑' },
    'Ασφαλτικά':         { bg:'#f59e0b', label:'🛣️' },
    'Ρείθρα':            { bg:'#06b6d4', label:'🧹' },
    'Βλάστηση':          { bg:'#16a34a', label:'🌿' },
    'Στηθαία':           { bg:'#8b5cf6', label:'🛡️' },
    'Κιγκλιδώματα':      { bg:'#0ea5e9', label:'🚧' },
    'Διαγραμμίσεις':     { bg:'#334155', label:'➖' },
    'Δέντρα':            { bg:'#22c55e', label:'🌳' },
    'Φωτιστικά':         { bg:'#f97316', label:'💡' },
    'Γενικά Προβλήματα': { bg:'#111827', label:'⚠️' }
  };
  return map[cat] || { bg:'#475569', label:'•' };
}


// --- Marker settings defaults (extended) ---
window.markerSettings = window.markerSettings || {};
if (!('labelMode' in window.markerSettings)) window.markerSettings.labelMode = 'hover'; // off | hover | permanent
if (!('hiddenCats' in window.markerSettings)) window.markerSettings.hiddenCats = new Set();
if (!('hiddenStatuses' in window.markerSettings)) window.markerSettings.hiddenStatuses = new Set();
if (!('hiddenGroups' in window.markerSettings)) window.markerSettings.hiddenGroups = new Set();

// SVG generator for custom icons
function svgIconHTML({ shape, size, bg, label, opacity=1 }) {
  const s = Math.max(18, +size || 26);
  const font = Math.round(s * 0.46);
  const textY = shape === 'pin' ? Math.round(s * 0.58) : Math.round(s * 0.62);

  const defs = `
    <defs>
      <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>`;

  const CIRCLE = `
    <circle cx="${s/2}" cy="${s/2}" r="${(s/2)-2}" fill="${bg}" fill-opacity="${opacity}"
            stroke="#fff" stroke-width="2" filter="url(#softShadow)"/>`;

  const SQUARE = `
    <rect x="2" y="2" rx="${Math.max(4, Math.round(s*0.18))}" ry="${Math.max(4, Math.round(s*0.18))}"
          width="${s-4}" height="${s-4}" fill="${bg}" fill-opacity="${opacity}"
          stroke="#fff" stroke-width="2" filter="url(#softShadow)"/>`;

  const pinH = Math.round(s*1.28);
  const pinBodyR = (s/2)-2;
  const pinCX = s/2;
  const pinCY = pinBodyR + 2;
  const PIN = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${pinH}" viewBox="0 0 ${s} ${pinH}">
      ${defs}
      <path d="
        M ${pinCX} 2
        a ${pinBodyR} ${pinBodyR} 0 1 1 0 ${pinBodyR*2}
        a ${pinBodyR} ${pinBodyR} 0 1 1 0 -${pinBodyR*2}
        Z
      " fill="${bg}" fill-opacity="${opacity}" stroke="#fff" stroke-width="2" filter="url(#softShadow)"/>
      <path d="M ${pinCX} ${pinCY + pinBodyR - 2} L ${pinCX} ${pinH - 3}" stroke="${bg}" stroke-width="${Math.max(2, Math.round(s*0.08))}" stroke-linecap="round" opacity="${opacity}"/>
      <g text-anchor="middle" dominant-baseline="central" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
         font-weight="800" font-size="${font}" fill="#fff">
        <text x="${pinCX}" y="${Math.round(pinCY + 0)}">${label || ''}</text>
      </g>
    </svg>`;

  const DIAMOND = `
    <polygon points="
      ${s/2},2
      ${s-2},${s/2}
      ${s/2},${s-2}
      2,${s/2}
    "
    fill="${bg}" fill-opacity="${opacity}" stroke="#fff" stroke-width="2" filter="url(#softShadow)"/>`;

  const openSVG  = (w=s, h=s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  const closeSVG = `</svg>`;

  if (shape === 'pin') return PIN;

  const BODY =
    (shape === 'square') ? SQUARE :
    (shape === 'diamond') ? DIAMOND :
    CIRCLE;

  const TEXT = `
    <g text-anchor="middle" dominant-baseline="central" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
       font-weight="800" font-size="${font}" fill="#fff">
      <text x="${s/2}" y="${textY}">${label || ''}</text>
    </g>`;

  return openSVG() + defs + BODY + TEXT + closeSVG;
}

// Build popup HTML (used by core.js)
function buildPopupHTML(r){
  const hasPhoto = !!r.photo;
  const img = hasPhoto ? `<img class="card__media" src="${r.photo}" alt="Φωτογραφία καταγραφής" loading="lazy" onerror="this.remove()">` : '';
  const sign = r.signCode ? `<div class="label">Πινακίδα:</div><div class="value">${r.signCode}</div>` : '';
  const dir  = r.directionText ? `<div class="label">Κατεύθυνση:</div><div class="value">${r.directionText}</div>` : '';

  const lat = Number(r.lat), lng = Number(r.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const latStr = hasCoords ? lat.toFixed(6) : '-';
  const lngStr = hasCoords ? lng.toFixed(6) : '-';

  const actions = hasCoords ? `
    <div class="actions">
      <button class="btn-small" data-action="copy" data-copy="${latStr},${lngStr}">Αντιγραφή συντεταγμένων</button>
      <a class="btn-small" target="_blank" rel="noopener noreferrer" href="https://maps.google.com/?q=${lat},${lng}">Άνοιγμα σε Google Maps</a>
    </div>` : '';

  const sNow = window.normalizeStatus ? window.normalizeStatus(r.status) : (r.status || 'new');

  return `
  <div class="card">
    ${img}
    <div class="card__body">
      <div class="title">${r.seqLabel || r.category}</div>
      <div class="grid">
        ${dir}
        <div class="label">Ποσότητα:</div><div class="value">${r.quantity||'-'}</div>
        <div class="label">Κλάδος:</div><div class="value">${r.side||'-'}</div>
        <div class="label">Δ.Π.Π.:</div><div class="value">${r.dpp||'-'}</div>
        ${sign}
        <div class="label">Περιγραφή:</div><div class="value">${r.description||'-'}</div>

        <div class="label">Κατάσταση:</div>
        <div class="value">
          <span class="badge-status ${statusClass(sNow)}">${statusLabel(sNow)}</span>
          <div class="status-chooser" style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="status-pill status--new ${sNow==='new'?'is-active':''}"  data-status="new"  title="Νέα Φθορά">● Νέα</button>
            <button type="button" class="status-pill status--old ${sNow==='old'?'is-active':''}"  data-status="old"  title="Παλιά Φθορά">● Παλιά</button>
            <button type="button" class="status-pill status--done ${sNow==='done'?'is-active':''}" data-status="done" title="Εκτελέστηκε">● Εκτελέστηκε</button>
          </div>
        </div>

        <div class="label">Ημ/νία:</div><div class="value">${r.date||''}</div>
        <div class="label">Ώρα:</div><div class="value">${r.time||''}</div>
        <div class="label">Lat:</div><div class="value">${latStr}</div>
        <div class="label">Lng:</div><div class="value">${lngStr}</div>
      </div>
    </div>
    ${actions}
    <div class="popup-actions" style="margin:8px 12px 10px; display:flex; justify-content:flex-end;">
      <button type="button" class="btn-delete">🗑️ Διαγραφή</button>
    </div>
  </div>`;
}

// Marker icon/label/drag application
function applyMarkerIcon(m){
  const r = m?.options?.data || {};
  const base = categoryVisual(r.category);
  const bg = statusColor((window.normalizeStatus ? window.normalizeStatus(r.status) : (r.status || 'new'))) || base.bg;
  const label = categoryEmoji(r.category) || base.label;
  const size = (window.markerSettings && window.markerSettings.size) || 26;
  const shape = (window.markerSettings && window.markerSettings.shape) || 'circle';

  const html = svgIconHTML({
    shape,
    size,
    bg,
    label,
    opacity: (window.markerSettings && window.markerSettings.opacity) || 1
  });

  const iconSize   = (shape === 'pin') ? [size, Math.round(size*1.28)] : [size, size];
  const iconAnchor = (shape === 'pin')
    ? [Math.round(size/2), iconSize[1]-2]
    : [Math.round(size/2), Math.round(size/2)];

  const icon = L.divIcon({
    className: 'cat-pin',
    html,
    iconSize,
    iconAnchor
  });

  m.setIcon(icon);
}

function applyLabelMode(m){
  if (!m) return;
  const text = (m.options?.data?.seqLabel || m.options?.data?.category || '');
  const mode = (window.markerSettings && window.markerSettings.labelMode) || 'hover';
  // Unbind any previous tooltip first
  if (m.unbindTooltip) { try { m.unbindTooltip(); } catch(e){} }
  if (mode === 'permanent') {
    m.bindTooltip && m.bindTooltip(text, { permanent:true, direction:'right' });
  } else if (mode === 'hover') {
    m.bindTooltip && m.bindTooltip(text); // Leaflet default: on hover
  } // off => no tooltip
}

function applyDragMode(m){
  try {
    const allow = !!(window.markerSettings && window.markerSettings.allowDrag);
    if (allow) { m.dragging && m.dragging.enable && m.dragging.enable(); }
    else       { m.dragging && m.dragging.disable && m.dragging.disable(); }
  } catch(e){ console.warn('applyDragMode failed', e); }
}

function applyMarkerSettings(m){
  if (!m) return;
  try { applyMarkerIcon(m); } catch(e){ console.warn(e); }
  try { applyLabelMode(m); } catch(e){ console.warn(e); }
  try { applyDragMode(m); } catch(e){ console.warn(e); }
  try { if (typeof applyVisibility==='function') applyVisibility(m); } catch(e){}
}

function applyAllSettingsToAllMarkers(){
  // 1) Markers (όπως πριν)
  (window.damageMarkers || []).forEach(applyMarkerSettings);

  // 2) ✅ Polylines: απόκρυψη/εμφάνιση ανά group
  try{
    const hiddenGr = window.markerSettings?.hiddenGroups || new Set();
    (window.routeItems || []).forEach(pl=>{
      const d = pl?.options?.data || {};
      const grpTop = String(d.group||'').split(/\s*\/\s*/)[0].trim();
      const hide = hiddenGr.has(grpTop);

      if (hide) {
        if (pl._map) { try { pl.remove(); } catch{} }
      } else {
        if (!pl._map) { try { (window.routeLayer || window.map).addLayer(pl); } catch{} }
      }
    });
  }catch(e){ console.warn('applyAllSettingsToAllMarkers (routes) failed', e); }
}
window.applyAllSettingsToAllMarkers = applyAllSettingsToAllMarkers;


// Undo modal stubs (core may call closeUndoModal)
function openUndoModal(){ try{ qs('#undoModal')?.classList.add('show'); } catch{} }
function closeUndoModal(){ try{ qs('#undoModal')?.classList.remove('show'); } catch{} }
window.openUndoModal = openUndoModal;
window.closeUndoModal = closeUndoModal;

// --- Camera helpers (compressed capture) ---
// cameraStream / isCameraPreviewOpen / currentPhotoSnapshot are in core.js

async function ensureCamera(){
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
}
window.ensureCamera = ensureCamera;

// ui.js — SAFE camera button handler
async function onCameraButton(){
  const video = qs('#cameraPreview');
  const btn   = qs('#btnCamera');
  if (!video || !btn) return;

  const setBtnText = (label) => {
    // Προσπάθησε να βρεις .label ή span, αλλιώς γράψε ολόκληρο το κείμενο
    const span = btn.querySelector('.label') || btn.querySelector('span');
    if (span) { span.textContent = ' ' + label; }
    else { btn.textContent = '📸 ' + label; }
  };

  if (!window.cameraStream) {
    try {
      window.cameraStream = await ensureCamera();
      video.srcObject = window.cameraStream;
    } catch(e){
      alert('Δεν ήταν δυνατή η πρόσβαση στην κάμερα');
      return;
    }
  }

  if (!window.isCameraPreviewOpen) {
    video.style.display = 'block';
    window.isCameraPreviewOpen = true;
    setBtnText('Τράβηξε φωτογραφία');
    return;
  }

  const canvas = qs('#snapshotCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !video.videoWidth || !video.videoHeight) {
    alert('Αποτυχία λήψης από κάμερα');
    return;
  }

  const maxW = 900;
  const scale = Math.min(1, maxW / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  window.currentPhotoSnapshot = canvas.toDataURL('image/jpeg', 0.5);

  const prev = qs('#photoPreview');
  if (prev) prev.innerHTML = '<img src="'+window.currentPhotoSnapshot+'" style="max-width:160px; border-radius:8px;">';
  const msg = qs('#noPhotoMsg'); if (msg) msg.style.display = 'none';

  video.style.display = 'none';
  window.isCameraPreviewOpen = false;
  setBtnText('Λήψη φωτογραφίας');
}
window.onCameraButton = onCameraButton;


function closeCameraPreview() {
  const video = document.getElementById('cameraPreview');
  if (window.cameraStream) {
    window.cameraStream.getTracks().forEach(track => track.stop());
    window.cameraStream = null;
  }
  if (video) video.style.display = 'none';
  window.isCameraPreviewOpen = false;
}
window.closeCameraPreview = closeCameraPreview;

function toggleMarkerPopup(force){
  const el = document.getElementById('markerPopup');
  if(!el) return;
  if(typeof force === 'boolean'){ el.classList.toggle('show', !!force); }
  else { el.classList.toggle('show'); }
}
window.toggleMarkerPopup = window.toggleMarkerPopup || toggleMarkerPopup;

function setLayerChecked(layer, on){
  if(!layer) return;
  try {
    const inMap = !!layer._map;
    if(on && !inMap){
      if (window.map) layer.addTo(window.map);
      else if (window.markerLayer && window.markerLayer._map) layer.addTo(window.markerLayer._map);
      else layer.addTo(window.map || window.markerLayer?._map);
    } else if (!on && inMap){
      layer.remove();
    }
  } catch (e) { console.warn('setLayerChecked failed', e); }
}
window.setLayerChecked = window.setLayerChecked || setLayerChecked;

function applyPresetStreet(){
  try {
    const bl = window.baseLayers || {};
    setLayerChecked(bl.esriImagery,   false);
    setLayerChecked(bl.nasaTrueColor, false);
    setLayerChecked(bl.cartoLabels,   false);
    setLayerChecked(bl.openTopo,      false);
    setLayerChecked(bl.esriTopo,      false);
    setLayerChecked(bl.hillshade,     false);
    setLayerChecked(bl.osm,           true);
  } catch(e){ console.warn('applyPresetStreet', e); }
}
window.applyPresetStreet = window.applyPresetStreet || applyPresetStreet;

function applySessionCustomLabelToButton(){
  const btn = document.getElementById('btnCustomCat');
  if (!btn) return;
  const labelEl = btn.querySelector('.label') || btn;
  let lbl = '';
  try { lbl = localStorage.getItem('sessionCustomCategoryLabel') || ''; } catch {}
  labelEl.textContent = lbl || 'Όρισε όνομα';
}
window.applySessionCustomLabelToButton = window.applySessionCustomLabelToButton || applySessionCustomLabelToButton;
function resetCustomNameToDefault(){
  try { localStorage.removeItem('sessionCustomCategoryLabel'); } catch {}
  // ανανέωσε το κείμενο στο κουμπί
  try { window.applySessionCustomLabelToButton?.(); } catch {}
}
window.resetCustomNameToDefault = window.resetCustomNameToDefault || resetCustomNameToDefault;

function closeDamageModal(){
  document.getElementById('damageModal')?.classList.remove('show');
}
window.closeDamageModal = window.closeDamageModal || closeDamageModal;
// ——— Damage modal: ESC + click-outside close (ασφαλές με camera preview) ———
// ——— Damage modal: ESC + click-outside close (ασφαλές με camera preview) ———
(function attachDamageModalDismiss(){
  const modal = document.getElementById('damageModal');
  if (!modal) return;

  const isOpen = () => modal.classList.contains('show');

  // ESC για κλείσιμο (δεν διακόπτει ενεργό preview κάμερας)
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && isOpen() && !window.isCameraPreviewOpen) {
      try { window.closeDamageModal?.(); } catch {}
    }
  });

  // click-outside για κλείσιμο (μόνο αν δεν τραβάς κάμερα)
  modal.addEventListener('click', (e)=>{
    if (!isOpen() || window.isCameraPreviewOpen) return;
    const content = modal.querySelector('.modal-content');
    if (content && !content.contains(e.target)) {
      try { window.closeDamageModal?.(); } catch {}
    }
  });
})();

// --- Unified Work Modal (single input) ---
(function attachWorkModal(){
  const m = document.getElementById('workModal');
  if (!m || m._wired) return; m._wired = true;

  // Tabs & panels
  const tabCont = m.querySelector('#tab-continue');
  const tabNew  = m.querySelector('#tab-new');
  const pCont   = m.querySelector('#panel-continue');
  const pNew    = m.querySelector('#panel-new');

  // Buttons & fields
  const btnOk      = m.querySelector('#btnWorkOk');
  const btnCancel  = m.querySelector('#btnWorkCancel');
  const btnCont    = m.querySelector('#btnContinueWork');
  const lastInfo   = m.querySelector('#lastSessionInfo');
  const routeInput = m.querySelector('#routeDirection'); // ΜΟΝΟ ένα input

  function setTab(which){
  const isCont = which === 'continue';
  tabCont?.classList.toggle('is-active', isCont);
  tabNew ?.classList.toggle('is-active', !isCont);
  if (pCont) pCont.hidden = !isCont;
  if (pNew)  pNew.hidden  =  isCont;
  (isCont ? btnCont : routeInput)?.focus();

  if (isCont){
    try {
      window.loadFromLocal?.();
      const lastRoute = localStorage.getItem('routeDirection') || '';
      const inp = document.getElementById('routeDirection');
      if (inp && !inp.value) inp.value = lastRoute;
    } catch(e) {
      console.warn('Continue/loadFromLocal:', e);
    }
  }
}



function loadLastSessionInfo(){
  let route='–', cnt=0, when='—';
  try { route = localStorage.getItem('routeDirection') || '–'; } catch {}
  try { cnt   = (window.damageMarkers||[]).length || 0; } catch {}
  try { when  = localStorage.getItem('lastSessionDate') || '—'; } catch {}
  if (lastInfo) lastInfo.textContent = `Κατεύθυνση: ${route} · Σημεία: ${cnt} · Ημ/νία: ${when}`;
}

btnOk?.addEventListener('click', ()=>{
  // Αν είμαστε στο tab "Νέα"
  if (!pNew.hidden){
    const dir = (routeInput?.value || '').trim();
    if (!dir){ routeInput?.focus(); return; }
    try {
      localStorage.setItem('routeDirection', dir);
      const rec = JSON.parse(localStorage.getItem('recentRoutes')||'[]');
      if (!rec.includes(dir)) rec.unshift(dir);
      localStorage.setItem('recentRoutes', JSON.stringify(rec.slice(0,20)));
    } catch {}

    // 🔴 ΝΕΟ: Καθάρισε markers και localStorage (ξεκίνα καθαρά)
    try { resetAll?.(); } catch(e){ console.warn('resetAll failed', e); }

    // 🔴 ΝΕΟ: Επαναφορά κουμπιού "Όρισε όνομα" στο default
    const btn = document.getElementById('btnCustomCat');
    if (btn){
      btn.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${window.CUSTOM_BTN_DEFAULT}`;
    }
  }

  closeWorkModal();
});



  btnCancel?.addEventListener('click', closeWorkModal);
  btnCont  ?.addEventListener('click', ()=> { closeWorkModal(); });

  tabCont?.addEventListener('click', ()=> setTab('continue'));
  tabNew ?.addEventListener('click', ()=> setTab('new'));

  m.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') { e.preventDefault(); btnOk?.click(); }
    if (e.key === 'Escape'){ e.preventDefault(); closeWorkModal(); }
  });

  function openWorkModal(pref='auto'){
    loadLastSessionInfo();
    const hasPrev = !!localStorage.getItem('routeDirection');
    setTab(pref==='auto' ? (hasPrev?'continue':'new') : pref);
    m.classList.add('show');
    m.querySelector('.modal-content')?.focus();
  }
  function closeWorkModal(){ m.classList.remove('show'); }

  window.openWorkModal  = openWorkModal;
  window.closeWorkModal = closeWorkModal;
})();


// === Category-specific form scenarios (fields shown, labels, description pills, focus) ===
const CATEGORY_FORMS = {
  'Πινακίδες': {
    show: ['quantity','side','priority','sign','description','status','photo'],
    rename: { quantity: 'Τεμάχια' },
    descPills: ['Με φθορά','Βαμμένη','Κεκλιμένη','Γυρισμένη','Πτώση','Στρέβλωση ιστού','Στρέβλωση ιστού κ πινακίδας'],
    focus: 'description'
  },
'Ασφαλτικά': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Μήκος (m)' },
  descPills: ['Καθίζηση','Ρωγμές αλιγάτορα','Ριγματώσεις','Λακκούβα'],
  focus: 'quantity',                         // (προαιρετικά άστο όπως είναι)
  quantitySelect: { min: 10, max: 500, step: 10 } // scroll list 10..500 ανά 10
},


  'Ρείθρα': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Μήκος (m)' },
  quantitySelect: { min: 50, max: 500, step: 50 },
  focus: 'quantity'
},

  'Βλάστηση': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Μήκος (m)' },
  quantitySelect: { min: 50, max: 500, step: 50 },
  focus: 'quantity'
},

  'Στηθαία': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Τεμάχια' },
  quantitySelect: { min: 1, max: 50, step: 1 },
  descPills: ['Ελλιπή','Στρέβλωση','Πτώση'],
  focus: 'quantity'
},


  'Κιγκλιδώματα': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Τεμάχια' },
  quantitySelect: { min: 1, max: 50, step: 1 },
  descPills: ['Σκουριά','Σπάσιμο','Πτώση'], // παράδειγμα: εδώ κρατάς ό,τι έχει ήδη
  focus: 'quantity'
},

 'Διαγραμμίσεις': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Μήκος (m)' },
  quantitySelect: { min: 100, max: 1000, step: 100 },
  descPills: ['Οριογραμμές','Άξονας','Διάβαση','Οριογραμμές κ Άξονας'],
  focus: 'quantity'
},

  'Δέντρα': {
  show: ['quantity','height','side','priority','description','status','photo'],
  rename: { 
    quantity: 'Τεμάχια',
    height: 'Ύψος'
  },
  quantitySelect: { min: 1, max: 50, step: 1 },
  heightSelect: { options: ['4–8μ', '8–12μ', '12+μ'] },
  focus: 'quantity'
},

 'Φωτιστικά': {
  show: ['quantity','side','priority','description','status','photo'],
  rename: { quantity: 'Τεμάχια' },
  quantitySelect: { min: 1, max: 10, step: 1 },
  descPills: ['Λειτουργεί','Δεν λειτουργεί','Πεσμένο φωτιστικό','Γυρισμένο','Κεκλιμένο','Στρέβλωση','Ελλειπή φωτιστικό'],
  focus: 'quantity'
},

  'Γενικά Προβλήματα': {
    show: ['quantity','side','priority','description','status','photo'],
    descPills: ['Καθαριότητα','Εμπόδιο','Επικινδυνότητα'],
    focus: 'description'
  }
};

// Βοηθός: μετονομασία label ενός input (ψάχνει <label for="...">)
function setLabelText(forId, text){
  if (!text) return;
  const lab = document.querySelector(`label[for="${forId}"]`);
  if (lab) lab.textContent = text;
}

// --- Render damage form (single definition; uses ONLY the global #cameraPreview in index.html) ---
function renderDamageForm(category){
  // Γέμισμα κατηγορίας (safe text)
  const catEl = document.getElementById('dmCategory');
  if (catEl) catEl.textContent = String(category || '');

  // Reset πεδίων (χωρίς να αλλάξουμε IDs)
  const q      = document.getElementById('quantity');
  const h      = document.getElementById('height');     // <-- ΝΕΟ: ύψος
  const side   = document.getElementById('side');
  const pr     = document.getElementById('priority');
  const sign   = document.getElementById('signCode');
  const desc   = document.getElementById('description');
  const st     = document.getElementById('status');

  if (q)    { q.value = ''; }
  if (h)    { h.value = ''; }        // <-- reset ύψους
  if (side) { side.value = ''; }
  if (pr)   { pr.value = ''; }
  if (sign) { sign.value = ''; }
  if (desc) { desc.value = ''; }
  if (st && !st.value) { st.value = 'new'; }

  // Φωτογραφίες (καθάρισμα preview/μηνύματος)
  const pv = document.getElementById('photoPreview');
  const noMsg = document.getElementById('noPhotoMsg');
  if (pv) pv.innerHTML = '';
  if (noMsg) noMsg.style.display = '';

  // --- ΕΦΑΡΜΟΓΗ ΣΕΝΑΡΙΟΥ ΑΝΑ ΚΑΤΗΓΟΡΙΑ (fields, labels, desc pills, quantity/height controls, focus) ---
  try {
    const cfg = (CATEGORY_FORMS && CATEGORY_FORMS[String(category) || 'Πινακίδες']) || null;

    if (cfg) {
      // 1) Εμφάνιση/απόκρυψη rows
      const rowMap = {
        quantity:    document.getElementById('quantity')?.closest('.dm-row') || document.getElementById('quantity')?.closest('.dm-field'),
        height:      document.getElementById('height')?.closest('.dm-row')   || document.getElementById('height')?.closest('.dm-field'), // <-- ΝΕΟ
        side:        document.getElementById('side')?.closest('.dm-row')     || document.getElementById('side')?.closest('.dm-field'),
        priority:    document.getElementById('priority')?.closest('.dm-row') || document.getElementById('priority')?.closest('.dm-field'),
        sign:        document.getElementById('dmRowSign'), // ειδικό row για Πινακίδες
        description: document.getElementById('description')?.closest('.dm-row') || document.getElementById('description')?.closest('.dm-field'),
        status:      document.getElementById('status')?.closest('.dm-row')   || document.getElementById('status')?.closest('.dm-field'),
        photo:       document.querySelector('.dm-row--photo') || document.getElementById('photoPreview')?.closest('.dm-row')
      };
      Object.entries(rowMap).forEach(([key, row])=>{
        if (!row) return;
        row.style.display = (Array.isArray(cfg.show) && cfg.show.includes(key)) ? '' : 'none';
      });

      // 2) Μετονομασίες labels (π.χ. Ποσότητα -> Μήκος (m), Ύψος -> Ύψος)
      if (cfg.rename && cfg.rename.quantity) setLabelText?.('quantity', cfg.rename.quantity);
      if (cfg.rename && cfg.rename.height)   setLabelText?.('height',   cfg.rename.height);   // <-- ΝΕΟ

      // 3) Pills Περιγραφής ανά κατηγορία
      const descPills = document.getElementById('descPills');
      if (descPills){
        descPills.innerHTML = '';
        (cfg.descPills || []).forEach(val=>{
          const b = document.createElement('button');
          b.className = 'pill';
          b.type = 'button';
          b.setAttribute('data-val', val);
          b.textContent = val;
          descPills.appendChild(b);
        });
      }

      // 4a) Quantity ως SELECT (scroll list) όπου ορίζεται quantitySelect
      (function applyQuantityControl(){
        const field = document.getElementById('quantity')?.closest('.dm-field') 
                   || document.getElementById('quantity')?.closest('.dm-row');
        if (!field) return;

        const cfgHasSelect = !!(cfg.quantitySelect);
        let qtyEl = document.getElementById('quantity');

        function replaceWith(tagName){
          const newEl = document.createElement(tagName);
          newEl.id = 'quantity';
          newEl.name = qtyEl?.name || 'quantity';
          if (qtyEl) qtyEl.replaceWith(newEl); else field.appendChild(newEl);
          return newEl;
        }

        if (cfgHasSelect) {
          // Βεβαιώσου ότι είναι <select>
          if (!qtyEl || qtyEl.tagName !== 'SELECT') {
            qtyEl = replaceWith('select');
          }
          const {min, max, step} = cfg.quantitySelect;
          qtyEl.innerHTML = '';
          for (let v=min; v<=max; v+=step){
            const opt = document.createElement('option');
            opt.value = String(v);
            opt.textContent = String(v);
            qtyEl.appendChild(opt);
          }
          qtyEl.value = String(min);
        } else {
          // Επαναφορά σε input type=number για λοιπές κατηγορίες
          if (!qtyEl || qtyEl.tagName !== 'INPUT') {
            qtyEl = replaceWith('input');
          }
          qtyEl.type = 'number';
          qtyEl.step = '1';
          qtyEl.min = '0';
        }
      })();

      // 4b) Height ως SELECT (scroll list) όπου ορίζεται heightSelect (π.χ. Δέντρα)
      (function applyHeightControl(){
        const hEl  = document.getElementById('height');
        const hRow = hEl ? hEl.closest('.dm-row') : null;
        if (!hEl || !hRow) return;

        if (cfg.heightSelect && Array.isArray(cfg.heightSelect.options)) {
          hEl.innerHTML = '';
          cfg.heightSelect.options.forEach(val=>{
            const opt = document.createElement('option');
            opt.value = String(val);
            opt.textContent = String(val);
            hEl.appendChild(opt);
          });
          // default στην 1η επιλογή
          if (cfg.heightSelect.options.length > 0) {
            hEl.value = String(cfg.heightSelect.options[0]);
          }
        } else {
          // Αν δεν έχει οριστεί για την κατηγορία, άφησε ένα κενό option
          hEl.innerHTML = '<option value="">—</option>';
        }
      })();

      // 5) Focus preference για αργότερα
      window.__nextDamageFocus = cfg.focus || 'description';
    } else {
      // fallback αν δεν υπάρχει CATEGORY_FORMS
      window.__nextDamageFocus = (String(category||'') === 'Πινακίδες') ? 'description' : 'quantity';
    }
  } catch(e){ console.warn('category scenario failed', e); }

  // --- ΠΟΣΟΤΗΤΑ: pills ΜΟΝΟ για «Πινακίδες» (force-hide αλλού, force-show το quantity) ---
  try {
    const isSigns = String(category || '') === 'Πινακίδες';
    const qtyEl = document.getElementById('quantity');
    const qtyField = qtyEl ? qtyEl.closest('.dm-field') : null;
    const qtyRow = (qtyEl?.closest('.dm-row')) || (qtyField?.closest('.dm-row')) || null;

    const qtyPills = document.getElementById('qtyPills');
    const qtyPillsRow = qtyPills ? (qtyPills.closest('.dm-row') || qtyPills.parentElement) : null;

    if (qtyField && qtyPills) {
      if (isSigns) {
        // Δείξε μόνο pills για Πινακίδες
        if (qtyRow) qtyRow.style.display = '';         // σειρά ποσότητας δεν μας νοιάζει (το πεδίο θα είναι hidden)
        qtyField.style.display = 'none';               // κρύψε το input/select ποσότητας
        qtyEl && (qtyEl.style.display = 'none');       // extra ασφάλεια

        qtyPills.hidden = false;
        qtyPills.style.display = '';
        if (qtyPillsRow) qtyPillsRow.style.display = '';

        // default ενεργοποίηση pill
        const active = qtyPills.querySelector('.pill.is-active');
        const def = active || qtyPills.querySelector('.pill[data-val="1"]') || qtyPills.querySelector('.pill');
        if (def) { def.click(); try { def.focus(); } catch {} }
      } else {
        // Για ΟΛΕΣ τις άλλες κατηγορίες (π.χ. Ασφαλτικά):
        // 1) Κρύψε ΟΛΟ το block pills
        qtyPills.hidden = true;
        qtyPills.style.display = 'none';
        if (qtyPillsRow) qtyPillsRow.style.display = 'none';
        qtyPills.querySelectorAll('.pill.is-active').forEach(b=> b.classList.remove('is-active'));

        // 2) ΔΕΙΞΕ ρητά το πεδίο ποσότητας και τη σειρά του
        if (qtyRow) qtyRow.style.display = '';
        if (qtyField) qtyField.style.display = '';
        if (qtyEl) {
          qtyEl.hidden = false;
          qtyEl.style.display = '';
        }
      }
    }
  } catch(e){ console.warn('quantity pills toggle failed', e); }

  // --- ΚΑΤΑΣΤΑΣΗ: κρύβουμε το <select id="status"> και δείχνουμε χρωματιστά pills που το ενημερώνουν
  try {
    const stSel = document.getElementById('status');  // <select id="status">
    if (stSel) {
      let stPills = document.getElementById('statusPills');
      if (!stPills) {
        const field = stSel.closest('.dm-field');
        stPills = document.createElement('div');
        stPills.id = 'statusPills';
        stPills.className = 'pill-group';
        const defs = [
          { val: 'new',  label: 'Νέα',          cls: 'status-pill status--new'  },
          { val: 'old',  label: 'Υφιστάμενη',   cls: 'status-pill status--old'  },
          { val: 'done', label: 'Ολοκληρωμένη', cls: 'status-pill status--done' },
        ];
        defs.forEach(d => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `pill ${d.cls}`;
          b.setAttribute('data-val', d.val);
          b.textContent = d.label;
          stPills.appendChild(b);
        });
        if (field) field.appendChild(stPills);
      }
      stSel.style.display = 'none';
      stPills.hidden = false;
      const currentVal = stSel.value || 'new';
      stPills.querySelectorAll('.pill').forEach(b=> b.classList.remove('is-active'));
      const cur = stPills.querySelector(`.pill[data-val="${currentVal}"]`) || stPills.querySelector('.pill[data-val="new"]');
      if (cur) cur.classList.add('is-active');
    }
  } catch(e){ console.warn('status pills setup failed', e); }

  // Listener στο κουμπί κάμερας (άνευ side effects αν υπάρχει ήδη)
  try {
    const cameraBtn = document.getElementById('btnCamera');
    if (cameraBtn && !cameraBtn._bound) {
      cameraBtn.addEventListener('click', ()=> onCameraButton?.());
      cameraBtn._bound = true;
    }
  } catch(e){ console.warn(e); }

  // Focus σύμφωνα με το σενάριο κατηγορίας
  try {
    const focusKey = window.__nextDamageFocus || (String(category||'') === 'Πινακίδες' ? 'description' : 'quantity');
    if (focusKey === 'description')      { document.getElementById('description')?.focus(); }
    else if (focusKey === 'quantity')    { document.getElementById('quantity')?.focus(); }
    else if (focusKey === 'height')      { document.getElementById('height')?.focus(); } // <-- προαιρετικό
  } catch {}
}
window.renderDamageForm = renderDamageForm;




// --- Damage modal pills wiring (quantity / side / priority) ---
(function wireDamagePills(){
  const modal = document.getElementById('damageModal');
  if (!modal || modal._pillsWired) return;
  modal._pillsWired = true;

  function setActive(pill){
    const group = pill.closest('.pill-group');
    if (!group) return;
    group.querySelectorAll('.pill').forEach(b=> b.classList.remove('is-active'));
    pill.classList.add('is-active');

    const val = pill.getAttribute('data-val') || pill.textContent.trim();
    if (!val) return;

    // map group -> input id
    const map = {
      'qtyPills':      'quantity',
      'sidePills':     'side',
      'priorityPills': 'priority',
      'statusPills':   'status'
    };
    const gid = group.id;
    const inputId = map[gid];
    if (inputId) {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = val;
        input.dispatchEvent(new Event('input', {bubbles:true}));
        input.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }
  }

  modal.addEventListener('click', function(ev){
    const pill = ev.target.closest && ev.target.closest('.pill');
    if (!pill) return;
    // Only respond if click happened inside our modal content
    const content = modal.querySelector('.modal-content');
    if (content && content.contains(pill)) {
      setActive(pill);
    }
  });
})();



/** Global visibility filter: respects category, status, and group checklists */
function applyVisibility(m){
  try{
    const r   = m?.options?.data || {};
    const cat = r.category;
    const st  = window.normalizeStatus ? window.normalizeStatus(r.status) : (r.status || 'new');
    const grp = r.group || '';

    // πάρε το top-level group μόνο
    const grpTop = String(grp).split(/\s*\/\s*/)[0].trim();

    const hideCat = !!(window.markerSettings?.hiddenCats?.has && window.markerSettings.hiddenCats.has(cat));
    const hideSt  = !!(window.markerSettings?.hiddenStatuses?.has && window.markerSettings.hiddenStatuses.has(st));
    const hideGrp = !!(window.markerSettings?.hiddenGroups?.has && window.markerSettings.hiddenGroups.has(grpTop));

    const shouldHide = hideCat || hideSt || hideGrp;

    if (shouldHide) {
      if (m._map) { try { window.markerLayer && window.markerLayer.removeLayer(m); } catch{} }
    } else {
      if (!m._map) { try { window.markerLayer && window.markerLayer.addLayer(m); } catch{} }
    }
  }catch(e){ console.warn('applyVisibility failed', e); }
}
window.applyVisibility = applyVisibility;



/** Live preview of marker with current settings */
function renderMarkerPreview(){
  try{
    const box = document.getElementById('markerPreviewIcon');
    if (!box) return;
    const size  = (window.markerSettings && window.markerSettings.size)  || 26;
    const shape = (window.markerSettings && window.markerSettings.shape) || 'circle';
    const op    = (window.markerSettings && window.markerSettings.opacity) || 1;
    // Show a yellow "old" sample by default
    const bg    = statusColor('old');
    const html  = svgIconHTML({ shape, size, bg, label:'🛠️', opacity: op });
    box.innerHTML = html;
  }catch(e){ console.warn('renderMarkerPreview failed', e); }
}
window.renderMarkerPreview = renderMarkerPreview;


// === Marker Settings: wiring for new controls (labelMode, status filter, reset/preview) ===
document.addEventListener('DOMContentLoaded', () => {
  const labelModeSel = document.getElementById('labelMode');
  if (labelModeSel){
    // init
    labelModeSel.value = window.markerSettings.labelMode || 'hover';
    labelModeSel.addEventListener('change', e=>{
      window.markerSettings.labelMode = e.target.value;
      try { (window.damageMarkers || []).forEach(applyLabelMode); } catch(e){}
    });
  }

  const stBox = document.getElementById('markerStatusList');
  if (stBox){
    // initialize: everything checked means hiddenStatuses is empty (show all)
    stBox.querySelectorAll('input[type="checkbox"][data-st]').forEach(cb=>{
      cb.addEventListener('change', e=>{
        const st = e.target.getAttribute('data-st');
        if (!window.markerSettings.hiddenStatuses) window.markerSettings.hiddenStatuses = new Set();
        if (e.target.checked) window.markerSettings.hiddenStatuses.delete(st);
        else window.markerSettings.hiddenStatuses.add(st);
        try { applyAllSettingsToAllMarkers(); } catch(e){}
      });
    });
  }

  const btnReset = document.getElementById('btnMarkerReset');
  if (btnReset){
    btnReset.addEventListener('click', ()=>{
      window.markerSettings.shape = 'circle';
      window.markerSettings.size = 26;
      window.markerSettings.opacity = 1;
      window.markerSettings.labelMode = 'hover';
      window.markerSettings.allowDrag = false;
      window.markerSettings.hiddenCats = new Set();
      window.markerSettings.hiddenStatuses = new Set();
      // reset UI controls if present
      const shapeSel = document.getElementById('markerShape'); if (shapeSel) shapeSel.value = 'circle';
      const sizeInp  = document.getElementById('markerSize');  const sizeVal = document.getElementById('markerSizeVal');
      if (sizeInp && sizeVal){ sizeInp.value = '26'; sizeVal.textContent = '26 px'; }
      const opInp    = document.getElementById('markerOpacity'); const opVal = document.getElementById('markerOpacityVal');
      if (opInp && opVal){ opInp.value = '100'; opVal.textContent = '100%'; }
      const lmSel    = document.getElementById('labelMode'); if (lmSel) lmSel.value = 'hover';
      // apply & preview
      try { applyAllSettingsToAllMarkers(); } catch(e){}
      try { renderMarkerPreview(); } catch(e){}
    });
  }

  // Keep preview live on setting changes
  ['markerShape','markerSize','markerOpacity','labelMode'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) {
      const evt = (id==='markerSize' || id==='markerOpacity') ? 'input' : 'change';
      el.addEventListener(evt, ()=>{ try { renderMarkerPreview(); } catch(e){} });
    }
  });

  // initial preview render
  try { renderMarkerPreview(); } catch(e){}
});



// === Extra wiring: pills για Περιγραφή (#descPills) → toggle σε κείμενο #description
(function(){
  const descPills = document.getElementById('descPills');
  const descInput = document.getElementById('description');
  if (descPills && descInput && !descPills._bound) {
    descPills.addEventListener('click', e => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      const val = btn.getAttribute('data-val') || '';
      if (!val) return;

      // Πάρε την τρέχουσα λίστα από το textarea
      let curVals = (descInput.value || '').split(',')
        .map(s => s.trim()).filter(Boolean);

      if (btn.classList.contains('is-active')) {
        // Αν είναι ήδη ενεργό → αφαίρεση
        curVals = curVals.filter(v => v !== val);
        btn.classList.remove('is-active');
      } else {
        // Αν δεν είναι → πρόσθεση
        curVals.push(val);
        btn.classList.add('is-active');
      }

      // Γράψε ξανά το textarea με κόμμα
      descInput.value = curVals.join(', ');

      // Στείλε events για να το «δει» όποιος ακούει
      descInput.dispatchEvent(new Event('input', {bubbles:true}));
      descInput.dispatchEvent(new Event('change', {bubbles:true}));
    });
    descPills._bound = true;
  }
})();
// ui.js

// ✅ ΝΕΟ saveCustomName που κάνει delegate στο core.js
function saveCustomName(){
  const input = document.getElementById('customNameInput');
  const val = (input?.value || '').trim();

  if (!val){
    closeCustomNameModal?.();
    return;
  }

  // 1) Αποθήκευση + ενημέρωση κουμπιού
  window.setSessionCustomLabel?.(val);
  window.applySessionCustomLabelToButton?.();

  // 2) Ζήτησε από το core να δημιουργήσει προσωρινό marker ΚΑΙ να ανοίξει τη φόρμα
  if (typeof window.openDamageModal === 'function') {
    window.openDamageModal(val);   // <-- ΠΕΡΝΑΜΕ την κατηγορία (το custom όνομα)
  } else {
    console.warn('window.openDamageModal is not available');
  }

  // 3) Κλείσε το modal ονόματος + καθάρισε input
  closeCustomNameModal?.();
  if (input) input.value = '';
}


// (προαιρετικά, αν θες ένα καθαρό UI opener χωρίς καταγραφή, με νέο όνομα)
function openDamageModalUI(){
  document.getElementById('damageModal')?.classList.add('show');
}


// === Custom Name Modal wiring (append at end of ui.js) ===
(function(){
  function openCustomNameModal(){
    const m = document.getElementById('customNameModal');
    if (m){
      m.classList.add('show');
      setTimeout(()=> document.getElementById('customNameInput')?.focus(), 0);
    }
  }
  function closeCustomNameModal(){
    document.getElementById('customNameModal')?.classList.remove('show');
  }
  window.openCustomNameModal  = window.openCustomNameModal  || openCustomNameModal;
  window.closeCustomNameModal = window.closeCustomNameModal || closeCustomNameModal;

  // αποθήκευση label στη session (το χρησιμοποιεί applySessionCustomLabelToButton όταν υπάρχει)
  window.setSessionCustomLabel = window.setSessionCustomLabel || function(val){
    try { localStorage.setItem('sessionCustomCategoryLabel', val || ''); } catch {}
  };

  function initCustomName(){
    // Κουμπί κάτω μπάρας — σταματάει bubbling/other delegates (π.χ. locate)
    const trigger = document.getElementById('btnCustomCat');
    if (trigger && !trigger._boundCNM){
      trigger._boundCNM = true;
      trigger.addEventListener('click', (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        openCustomNameModal();
      });
    }

    // Κουμπί Αποθήκευση
    const btnSave = document.getElementById('btnCustomNameSave');
    if (btnSave && !btnSave._boundCNM){
      btnSave._boundCNM = true;
      btnSave.addEventListener('click', (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();

        if (typeof window.saveCustomName === 'function'){
          // χρησιμοποιεί την υπάρχουσα ροή σου (ορίζει label, ενημερώνει κουμπί, ανοίγει damage modal)
          window.saveCustomName();
          return;
        }

        // fallback: ορισμός label + ενημέρωση κουμπιού + (προαιρετικά) άνοιγμα damage modal
        const val = (document.getElementById('customNameInput')?.value || '').trim();
        window.setSessionCustomLabel(val);

        if (typeof window.applySessionCustomLabelToButton === 'function'){
          window.applySessionCustomLabelToButton();
        } else {
          const btn = document.getElementById('btnCustomCat');
          if (btn){
            const el = btn.querySelector('.label') || btn;
            el.textContent = val || 'Όρισε όνομα';
          }
        }

        closeCustomNameModal();
        if (val && typeof window.openDamageModal === 'function'){
          window.openDamageModal(val);
        }
      });
    }

    // Κουμπί Άκυρο
    const btnCancel = document.getElementById('btnCustomNameCancel');
    if (btnCancel && !btnCancel._boundCNM){
      btnCancel._boundCNM = true;
      btnCancel.addEventListener('click', (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        closeCustomNameModal();
      });
    }

    // Αρχικοποίηση label στο κουμπί από αποθηκευμένη τιμή
    try{
      const val = localStorage.getItem('sessionCustomCategoryLabel') || '';
      if (typeof window.applySessionCustomLabelToButton === 'function'){
        window.applySessionCustomLabelToButton();
      } else {
        const btn = document.getElementById('btnCustomCat');
        if (btn){
          const el = btn.querySelector('.label') || btn;
          el.textContent = val || 'Όρισε όνομα';
        }
      }
    }catch{}
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initCustomName);
  } else {
    initCustomName();
  }
})();
// === Instant GPS marker helpers (append at end of ui.js) ===
(function(){
  function makeRecord(cat, latlng){
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    return {
      category: cat || 'Γενικά Προβλήματα',
      status: 'new',
      quantity: '',
      side: '',
      priority: '',
      description: '',
      date: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      lat: latlng?.lat ?? null,
      lng: latlng?.lng ?? null,
      photo: '',
      seqLabel: cat || 'Κατηγορία'
    };
  }

  // Δημιουργεί marker εδώ-και-τώρα, δένει popup (με buildPopupHTML αν υπάρχει), τον ανοίγει, και τον κρατά ως "current draft"
  window.createMarkerAt = function(latlng, cat){
    if (!window.map || typeof L === 'undefined') return null;

    const rec = makeRecord(cat, latlng);
    const m = L.marker(latlng, { data: rec });

    if (window.markerLayer && window.markerLayer.addLayer) window.markerLayer.addLayer(m);
    else m.addTo(window.map);

    window.damageMarkers = window.damageMarkers || [];
    window.damageMarkers.push(m);

    // Περιεχόμενο popup: χρησιμοποίησε το δικό σου builder αν υπάρχει
    let html = '';
    if (typeof window.buildPopupHTML === 'function'){  // υπάρχει στο ui.js
      try { html = window.buildPopupHTML(rec); } catch(e){}
    }
	// Κράτα ενημερωμένες τις συντεταγμένες & σώζε μετά από drag
try { if (typeof window.wireDragPersist === 'function') window.wireDragPersist(m); } catch {}

    if (!html){
      html = `<div class="card"><div class="card__body">
                <div class="title">${rec.seqLabel}</div>
                <div class="grid">
                  <div class="label">Lat:</div><div class="value">${rec.lat ?? '-'}</div>
                  <div class="label">Lng:</div><div class="value">${rec.lng ?? '-'}</div>
                </div>
              </div></div>`;
    }
    m.bindPopup(html, { maxWidth: 320, className: 'popup-card popup-compact' });

    // Εφάρμοσε ρυθμίσεις εικονιδίου/label/drag, αν έχεις
    if (typeof window.applyMarkerSettings === 'function') { try { window.applyMarkerSettings(m); } catch{} }

    try { m.openPopup(); } catch{}

    // Κράτα τον ως "προσχέδιο" για να τον ενημερώσει το Save
    window.currentDraftMarker = m;
    return m;
  };

  // Πατάς κατηγορία → παίρνουμε ΑΜΕΣΑ GPS και βάζουμε marker εκεί (fallback: κέντρο χάρτη)
  window.placeMarkerForCategoryGPS = function(cat){
    const fallback = ()=>{
      const ll = window.map?.getCenter?.() || {lat:null, lng:null};
      const m = window.createMarkerAt(ll, cat);
      if (typeof window.openDamageModal === 'function') window.openDamageModal(cat);
      return m;
    };
    if (!navigator.geolocation) return fallback();

    const opts = { enableHighAccuracy: true, maximumAge: 2000, timeout: 2500 };
    navigator.geolocation.getCurrentPosition(
      pos => {
        const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const m = window.createMarkerAt(ll, cat);
        if (typeof window.openDamageModal === 'function') window.openDamageModal(cat);
        return m;
      },
      _err => fallback(),
      opts
    );
  };

  // Ο handler για το Save θα χρησιμοποιεί αυτό για να ενημερώνει τον ΗΔΗ τοποθετημένο marker
  window.attachToCurrentDraft = window.attachToCurrentDraft || function(fields){
    const mk = window.currentDraftMarker;
    if (!mk || !mk.options) return;
    mk.options.data = Object.assign(mk.options.data || {}, fields || {});
    try{
      const html2 = (typeof window.buildPopupHTML==='function') ? window.buildPopupHTML(mk.options.data) : mk.getPopup()?.getContent();
      if (html2) mk.setPopupContent(html2);
      mk.getPopup()?.update && mk.getPopup().update();
    }catch{}
    if (typeof window.applyMarkerSettings === 'function') { try { window.applyMarkerSettings(mk); } catch{} }
  };
})();
