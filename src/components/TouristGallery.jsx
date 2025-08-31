import React, { useEffect, useState } from "react";


const CATEGORIES = [
  { key: "16000", label: "Food & Drink", emoji: "🍴" },
  { key: "19000", label: "Classrooms", emoji: "🏫" },
  { key: "13000", label: "Landmarks", emoji: "🏛️" },
  { key: "16001", label: "Outdoor", emoji: "🌳" },
  { key: "17000", label: "Building & Grounds", emoji: "🏟️" },
  { key: "17069", label: "Building Exterior", emoji: "🏢" },
  { key: "17100", label: "Grounds", emoji: "🌱" },
  { key: "17070", label: "Storefront", emoji: "🏬" },
  { key: "16022", label: "Scenery", emoji: "🌄" },
  { key: "19018", label: "Products", emoji: "🛍️" },
];


function getCategoryEmoji(catKey) {
  const found = CATEGORIES.find((c) => c.key === catKey);
  return found ? found.emoji : "📍";
}

function getFakeRating() {
  return (Math.random() * (5 - 3) + 3).toFixed(1);
}

export default function TouristGallery() {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [category, setCategory] = useState("");
  const [places, setPlaces] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get current location (fallback: Times Square NYC)
  useEffect(() => {
    const fallback = { lat: 40.758, lng: -73.9855 };
    if (!navigator.geolocation) {
      setLocation(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(fallback),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  async function fetchPlaces(catKey) {
    if (!location.lat || !location.lng) return;

    setCategory(catKey);
    setLoading(true);
    setPlaces([]);
    setNearby([]);

    try {
      // 1. Search places nearby
      const res = await fetch(
        `http://localhost:4000/api/search?ll=${location.lat},${location.lng}&categories=${catKey}&limit=6`
      );
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        setPlaces([]);
        setLoading(false);
        return;
      }

      // 2. Fetch photos for each place
      const withPhotos = await Promise.all(
        data.results.map(async (place) => {
          try {
            const photosRes = await fetch(
              `http://localhost:4000/api/photos/${place.fsq_id}?name=${encodeURIComponent(
                place.name
              )}&category=${encodeURIComponent(catKey)}`
            );
            const photos = await photosRes.json();

            return {
              id: place.fsq_id,
              name: place.name,
              address: place.location?.formatted_address,
              photos: Array.isArray(photos) ? photos : [],
            };
          } catch (err) {
            console.error("Error fetching place photos:", err);
            return null;
          }
        })
      );

      setPlaces(withPhotos.filter(Boolean));

      const nearRes = await fetch(
        `http://localhost:4000/api/nearby?ll=${location.lat},${location.lng}&categories=${catKey}&limit=5`
      );
      const nearData = await nearRes.json();

      const enriched = (nearData.results || []).map((p) => ({
        ...p,
        rating: p.rating || getFakeRating(),
        category: catKey,
      }));

      setNearby(enriched);
    } catch (err) {
      console.error("Error fetching places:", err);
    }

    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📸 Tourist Gallery</h2>

      <div style={styles.buttonRow}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => fetchPlaces(cat.key)}
            style={{
              ...styles.btn,
              backgroundColor: category === cat.key ? "#16a34a" : "#2563eb",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <div style={styles.results}>
        <h3>
          {loading
            ? "Loading photos..."
            : places.length > 0
            ? `Showing photos`
            : category
            ? "No photos found"
            : "Pick a category above"}
        </h3>

        <div style={styles.gallery}>
          {places.map((place) =>
            place.photos.map((photo, i) => (
              <div key={`${place.id}-${i}`} style={styles.photoWrapper}>
                <img src={photo.url} alt={place.name} style={styles.photo} />
                <p style={styles.date}>
                  {photo.created_at
                    ? new Date(photo.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                  {/* {photo.source === "foursquare" ? " FSQ" : " 📷Unsplash"} */}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      
      {nearby.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>📍 Nearby Suggestions</h3>
          <div style={styles.resultsGrid}>
            {nearby.map((p, i) => (
              <div key={`${p.fsq_id}-${i}`} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.emoji}>{getCategoryEmoji(p.category)}</span>
                  <div>
                    <div style={styles.cardTitle}>{p.name}</div>
                    <div style={styles.cardRating}>⭐ {p.rating}</div>
                  </div>
                </div>
                <div style={styles.cardAddress}>
                  {p.location?.formatted_address || "📍 Address not available"}
                </div>
                <div style={styles.cardDistance}>
                  📌 {p.distance ? p.distance + " m away" : "Distance unknown"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 20, margin: 30, fontFamily: "system-ui, Arial" },
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
    fontWeight: "600",
    boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  results: { marginTop: 12 },
  gallery: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
  photoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  photo: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,.15)",
  },
  date: {
    fontSize: "12px",
    marginTop: "4px",
    color: "#555",
  },
  
  resultsGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#f1f5f9",
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
