// markers_hotfix.js — resilient popup theming & binding (waits for map, rebinds safely)
(function(){

  // ---------- utils ----------
  function isMarkerLike(x){
    return !!(x && typeof x.on==='function' && typeof x.bindPopup==='function' && typeof x.openPopup==='function');
  }
  function ensurePopupThemeOnDom(popup){
    try{
      const el = popup && popup._container;
      if (el) el.classList.add('popup-card','popup-compact');
    }catch{}
  }
  function ensurePopupThemeOption(p){
    if (!p || !p.options) return;
    const cls = p.options.className || '';
    if (!/\bpopup-card\b/.test(cls)){
      p.options.className = (cls ? cls+' ' : '') + 'popup-card popup-compact';
    }
  }
  function hasCardContent(p){
    try{
      const html = p && p.getContent && p.getContent();
      return typeof html==='string' && /class="card"/.test(html);
    }catch{ return false; }
  }
  function buildContentFor(m){
    const r = (m && m.options && m.options.data) || null;
    if (r && typeof window.buildPopupHTML==='function'){
      try { return window.buildPopupHTML(r); } catch(e){}
    }
    const title = (m?.options?.title || m?.options?.name || 'Σημείο');
    const ll = (m && typeof m.getLatLng==='function') ? m.getLatLng() : null;
    const coords = (ll) ? `<br><small>${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}</small>` : '';
    return `<div class="card"><div class="card__body"><div class="title">${title}</div>${coords}</div></div>`;
  }

  // ---------- core binders ----------
  function bindOne(m){
    if (!isMarkerLike(m)) return;
    if (m._popupClickWired) return;

    // κόψε hover tooltips που μπερδεύουν clicks
    try { m.off && m.off('mouseover'); } catch{}

    let p = (m.getPopup && m.getPopup()) || null;

    // Αν δεν υπάρχει popup ή δεν έχει "card" HTML → χτίσε σωστό περιεχόμενο + theme
    if (!p || !hasCardContent(p)){
      const html = buildContentFor(m);
      m.bindPopup(html, { maxWidth: 340, className: 'popup-card popup-compact' }); // ↑ ελαφρώς πιο άνετο
      p = m.getPopup && m.getPopup();
    } else {
      ensurePopupThemeOption(p);
    }

    // Καθαρό click-open
    try { m.off && m.off('click'); } catch{}
    m.on('click', (e)=>{ if(e?.originalEvent) e.originalEvent._fromHotfix = true; m.openPopup(); });

    // Αν είναι ήδη ανοιχτό, πέρνα το theme και στο DOM
    if (p && p._container){ ensurePopupThemeOnDom(p); p.update && p.update(); }

    m._popupClickWired = true;
  }

  function bindInLayer(layer){
    try{
      if (!layer) return;
      if (isMarkerLike(layer)) { bindOne(layer); return; }
      if (layer.eachLayer) { layer.eachLayer(bindInLayer); }
    }catch{}
  }

  // ---------- map readiness ----------
  function whenMapReady(cb){
    if (window.map && typeof window.map.on === 'function') { cb(window.map); return; }
    const t0 = Date.now();
    const iv = setInterval(()=>{
      if (window.map && typeof window.map.on === 'function'){
        clearInterval(iv); cb(window.map);
      } else if (Date.now() - t0 > 10000){
        clearInterval(iv);
        console.warn('markers_hotfix: map not found in time');
      }
    }, 100);
  }

  function attachToMap(map){
    if (!map || typeof map.on!=='function') return;

    // Κάθε άνοιγμα popup → πρόσθεσε theme στο container
    map.on('popupopen', (e)=>{ ensurePopupThemeOnDom(e.popup); });

    // Αρχική σάρωση υπαρχόντων layers/markers
    if (typeof map.eachLayer==='function'){
      map.eachLayer(bindInLayer);
    }

    // Ό,τι προστίθεται μετά
    map.on('layeradd', (ev)=> bindInLayer(ev.layer));
  }

  // ---------- public helpers ----------
  window.rebindMarkerPopups = function(){
    const map = window.map;
    if (map && typeof map.eachLayer==='function'){ map.eachLayer(bindInLayer); }
  };
  // Χρήσιμο αν έχεις ξεχωριστό FeatureGroup για τα damage markers:
  window.bindPopupsInLayer = function(layer){ bindInLayer(layer); };

  // boot
  whenMapReady(attachToMap);
})();
