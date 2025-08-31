import React, { useEffect, useMemo, useState } from "react";

export default function EmergencyMode() {
  const [location, setLocation] = useState({ city: "", region: "", country: "" });

  const [enabled, setEnabled] = useState(false);
  const [loc, setLoc] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);

  const [hospitals, setHospitals] = useState([]);
  const [police, setPolice] = useState([]);
  const [helplines, setHelplines] = useState({
    country: "default",
    numbers: { general: "112" },
  });

  const ll = useMemo(
    () => (loc.lat && loc.lng ? `${loc.lat},${loc.lng}` : ""),
    [loc.lat, loc.lng]
  );

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    const fallback = { lat: 17.385, lng: 78.4867 }; // Hyderabad fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Reverse geocode → city/region/country
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const geoData = await geoRes.json();
        setLocation({
          city: geoData.city || geoData.locality,
          region: geoData.principalSubdivision,
          country: geoData.countryName,
        });

      });
    }

    const onSuccess = (pos) => {
      setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };
    const onError = () => {
      setLoc(fallback);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    } else {
      setLoc(fallback);
    }

    try {
      const lang = navigator.language || "";
      const guess = (lang.split("-")[1] || "").toUpperCase();
      fetch(`/api/emergency/helplines?country=${guess || "default"}`)
        .then((r) => r.json())
        .then(setHelplines)
        .catch(() => {});
    } catch (_) {}

    setTimeout(() => setLoading(false), 400);
  }, [enabled]);

  // ✅ Load hospitals or police from Overpass API
  async function loadType(type) {
    if (!ll) return [];

    const TYPE_TO_QUERY = {
      hospital: [{ key: "amenity", val: "hospital" }],
      police: [{ key: "amenity", val: "police" }],
    };

    const tags = TYPE_TO_QUERY[type] || [];
    const blocks = tags
      .map(
        (t) => `
        node["${t.key}"="${t.val}"](around:5000,${loc.lat},${loc.lng});
        way["${t.key}"="${t.val}"](around:5000,${loc.lat},${loc.lng});
        relation["${t.key}"="${t.val}"](around:5000,${loc.lat},${loc.lng});
      `
      )
      .join("\n");

    const query = `[out:json][timeout:25];(${blocks});out center;`;

    const overpassEndpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter",
    ];

    let data = null;
    for (const ep of overpassEndpoints) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: query,
        });
        if (res.ok) {
          data = await res.json();
          if (data?.elements?.length > 0) break;
        }
      } catch (e) {
        console.error("Overpass error:", e);
      }
    }
    if (!data?.elements) return [];

    const seen = new Set();
    return data.elements
      .map((el, i) => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng) return null;

        const key = `${lat.toFixed(5)}|${lng.toFixed(5)}`;
        if (seen.has(key)) return null;
        seen.add(key);

        return {
          id: el.id || i,
          name: el.tags?.name || type.toUpperCase(),
          address: [el.tags?.["addr:street"], el.tags?.["addr:city"]]
            .filter(Boolean)
            .join(", "),
          lat,
          lng,
          distance: Math.round(
            haversineMeters({ lat: loc.lat, lng: loc.lng }, { lat, lng })
          ),
          phone: el.tags?.phone || null,
        };
      })
      .filter(Boolean);
  }

  async function refreshLists() {
    if (!ll) return;
    setLoading(true);
    try {
      const [h, p] = await Promise.all([loadType("hospital"), loadType("police")]);
      setHospitals(h);
      setPolice(p);
    } catch (e) {
      console.error("Emergency fetch failed:", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (enabled && ll) {
      refreshLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ll]);

  const fmtDistance = (m) =>
    m || m === 0 ? (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`) : "—";
  const gmapsDir = (lat, lng) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const canCall = (num) => typeof num === "string" && num.trim();

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>🆘 Emergency Mode</h2>
        <button
          onClick={() => setEnabled((v) => !v)}
          style={{ ...styles.switch, background: enabled ? "#dc2626" : "#2563eb" }}
        >
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>

      {enabled && (
        <div style={styles.content}>
          {/* Current location */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📍 Current Location</h3>
            <div>
              Current City: <b>{location.city ?? "…"}</b>
            </div>
            <div>
              Current Region: <b>{location.region ?? "…"}   |    {location.country}</b>
            </div>
            {ll && (
              <div style={{ marginTop: 8 }}>
                <a
                  href={gmapsDir(loc.lat, loc.lng)}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.linkBtn}
                >
                  Open in Google Maps
                </a>
                <button
                  style={styles.ghostBtn}
                  onClick={refreshLists}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "Refresh Nearby"}
                </button>
              </div>
            )}
          </div>

          {/* Helplines */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              ☎️ Emergency Helplines ({helplines.country})
            </h3>
            <div style={styles.helplines}>
              {Object.entries(helplines.numbers).map(([k, v]) => (
                <div key={k} style={styles.helpRow}>
                  <div style={{ textTransform: "capitalize" }}>
                    {k.replaceAll("_", " ")}:
                  </div>
                  <div>
                    <b>{v}</b>
                  </div>
                  {canCall(v) && (
                    <a href={`tel:${v}`} style={styles.callBtn}>
                      Call
                    </a>
                  )}
                </div>
              ))}
            </div>
            <small style={{ color: "#555" }}>
              Tip: If unsure, dial <b>112</b> (works in most countries) or your
              local emergency number.
            </small>
          </div>

          {/* Hospitals + Police */}
          <div style={styles.cols}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🏥 Nearby Hospitals</h3>
              <List places={hospitals} fmtDistance={fmtDistance} gmapsDir={gmapsDir} />
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>👮 Police Stations</h3>
              <List places={police} fmtDistance={fmtDistance} gmapsDir={gmapsDir} />
            </div>
          </div>
        </div>
      )}

      {!enabled && (
        <p style={{ color: "#555" }}>
          Toggle <b>Enable</b> to get your location, show nearest hospitals &
          police, and quick-dial helplines.
        </p>
      )}
    </div>
  );
}

function List({ places, fmtDistance, gmapsDir }) {
  if (!places?.length) return <div style={{ color: "#666" }}>No results yet.</div>;
  return (
    <div style={{ display: "grid", gap: 10, overflowY:"scroll", height:"40rem" }}>
      {places.map((p) => (
        <div key={p.id} style={styles.row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: "#444" }}>
              {p.address || "Address not available"}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
              Distance: {fmtDistance(p.distance)}
            </div>
            {p.phone && (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Phone:{" "}
                <a href={`tel:${p.phone}`} style={{ textDecoration: "none" }}>
                  {p.phone}
                </a>
              </div>
            )}
          </div>
          {p.lat && p.lng && (
            <a
              href={gmapsDir(p.lat, p.lng)}
              target="_blank"
              rel="noreferrer"
              style={styles.smallBtn}
            >
              Directions
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ✅ Haversine distance
function haversineMeters(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// 🎨 Styles
const styles = {
  wrap: { padding: 20, margin: 20, fontFamily: "system-ui, Arial, sans-serif" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  switch: {
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 3px 8px rgba(0,0,0,.2)",
  },
  content: { display: "grid", gap: 14 },
  cols: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  card: {
    background: "#f1f5f9",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 2px 6px rgba(0,0,0,.1)",
  },
  cardTitle: { margin: 0, marginBottom: 10 },
  helplines: { display: "grid", gap: 8, marginTop: 6, marginBottom: 4 },
  helpRow: { display: "flex", alignItems: "center", gap: 10 },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 10,
  },
  linkBtn: {
    padding: "6px 10px",
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 8,
    marginRight: 8,
    fontSize: 14,
  },
  ghostBtn: {
    padding: "6px 10px",
    background: "transparent",
    color: "#111",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    cursor: "pointer",
  },
  smallBtn: {
    padding: "6px 10px",
    background: "#16a34a",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 8,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  callBtn: {
    padding: "4px 10px",
    background: "#dc2626",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 8,
    fontSize: 13,
    marginLeft: "auto",
  },
};
