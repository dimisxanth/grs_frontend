// exports.js — cleaned: uses global window.normalizeStatus / window.statusGR only

function clearAllImportInputs(){
  try {
    ['impExcel','impKML','impKMZ','impGeoJSON','impCSV'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch(e){ /* noop */ }
}
function hideMarkerLabels(){
  try {
    if (Array.isArray(damageMarkers)) {
      damageMarkers.forEach(m => {
        if (m && typeof m.unbindTooltip === 'function') {
          try { m.unbindTooltip(); } catch(e){}
        }
      });
    }
  } catch(e){ /* noop */ }
}

// ---------- GeoJSON export ----------
function exportToGeoJSON(){
  const features = (damageMarkers || []).map(m=>{
    const r = m?.options?.data || {};
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: { ...r }
    };
  });
  const fc = { type:"FeatureCollection", features };
  const __d = (typeof getDirectionText==='function' ? getDirectionText() : '');
  const fname = ( __d ? safeFilenameKeepSpaces(__d) : 'Καταγραφές') + '.geojson';
  saveAs(new Blob([JSON.stringify(fc,null,2)], {type:'application/geo+json'}), fname);
}

// ---------- CSV export ----------
function exportToCSV(){
  const headers = ['Κωδικός','Κατεύθυνση','Κατηγορία','Ποσότητα','Κλάδος','Δ.Π.Π.','Πινακίδα','Περιγραφή','Γεωγρ. Πλάτος','Γεωγρ. Μήκος','Ημερομηνία','Ώρα','Κατάσταση'];
  const rows = (damageMarkers || []).map(m=>{
    const r = m.options.data || {};
    return [
      r.seqLabel||'',
      r.directionText||'',
      r.category||'',
      r.quantity||'',
      r.side||'',
      r.dpp||'',
      r.signCode||'',
      (r.description||'').toString().replaceAll('"','""'),
      r.lat ?? '', r.lng ?? '',
      r.date || '', r.time || '',
      window.statusGR(window.normalizeStatus(r.status||'new'))
    ];
  });
  const csv = [headers.join(','), ...rows.map(row => row.map(v => typeof v==='string' && v.includes(',') ? `"${v}"` : v).join(','))].join('\n');
  const __d = (typeof getDirectionText==='function' ? getDirectionText() : '');
  const fname = ( __d ? safeFilenameKeepSpaces(__d) : 'Καταγραφές') + '.csv';
  saveAs(new Blob([csv], {type:'text/csv;charset=utf-8'}), fname);
}

// ===== IMPORTS =====

function readFileAsText(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>res(fr.result);
    fr.onerror=rej;
    fr.readAsText(file);
  });
}
function readFileAsArrayBuffer(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>res(fr.result);
    fr.onerror=rej;
    fr.readAsArrayBuffer(file);
  });
}

// ---------- Excel ----------
async function importFromExcel(file){
  const buf = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type:'array' });
  const get = (o,k)=> o[k] ?? o[k?.toLowerCase?.()] ?? '';

  wb.SheetNames.forEach(name=>{
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:true });
    rows.forEach(row=>{
      let statusRaw = get(row,'Κατάσταση') || get(row,'status');
      const r = {
        group: name || (file && file.name) || 'Excel',
        seqLabel: get(row,'Κωδικός'),
        directionText: get(row,'Κατεύθυνση'),
        category: get(row,'Κατηγορία') || (get(row,'Κωδικός')||'').toString().trim().replace(/\s+\d+$/,'') || 'Γενικά Προβλήματα',
        quantity: get(row,'Ποσότητα'),
        side: get(row,'Κλάδος'),
        dpp: get(row,'Δ.Π.Π.'),
        signCode: get(row,'Πινακίδα'),
        description: get(row,'Περιγραφή'),
        lat: +get(row,'Γεωγρ. Πλάτος'),
        lng: +get(row,'Γεωγρ. Μήκος'),
        date: get(row,'Ημερομηνία'),
        time: get(row,'Ώρα'),
        status: statusRaw ? window.normalizeStatus(statusRaw) : 'old' // default old ΜΟΝΟ αν λείπει
      };
      addRecordAsMarker(r);
    });
  });
  saveToLocal?.();
  try {
    window.refreshCategoryChecklist?.();
    window.refreshGroupChecklist?.();
    window.applyAllSettingsToAllMarkers?.();
    window.rebindMarkerPopups?.();
  } catch(e) {}

}

// ---------- KML helpers ----------
function buildKmlStyleIndex(dom){
  const idx = {};
  const styles = Array.from(dom.getElementsByTagName('Style'));
  styles.forEach(st=>{
    const id = st.getAttribute('id');
    const href = st.getElementsByTagName('href')[0]?.textContent || '';
    const color = st.getElementsByTagName('color')[0]?.textContent || '';
    if (id) idx['#'+id] = { href, color };
  });
  return idx;
}
function inferStatusFromStyleObj(st){
  if (!st) return '';
  const href = st.href || '';
  if (/grn/i.test(href)) return 'done';
  if (/ylw/i.test(href)) return 'old';
  if (/red/i.test(href)) return 'new';
  // fallback μέσω color (AABBGGRR)
  const c = (st.color||'').toLowerCase();
  if (c.startsWith('ff') && c.length===8){
    if (/^(ff00ff00|ff5ec522)$/i.test(c)) return 'done'; // green-ish
    if (/^(ff00ffff|ff47e3fd|ff47dfe0|ffe7d047)$/i.test(c)) return 'old'; // yellow-ish (ABGR)
    if (/^(ff0000ff|ff3c93fb)$/i.test(c)) return 'new'; // red/orange-ish
  }
  return '';
}
function parseDescField(desc, label){
  const re = new RegExp(`<b>${label}:</b>\\s*([^<]+)`, 'i');
  return (desc.match(re)?.[1]||'').trim();
}

// ---------- KML ----------
function parseKMLTextAndAddMarkers(text){
  const dom = new DOMParser().parseFromString(text, "text/xml");
  const styleIndex = buildKmlStyleIndex(dom);
  const placemarks = Array.from(dom.getElementsByTagName('Placemark'));
  placemarks.forEach(pm=>{
    const name = (pm.getElementsByTagName('name')[0]?.textContent||'').trim();
    const coords = (pm.getElementsByTagName('coordinates')[0]?.textContent||'').trim().split(',');
    const lng = +coords[0], lat = +coords[1];
    const desc = pm.getElementsByTagName('description')[0]?.textContent || '';
    const styleUrl = pm.getElementsByTagName('styleUrl')[0]?.textContent || '';

    // derive group from ancestor Folder names
    let grp = '';
    try {
      let node = pm.parentNode, names = [];
      while (node && node.nodeName) {
        if (node.nodeName === 'Folder' || node.nodeName === 'Document') {
          const nm = (node.getElementsByTagName('name')[0]?.textContent||'').trim();
          if (nm) names.unshift(nm);
        }
        node = node.parentNode;
      }
      grp = names.join(' / ');
    } catch(e) { grp = ''; }
    // προτεραιότητα: description Κατάσταση -> styleUrl/icon -> default 'old'
    let statusRaw = parseDescField(desc, 'Κατάσταση');
    if (!statusRaw && styleUrl) statusRaw = inferStatusFromStyleObj(styleIndex[styleUrl]);
    const status = statusRaw ? window.normalizeStatus(statusRaw) : 'old';

    const r = {
      seqLabel: name,
      group: grp || 'KML',
      category: name.replace(/\s+\d+$/,'') || 'Γενικά Προβλήματα',
      seqNum: +(name.match(/(\d+)\s*$/)?.[1]||''),
      directionText: parseDescField(desc,'Κατεύθυνση'),
      quantity: parseDescField(desc,'Ποσότητα'),
      side: parseDescField(desc,'Κλάδος'),
      dpp: parseDescField(desc,'Δ.Π.Π.'),
      signCode: parseDescField(desc,'Πινακίδα'),
      description: parseDescField(desc,'Περιγραφή'),
      date: parseDescField(desc,'Ημερομηνία'),
      time: parseDescField(desc,'Ώρα'),
      lat, lng, photo:'',
      status
    };
    addRecordAsMarker(r);
  });
}

async function importFromKML(file){
  const text = await readFileAsText(file);
  parseKMLTextAndAddMarkers(text);
  recomputeCountersFromMarkers();
  saveToLocal();
  try {
    window.refreshCategoryChecklist?.();
    window.refreshGroupChecklist?.();
    window.applyAllSettingsToAllMarkers?.();
    window.rebindMarkerPopups?.();
  } catch(e){}
  clearAllImportInputs();
  alert('Ολοκληρώθηκε το import από KML.');
}

async function importFromKMZ(file){
  if (typeof JSZip === 'undefined'){ alert('Το JSZip δεν είναι διαθέσιμο.'); return; }
  const buf = await readFileAsArrayBuffer(file);
  const zip = await JSZip.loadAsync(buf);
  const entries = zip.filter((p, f) => /\.kml$/i.test(p));
  if (!entries.length){ alert('Δεν βρέθηκε KML μέσα στο KMZ.'); return; }
  const doc = entries.find(e => /(^|\/)doc\.kml$/i.test(e.name)) || entries[0];
  const text = await doc.async('text');
  parseKMLTextAndAddMarkers(text);
  recomputeCountersFromMarkers();
  saveToLocal();
  try {
    window.refreshCategoryChecklist?.();
    window.refreshGroupChecklist?.();
    window.applyAllSettingsToAllMarkers?.();
    window.rebindMarkerPopups?.();
  } catch(e){}
  clearAllImportInputs();
  alert('Ολοκληρώθηκε το import από KMZ.');
}

// ---------- GeoJSON ----------
async function importFromGeoJSON(file){
  const text = await readFileAsText(file);
  const gj = JSON.parse(text);
  (gj.features||[]).forEach(f=>{
    const p = f.properties||{}
    const _grp = p.group || (gj.name||'').trim() || (file && file.name) || 'GeoJSON';
    const [lng,lat] = (f.geometry?.coordinates||[]);
    const r = {
      ...p,
      lat: p.lat ?? lat, lng: p.lng ?? lng,
      photo:'',
      status: p.status ? window.normalizeStatus(p.status) : 'old' // default μόνο αν λείπει
    };
    if (!r.category) r.category = 'Γενικά Προβλήματα';
    addRecordAsMarker(r);
  });
  recomputeCountersFromMarkers();
  saveToLocal();
  try {
    window.refreshCategoryChecklist?.();
    window.refreshGroupChecklist?.();
    window.applyAllSettingsToAllMarkers?.();
    window.rebindMarkerPopups?.();
  } catch(e){}
  clearAllImportInputs();
  alert('Ολοκληρώθηκε το import από GeoJSON.');
}

// ---------- CSV ----------
async function importFromCSV(file){
  const text = await readFileAsText(file);
  const lines = text.replace(/\r\n?/g,'\n').split('\n').filter(Boolean);
  const headers = lines.shift().split(',').map(h=>h.replace(/(^"|"$)/g,'').trim().toLowerCase());
  const idx = (name)=> headers.indexOf(String(name||'').toLowerCase());
  lines.forEach(line=>{
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g)?.map(c=>c.replace(/^"|"$/g,'').replace(/""/g,'"'))||[];
    const val = (h)=> cols[idx(h)]||'';
    const statusRaw = val('κατάσταση') || val('status') || '';
    const r = {
      seqLabel: val('κωδικός') || val('code'),
      directionText: val('κατεύθυνση') || val('direction'),
      category: val('κατηγορία') || val('category') || (val('κωδικός')||'').toString().trim().replace(/\s+\d+$/,'') || 'Γενικά Προβλήματα',
      quantity: val('ποσότητα') || val('quantity'),
      side: val('κλάδος') || val('side'),
      dpp: val('δ.π.π.') || val('dpp') || val('priority'),
      signCode: val('πινακίδα') || '',
      description: val('περιγραφή') || val('description') || '',
      lat: +(val('γεωγρ. πλάτος') || val('lat') || 0),
      lng: +(val('γεωγρ. μήκος') || val('lng') || 0),
      date: val('ημερομηνία') || val('date') || '',
      time: val('ώρα') || val('time') || '',
      status: statusRaw ? window.normalizeStatus(statusRaw) : 'old'
    };
    addRecordAsMarker(r);
  });
  saveToLocal?.();
  try {
    window.refreshCategoryChecklist?.();
    window.refreshGroupChecklist?.();
    window.applyAllSettingsToAllMarkers?.();
    window.rebindMarkerPopups?.();
  } catch(e) {}

}

/* ===========================
   KML/KMZ pushpin styles ανά status
   done -> πράσινο, old -> κίτρινο, new -> κόκκινο
=========================== */
function statusKey(v){
  const s = window.normalizeStatus(v||'new');
  return (s==='done' ? 'done' : (s==='old' ? 'old' : 'new'));
}
function getStatusStyleInfo(s){
  const key = statusKey(s);
  const hrefs = {
    done: 'http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png',
    old:  'http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png',
    new:  'http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png'
  };
  return { id: `st_${key}`, href: hrefs[key] || hrefs.new };
}
function buildPushpinStylesKml(){
  const keys = ['new','old','done'];
  return keys.map(k=>{
    const { id, href } = getStatusStyleInfo(k);
    return `
    <Style id="${id}">
      <IconStyle>
        <scale>1.1</scale>
        <Icon><href>${href}</href></Icon>
        <hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>
      </IconStyle>
      <LabelStyle><scale>0.0</scale></LabelStyle>
    </Style>`;
  }).join('');
}

/* ===========================
   ΕΞΑΓΩΓΕΣ KML/KMZ με σωστά χρώματα & Κατάσταση
=========================== */

// ---------- Excel export ----------
function exportToExcel(){
  try{
    if (typeof XLSX === 'undefined') {
      alert('Η βιβλιοθήκη XLSX δεν φορτώθηκε.');
      return;
    }
    const grouped = {};
    (damageMarkers || []).forEach(m => {
      const r = m?.options?.data || {};
      (grouped[r.category || 'Χωρίς Κατηγορία'] ||= []).push(r);
    });
    const wb = XLSX.utils.book_new();
    let sheetCount = 0;

    const catOrder = Object.keys(grouped);
    catOrder.forEach(cat => {
      const rows = grouped[cat] || [];
      if (!rows.length) return;

      const headers = [
        'Κωδικός','Κατεύθυνση','Κατηγορία','Ποσότητα','Κλάδος','Δ.Π.Π.',
        ...(cat==='Πινακίδες' ? ['Πινακίδα'] : []),
        'Περιγραφή','Γεωγρ. Πλάτος','Γεωγρ. Μήκος','Ημερομηνία','Ώρα','Κατάσταση','Google Maps Link'
      ];

      const data = rows.map(r => [
        r.seqLabel || cat,
        r.directionText || '', r.category || '', r.quantity ?? '', r.side || '', r.dpp || '',
        ...(cat==='Πινακίδες' ? [r.signCode || ''] : []),
        r.description || '',
        r.lat ?? '', r.lng ?? '',
        r.date || '', r.time || '',
        window.statusGR(window.normalizeStatus(r.status||'new')),
        `https://maps.google.com/?q=${r.lat},${r.lng}`
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(h => ({ wch: Math.max(String(h).length + 2, 12) }));

      // Hyperlink στην τελευταία στήλη (Google Maps)
      const linkCol = headers.length - 1;
      rows.forEach((r, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: idx + 1, c: linkCol });
        const url = `https://maps.google.com/?q=${r.lat},${r.lng}`;
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        ws[cellRef].l = { Target: url, Tooltip: r.seqLabel || r.category || '' };
      });

      const safeName = (cat && typeof cat === 'string') ? cat.slice(0,31) : ('Φύλλο ' + (++sheetCount));
      XLSX.utils.book_append_sheet(wb, ws, safeName || ('Φύλλο ' + (++sheetCount)));
    });

    const __d = (typeof getDirectionText==='function' ? getDirectionText() : '');
    const fname = ( __d ? safeFilenameKeepSpaces(__d) : 'Καταγραφές') + '.xlsx';
    XLSX.writeFile(wb, fname);
  }catch(e){
    alert('Σφάλμα κατά την εξαγωγή Excel: ' + (e?.message||e));
  }
}

// ---------- KML export ----------
function exportToKML(){
  if (typeof saveAs === 'undefined') { alert('Η saveAs() δεν είναι διαθέσιμη.'); return; }

  const allRecords = [];
  (damageMarkers || []).forEach(m => { const r = m?.options?.data; if (r) allRecords.push(r); });

  let kml = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>';

  // Styles: fixed για new/old/done
  kml += buildPushpinStylesKml();

  // Ομαδοποίηση: Κατηγορία -> Περιγραφή
  const grouped = {};
  allRecords.forEach(r => {
    (grouped[r.category || 'Χωρίς Κατηγορία'] ||= []).push(r);
  });

  Object.entries(grouped).forEach(([cat, rows]) => {
    kml += `<Folder><name>${cat}</name>`;
    const sub = {};
    rows.forEach(r => {
      const key = (r.description && String(r.description).trim()) ? r.description : 'Χωρίς Περιγραφή';
      (sub[key] ||= []).push(r);
    });
    Object.entries(sub).forEach(([desc, items]) => {
      kml += `<Folder><name>${desc}</name>`;
      items.forEach(r => {
        const st = getStatusStyleInfo(r.status);
        kml += placemarkXML(cat, r, st.id);
      });
      kml += `</Folder>`;
    });
    kml += `</Folder>`;
  });

  kml += `</Document></kml>`;

  const __d = (typeof getDirectionText === 'function' ? getDirectionText() : '');
  const __base = (__d ? __d : 'Καταγραφές');
  const __safe = (typeof safeFilenameKeepSpaces === 'function')
    ? safeFilenameKeepSpaces(__base)
    : __base.replace(/[\\/:*?"<>|]+/g,'_');

  saveAs(new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }), __safe + '.kml');
}

// ---------- KMZ export ----------
async function exportToKMZ(){
  if (typeof JSZip === 'undefined') { alert('Το JSZip δεν είναι διαθέσιμο.'); return; }
  if (typeof saveAs === 'undefined') { alert('Η saveAs() δεν είναι διαθέσιμη.'); return; }

  const allRecords = [];
  (damageMarkers || []).forEach(m => { const r = m?.options?.data; if (r) allRecords.push(r); });

  let kml = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>';
  kml += buildPushpinStylesKml();

  const grouped = {};
  allRecords.forEach(r => { (grouped[r.category || 'Χωρίς Κατηγορία'] ||= []).push(r); });

  Object.entries(grouped).forEach(([cat, rows]) => {
    kml += `<Folder><name>${cat}</name>`;
    const sub = {};
    rows.forEach(r => {
      const key = (r.description && String(r.description).trim()) ? r.description : 'Χωρίς Περιγραφή';
      (sub[key] ||= []).push(r);
    });
    Object.entries(sub).forEach(([desc, items]) => {
      kml += `<Folder><name>${desc}</name>`;
      items.forEach(r => {
        const st = getStatusStyleInfo(r.status);
        kml += placemarkXML(cat, r, st.id);
      });
      kml += `</Folder>`;
    });
    kml += `</Folder>`;
  });

  kml += `</Document></kml>`;

  const __d = (typeof getDirectionText === 'function' ? getDirectionText() : '');
  const __base = (__d ? __d : 'Καταγραφές');
  const __safe = (typeof safeFilenameKeepSpaces === 'function')
    ? safeFilenameKeepSpaces(__base)
    : __base.replace(/[\\/:*?"<>|]+/g,'_');

  const zip = new JSZip();
  zip.file('doc.kml', kml);
  const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
  saveAs(blob, __safe + '.kmz');
}

// placemark με styleUrl + ρητή “Κατάσταση” στο description
function placemarkXML(cat, r, styleId){
  const name = r.seqLabel || cat;
  return `
<Placemark>
  <name>${name}</name>
  ${styleId ? `<styleUrl>#${styleId}</styleUrl>` : ''}
  <description><![CDATA[
    ${r.photo ? `<img src="${r.photo}" width="300"/><br/>` : ''}
    <b>Κατεύθυνση:</b> ${r.directionText||''}<br/>
    <b>Ποσότητα:</b> ${r.quantity||''}<br/>
    <b>Κλάδος:</b> ${r.side||''}<br/>
    <b>Δ.Π.Π.:</b> ${r.dpp||''}<br/>
    ${r.signCode ? `<b>Πινακίδα:</b> ${r.signCode}<br/>` : ''}
    <b>Περιγραφή:</b> ${r.description||''}<br/>
    <b>Κατάσταση:</b> ${window.statusGR(window.normalizeStatus(r.status))}<br/>
    <b>Ημερομηνία:</b> ${r.date||''}<br/>
    <b>Ώρα:</b> ${r.time||''}
  ]]> </description>
  <Point><coordinates>${r.lng},${r.lat},0</coordinates></Point>
</Placemark>`;
}

/* ===========================
   Data Menu wiring (EXPORTS / IMPORTS)
=========================== */

// άνοιγμα/κλείσιμο menu
function toggleDataMenu(force){
  const menu = document.getElementById('dataMenu');
  if (!menu) return;
  const show = (force===true) ? true : (force===false ? false : !menu.classList.contains('show'));
  menu.classList.toggle('show', show);
}

// κλείσιμο menu όταν κάνεις click εκτός
document.addEventListener('click', (e)=>{
  const menu = document.getElementById('dataMenu');
  if (!menu) return;
  const btn = document.getElementById('btnData');
  if ((btn && btn.contains(e.target)) || menu.contains(e.target)) return;
  menu.classList.remove('show');
});

// ESC κλείσιμο
document.addEventListener('keydown', (e)=>{
  if (e.key==='Escape') toggleDataMenu(false);
});

// wire-up όταν φορτώσει το DOM
document.addEventListener('DOMContentLoaded', ()=>{
  // κουμπί που ανοίγει το menu
  const btnData = document.getElementById('btnData');
  const menu    = document.getElementById('dataMenu');
  if (btnData && menu){
    btnData.addEventListener('click', ()=> toggleDataMenu());
  }

  // === EXPORTS ===
  const hasXLSX        = typeof XLSX !== 'undefined' && XLSX?.utils?.book_new;
  const btnExpExcel    = document.getElementById('expExcel');
  const btnExpKML      = document.getElementById('expKML');
  const btnExpGeoJSON  = document.getElementById('expGeoJSON');
  const btnExpCSV      = document.getElementById('expCSV');
  const btnExpKMZ      = document.getElementById('expKMZ');

  btnExpExcel?.addEventListener('click', () => {
    if (!hasXLSX) { alert('Η βιβλιοθήκη Excel (XLSX) δεν έχει φορτώσει.'); return; }
    try { exportToExcel(); } finally { toggleDataMenu(false); }
  });
  btnExpKML?.addEventListener('click', () => {
    try { exportToKML(); } finally { toggleDataMenu(false); }
  });
  btnExpGeoJSON?.addEventListener('click', () => {
    try { exportToGeoJSON(); } finally { toggleDataMenu(false); }
  });
  btnExpCSV?.addEventListener('click', () => {
    try { exportToCSV(); } finally { toggleDataMenu(false); }
  });
  btnExpKMZ?.addEventListener('click', () => {
    try { exportToKMZ(); } finally { toggleDataMenu(false); }
  });

  // === IMPORTS ===
  const pick = (id, handler) => {
    const el = document.getElementById(id);
    el?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try { await handler(f); }
      finally { e.target.value = ''; toggleDataMenu(false); }
    });
  };

  pick('impExcel',   f => importFromExcel(f));
  pick('impKML',     f => importFromKML(f));
  pick('impKMZ',     f => importFromKMZ(f));
  pick('impGeoJSON', f => importFromGeoJSON(f));
  pick('impCSV',     f => importFromCSV(f));
});
/* ===========================
   Server PNG export μέσω backend
=========================== */
async function exportViaBackend() {
  try {
    const supa = window.supabaseClient || (window.supabase && window.supabase.createClient && window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    if (!supa) { alert("Supabase client δεν είναι διαθέσιμος"); return; }

    const { data: { session } } = await supa.auth.getSession();
    if (!session) { alert("Κάνε login πρώτα (Supabase)."); return; }

    // 🔧 Φτιάχνουμε ένα απλό payload (δείγμα).
    // Αν θέλεις να συνθέσεις εικόνα από markers, μπορείς να στείλεις π.χ. τα data τους.
    const payload = {
      width: 800,
      height: 600,
      format: "PNG",
      add_watermark: true,
      // Δείγμα layer (μπορείς να αφαιρέσεις/αλλάξεις)
      layers: [
        // Παράδειγμα: αν έχεις διαθέσιμη εικόνα κάπου public, ή icons από το repo σου
        // { src: "κινδύνου/Κ-10.png", x: 40, y: 40, w: 200, h: 200, opacity: 1 }
      ],
      // Προαιρετικά: στείλε και markers αν θες ο server να κάνει πιο έξυπνη σύνθεση
      // markers: (window.damageMarkers || []).map(m => m?.options?.data).filter(Boolean)
    };

    const res = await fetch(`${window.BACKEND_URL}/api/export`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      alert("Σφάλμα server: " + txt);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.png";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Σφάλμα exportViaBackend: " + (e?.message || e));
  }
}

// (Προαιρετικό) Αν υπάρχει κουμπί με id="expPNG" στο μενού, σύνδεσέ το:
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('expPNG');
  if (btn) btn.addEventListener('click', () => { exportViaBackend(); toggleDataMenu(false); });
});
