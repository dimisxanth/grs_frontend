// kmz_layer.js — Toggle layer για ΧΘ από KMZ, με μόνιμες ετικέτες & clustering
// ΛΥΣΗ Β: Όταν άνοιγμα είναι από file:// → χρησιμοποιεί file picker (χωρίς CORS)
// Όταν είναι από http/https → κάνει fetch το KMZ κανονικά.

(function waitForLeafletAndDOM(){
  const domReady = document.readyState !== 'loading';
  const leafletReady = !!(window.L && window.L.map);
  if (domReady && leafletReady) return initKmzLayer();
  setTimeout(waitForLeafletAndDOM, 150);
})();

function initKmzLayer(){
  const KMZ_FILE = 'ΧΛΜ ΘΕΣΕΙΣ ΠΕΧ.kmz';   // ή π.χ. 'xth.kmz' αν το μετονομάσεις
  const INPUT_ID = 'layerKmzXth';
  const TITLE    = 'Χιλιομετρικές Θέσεις ΠΕΧ';

  const kmzRoot = L.layerGroup();
  let loaded = false;
  let cluster = null;

  // ------------- helpers για file:// vs http(s) -------------
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
      // file:// → επέλεξε τοπικά το KMZ, αποφεύγοντας CORS
      const file = await pickLocalKMZ();
      buf = await file.arrayBuffer();
    } else {
      // http/https → fetch
      buf = await loadKmzViaFetch(url);
    }
    return await unzipKmlFromArrayBuffer(buf); // επιστρέφει KML text
  }

  // ------------- UI: προσθήκη checkbox στο panel -------------
  function addCheckboxRow(){
    const list = document.querySelector('.layer-list');
    if (!list || document.getElementById(INPUT_ID)) return;

    const row = document.createElement('div');
    row.className = 'layer-item';
    row.innerHTML = `
      <div class="layer-name">${TITLE}</div>
      <label class="switch">
        <input id="${INPUT_ID}" type="checkbox">
        <span class="track"></span><span class="thumb"></span>
      </label>
      <div class="layer-sub">Οδεύσεις & σημεία Χ.Θ. (KMZ)</div>
    `;
    list.appendChild(row);

    document.getElementById(INPUT_ID).addEventListener('change', async (e)=>{
      if (e.target.checked){
        if (!loaded) {
          try {
            await loadKmz(); // lazy load
            loaded = true;
          } catch(err){
            console.error('KMZ load error:', err);
            alert('Δεν μπόρεσα να φορτώσω το KMZ (δες κονσόλα για λεπτομέρειες).');
            e.target.checked = false;
            return;
          }
        }
        kmzRoot.addTo(window.map);
      } else {
        kmzRoot.remove();
      }
    });
  }

  // ------------- Φόρτωση & σχεδίαση KMZ -------------
  async function loadKmz(){
    // 1) Πάρε KML text μέσω smart loader (file picker για file://, fetch για http/s)
    const kmlText = await loadKmzSmart(KMZ_FILE);

    // 2) Parse KML DOM
    const dom = new DOMParser().parseFromString(kmlText, "text/xml");

    // 3) Ομάδες γραμμών & σημείων
    const linesGroup  = L.featureGroup().addTo(kmzRoot);
    const pointsGroup = L.featureGroup().addTo(kmzRoot);

    // 4) Clustering (αν υπάρχει η βιβλιοθήκη, αλλιώς fallback)
    if (L.markerClusterGroup) {
      cluster = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        chunkedLoading: true
      }).addTo(pointsGroup);
    } else {
      cluster = pointsGroup; // fallback χωρίς κλάστερ
    }

    // 5) LineString (οδεύσεις)
    dom.querySelectorAll('Placemark LineString').forEach(ls=>{
      const pm = ls.closest('Placemark');
      const name = (pm && pm.getElementsByTagName('name')[0]?.textContent || '').trim();

      const coordText = ls.getElementsByTagName('coordinates')[0]?.textContent || '';
      const latlngs = coordText
        .trim()
        .split(/\s+/)
        .map(s=>{
          const [lng, lat] = s.split(',').map(Number);
          return [lat, lng];
        })
        .filter(([lat,lng]) => Number.isFinite(lat) && Number.isFinite(lng));

      if (latlngs.length >= 2){
        const pl = L.polyline(latlngs, { color:'#00A3FF', weight:3, opacity:0.8 });
        if (name) pl.bindTooltip(name, {permanent:false, direction:'center'});
        linesGroup.addLayer(pl);
      }
    });

    // 6) Points (πινέζες Χ.Θ. με μόνιμα labels)
    dom.querySelectorAll('Placemark Point').forEach(pt=>{
      const pm   = pt.closest('Placemark');
      const name = (pm && pm.getElementsByTagName('name')[0]?.textContent || '').trim();

      const coord = pt.getElementsByTagName('coordinates')[0]?.textContent || '';
      const [lng, lat] = coord.split(',').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      // Ελαφρύ divIcon
      const icon = L.divIcon({
        className: 'cat-pin',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#475569;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`,
        iconSize: [20,20],
        iconAnchor: [10,10]
      });
      const m = L.marker([lat, lng], { icon });

      // Μόνιμο tooltip με όνομα Χ.Θ.
      if (name) m.bindTooltip(name, { permanent:true, direction:'right', opacity:0.9 });

      // Ελαφρύ popup (προαιρετικό)
      m.bindPopup(
        `<div class="card"><div class="card__body"><div class="title">${name || 'Χ.Θ.'}</div>
         <div class="mono">${lat.toFixed(6)}, ${lng.toFixed(6)}</div></div></div>`,
        { className:'popup-card popup-compact', maxWidth:320 }
      );

      cluster.addLayer(m);
    });

    // 7) Zoom σε όλα με padding
    try {
      const b1 = linesGroup.getBounds();
      const b2 = (cluster.getBounds ? cluster.getBounds() : null);
      let bounds = null;
      if (b1 && b1.isValid() && b2 && b2.isValid()) bounds = b1.extend(b2);
      else if (b1 && b1.isValid()) bounds = b1;
      else if (b2 && b2.isValid()) bounds = b2;
      if (bounds && window.map && bounds.isValid()) window.map.fitBounds(bounds.pad(0.15));
    } catch(e){ /* no-op */ }
  }

  // ------------- bootstrap: βάλε το checkbox στο panel -------------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', addCheckboxRow, { once:true });
  } else {
    addCheckboxRow();
  }
}
