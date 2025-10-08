// kmz_layer.js — KMZ loader με file picker, clustering & polylines (οδεύση)
// - Αν τρέχεις με file:// → ανοίγει file picker (χωρίς CORS)
// - Αν τρέχεις με http/https → κάνει fetch()
// - Δείχνει ΠΙΝΕΖΕΣ (Χ.Θ.) + ΓΡΑΜΜΕΣ (οδεύση) — LineString & gx:Track
// - Υπο-διακόπτες στο panel: "Οδεύση (γραμμή)" & "Σημεία Χ.Θ."

(function waitForLeafletAndDOM(){
  const domReady = document.readyState !== 'loading';
  const leafletReady = !!(window.L && window.L.map);
  if (domReady && leafletReady) return initKmzLayer();
  setTimeout(waitForLeafletAndDOM, 120);
})();

function initKmzLayer(){
  const KMZ_FILE = 'ΧΛΜ ΘΕΣΕΙΣ ΠΕΧ.kmz'; // ή άλλαξε σε 'xth.kmz'
  const MASTER_ID = 'layerKmzXth';
  const TITLE     = 'Χιλιομετρικές Θέσεις ΠΕΧ';

  // υπο-διακόπτες
  const TOGGLE_LINE_ID  = 'layerKmzXth_line';
  const TOGGLE_POINT_ID = 'layerKmzXth_pts';

  // root group + subgroups
  const kmzRoot  = L.layerGroup();
  const linesGrp = L.featureGroup().addTo(kmzRoot);
  const ptsGrp   = L.featureGroup().addTo(kmzRoot);

  let loaded = false;
  let cluster = null;

  // Canvas renderer για καλύτερη απόδοση/εμφάνιση γραμμών
  const canvasRenderer = L.canvas({ padding: 0.5 });

  // ---------- helpers: file:// vs http ----------
  function pickLocalKMZ(){
    return new Promise((resolve, reject)=>{
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.kmz';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = ()=> {
        const f = inp.files && inp.files[0];
        if (!f) return reject(new Error('Δεν επιλέχθηκε αρχείο'));
        resolve(f);
        setTimeout(()=>inp.remove(), 0);
      };
      inp.click();
    });
  }
  async function loadKmzViaFetch(url){
    const res = await fetch(encodeURI(url));
    if (!res.ok) throw new Error(`HTTP ${res.status} στο ${url}`);
    return await res.arrayBuffer();
  }
  async function unzipKmlFromArrayBuffer(buf){
    const zip = await JSZip.loadAsync(buf);
    const kmlFile = zip.file(/^.*\.kml$/i)[0];
    if (!kmlFile) throw new Error('Δεν βρέθηκε .kml μέσα στο KMZ');
    return await kmlFile.async('text');
  }
  async function loadKmzSmart(url){
    let buf;
    if (location.protocol === 'file:') {
      const file = await pickLocalKMZ();
      buf = await file.arrayBuffer();
    } else {
      buf = await loadKmzViaFetch(url);
    }
    return await unzipKmlFromArrayBuffer(buf); // -> KML string
  }

  // ---------- UI: προσθήκη γραμμής στο panel + υπο-διακόπτες ----------
  function addCheckboxRow(){
    const list = document.querySelector('.layer-list');
    if (!list || document.getElementById(MASTER_ID)) return;

    const row = document.createElement('div');
    row.className = 'layer-item';
    row.innerHTML = `
      <div class="layer-name">${TITLE}</div>
      <label class="switch">
        <input id="${MASTER_ID}" type="checkbox">
        <span class="track"></span><span class="thumb"></span>
      </label>
      <div class="layer-sub">Οδεύσεις & σημεία Χ.Θ. (KMZ)</div>

      <div class="row-inline" style="grid-column:1/-1; gap:14px; margin-top:6px;">
        <label style="display:flex;align-items:center;gap:8px;">
          <input id="${TOGGLE_LINE_ID}" type="checkbox" checked>
          <span>Οδεύση (γραμμή)</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;">
          <input id="${TOGGLE_POINT_ID}" type="checkbox" checked>
          <span>Σημεία Χ.Θ.</span>
        </label>
      </div>
    `;
    list.appendChild(row);

    const master = document.getElementById(MASTER_ID);
    const tLine  = document.getElementById(TOGGLE_LINE_ID);
    const tPts   = document.getElementById(TOGGLE_POINT_ID);

    master.addEventListener('change', async (e)=>{
      if (e.target.checked){
        if (!loaded) {
          try { await loadAndBuild(); loaded = true; }
          catch(err){
            console.error('KMZ load error:', err);
            alert('Δεν μπόρεσα να φορτώσω το KMZ (δες κονσόλα).');
            master.checked = false;
            return;
          }
        }
        kmzRoot.addTo(window.map);
        // εφάρμοσε τρέχουσες υπο-επιλογές
        setVisible(linesGrp, tLine.checked);
        setVisible(ptsGrp,   tPts.checked);
      } else {
        kmzRoot.remove();
      }
    });

    tLine.addEventListener('change', ()=> setVisible(linesGrp, tLine.checked));
    tPts .addEventListener('change', ()=> setVisible(ptsGrp,   tPts.checked));
  }

  function setVisible(layer, on){
    try{
      if (!window.map) return;
      if (on) layer.addTo(window.map);
      else window.map.removeLayer(layer);
    }catch{}
  }

  // ---------- parsing βοηθητικά ----------
  function parseCoordsTextToLatLngs(coordText){
    return (coordText || '')
      .trim()
      .split(/\s+/)
      .map(s => {
        const [lng, lat] = s.split(',').map(Number); // lng,lat[,alt]
        return [lat, lng];
      })
      .filter(([lat,lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }
  // gx:Track -> <gx:coord> "lon lat alt" ανά γραμμή
  function parseGxTrackToLatLngs(trackEl){
    const nodes = trackEl.querySelectorAll('gx\\:coord, coord'); // namespaces-safe
    const out = [];
    nodes.forEach(n=>{
      const parts = (n.textContent||'').trim().split(/\s+/).map(Number);
      if (parts.length >= 2){
        const [lng, lat] = parts; // μορφή: lon lat (alt προαιρετικό)
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
      }
    });
    return out;
  }
  function defaultLineStyle(){
    return {
      color: '#00A3FF',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      renderer: canvasRenderer,
      smoothFactor: 1.2
    };
  }

  // ---------- φόρτωση & σχεδίαση ----------
  async function loadAndBuild(){
    const kmlText = await loadKmzSmart(KMZ_FILE);
    const dom = new DOMParser().parseFromString(kmlText, 'text/xml');

    // Cluster για σημεία (αν υπάρχει η βιβλιοθήκη)
    if (L.markerClusterGroup) {
      cluster = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        chunkedLoading: true
      }).addTo(ptsGrp);
    } else {
      cluster = ptsGrp;
    }

    // Γραμμές / Οδεύσεις: LineString + gx:Track (μέσα/έξω από MultiGeometry)
    let lineCount = 0;

    // a) LineString
    dom.querySelectorAll('Placemark LineString').forEach(ls=>{
      const pm   = ls.closest('Placemark');
      const name = (pm && pm.getElementsByTagName('name')[0]?.textContent || '').trim();
      const coordsTxt = ls.getElementsByTagName('coordinates')[0]?.textContent || '';
      const latlngs = parseCoordsTextToLatLngs(coordsTxt);
      if (latlngs.length >= 2){
        const pl = L.polyline(latlngs, defaultLineStyle()).addTo(linesGrp);
        if (name) pl.bindTooltip(name, { permanent:false, direction:'center' });
        try { pl.bringToFront && pl.bringToFront(); } catch {}
        lineCount++;
      }
    });

    // b) gx:Track
    dom.querySelectorAll('Placemark gx\\:Track, Placemark Track').forEach(tr=>{
      const pm   = tr.closest('Placemark');
      const name = (pm && pm.getElementsByTagName('name')[0]?.textContent || '').trim();
      const latlngs = parseGxTrackToLatLngs(tr);
      if (latlngs.length >= 2){
        const pl = L.polyline(latlngs, defaultLineStyle()).addTo(linesGrp);
        if (name) pl.bindTooltip(name, { permanent:false, direction:'center' });
        try { pl.bringToFront && pl.bringToFront(); } catch {}
        lineCount++;
      }
    });

    console.info('[KMZ] Γραμμές που σχεδιάστηκαν:', lineCount);

    // Σημεία (Χ.Θ.)
    const ptNodes = dom.querySelectorAll('Placemark Point');
    ptNodes.forEach(pt=>{
      const pm   = pt.closest('Placemark');
      const name = (pm && pm.getElementsByTagName('name')[0]?.textContent || '').trim();

      const coord = pt.getElementsByTagName('coordinates')[0]?.textContent || '';
      const [lng, lat] = coord.split(',').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const icon = L.divIcon({
        className: 'cat-pin',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#475569;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`,
        iconSize: [20,20],
        iconAnchor: [10,10]
      });
      const m = L.marker([lat, lng], { icon });

      if (name) m.bindTooltip(name, { permanent:true, direction:'right', opacity:0.9 });

      m.bindPopup(
        `<div class="card"><div class="card__body"><div class="title">${name || 'Χ.Θ.'}</div>
         <div class="mono">${lat.toFixed(6)}, ${lng.toFixed(6)}</div></div></div>`,
        { className:'popup-card popup-compact', maxWidth:320 }
      );

      cluster.addLayer(m);
    });

    // Zoom σε όλα
    try{
      const b1 = linesGrp.getBounds();
      const b2 = (cluster.getBounds ? cluster.getBounds() : null);
      let bounds = null;
      if (b1 && b1.isValid() && b2 && b2.isValid()) bounds = b1.extend(b2);
      else if (b1 && b1.isValid()) bounds = b1;
      else if (b2 && b2.isValid()) bounds = b2;
      if (bounds && window.map && bounds.isValid()) window.map.fitBounds(bounds.pad(0.15));
    }catch{}
  }

  // bootstrap UI
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', addCheckboxRow, { once:true });
  } else {
    addCheckboxRow();
  }
}
