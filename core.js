


function getSafeQuantity(){ const isSigns = (window.currentCategory === 'Πινακίδες'); const q = (document.querySelector('#quantity')?.value || '').trim(); return isSigns ? (q || '1') : q; }

// === GLOBAL STATE (visible to ui.js) ===
window.markerSettings = window.markerSettings || {
  shape: 'circle',
  size: 26,
  opacity: 1,
  showLabels: false,
  allowDrag: false,
  hiddenCats: new Set()
};
window.baseLayers = window.baseLayers || {};

// -------------------- core.js — cleaned 1:1 (no duplicate globals) --------------------

// Put shared constants on window to avoid re-declarations across files
window.CUSTOM_BTN_DEFAULT = window.CUSTOM_BTN_DEFAULT || 'Όρισε όνομα';
window.SESSION_CUSTOM_KEY = window.SESSION_CUSTOM_KEY || 'sessionCustomCategoryLabel';

// Helpers for custom name modal & label (idempotent)
window.setSessionCustomLabel = window.setSessionCustomLabel || function(v){
  try { localStorage.setItem(window.SESSION_CUSTOM_KEY, String(v||'')); } catch {}
};
window.getSessionCustomLabel = window.getSessionCustomLabel || function(){
  try { return localStorage.getItem(window.SESSION_CUSTOM_KEY) || ''; } catch { return ''; }
};
window.applySessionCustomLabelToButton = window.applySessionCustomLabelToButton || function(){
  const btn = document.getElementById('btnCustomCat');
  if (!btn) return;
  const labelEl = btn.querySelector('.label') || btn;
  const lbl = window.getSessionCustomLabel() || 'Γενική Φθορά';
  labelEl.textContent = lbl;
};
window.openCustomNameModal  = window.openCustomNameModal  || function(){ document.getElementById('customNameModal')?.classList.add('show'); };
window.closeCustomNameModal = window.closeCustomNameModal || function(){ document.getElementById('customNameModal')?.classList.remove('show'); };

// Safe query helpers (once)
window.qs  = window.qs  || ((sel, root=document) => root.querySelector(sel));
window.qsa = window.qsa || ((sel, root=document) => Array.from(root.querySelectorAll(sel)));

// --- Status (global, single source of truth) ---
window.normalizeStatus = window.normalizeStatus || function(v){
  const s = String(v||'').trim().toLowerCase();
  if (['εκτελέστηκε','εκτελεστηκε','done','green','πράσινο','πρασινο','completed','ok','okey','okey-dokey'].includes(s)) return 'done';
  if (['παλιά','παλια','old','yellow','κιτρινο','κίτρινο','παλιά φθορά','παλια φθορα'].includes(s)) return 'old';
  return 'new';
};
window.statusGR = window.statusGR || function(s){
  const n = window.normalizeStatus(s);
  return n==='done' ? 'Εκτελέστηκε' : (n==='old' ? 'Παλιά Φθορά' : 'Νέα Φθορά');
};



// --- Damage modal helpers ---
window.closeDamageModal = window.closeDamageModal || function(){
  try {
    const modal = document.getElementById('damageModal');
    if (modal) {
      modal.classList.remove('show');
      // restore last opener focus if we stored it
      const last = window._lastDamageOpener;
      if (last && typeof last.focus === 'function') {
        setTimeout(() => { try{ last.focus(); }catch{} }, 0);
      }
    }
  } catch (e) {
    console.error("closeDamageModal error:", e);
  }
};


// Undo modal fallbacks
window.openUndoModal  = window.openUndoModal  || function(){ document.getElementById('undoModal')?.classList.add('show'); };
window.closeUndoModal = window.closeUndoModal || function(){ document.getElementById('undoModal')?.classList.remove('show'); };

// Marker settings panel fallback
window.toggleMarkerPopup = window.toggleMarkerPopup || function(force){
  const panel = document.getElementById('markerPopup');
  if (!panel) return;
  if (typeof force === 'boolean') panel.classList.toggle('show', force);
  else panel.classList.toggle('show');
  return panel.classList.contains('show');
};

// Layer toggle helper (fallback)
window.setLayerChecked = window.setLayerChecked || function(layer, on){
  if (!layer || !window.map) return;
  try {
    if (on) layer.addTo(window.map);
    else layer.remove();
  } catch {}
};

// Presets
window.applyPresetStreet = window.applyPresetStreet || function(){
  const chkOSM        = qs('#layerOSM');
  const chkEsriImg    = qs('#layerEsriImg');
  const chkEsriLabels = qs('#layerEsriLabels');
  const chkNasaTrue   = qs('#layerNasaTrue');
  const chkOpenTopo   = qs('#layerOpenTopo');
  const chkEsriTopo   = qs('#layerEsriTopo');
  const chkHillshade  = qs('#layerHillshade');

  if (chkOSM)        chkOSM.checked = true;
  if (chkEsriImg)    chkEsriImg.checked = false;
  if (chkEsriLabels) chkEsriLabels.checked = false;
  if (chkNasaTrue)   chkNasaTrue.checked = false;
  if (chkOpenTopo)   chkOpenTopo.checked = false;
  if (chkEsriTopo)   chkEsriTopo.checked = false;
  if (chkHillshade)  chkHillshade.checked = false;

  setLayerChecked(window.baseLayers.osm,           true);
  setLayerChecked(window.baseLayers.esriImagery,   false);
  setLayerChecked(window.baseLayers.cartoLabels,   false);
  setLayerChecked(window.baseLayers.nasaTrueColor, false);
  if (window.baseLayers.openTopo)  setLayerChecked(window.baseLayers.openTopo,  false);
  if (window.baseLayers.esriTopo)  setLayerChecked(window.baseLayers.esriTopo,  false);
  if (window.baseLayers.hillshade) setLayerChecked(window.baseLayers.hillshade, false);
};

// Label/drag fallbacks (no-ops if ui.js already provides)
window.applyLabelMode = window.applyLabelMode || function(m){
  try {
    const show = !!(window.markerSettings && window.markerSettings.showLabels);
    if (show) m.openTooltip && m.openTooltip();
    else m.closeTooltip && m.closeTooltip();
  } catch {}
};
window.applyDragMode = window.applyDragMode || function(m){
  try {
    if (window.markerSettings && window.markerSettings.allowDrag) {
      m.dragging && m.dragging.enable && m.dragging.enable();
    } else {
      m.dragging && m.dragging.disable && m.dragging.disable();
    }
  } catch {}
};

// --- Global state (ONLY via window to avoid duplicate let/const across files) ---
if (typeof window.firstLocate === 'undefined') window.firstLocate = true;
window.map              = window.map              || null;
window.markerLayer      = window.markerLayer      || null;
window.routeLayer       = window.routeLayer       || null;

window.watchId          = window.watchId          || null;
window.currentMarker    = window.currentMarker    || null;
window.currentDamageMarker = window.currentDamageMarker || null;
window.damageMarkers    = window.damageMarkers    || [];
window.redoStack        = window.redoStack        || [];
window.currentCategory  = window.currentCategory  || '';
if (typeof window.followUser === 'undefined') window.followUser = true;

// Camera globals (avoid duplicate declaration with ui.js)
window.isCameraPreviewOpen  = (typeof window.isCameraPreviewOpen  !== 'undefined') ? window.isCameraPreviewOpen  : false;
window.cameraStream         = (typeof window.cameraStream         !== 'undefined') ? window.cameraStream         : null;
window.currentPhotoSnapshot = (typeof window.currentPhotoSnapshot !== 'undefined') ? window.currentPhotoSnapshot : '';

// === Helper για εμφάνιση/απόκρυψη ονομάτων markers ===
function toggleMarkerLabels(show) {
  const s = document.getElementById('no-marker-labels');
  if (!s) return;
  if (show) {
    s.textContent = '';
  } else {
    s.textContent = '.leaflet-tooltip, .marker-label, .leaflet-tooltip-pane .leaflet-tooltip { display: none !important; }';
  }
}

// Misc helpers
const yesterdayISO = () => new Date(Date.now() - 86400000).toISOString().slice(0,10);
const pad3 = n => String(n).padStart(3,'0');


// --- Date/Time helpers for consistent ISO storage ---
const _pad = n => String(n).padStart(2, '0');
function nowDateISO(){ const d = new Date(); return `${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`; }
function nowTimeHM(){ const d = new Date(); return `${_pad(d.getHours())}:${_pad(d.getMinutes())}`; }

// Counters
window.categoryCounters = window.categoryCounters || {};
window.COUNTERS_KEY     = window.COUNTERS_KEY     || 'categoryCounters';

function saveCounters(){
  try { localStorage.setItem(window.COUNTERS_KEY, JSON.stringify(window.categoryCounters)); } catch {}
}
function loadCounters(){
  try{
    window.categoryCounters = JSON.parse(localStorage.getItem(window.COUNTERS_KEY) || '{}') || {};
  }catch{
    window.categoryCounters = {};
  }
}
function getNextSeq(cat){
  const n = (window.categoryCounters[cat] || 0) + 1;
  window.categoryCounters[cat] = n;
  saveCounters();
  return n;
}
function recomputeCountersFromMarkers(){
  window.categoryCounters = {};
  (window.damageMarkers || []).forEach(m=>{
    const r = m.options?.data;
    if (r && r.category && Number.isFinite(r.seqNum)){
      window.categoryCounters[r.category] = Math.max(window.categoryCounters[r.category]||0, r.seqNum);
    }
  });
  saveCounters();
}

// Follow mode toggle
function setFollow(v){
  window.followUser = v;
  const b = document.getElementById('btnLocate');
  if (b){
    b.textContent = window.followUser ? '🛰️' : '📍';
    b.title = window.followUser ? 'Ακολουθεί: ΕΝΕΡΓΟ' : 'Ακολουθεί: ΑΝΕΝΕΡΓΟ';
  }
}

// Redo last delete
function redoLastDelete(){
  const m = window.redoStack.pop();
  if (!m) { alert('Δεν υπάρχει καταγραφή για επαναφορά.'); return; }
  m.addTo(window.markerLayer);
  window.damageMarkers.push(m);
  saveToLocal();
  recomputeCountersFromMarkers();
}

// Route direction helper
function getDirectionText(){
  const inDom = document.querySelector('#routeDirection')?.value || '';
  if (inDom.trim()) return inDom.trim();
  try{
    const arr = (Array.isArray(window.damageMarkers) ? window.damageMarkers : []);
    if (arr.length){
      const d = arr.find(m => m?.options?.data?.directionText)?.options.data.directionText;
      if (d && String(d).trim()) return String(d).trim();
    }
  }catch { console.warn('Caught error in core.js'); }
  const saved = localStorage.getItem('routeDirection');
  if (saved && saved.trim()) return saved.trim();
  return '';
}

// NASA True Color
function buildNasaTrueColor(dateStr) {
  return L.tileLayer(
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    { attribution: 'NASA MODIS', maxZoom: 9 }
  );
}

// Add marker from record
function addRecordAsMarker(r){
  // backfill numbering αν λείπουν seq
  if (!Number.isFinite(r.seqNum)) {
    const next = (window.categoryCounters[r.category] || 0) + 1;
    window.categoryCounters[r.category] = next;
    r.seqNum = next;
    r.seqCode = String(next).padStart(3, '0');
    r.seqLabel = `${r.category} ${r.seqCode}`;
  }
  if (!r.status) r.status = 'old';
  else r.status = window.normalizeStatus(r.status);

  const m = L.marker([+r.lat, +r.lng], {
      icon: L.divIcon({ className:'cat-pin', html:'', iconSize:[window.markerSettings?.size||26, window.markerSettings?.size||26] })
    })
    .addTo(window.markerLayer)
    .bindTooltip(r.seqLabel || r.category, { permanent:true, direction:'right' });

  m.options.data = r;

  // ✅ Compact popup
  const isSmall = (innerWidth < 900) || (innerHeight < 700);
  m.bindPopup(buildPopupHTML(r), {
    className: 'popup-card' + (isSmall ? ' popup-compact' : ''),
    maxWidth: isSmall ? 280 : 320,
    autoPanPadding: isSmall ? [10,10] : [16,16],
    keepInView: true
  });

  try { if (typeof applyMarkerSettings === 'function') applyMarkerSettings(m); } catch { console.warn('applyMarkerSettings not ready'); }
  try { m.setZIndexOffset(2000); } catch { console.warn('Caught error in core.js'); }
  m.on('click', ()=> m.openPopup());
  window.damageMarkers.push(m);
}


/// ===== STORAGE =====
function saveToLocal(){
  try{
    // ΠΑΝΤΑ σώζουμε ΚΑΙ lat/lng από τον marker (ώστε να ξαναστηθούν σωστά)
    const data = (window.damageMarkers || []).map(m => {
      const r  = { ...(m?.options?.data || {}) };
      const ll = m?.getLatLng ? m.getLatLng() : null;
      if (ll){
        r.lat = Number(ll.lat);
        r.lng = Number(ll.lng);
      }
      return r;
    }).filter(Boolean);

    localStorage.setItem("damageMarkers", JSON.stringify(data));
  }catch(e){ console.warn('saveToLocal error:', e); }

  try{ saveCounters?.(); }catch{}
}

function hasSavedData(){
  try {
    const d = JSON.parse(localStorage.getItem('damageMarkers') || '[]');
    return Array.isArray(d) && d.length > 0;
  } catch { return false; }
}

function loadFromLocal(){
  // προαιρετικά: φορτώνεις counters σου
  try{ loadCounters?.(); }catch{}

  // 1) ασφαλές διάβασμα
  let data = [];
  try{
    data = JSON.parse(localStorage.getItem("damageMarkers") || "[]") || [];
  }catch(e){
    console.warn('loadFromLocal: parse error', e);
    return 0;
  }

  // 2) ετοίμασε layer & καθάρισε τρέχοντες markers
  try{
    if (!window.markerLayer && window.L && window.map){
      window.markerLayer = L.layerGroup().addTo(window.map);
	 
window.routeLayer = L.layerGroup().addTo(window.map);

    }
    (window.damageMarkers || []).forEach(m => {
      try{
        if (m.remove) m.remove();
        else if (window.map && m._leaflet_id) window.map.removeLayer(m);
      }catch{}
    });
    window.damageMarkers = [];
    window.markerLayer?.clearLayers?.();
  }catch(e){ console.warn('clear markers failed', e); }

  // 3) backfill αρίθμησης για παλιές εγγραφές
  const localCounters = { ...(window.categoryCounters || {}) };
  const ensureSeq = (rec) => {
    if (Number.isFinite(rec.seqNum)) return rec;
    const next = (localCounters[rec.category] || 0) + 1;
    localCounters[rec.category] = next;
    rec.seqNum  = next;
    rec.seqCode = pad3(next);
    rec.seqLabel = `${rec.category} ${rec.seqCode}`;
    return rec;
  };

  // 4) ανασύσταση markers
  const group = (window.L && L.featureGroup) ? L.featureGroup() : null;
  if (group && window.map) group.addTo(window.map);

  const normStatus = (s)=> (window.normalizeStatus ? window.normalizeStatus(s || 'old') : (s || 'old'));

  data.forEach(_r => {
    const r = ensureSeq({ ..._r });
    r.status = normStatus(r.status);

    // cast lat/lng σε αριθμό (αν ήταν string στο localStorage)
    r.lat = Number(r.lat);
    r.lng = Number(r.lng);
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return;

    const m = L.marker([r.lat, r.lng], { icon: L.divIcon({className:'cat-pin', html:''}) })
      .addTo(window.markerLayer)
      .bindTooltip(r.seqLabel || r.category || '', { permanent: true, direction: "right" });

    // Popup (compact σε μικρές οθόνες)
    {
      const isSmall = (innerWidth < 900) || (innerHeight < 700);
      m.bindPopup(buildPopupHTML(r), {
        className: 'popup-card' + (isSmall ? ' popup-compact' : ''),
        maxWidth: isSmall ? 280 : 320,
        autoPanPadding: isSmall ? [10,10] : [16,16],
        keepInView: true
      });
    }

    // ΔΕΣΕ τα δεδομένα πάνω στον marker για μελλοντικό save
    if (!m.options) m.options = {};
    m.options.data = r;

    // ➕ ΕΦΑΡΜΟΓΗ SKIN/ICON (όπως κάνει το κουμπί «Ανανέωση»)
    try {
      if (typeof window.applyMarkerSettings === 'function') {
        window.applyMarkerSettings(m);
      } else {
        // Fallback για να μη μείνει «αόρατος»
        m.setIcon(L.divIcon({
          className: 'cat-pin',
          html: '<span class="pin-core"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        }));
      }
    } catch (e) {
      console.warn('applyMarkerSettings failed; using fallback icon', e);
      try {
        m.setIcon(L.divIcon({
          className: 'cat-pin',
          html: '<span class="pin-core"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        }));
      } catch {}
    }

    try { m.setZIndexOffset?.(2000); } catch {}
    m.on('click', () => m.openPopup());

    window.damageMarkers.push(m);
    if (group) group.addLayer(m);
  });

  // 5) ενημέρωσε counters & κάνε fit στους δείκτες
  window.categoryCounters = localCounters;
  try{ saveCounters?.(); }catch{}
  try{
    if (group && group.getLayers().length && window.map){
      window.map.fitBounds(group.getBounds(), { padding:[30,30] });
    }
  }catch{}

  // 6) ενημέρωσε UI "Τελευταία συνεδρία" & Κατεύθυνση
  try{
    const route = localStorage.getItem('routeDirection') || '';
    const when  = localStorage.getItem('lastSessionDate') || '—';
    const cnt   = (window.damageMarkers || []).length;
    const lastInfo = document.getElementById('lastSessionInfo');
    if (lastInfo){
      lastInfo.textContent = `Κατεύθυνση: ${route || '–'} · Σημεία: ${cnt} · Ημ/νία: ${when}`;
    }
    const inp = document.getElementById('routeDirection');
    if (inp && !inp.value) inp.value = route;
  }catch{}

  // 7) σώσε ξανά (τώρα που οι markers έχουν options.data) & καθάρισε redo
  try{ saveToLocal(); }catch{}
  if (window.redoStack) window.redoStack.length = 0;

  return (window.damageMarkers || []).length;
}


function initMap() {
	// ✅ Ενεργοποίηση TouchRotate handler (αν υπάρχει από το plugin)
if (window.L && L.Map && L.Map.TouchRotate) {
  L.Map.addInitHook('addHandler','touchRotate', L.Map.TouchRotate);
} else {
  console.warn('Leaflet Rotate plugin missing -> no rotation gestures/controls');
}


  // Χάρτης (βελτιώσεις: preferCanvas για πολλούς δείκτες, worldCopyJump για ομαλό pan)
  window.map = L.map('map', {
    zoomControl: false,
    preferCanvas: true,
    worldCopyJump: true,
    // ✅ Προσθήκη περιστροφής
    rotate: true,
    touchRotate: true,
    bearing: 0
  }).setView([40.64, 22.94], 17);


  // --- μέσα στη initMap(), ΟΛΟ το window.map.on('popupopen', ...) ---
  window.map.on('popupopen', (e) => {
    const root = e.popup.getElement();
    if (!root) return;

    // ασφαλές source marker (fallback)
    const src = e.popup._source || window._lastPopupMarker || null;
    window._lastPopupMarker = src;
    if (!src) return;

    // Διαγραφή
    const delBtn = root.querySelector('.btn-delete');
    if (delBtn) {
      delBtn.onclick = () => {
        const m = src;
        if (!m) return;
        if (!confirm('Να διαγραφεί ο marker;')) return;

        try { window.map.removeLayer(m); } catch {}
        const idx = window.damageMarkers.indexOf(m);
        if (idx > -1) window.damageMarkers.splice(idx, 1);

        window.redoStack.push(m);
        try { recomputeCountersFromMarkers?.(); } catch {}
        try { saveToLocal?.(); } catch {}
      };
    }

    // === Αλλαγή Κατάστασης (τρίχρωμα pills) ===
    root.querySelectorAll('.status-pill[data-status]')?.forEach(btn => {
      btn.onclick = () => {
        const m = src;
        if (!m) return;
        const newStatus = window.normalizeStatus(btn.dataset.status || 'new');

        m.options.data = m.options.data || {};
        m.options.data.status = newStatus;

        root.querySelectorAll('.status-pill').forEach(b =>
          b.classList.toggle('is-active', b === btn)
        );

        const badge = root.querySelector('.badge-status');
        if (badge) {
          badge.textContent = window.statusGR(newStatus);
          badge.classList.remove('status--new','status--old','status--done');
          badge.classList.add('status--' + newStatus);
        }

        try { window.applyMarkerSettings?.(m); } catch {}
        try { saveToLocal?.(); } catch {}
      };
    });
  

// === Οργάνωση εμφάνισης μέσα στο popup (status pills + actions) ===
try {
  const contentEl = root.querySelector('.leaflet-popup-content');
  if (contentEl) {
    // 1) Βάλε τα status pills σε μια σειρά (3 στήλες)
    const pills = Array.from(contentEl.querySelectorAll('.status-pill[data-status]'));
    if (pills.length >= 3 && !contentEl.querySelector('.status-row')) {
      const row = document.createElement('div');
      row.className = 'status-row';
      const actionsEl = contentEl.querySelector('.popup-card .actions, .actions');
      if (actionsEl) ((actionsEl && actionsEl.parentNode) ? actionsEl.parentNode : contentEl).insertBefore(row, actionsEl);
      else contentEl.appendChild(row);
      pills.slice(0,3).forEach(p => row.appendChild(p));
      if(!row.isConnected){ contentEl.appendChild(row); }
    }

    // 2) Actions: διαγραφή στο τέλος και full-width
    const actions = contentEl.querySelector('.popup-card .actions, .actions');
    if (actions) {
      const del = actions.querySelector('.btn-delete');
      if (del && del.parentElement === actions) {
        actions.appendChild(del);
        del.style.gridColumn = '1 / -1';
      }
    }
  }
} catch(e) { console.warn('popup layout organize failed', e); }
});

  // μετά τη δημιουργία του map
  window.map.on('dragstart zoomstart', () => setFollow(false));
    // === Περιστροφή (controls επάνω δεξιά) ===
  (function () {
    if (!window.map || !window.map.setBearing) return;

    const ROT_STEP = 15; // μοίρες ανά κλικ

    const RotateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar rotate-control');
        container.innerHTML = `
          <a class="rot-btn rot-left" title="Περιστροφή αριστερά (−${ROT_STEP}°)">↺</a>
          <a class="rot-btn rot-right" title="Περιστροφή δεξιά (+${ROT_STEP}°)">⟲</a>
          <a class="rot-btn rot-reset" title="Επαναφορά Βορρά (0°)">N</a>
        `;

        const stop = (e)=>{ e.preventDefault(); e.stopPropagation(); };
        L.DomEvent.on(container, 'pointerdown mousedown dblclick', stop);

        const left  = container.querySelector('.rot-left');
        const right = container.querySelector('.rot-right');
        const reset = container.querySelector('.rot-reset');

        left.onclick  = ()=> window.map.setBearing(((window.map.getBearing() || 0) - ROT_STEP + 360) % 360);
        right.onclick = ()=> window.map.setBearing(((window.map.getBearing() || 0) + ROT_STEP) % 360);
        reset.onclick = ()=> window.map.setBearing(0);

        return container;
      }
    });

    window.map.addControl(new RotateControl());
  })();


  // Κεντρικό layer για markers
  window.markerLayer = L.layerGroup().addTo(window.map);

  // OSM (on by default)
  window.baseLayers.osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      minZoom: 2,
      detectRetina: true,
      attribution: '© OpenStreetMap contributors'
    }
  ).addTo(window.map);

  // Esri Imagery (off — το ανοίγει το preset)
  window.baseLayers.esriImagery = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 20, attribution: 'Esri World Imagery' }
  );

  // Pane για labels (πάνω από όλα, χωρίς να "κόβει" clicks)
  if (!window.map.getPane('labels')) {
    window.map.createPane('labels');
  }
  window.map.getPane('labels').style.zIndex = 650;
  window.map.getPane('labels').style.pointerEvents = 'none';

  // Labels-only overlay (OSM via Carto)
  window.baseLayers.cartoLabels = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
    {
      pane: 'labels',
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '© CARTO, © OpenStreetMap'
    }
  );

  // NASA True Color (δηλώνεται – ανοίγει από switch/preset)
  window.baseLayers.nasaTrueColor = buildNasaTrueColor(yesterdayISO());

  // Επιπλέον υποβάθρα
  window.baseLayers.openTopo = L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { maxZoom: 17, attribution: '© OpenTopoMap' }
  );

  window.baseLayers.esriTopo = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 20, attribution: 'Esri World Topographic' }
  );

  window.baseLayers.hillshade = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 20, attribution: 'Esri Hillshade', opacity: 0.7 }
  );

  // Σωστό reflow μετά το πρώτο paint + σε resize
  try {
    setTimeout(() => window.map && window.map.invalidateSize(true), 100);
    window.addEventListener('resize', () => window.map && window.map.invalidateSize(true), { passive: true });
  } catch {
    /* noop */
  }
}
// --- End Map init ---


// === Geolocation & "my location" ===
let accuracyCircle = null;               // κύκλος ακρίβειας γύρω από το GPS
const ACC_RADIUS_CAP = 30;               // μέγιστη ακτίνα κύκλου ακρίβειας (m)

// scale του dot + παλμών χωρίς να χαλάμε anchors
const LOC_SCALE = 1.20; // παίξε 1.6–2.0 ανάλογα το γούστο

const myLocIcon = L.divIcon({
  className: 'my-loc-icon',
  html: `
    <div class="loc-halo"></div>
    <div class="pulse-pin" style="transform:scale(${LOC_SCALE});transform-origin:center;">
      <div class="pulse-shadow"></div>
    </div>
  `,
  iconSize: [18, 18],          // βασικό μέγεθος (κλιμακώνουμε με CSS transform)
  iconAnchor: [9, 9]           // κεντράρισμα στο σημείο
});


function requestLocation() {
  if (!('geolocation' in navigator)) {
    alert('Η συσκευή δεν υποστηρίζει υπηρεσίες τοποθεσίας (geolocation).');
    return;
  }

  // Καθάρισε τυχόν προηγούμενο watch
  if (window.watchId) {
    try { navigator.geolocation.clearWatch(window.watchId); } catch { console.warn('Caught error in core.js'); }
    window.watchId = null;
  }

  window.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy = 0 } = pos.coords;

      // Δημιούργησε ή ενημέρωσε τον marker τρέχουσας θέσης
      if (!window.currentMarker) {
        window.currentMarker = L.marker([lat, lng], { icon: myLocIcon }).addTo(window.markerLayer);
        try { window.currentMarker.setZIndexOffset(9999); } catch { console.warn('Caught error in core.js'); }

      } else {
        window.currentMarker.setLatLng([lat, lng]);
        try { window.currentMarker.setZIndexOffset(9999); } catch { console.warn('Caught error in core.js'); }
      }

      // Κύκλος ακρίβειας (με “κόφτη”)
      const r = Math.min(accuracy, ACC_RADIUS_CAP);
      if (!accuracyCircle) {
        accuracyCircle = L.circle([lat, lng], {
          radius: r,
          color: '#0ea5e9',
          weight: 1,
          opacity: 0.8,
          fillColor: '#38bdf8',
          fillOpacity: 0.12,
          interactive: false
        }).addTo(window.markerLayer);
      } else {
        accuracyCircle.setLatLng([lat, lng]);
        accuracyCircle.setRadius(r);
      }

      // Κεντράρισμα / Follow
      if (window.firstLocate) {
        window.firstLocate = false;
        try {
  window.map.setView([lat, lng], window.map.getZoom() || 16, { animate: true });
} catch { console.warn('Caught error in core.js'); }

      } else if (window.followUser) {
        // πιο «μαλακό» από setView, δεν αλλάζει zoom
        window.map.panTo([lat, lng], { animate: true });
      }
    },
    (err) => {
      console.warn('Geolocation error:', err && err.message);
      alert('Αποτυχία εντοπισμού. Έλεγξε δικαιώματα τοποθεσίας της εφαρμογής/φυλλομετρητή.');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,   // απόφυγε ατέρμονη αναμονή
      maximumAge: 1000  // αποδέξου πολύ φρέσκο cached fix (≤1s)
    }
  );
}

// --- Modals ---
function openDamageModal(category){
  try{ window._lastDamageOpener = document.activeElement; }catch{};

  // Απλός έλεγχος: απαιτείται μη-κενό όνομα κατηγορίας
  if (!String(category || '').trim()) {
    alert('Δώσε όνομα κατηγορίας.');
    return;
  }

  // ΝΕΟ: Επιλογή σημείου: GPS αν υπάρχει, αλλιώς το κέντρο χάρτη
  let latlng = null;
  try{
    if (window.currentMarker && typeof window.currentMarker.getLatLng === 'function') {
      latlng = window.currentMarker.getLatLng();
    } else if (window.map && typeof window.map.getCenter === 'function') {
      latlng = window.map.getCenter();
    }
  }catch(e){ /* noop */ }

  // Αν για κάποιο λόγο δεν έχουμε ούτε map, βάλε ακραίο fallback (0,0)
  if (!latlng) latlng = { lat: 0, lng: 0 };

  // καθαρισμός τυχόν προηγούμενου προσωρινού marker
  if (window.currentDamageMarker) {
    try { window.markerLayer.removeLayer(window.currentDamageMarker); } catch(e) { console.warn('Caught error in core.js:', e); }
    window.currentDamageMarker = null;
  }

  window.currentCategory = category;
  const { lat, lng } = latlng;

  window.currentDamageMarker = L.marker([lat, lng], { icon: L.divIcon({className:'cat-pin', html:''}) })
    .addTo(window.markerLayer)
    .bindTooltip(category, { permanent: true, direction: 'right' });

  try { if (typeof applyMarkerSettings === 'function') applyMarkerSettings(window.currentDamageMarker); } catch {}

  window.currentDamageMarker.options.data = {
    category,
    quantity:'',
    side:'',
    dpp:'',
    signCode:'',
    description:'',
    directionText: qs('#routeDirection')?.value || '',
    date: nowDateISO(),
    time: nowTimeHM(),
    status: 'new',
    lat,
    lng,
    photo:''
  };

  renderDamageForm(category);
  qs('#damageModal')?.classList.add('show');
}


window.closeCameraPreview = window.closeCameraPreview || function(){
  const v = document.getElementById('cameraPreview');
  if (v) v.style.display = 'none';
  try { if (window.cameraStream) window.cameraStream.getTracks().forEach(t=>t.stop()); } catch {}
  window.cameraStream = null;
  window.isCameraPreviewOpen = false;
};

function saveDamage(){
  if (!window.currentDamageMarker) { alert('Δεν υπάρχει ενεργό marker καταγραφής'); return; }

  const quantity = qs('#quantity')?.value || '';
  const side = qs('#side')?.value || '';
  const description = qs('#description')?.value || '';

  const r = {
    category: window.currentCategory,
    quantity,
    side,
    dpp: qs('#priority')?.value || '',
    signCode: qs('#signCode')?.value || '',
    status: (qs('#status')?.value || 'new'),
    description,
    directionText: qs('#routeDirection')?.value || '',
    date: nowDateISO(),
    time: nowTimeHM(),
    photo: window.currentPhotoSnapshot
  };

  // ΚΡΑΤΑΜΕ ΤΟΠΙΚΗ ΑΝΑΦΟΡΑ (για να μη "σπάσουν" οι handlers μετά το null)
  const m = window.currentDamageMarker;
  const { lat, lng } = m.getLatLng();
  r.lat = lat; r.lng = lng;

  // numbering
  const seqNum = getNextSeq(window.currentCategory);
  r.seqNum = seqNum;
  r.seqCode = String(seqNum).padStart(3,'0');
  r.seqLabel = `${window.currentCategory} ${r.seqCode}`;

  // γράψε δεδομένα
  m.options.data = r;

  // SAFE tooltip update (χωρίς rebind/unbind αν ήδη υπάρχει)
  try {
    const tt = m.getTooltip && m.getTooltip();
    if (tt) tt.setContent(r.seqLabel);
    else m.bindTooltip && m.bindTooltip(r.seqLabel, { permanent:true, direction:'right' });
  } catch {}

  // popup
  m.bindPopup(buildPopupHTML(r), {
    className: 'popup-card',
    maxWidth: 340,
    autoPanPadding: [24, 24],
    keepInView: true
  });

  try { m.setZIndexOffset(2000); } catch {}

  // καθάρισε παλιούς listeners και ξαναδέσε
  m.off('click');
  m.on('click', () => m.openPopup());

  window.damageMarkers.push(m);
  window.redoStack.length = 0;
  try { saveToLocal?.(); } catch {}

  // UI refresh για icon/label/drag/opacity
  try { window.applyMarkerSettings?.(m); } catch {}

  // καθαρισμοί
  window.currentDamageMarker = null;
  window.currentPhotoSnapshot = '';
  closeDamageModal();
  closeCameraPreview();
}


function resetAll(){
  // 1) αφαίρεσε markers και καθάρισε tooltips/popups
  (window.damageMarkers || []).forEach(m => { 
    try { m.unbindTooltip?.(); } catch {}
    try { m.unbindPopup?.();   } catch {}
    try { m.remove?.(); } catch {}
    try { window.map.removeLayer(m); } catch {}
	try { window.routeLayer?.clearLayers?.(); } catch {}
  });
  window.damageMarkers = [];

  // 2) καθάρισε layer group
  try { window.markerLayer?.clearLayers?.(); } catch {}

  // 3) καθάρισε τυχόν «ορφανά» tooltips/popups από το DOM
  try {
    document.querySelectorAll('.leaflet-tooltip, .leaflet-popup').forEach(el=>{
      try { el.remove(); } catch {}
    });
  } catch {}

  // 4) counters, redoStack
  window.categoryCounters = {};
  window.redoStack = [];
  saveCounters?.();

  // 5) καθάρισε ΜΟΝΟ τα δεδομένα καταγραφής – όχι την κατεύθυνση
  try { localStorage.removeItem(window.SESSION_CUSTOM_KEY); } catch {}
  try { localStorage.setItem("damageMarkers","[]"); } catch {}
  try { localStorage.removeItem("lastSessionDate"); } catch {}
  // 👉 ΔΕΝ σβήνουμε το routeDirection εδώ

  // 6) επαναφορά κουμπιού «Όρισε όνομα»
  const _btn = document.getElementById('btnCustomCat');
  if (_btn) _btn.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${window.CUSTOM_BTN_DEFAULT}`;

  // 7) καθάρισμα θέσης/GPS
  if (accuracyCircle) { try { window.map.removeLayer(accuracyCircle); } catch {} accuracyCircle = null; }
  if (window.currentMarker) { try { window.map.removeLayer(window.currentMarker); } catch {} window.currentMarker = null; }
  if (window.watchId) { try { navigator.geolocation.clearWatch(window.watchId); } catch {} window.watchId = null; }
  window.firstLocate = true;
}



// ==================== DOMContentLoaded ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Service Worker (προαιρετικό log αν αποτύχει)
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('service-worker.js'); } catch { console.warn('Caught error in core.js'); }
  }

  // ===== Marker Settings — INIT =====
function buildCategoryChecklist(){
  const box = document.getElementById('markerCatList');
  if(!box) return;
  box.innerHTML = '';

  const cats = (typeof window.damageConfig === 'object' && window.damageConfig && Object.keys(window.damageConfig).length)
    ? Object.keys(window.damageConfig)
    : [...new Set((window.damageMarkers || []).map(m => m.options?.data?.category).filter(Boolean))];

  cats.forEach(cat=>{
    const id = 'cat_' + String(cat).replace(/\s+/g,'_');
    const pill = document.createElement('label');
    pill.className = 'marker-cat-pill';
    pill.innerHTML = `<input type="checkbox" id="${id}" checked> ${cat}`;
    const input = pill.querySelector('input');
    input.addEventListener('change', (e)=>{
      window.markerSettings.hiddenCats = window.markerSettings.hiddenCats || new Set();
      if (e.target.checked) window.markerSettings.hiddenCats.delete(cat);
      else window.markerSettings.hiddenCats.add(cat);
      try { window.applyAllSettingsToAllMarkers?.(); } catch(e){ console.warn('applyAllSettingsToAllMarkers missing'); }
    });
    box.appendChild(pill);
  });
}

function buildGroupChecklist(){
  const box = document.getElementById('markerGroupList');
  if(!box) return;
  box.innerHTML = '';

  // Συλλογή μοναδικών top-level groups από MARKERS
  const groupsSet = new Set(
    (window.damageMarkers || [])
      .map(m => String(m?.options?.data?.group || ''))
      .map(grp => grp.split(/\s*\/\s*/)[0].trim())
      .filter(Boolean)
  );

  // ✅ ΚΑΙ από POLYLINES (routeItems)
  (window.routeItems || []).forEach(pl => {
    const g = String(pl?.options?.data?.group || '').split(/\s*\/\s*/)[0].trim();
    if (g) groupsSet.add(g);
  });

  const groups = Array.from(groupsSet).sort((a,b)=>a.localeCompare(b,'el'));
  groups.forEach(gr => {
    const id = 'grp_' + String(gr).replace(/\s+/g,'_');
    const pill = document.createElement('label');
    pill.className = 'marker-cat-pill';
    pill.innerHTML = `<input type="checkbox" id="${id}" checked> ${gr}`;

    const input = pill.querySelector('input');
    input.addEventListener('change', (e)=>{
      window.markerSettings.hiddenGroups = window.markerSettings.hiddenGroups || new Set();
      if (e.target.checked) window.markerSettings.hiddenGroups.delete(gr);
      else window.markerSettings.hiddenGroups.add(gr);
      try { window.applyAllSettingsToAllMarkers?.(); } catch(e){ console.warn('applyAllSettingsToAllMarkers missing'); }
    });
    box.appendChild(pill);
  });
}

window.refreshGroupChecklist = buildGroupChecklist;


window.refreshCategoryChecklist = buildCategoryChecklist;
// --- Status filters ΜΟΝΟ μέσα στο panel (markerStatusList) ---
(() => {
  try{
    window.markerSettings = window.markerSettings || {};
    window.markerSettings.hiddenStatuses = window.markerSettings.hiddenStatuses || new Set();

    const root = document.getElementById('markerStatusList');
    if (!root) return;

    const wire = () => {
      root.querySelectorAll('input[type="checkbox"][data-st]').forEach(cb=>{
        const key = String(cb.dataset.st || '').trim();
        // αρχικοποίηση από το state
        cb.checked = !window.markerSettings.hiddenStatuses.has(key);

        cb.addEventListener('change', (e)=>{
          const on = !!e.target.checked; // checked = εμφανίζεται
          if (on) window.markerSettings.hiddenStatuses.delete(key);
          else    window.markerSettings.hiddenStatuses.add(key);

          try { window.applyAllSettingsToAllMarkers?.(); } catch(err){ console.warn('applyAllSettingsToAllMarkers missing', err); }
        });
      });
    };

    wire();
  }catch(e){
    console.warn('status filters wiring failed', e);
  }
})();

// --- Status filters (πάνω statusBar + panel στο popup) ---
(() => {
  try{
    window.markerSettings = window.markerSettings || {};
    window.markerSettings.hiddenStatuses = window.markerSettings.hiddenStatuses || new Set();

    const wireStatusContainer = (root) => {
      if (!root) return;
      root.querySelectorAll('input[type="checkbox"][data-st]').forEach(cb=>{
        const key = String(cb.dataset.st || '').trim();

        // αρχικοποίηση από το state
        cb.checked = !window.markerSettings.hiddenStatuses.has(key);

        cb.addEventListener('change', (e)=>{
          const on = !!e.target.checked; // checked = εμφανίζεται
          if (on) window.markerSettings.hiddenStatuses.delete(key);
          else    window.markerSettings.hiddenStatuses.add(key);

          // εφάρμοσε τα φίλτρα στα markers
          try { window.applyAllSettingsToAllMarkers?.(); } catch(err){ console.warn('applyAllSettingsToAllMarkers missing', err); }

          // συγχρόνισε τυχόν άλλο UI με το ίδιο data-st
          document.querySelectorAll(`input[type="checkbox"][data-st="${key}"]`).forEach(x=>{
            if (x !== cb) x.checked = on;
          });
        });
      });
    };

    // wire πάνω μπαράκι + panel (αν υπάρχει)
    wireStatusContainer(document.getElementById('statusBar'));
    wireStatusContainer(document.getElementById('markerStatusList'));
  }catch(e){
    console.warn('status filters wiring failed', e);
  }
})();
// Κουμπί ανοίγματος/κλεισίματος panel
  document.getElementById('btnMarkerSettings')?.addEventListener('click', ()=> window.toggleMarkerPopup());
  document.getElementById('btnMarkerClose')?.addEventListener('click', ()=> window.toggleMarkerPopup(false));

  // Κλείσιμο με click εκτός panel
  document.addEventListener('click', (e)=>{
    const panel = document.getElementById('markerPopup');
    const btn = document.getElementById('btnMarkerSettings');
    if(!panel) return;
    if(panel.contains(e.target) || btn?.contains(e.target)) return;
    panel.classList.remove('show');
  });

  // ESC για κλείσιμο
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') window.toggleMarkerPopup(false);
  });

  // Inputs
  const shapeSel = document.getElementById('markerShape');
  const sizeInp  = document.getElementById('markerSize');
  const sizeVal  = document.getElementById('markerSizeVal');
  const opInp    = document.getElementById('markerOpacity');
  const opVal    = document.getElementById('markerOpacityVal');
  const showCb   = document.getElementById('showLabels');
  const dragCb   = document.getElementById('allowDrag');

  if(shapeSel){
    shapeSel.value = window.markerSettings.shape;
    shapeSel.addEventListener('change', e=>{
      window.markerSettings.shape = e.target.value;
      try { window.applyAllSettingsToAllMarkers?.(); } catch (e) { console.warn('applyAllSettingsToAllMarkers missing'); }
    });
  }

  if(sizeInp && sizeVal){
    sizeInp.value = String(window.markerSettings.size);
    sizeVal.textContent = `${window.markerSettings.size} px`;
    sizeInp.addEventListener('input', e=>{
      window.markerSettings.size = +e.target.value;
      sizeVal.textContent = `${window.markerSettings.size} px`;
      try { window.applyAllSettingsToAllMarkers?.(); } catch (e) { console.warn('applyAllSettingsToAllMarkers missing'); }
    });
  }

  if(opInp && opVal){
    opInp.value = String(Math.round(window.markerSettings.opacity * 100));
    opVal.textContent = `${opInp.value}%`;
    opInp.addEventListener('input', e=>{
      window.markerSettings.opacity = (+e.target.value)/100;
      opVal.textContent = `${e.target.value}%`;
      try { window.applyAllSettingsToAllMarkers?.(); } catch (e) { console.warn('applyAllSettingsToAllMarkers missing'); }
    });
  }

  if(showCb){
    showCb.checked = window.markerSettings.showLabels;
    showCb.addEventListener('change', e=>{
      window.markerSettings.showLabels = !!e.target.checked;
      (window.damageMarkers || []).forEach(window.applyLabelMode);
    });
  }

  if(dragCb){
    dragCb.checked = window.markerSettings.allowDrag;
    dragCb.addEventListener('change', e=>{
      window.markerSettings.allowDrag = !!e.target.checked;
      (window.damageMarkers || []).forEach(window.applyDragMode);
    });
  }

  // Φτιάξε τα checkboxes κατηγοριών
  buildCategoryChecklist();

  
  try { window.refreshGroupChecklist?.(); } catch(e) { console.warn('refreshGroupChecklist missing'); }
// Εφάρμοσε ρυθμίσεις στα ήδη φορτωμένα markers (π.χ. από local/import)
  try { window.applyAllSettingsToAllMarkers?.(); } catch (e) { console.warn('applyAllSettingsToAllMarkers missing'); }

  /* ===========================
     Χάρτης & τοποθεσία
  =========================== */
  // Eager map init ώστε ο χάρτης να είναι ορατός αμέσως
  try { initMap?.(); } catch { console.warn('Caught error in core.js'); }
  try { requestLocation?.(); } catch { console.warn('Caught error in core.js'); }

// === Start flow: Unified Work Modal ===
(function(){
  if (document.getElementById('workModal') && typeof window.openWorkModal === 'function') {
    window.openWorkModal('auto'); // auto = αν έχεις ήδη κατεύθυνση -> Συνέχιση, αλλιώς Νέα
    return;
  }
})();


  // Top buttons
  qs('#btnRedo')?.addEventListener('click', redoLastDelete);
  qs('#btnUndo')?.addEventListener('click', () => { try { window.openUndoModal?.(); } catch (e) { console.warn('openUndoModal missing'); } });
  qs('#btnLocate')?.addEventListener('click', () => {
    // αν δεν «τρέχει» ήδη GPS, ξεκίνα το
    if (!window.watchId) requestLocation?.();
    // toggle follow
    setFollow?.(!window.followUser);
    // αν το άναψες τώρα, κέντραρε άμεσα στη τρέχουσα θέση
    if (window.followUser && window.currentMarker) {
      const { lat, lng } = window.currentMarker.getLatLng();
      const p = L.latLng(lat, lng);
      try {
        if (!window.map.getBounds().pad(-0.25).contains(p)) {
          window.map.panTo(p, { animate: true });
        }
      } catch { console.warn('Caught error in core.js'); }
    }
  });

  // 👉 Toggle εμφάνισης κάτω μπάρας
  const btnToggleBottom = document.getElementById('btnToggleBottom');
  const bottomBar = document.querySelector('.bottom-buttons');
  if (btnToggleBottom && bottomBar) {
    btnToggleBottom.addEventListener('click', () => {
      const hidden = bottomBar.classList.toggle('is-hidden');
      btnToggleBottom.textContent = hidden ? '⬇️' : '⬆️';
      btnToggleBottom.title = hidden ? 'Δείξε τα κάτω κουμπιά' : 'Κρύψε τα κάτω κουμπιά';
      btnToggleBottom.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    });
  }

  // Custom category button (simple: 1 tap -> δώσε όνομα -> καταγραφή)
  const btnCustom = document.getElementById('btnCustomCat');
  if (btnCustom) {
    window.applySessionCustomLabelToButton?.(); // δείξε το name αν υπάρχει, αλλιώς το default
    btnCustom.addEventListener('click', window.openCustomNameModal);
  }

  // κάτω κουμπιά
qsa('.bottom-buttons .btn[data-cat]')?.forEach(btn => {
  btn.addEventListener('click', () =>
    window.openDamageModal && window.openDamageModal(btn.dataset.cat)
  );
});



  // Modal ονοματοδοσίας custom κατηγορίας
  const btnCustomSave = document.getElementById('btnCustomNameSave');
  const btnCustomCancel = document.getElementById('btnCustomNameCancel');
  const customNameInput = document.getElementById('customNameInput');

  if (btnCustomSave && btnCustomCancel && customNameInput) {
    btnCustomSave.addEventListener('click', () => {
      const val = (customNameInput.value || '').trim();
      if (!val) { alert('Δώσε όνομα κατηγορίας'); return; }

      window.setSessionCustomLabel?.(val);
      window.applySessionCustomLabelToButton?.();
      window.closeCustomNameModal?.();

      openDamageModal(val);
    });

    btnCustomCancel.addEventListener('click', () => {
      window.closeCustomNameModal?.();
    });
  }

  // === Show/Hide marker labels από το checkbox ===
  const chk = document.getElementById('showLabels');
  if (chk) {
    chk.addEventListener('change', (e) => {
      toggleMarkerLabels(e.target.checked);
    });
    // Συγχρόνισε την αρχική κατάσταση (στην πρώτη φόρτωση)
    toggleMarkerLabels(chk.checked);
  }

  // Undo modal
  qs('#btnUndoOk')?.addEventListener('click', () => {
    if (window.damageMarkers.length) {
      const m = window.damageMarkers.pop();
      try { window.map.removeLayer(m); } catch { console.warn('Caught error in core.js'); }
      window.redoStack.push(m);                 // κράτα για πιθανό redo
      saveToLocal?.();
      recomputeCountersFromMarkers?.();
    }
    try { window.openUndoModal && window.closeUndoModal && window.closeUndoModal(); } catch (e) { console.warn('closeUndoModal missing'); }
  });
  qs('#btnUndoCancel')?.addEventListener('click', window.closeUndoModal);

  // Διόρθωση: placeholder clean
  qs('#btnDirectionOk')?.addEventListener('click', () => {
    const v = qs('#routeDirection')?.value || '';
    try { localStorage.setItem('routeDirection', v); } catch { console.warn('Caught error in core.js'); }
    window.closeDirectionModal();
  });

  // Save/Cancel στο modal φθοράς
  qs('#btnDamageSave')?.addEventListener('click', saveDamage);
  qs('#btnDamageCancel')?.addEventListener('click', () => {
    if (window.currentDamageMarker) {
      try { window.markerLayer.removeLayer(window.currentDamageMarker); } catch { console.warn('Caught error in core.js'); }
      window.currentDamageMarker = null;
    }
    window.currentPhotoSnapshot = '';
    window.closeCameraPreview();
    window.closeDamageModal();
  });

  // ==== Layers panel logic ====
  (function() {
    const panel     = qs('#layerPopup');
    const btnLayers = qs('#btnLayers');
    const btnClose  = qs('#btnLayersClose');

    // Άνοιγμα/κλείσιμο panel
    btnLayers?.addEventListener('click', () => panel?.classList.toggle('show'));
    btnClose ?.addEventListener('click', () => panel?.classList.remove('show'));

    // Click έξω & ESC -> κλείσιμο
    document.addEventListener('click', (e) => {
      if (!panel || !panel.classList.contains('show')) return;
      const inside = panel.contains(e.target) || (btnLayers && btnLayers.contains(e.target));
      if (!inside) panel.classList.remove('show');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panel?.classList.remove('show');
    });

    // === Switches & Sliders (bindings) ===
    const chkOSM        = qs('#layerOSM');
    const chkEsriImg    = qs('#layerEsriImg');
    const chkEsriLabels = qs('#layerEsriLabels');
    const chkNasaTrue   = qs('#layerNasaTrue');

    const chkOpenTopo   = qs('#layerOpenTopo');
    const chkEsriTopo   = qs('#layerEsriTopo');
    const chkHillshade  = qs('#layerHillshade');

    // Listeners για τα checkbox
    chkOSM        ?.addEventListener('change', e => window.setLayerChecked(window.baseLayers.osm,            e.target.checked));
    chkEsriImg    ?.addEventListener('change', e => window.setLayerChecked(window.baseLayers.esriImagery,    e.target.checked));
    chkEsriLabels ?.addEventListener('change', e => {
      const on = e.target.checked;
      window.setLayerChecked(window.baseLayers.cartoLabels, on); // ΜΟΝΟ Carto labels (OSM)
    });
    chkNasaTrue   ?.addEventListener('change', e => window.setLayerChecked(window.baseLayers.nasaTrueColor,  e.target.checked));

    chkOpenTopo   ?.addEventListener('change', e => window.setLayerChecked(window.baseLayers.openTopo,       e.target.checked));
    chkEsriTopo   ?.addEventListener('change', e => window.setLayerChecked(window.baseLayers.esriTopo,       e.target.checked));
    chkHillshade  ?.addEventListener('change', e => window.setLayerChecked(window.baseLayers.hillshade,      e.target.checked));

    // Sliders
    const opEsriImg     = qs('#opacityEsriImg');
    const opEsriLabels  = qs('#opacityEsriLabels');
    const opHillshade   = qs('#opacityHillshade');

    opEsriImg    ?.addEventListener('input', e => {
      try { window.baseLayers.esriImagery.setOpacity(Number(e.target.value) / 100); } catch { console.warn('Caught error in core.js'); }
    });

    // Labels -> Carto labels-only
    opEsriLabels ?.addEventListener('input', e => {
      const o = Number(e.target.value) / 100;
      try { window.baseLayers.cartoLabels.setOpacity(o); } catch { console.warn('Caught error in core.js'); }
    });

    // Hillshade opacity
    opHillshade  ?.addEventListener('input', e => {
      try { window.baseLayers.hillshade.setOpacity(Number(e.target.value) / 100); } catch { console.warn('Caught error in core.js'); }
    });

    // NASA True Color – badge ημερομηνίας + refresh
    const trueDate = qs('#trueDate');

    function applyPresetSat(){
      // Checkboxes
      if (chkOSM)        chkOSM.checked = false;
      if (chkEsriImg)    chkEsriImg.checked = true;
      if (chkEsriLabels) chkEsriLabels.checked = true;
      if (chkNasaTrue)   chkNasaTrue.checked = false;

      if (chkOpenTopo)   chkOpenTopo.checked  = false;
      if (chkEsriTopo)   chkEsriTopo.checked  = false;
      if (chkHillshade)  chkHillshade.checked = false;

      // Layers
      window.setLayerChecked(window.baseLayers.osm,           false);
      window.setLayerChecked(window.baseLayers.esriImagery,   true);
      window.setLayerChecked(window.baseLayers.cartoLabels,   true); // labels πάνω από imagery
      window.setLayerChecked(window.baseLayers.nasaTrueColor, false);

      if (window.baseLayers.openTopo)  window.setLayerChecked(window.baseLayers.openTopo,  false);
      if (window.baseLayers.esriTopo)  window.setLayerChecked(window.baseLayers.esriTopo,  false);
      if (window.baseLayers.hillshade) window.setLayerChecked(window.baseLayers.hillshade, false);

      // Opacity + UI reset
      try { window.baseLayers.esriImagery.setOpacity(1); } catch { console.warn('Caught error in core.js'); }
      try { window.baseLayers.cartoLabels.setOpacity(1); } catch { console.warn('Caught error in core.js'); }
      if (opEsriImg)    opEsriImg.value    = 100;
      if (opEsriLabels) opEsriLabels.value = 100;
    }

    // Bindings κουμπιών preset
    qs('#presetOSM')       ?.addEventListener('click', window.applyPresetStreet);
    qs('#btnPresetStreet') ?.addEventListener('click', window.applyPresetStreet);
    qs('#presetSAT')       ?.addEventListener('click', applyPresetSat);
    qs('#btnPresetSat')    ?.addEventListener('click', applyPresetSat);
  })();

  // Fallback: delegated clicks για τα status pills (δουλεύει και για imports)
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.status-pill[data-status]');
    if (!btn) return;

    const root = btn.closest('.leaflet-popup') || document;
    const m = window._lastPopupMarker; // ορίζεται στο popupopen
    if (!m) return;

    const newStatus = (window.normalizeStatus ? window.normalizeStatus(btn.dataset.status) : (btn.dataset.status || 'new'));

    // ενημέρωση δεδομένων
    m.options.data = m.options.data || {};
    m.options.data.status = newStatus;

    // οπτική ενημέρωση pills
    root.querySelectorAll('.status-pill').forEach(b =>
      b.classList.toggle('is-active', b === btn)
    );

    // ενημέρωση badge
    const badge = root.querySelector('.badge-status');
    if (badge) {
      badge.textContent = (window.statusGR ? window.statusGR(newStatus) : newStatus);
      badge.classList.remove('status--new','status--old','status--done');
      badge.classList.add('status--' + newStatus);
    }

    // refresh icon + save
    try { window.applyMarkerSettings?.(m); } catch {}
    try { saveToLocal?.(); } catch {}
  });

  // (removed duplicate DOMContentLoaded init block — initMap/requestLocation already called above)
});

// -------------------- end core.js — cleaned 1:1 --------------------


// Bind Save button to legacy saveDamage (uses currentDamageMarker)
(function(){
  const b = document.getElementById('btnDamageSave');
  if (b && !b._wiredLegacy){
    b.addEventListener('click', saveDamage);
    b._wiredLegacy = true;
  }
})();


// === Damage Modal UX wiring (idempotent) ===
(function(){
  if (window._wiredDamageModal) return;
  window._wiredDamageModal = true;

  function isModalOpen(modal){ return !!(modal && modal.classList.contains('show')); }

  function getFocusable(root){
    if (!root) return [];
    const sel = [
      'a[href]','button:not([disabled])','textarea:not([disabled])',
      'input:not([disabled])','select:not([disabled])','[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(root.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
  }

  // Backdrop click
  document.addEventListener('mousedown', function(ev){
    const modal = document.getElementById('damageModal');
    if (!isModalOpen(modal)) return;
    if (ev.target === modal) {
      // close on backdrop
      // remove unsaved temp marker (no seqLabel yet)
      try {
        const m = window.currentDamageMarker;
        const notSaved = m && (!m.options || !m.options.data || !m.options.data.seqLabel);
        if (notSaved) { window.markerLayer && m && window.markerLayer.removeLayer(m); }
        window.currentDamageMarker = null;
      } catch {}
      window.closeDamageModal && window.closeDamageModal();
    }
  }, true);

  // ESC to close
  document.addEventListener('keydown', function(ev){
    if (ev.key !== 'Escape') return;
    const modal = document.getElementById('damageModal');
    if (!isModalOpen(modal)) return;
    ev.stopPropagation();
    // same unsaved cleanup as backdrop
    try {
      const m = window.currentDamageMarker;
      const notSaved = m && (!m.options || !m.options.data || !m.options.data.seqLabel);
      if (notSaved) { window.markerLayer && m && window.markerLayer.removeLayer(m); }
      window.currentDamageMarker = null;
    } catch {}
    window.closeDamageModal && window.closeDamageModal();
  }, true);

  // Cancel button
  document.addEventListener('click', function(ev){
    const b = ev.target.closest('#btnDamageCancel');
    if (!b) return;
    const modal = document.getElementById('damageModal');
    if (!isModalOpen(modal)) return;
    ev.preventDefault();
    try {
      const m = window.currentDamageMarker;
      const notSaved = m && (!m.options || !m.options.data || !m.options.data.seqLabel);
      if (notSaved) { window.markerLayer && m && window.markerLayer.removeLayer(m); }
      window.currentDamageMarker = null;
    } catch {}
    window.closeDamageModal && window.closeDamageModal();
  }, true);

  // Focus trap when opened
  const obs = new MutationObserver(() => {
    const modal = document.getElementById('damageModal');
    const box = modal ? modal.querySelector('.modal-content') : null;
    if (!isModalOpen(modal) || !box) return;
    const focusables = getFocusable(box);
    const first = focusables[0], last = focusables[focusables.length - 1];
    // focus the first field (quantity) for convenience
    try { (document.getElementById('quantity') || first || box).focus(); } catch {}
    function onKey(ev){
      if (ev.key !== 'Tab') return;
      const focusablesNow = getFocusable(box);
      if (!focusablesNow.length) return;
      const fFirst = focusablesNow[0], fLast = focusablesNow[focusablesNow.length - 1];
      if (ev.shiftKey && document.activeElement === fFirst){ ev.preventDefault(); fLast.focus(); }
      else if (!ev.shiftKey && document.activeElement === fLast){ ev.preventDefault(); fFirst.focus(); }
    }
    box.addEventListener('keydown', onKey);
    // cleanup when modal hides
    const cleanup = new MutationObserver(() => {
      if (!isModalOpen(modal)) {
        box.removeEventListener('keydown', onKey);
        cleanup.disconnect();
      }
    });
    cleanup.observe(modal, { attributes:true, attributeFilter:['class'] });
  });
  obs.observe( document.getElementById('damageModal') || document.body, { attributes:true, attributeFilter:['class'] });
})();
