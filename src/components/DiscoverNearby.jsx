import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in Vite
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: shadow,
});

const CATEGORIES = {
  restaurant: [{ key: "amenity", val: "restaurant" }],
  park: [{ key: "leisure", val: "park" }],
  coffee: [{ key: "amenity", val: "cafe" }],
  hospital: [{ key: "amenity", val: "hospital" }],
  hotel: [{ key: "tourism", val: "hotel" }],
  attraction: [{ key: "tourism", val: "attraction" }], 
};

const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// Build Overpass query
function buildOverpassQL(lat, lon, cat, radius = 5000) {
  const tags = CATEGORIES[cat] || [];
  const blocks = tags
    .map(
      (t) => `
        node["${t.key}"="${t.val}"](around:${radius},${lat},${lon});
        way["${t.key}"="${t.val}"](around:${radius},${lat},${lon});
        relation["${t.key}"="${t.val}"](around:${radius},${lat},${lon});
      `
    )
    .join("\n");
  return `[out:json][timeout:25];
  (
    ${blocks}
  );
  out center;`;
}

// Distance function
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

// ✅ Fake rating generator
function getFakeRating() {
  return (Math.random() * (5 - 3) + 3).toFixed(1);
}

export default function DiscoverNearby() {
  const [category, setCategory] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });

  const mapRef = useRef(null);
  const markersRef = useRef(L.layerGroup());
  const userMarkerRef = useRef(null);

  // Init map
  useEffect(() => {
    if (location.lat && location.lng && !mapRef.current) {
      const m = L.map("nearby-map", { zoomControl: true }).setView(
        [location.lat, location.lng],
        14
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "",
      }).addTo(m);

      userMarkerRef.current = L.marker([location.lat, location.lng]).addTo(m);
      userMarkerRef.current.bindPopup("📍 You are here").openPopup();

      markersRef.current.addTo(m);
      mapRef.current = m;
    }
  }, [location]);

  // Get current location
  useEffect(() => {
    const fallback = { lat: 17.385, lng: 78.4867 }; // Hyderabad
    if (!navigator.geolocation) {
      setLocation(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocation(fallback),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch places
  async function fetchPlaces(cat) {
    if (!location.lat || !location.lng) return;
    setCategory(cat);
    setLoading(true);
    setResults([]);

    const body = buildOverpassQL(location.lat, location.lng, cat, 5000);
    let data = null;

    for (const endpoint of overpassEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body,
        });
        if (res.ok) {
          data = await res.json();
          if (data?.elements?.length > 0) break;
        }
      } catch (err) {
        console.error("⚠️ Error fetching from", endpoint, err);
      }
    }

    if (!data?.elements || data.elements.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Normalize
    const seen = new Set();
    const items = [];
    for (const el of data.elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;

      const name = el.tags?.name || cat.toUpperCase();
      const key = `${name}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const addressParts = [
        el.tags?.["addr:housenumber"],
        el.tags?.["addr:street"],
        el.tags?.["addr:city"],
      ].filter(Boolean);

      const distance =
        Math.round(haversineMeters(location, { lat, lng: lon }) / 10) / 100;

      items.push({
        name,
        lat,
        lon,
        address: addressParts.join(", "),
        distanceKm: distance,
        rating: getFakeRating(),
      });
    }

    items.sort((a, b) => a.distanceKm - b.distanceKm);
    const list = items.slice(0, 20);
    setResults(list);

    // Update markers
    if (mapRef.current) {
      markersRef.current.clearLayers();
      const bounds = L.latLngBounds([]);
      list.forEach((p) => {
        const mk = L.marker([p.lat, p.lon]).bindPopup(
          `<b>${p.name}</b><br/>⭐ ${p.rating}<br/>${p.address || ""}<br/>📍 ${
            p.distanceKm
          } km`
        );
        mk.addTo(markersRef.current);
        bounds.extend([p.lat, p.lon]);
      });
      bounds.extend([location.lat, location.lng]);
      if (!bounds.isEmpty())
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }

    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🌍 Discover Nearby</h2>

      {/* Category Buttons */}

      <div style={styles.buttonRow}>
        {[
          { key: "restaurant", label: "Restaurant", emoji: "🍴" },
          { key: "park", label: "Park", emoji: "🌳" },
          { key: "coffee", label: "Coffee", emoji: "☕" },
          { key: "hospital", label: "Hospital", emoji: "🏥" },
          { key: "hotel", label: "Hotel", emoji: "🏨" },
          { key: "attraction", label: "Attractions", emoji: "🎡" },
        ].map((cat) => (
        <button
            key={cat.key}
            onClick={() => fetchPlaces(cat.key)}
            style={{
              ...styles.btn,
              backgroundColor: category === cat.key ? "#16a34a" : "#2563eb",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "1rem",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#fff",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }
          >
            <span style={{ fontSize: "1.2rem" }}>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>


      {/* Map */}
      <div id="nearby-map" style={styles.map} />

      {/* Results */}
      <div style={styles.results}>
        <h3>
          {loading
            ? "Loading places..."
            : results.length > 0
            ? `Results for ${category}:`
            : category
            ? "No results found"
            : "Pick a category above"}
        </h3>

        {results.map((p, i) => (
          <div key={`${p.name}-${i}`} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.emoji}>
                {category === "attraction"
                  ? "🎡"
                  : category === "park"
                  ? "🌳"
                  : category === "restaurant"
                  ? "🍴"
                  : category === "coffee"
                  ? "☕"
                  : category === "hotel"
                  ? "🏨"
                  : "🏥"}
              </span>
              <div>
                <div style={styles.cardTitle}>{p.name}</div>
                <div style={styles.cardRating}>⭐ {p.rating}</div>
              </div>
            </div>
            <div style={styles.cardAddress}>
              {p.address || "📍 Address not available"}
            </div>
            <div style={styles.cardDistance}>📌 {p.distanceKm} km away</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, fontFamily: "system-ui, Arial, sans-serif", margin: 30 },
  heading: { textAlign: "center", marginBottom: 10, fontSize: 30 },
  buttonRow: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  btn: {
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 14,
    boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
  },
  map: {
    height: 420,
    width: "100%",
    borderRadius: 12,
    marginBottom: 18,
    boxShadow: "0 2px 10px rgba(0,0,0,.1)",
  },
  results: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#ffe7e7ff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 3px 10px rgba(0,0,0,.08)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  emoji: { fontSize: 22 },
  cardTitle: { fontWeight: 600, fontSize: 16, color: "#111" },
  cardRating: { fontSize: 14, color: "#f59e0b" },
  cardAddress: { fontSize: 13, color: "#555" },
  cardDistance: {
    fontSize: 13,
    marginTop: 6,
    fontStyle: "italic",
    color: "#2563eb",
  },
};
