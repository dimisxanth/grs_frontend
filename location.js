// /geo/location.js
export async function initGeo(opts = {}) {
  const state = {
    lastRaw: null,
    lastFiltered: null,
    kalman: new Kalman2D(),
    listeners: new Set(),
    watchId: null,
    fastGot: false,
  };

  // iOS: ζήτα άδεια μετά από χειρονομία χρήστη, αν ζητηθεί.
  if (opts.askPermissionOnGesture) {
    const ask = () => navigator.permissions?.query?.({ name: 'geolocation' })
      .then(()=>{}) .catch(()=>{});
    window.addEventListener('click', ask, { once: true });
    window.addEventListener('touchstart', ask, { once: true });
  }

  // 1) FAST fix (επιτρέπει cached έως 5s για ultra-low latency)
  const getFast = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition((pos) => {
      state.fastGot = true;
      handlePosition(pos, { stage: 'fast' });
      resolve();
    }, () => resolve(), { enableHighAccuracy: false, timeout: 2000, maximumAge: 5000 });
  });

  // 2) Start HIGH ACCURACY watch
  const startWatch = () => {
    if (state.watchId != null) return;
    state.watchId = navigator.geolocation.watchPosition((pos) => {
      handlePosition(pos, { stage: 'high' });
    }, (err) => {
      console.warn('Geo watch error', err);
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  };

  // Εξομάλυνση + throttle προς UI
  let rafPending = false;
  function handlePosition(pos, meta) {
    state.lastRaw = pos;
    const f = filterPosition(state.kalman, pos);
    state.lastFiltered = f;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        for (const cb of state.listeners) cb(f, meta);
      });
    }
  }

  // Heading (όπου υπάρχει)
  let heading = null;
  window.addEventListener('deviceorientation', (e) => {
    if (typeof e.alpha === 'number') heading = e.alpha; // degrees
  }, { passive: true });

  function getHeading() { return heading; }

  function onUpdate(cb) { state.listeners.add(cb); return () => state.listeners.delete(cb); }

  await getFast;
  startWatch();

  return { onUpdate, getHeading };
}

// ΜΙΝΙΜΑΛ Kalman 2D (σταθερές παραμετροποιήσιμες)
class Kalman2D {
  constructor({ q = 0.00001, r = 5 } = {}) { // q=process noise, r=measurement noise (m)
    this.q = q; this.r = r; this.x = null; this.p = null;
  }
  filter(z) {
    if (this.x == null) { this.x = z; this.p = 1; return z; }
    // predict
    this.p = this.p + this.q;
    // update
    const k = this.p / (this.p + this.r);
    this.x = this.x + k * (z - this.x);
    this.p = (1 - k) * this.p;
    return this.x;
  }
}

function filterPosition(kalman, pos) {
  // Μετατρέπουμε lat/lon σε approx meters γύρω από το τελευταίο σημείο για φίλτρο
  const { latitude: lat, longitude: lon, accuracy } = pos.coords;
  const z = { lat, lon };
  // Εδώ απλά φιλτράρουμε χωριστά lat/lon (για απλότητα). Για ακριβέστερο: ENU μετασχηματισμός.
  const flat = kalman.filter(z.lat);
  const flon = kalman.filter(z.lon);
  return {
    lat: flat,
    lon: flon,
    accuracy,
    timestamp: pos.timestamp
  };
}
