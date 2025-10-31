// /geo/mapmatch.osrm.js
export function createOSRMMatcher({
  baseUrl = 'https://router.project-osrm.org',
  minAccuracy = 60,  // μην κάνεις snap αν το GPS είναι πιο κακό από 60 m
  minSpeed = 3,      // μην κάνεις snap αν κινείσαι πιο αργά από ~11 km/h
  rateMs = 1000      // 1 κλήση/δευτ. στο OSRM
} = {}) {
  const buf = [];
  let lastCall = 0;
  let lastSnapped = null;

  async function match(fix) {
    const acc = fix.accuracy ?? 999;
    const spd = fix.speed ?? 0;
    if (acc > minAccuracy || spd < minSpeed) return decorate(fix, false);

    buf.push({
      lat: fix.lat, lon: fix.lon,
      ts: Math.round(fix.timestamp / 1000),
      acc: Math.max(5, Math.min(50, Math.floor(acc)))
    });
    if (buf.length > 8) buf.shift();

    const now = performance.now();
    if (now - lastCall < rateMs) return lastSnapped ?? decorate(fix, false);
    lastCall = now;

    try {
      const coords = buf.map(p => `${p.lon},${p.lat}`).join(';');
      const radiuses = buf.map(p => p.acc).join(';');
      const timestamps = buf.map(p => p.ts).join(';');
      const url = `${baseUrl}/match/v1/driving/${coords}?radiuses=${radiuses}&timestamps=${timestamps}&geometries=geojson&overview=simplified`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = await res.json();
      if (!data.matchings?.length) return decorate(fix, false);

      const m = data.matchings[0];
      const last = m.geometry.coordinates.at(-1); // [lon,lat]
      const snapped = {
        lat: last[1],
        lon: last[0],
        snapped: true,
        road: null,
        bearing: bearingFromLine(m.geometry.coordinates)
      };
      lastSnapped = snapped;
      return snapped;
    } catch (e) {
      console.warn('OSRM match fail:', e);
      return decorate(fix, false);
    }
  }

  return { match };
}

function decorate(fix, snapped) {
  return { ...fix, snapped, road: null, bearing: fix.heading ?? null };
}
function bearingFromLine(coords) {
  if (!coords || coords.length < 2) return null;
  const a = coords[coords.length-2], b = coords[coords.length-1];
  const φ1 = a[1] * Math.PI/180, φ2 = b[1] * Math.PI/180, Δλ = (b[0]-a[0]) * Math.PI/180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}
