// signpicker.js — Λίστες που καθρεφτίζουν τους φακέλους του root (folder-driven)
// Ρυθμιστικές  -> ./ρυθμιστικές/<ΚΩΔΙΚΟΣ>.(png|PNG|jpg|JPG|webp)
// Κινδύνου     -> ./κινδύνου/<ΚΩΔΙΚΟΣ>.(png|PNG|jpg|JPG|webp)

(function(){
  // ===== ΡΥΘΜΙΣΕΙΣ ΕΙΚΟΝΩΝ =====
  const GROUP_DIR = {
    'ρυθμιστικές': 'ρυθμιστικες',
    'κινδύνου': 'κινδυνου'
  };
  const IMG_BASES = ['', '.']; // root & ./root
  const EXTENSIONS = ['.png'];
  // Μετατροπή ελληνικού prefix σε λατινικό (Κ->K, Ρ->R, Π->P)
  function latinizeCodePrefix(code){
    return String(code)
      .replace(/^Κ-/, 'K-')
      .replace(/^Ρ-/, 'R-')
      .replace(/^Π-/, 'P-');
  }

  // Αφαίρεση τόνων (π.χ. κινδύνου -> κινδυνου)
  function stripTonous(s){
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
  }


  
  // Επιλογή φακέλου από prefix του κωδικού
  function folderForCode(code){
    const s = String(code).toUpperCase();
    return s.startsWith('Κ-') ? GROUP_DIR['κινδύνου'] : GROUP_DIR['ρυθμιστικές'];
  }
// ===== ΚΑΤΑΣΤΑΣΗ =====
  let catalog = null; // θα χρησιμοποιηθεί μόνο ως πηγή κωδικών, ΟΧΙ για grouping

  // ===== HELPERS =====
  const $ = (id)=> document.getElementById(id);

  function getInlineCatalog(){
    try{
      const el = $('signCatalogJSON');
      if (!el) return null;
      const txt = (el.textContent || el.innerText || '').trim();
      return txt ? JSON.parse(txt) : null;
    }catch(e){
      console.warn('[signpicker] inline catalog parse failed', e);
      return null;
    }
  }

  async function loadCatalog(){
    if (catalog) return catalog;
    const inline = getInlineCatalog();
    if (inline) { catalog = inline; return catalog; }
    
  // Προαιρετικό manifest: λίστες με ΟΝΟΜΑΤΑ PNG που υπάρχουν πραγματικά
  let manifest = null; // { 'ρυθμιστικές': ['Ρ-1.png', ...], 'κινδύνου': ['Κ-1.png', ...] }

  function getInlineManifest(){
    try{
      const el = document.getElementById('signManifestJSON');
      if (!el) return null;
      const txt = (el.textContent || el.innerText || '').trim();
      return txt ? JSON.parse(txt) : null;
    }catch(e){
      console.warn('[signpicker] inline manifest parse failed', e);
      return null;
    }
  }

  async function loadManifest(){
    if (manifest) return manifest;
    const inline = getInlineManifest();
    if (inline) { manifest = inline; return manifest; }
    try{
      const res = await fetch('sign_manifest.json', { cache:'no-cache' });
      if (!res.ok) throw new Error(res.statusText);
      manifest = await res.json();
      return manifest;
    }catch(e){
      manifest = null; // συνεχίζουμε χωρίς manifest
      return manifest;
    }
  }
try{
      const res = await fetch('sign_catalog.json', { cache:'no-cache' });
      if (!res.ok) throw new Error(res.statusText);
      catalog = await res.json();
      return catalog;
    }catch(e){
      console.error('[signpicker] Αποτυχία φόρτωσης sign_catalog.json', e);
      alert('Αποτυχία φόρτωσης πινακίδων. Ελέγξτε το sign_catalog.json ή το inline block.');
      catalog = { 'ρυθμιστικές': [], 'κινδύνου': [] };
      return catalog;
    }
  }

  // Ενιαία λίστα κωδικών (unique, με σειρά εμφάνισης όπως υπάρχουν στο catalog)
  function allCodes(){
    const r = (catalog?.['ρυθμιστικές'] || []);
    const k = (catalog?.['κινδύνου'] || []);
    const seen = new Set(), out = [];
    [...r, ...k].forEach(code => { if(!seen.has(code)){ seen.add(code); out.push(code); }});
    return out;
  }

  // Δημιουργεί πιθανούς δρόμους ΜΟΝΟ για τον φάκελο της τρέχουσας κατηγορίας
  function buildCandidatesFor(group, code){
    const folder = GROUP_DIR[group] || group; // ο φάκελος στο root
    const raw = String(code);
    const enc = encodeURIComponent(raw);
    const cands = [];
    IMG_BASES.forEach(base=>{
      EXTENSIONS.forEach(ext=>{
        const pfx = base ? base + '/' : '';
        // raw όνομα
        cands.push(`${pfx}${folder}/${raw}${ext}`);
        // url-encoded όνομα (για ιδιαίτερους χαρακτήρες)
        if (enc !== raw) cands.push(`${pfx}${folder}/${enc}${ext}`);
      });
    });
    return cands;
  }

  // Ελέγχει αν ΥΠΑΡΧΕΙ εικόνα του code στον φάκελο της κατηγορίας (δοκιμάζοντας candidates)
  function existsInGroup(group, code){
    return new Promise(resolve=>{
      const candidates = buildCandidatesFor(group, code);
      let i = 0;
      const img = new Image();
      const done = (ok, src)=> resolve({ ok, src, code });
      img.onload = ()=> done(true, img.src);
      img.onerror = ()=>{
        i++;
        if (i >= candidates.length) done(false, null);
        else img.src = candidates[i];
      };
      img.src = candidates[i];
    });
  }

  function placeholderNode(){
    const ph = document.createElement('div');
    Object.assign(ph.style, {
      width:'56px', height:'56px', display:'grid', placeItems:'center',
      background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'8px', fontWeight:'800'
    });
    ph.textContent = '⛔';
    return ph;
  }

  // ===== UI =====
  async function renderThumbs(groupFilter, query){
    const wrap = $('signThumbs');
    if (!wrap || !catalog) return;
    wrap.innerHTML = '';

    if (!groupFilter){
      wrap.innerHTML = '<small style="color:#64748b">Επίλεξε πρώτα κατηγορία: <b>Ρυθμιστικές</b> ή <b>Κινδύνου</b>.</small>';
      return;
    }

    const codes = (catalog?.[groupFilter] || []); // μόνο οι κωδικοί της επιλεγμένης κατηγορίας
    const q = (query||'').trim().toLowerCase();

    // Προσωρινό μήνυμα
    wrap.innerHTML = '<small style="color:#64748b">Έλεγχος διαθέσιμων εικόνων στον φάκελο…</small>';

    // Απλά πάρε όλα τα codes χωρίς προ-έλεγχο ύπαρξης αρχείου
    let items = codes.slice();

    // Εφαρμογή αναζήτησης (αν υπάρχει)
    if (q) items = items.filter(c => String(c).toLowerCase().includes(q));

    // Απόδοση
    wrap.innerHTML = '';
    if (!items.length){
      wrap.innerHTML = '<small style="color:#64748b">Δεν βρέθηκαν πινακίδες στον φάκελο της κατηγορίας για τα φίλτρα.</small>';
      return;
    }

    items.forEach(code=>{
      const div = document.createElement('div');
      div.className = 'sign-thumb';
      div.tabIndex = 0;

      const img = document.createElement('img');
      img.alt = code;
      img.loading = 'lazy';
      img.style.width = '56px';
      img.style.height = '56px';
      img.style.objectFit = 'contain';

      // Βάλε πρώτο πιθανό μονοπάτι. Αν (σπάνια) αποτύχει, δείξε placeholder.
      const firstSrc = buildCandidatesFor(groupFilter, code)[0];
      img.onerror = ()=> { img.onerror = null; img.replaceWith(placeholderNode()); };
      img.src = firstSrc;

      const codeEl = document.createElement('div');
      codeEl.className = 'code';
      codeEl.textContent = code;

      function pick(){
        const input = $('signCode');
        if (input) {
          input.value = code;
          input.dispatchEvent(new Event('change', {bubbles:true}));
        }
        const prev = $('signSelectedPreview');
        if (prev) prev.textContent = `Επιλέχθηκε: ${code}`;
        wrap.querySelectorAll('.sign-thumb.is-selected').forEach(x=> x.classList.remove('is-selected'));
        div.classList.add('is-selected');
        const panel = $('signPickerPanel');
        if (panel) panel.style.display = 'none';
      }
      div.addEventListener('click', pick);
      div.addEventListener('keydown', e=>{ if (e.key==='Enter') pick(); });

      div.append(img, codeEl);
      wrap.appendChild(div);
    });
  }

  async function openPicker(initialGroup){
    if (typeof loadManifest === 'function') { try { await loadManifest(); } catch(_){} }
    const data = await loadCatalog();
    if (!data) return;

    const panel = $('signPickerPanel');
    panel.querySelectorAll('.chip').forEach(ch=> ch.classList.remove('is-active'));

    let currentGroup = initialGroup || null;
    if (initialGroup){
      const chip = panel.querySelector(`.chip[data-group="${initialGroup}"]`);
      chip && chip.classList.add('is-active');
    }

    // listeners στα chips (μία φορά)
    panel.querySelectorAll('.chip').forEach(ch=>{
      if (ch._bound) return;
      ch._bound = true;
      ch.addEventListener('click', ()=>{
        currentGroup = ch.getAttribute('data-group');
        panel.querySelectorAll('.chip').forEach(c=> c.classList.remove('is-active'));
        ch.classList.add('is-active');
        renderThumbs(currentGroup, $('signSearch')?.value);
      });
    });

    const search = $('signSearch');
    if (search && !search._bound){
      search._bound = true;
      search.addEventListener('input', ()=> renderThumbs(currentGroup, search.value));
    }

    const clear = $('signClear');
    if (clear && !clear._bound){
      clear._bound = true;
      clear.addEventListener('click', ()=>{
        const input = $('signCode'); if (input) input.value='';
        const prev = $('signSelectedPreview'); if (prev) prev.textContent='';
        search && (search.value='');
        renderThumbs(currentGroup, '');
      });
    }

    const close = $('signClose');
    if (close && !close._bound){
      close._bound = true;
      close.addEventListener('click', ()=> panel.style.display='none');
    }

    renderThumbs(currentGroup, search?.value);
    panel.style.display = 'block';
  }

  function wireButton(){
    const btn = $('btnPickSign');
    const panel = $('signPickerPanel');
    if (!btn || btn._bound) return;
    btn._bound = true;

    // Άνοιγμα «ουδέτερο»
    btn.addEventListener('click', ()=> openPicker(null));

    // Κλείσιμο με κλικ εκτός
    document.addEventListener('click', (ev)=>{
      if (!panel || panel.style.display==='none') return;
      if (!panel.contains(ev.target) && ev.target !== btn) panel.style.display='none';
    });
  }

  // Hook για να εμφανίζεται η σειρά μόνο στην κατηγορία «Πινακίδες»
  const origRender = window.renderDamageForm;
  window.renderDamageForm = function(category){
    origRender && origRender(category);
    const row = $('dmRowSign');
    if (row) row.style.display = (String(category||'') === 'Πινακίδες') ? '' : 'none';
    wireButton();
  };
})();
