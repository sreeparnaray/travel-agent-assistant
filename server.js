import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = 4000;

const FOURSQUARE_API_KEY = "1EJZMOZHRSAORYRBF1KCPPEDU5XFDTSTNHOAFQ5MQG4HAX3B"; 
const UNSPLASH_ACCESS_KEY = "K7pHwS1LxSL7J20TUL2_2u_6juOvtdqS7ZWzcFH5Okg"; 
const API_VERSION = "2025-06-17";

app.use(cors());

// ==========================
// Search Places
// ==========================
app.get("/api/search", async (req, res) => {
  const { ll, categories, limit = 8 } = req.query;

  const url = new URL("https://places-api.foursquare.com/places/search");
  url.searchParams.set("ll", ll);
  url.searchParams.set("limit", limit);
  if (categories) url.searchParams.set("categories", categories);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
        "X-Places-API-Version": API_VERSION,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error in /api/search:", err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

// ==========================
// Nearby Suggestions
// ==========================
app.get("/api/nearby", async (req, res) => {
  const { ll, categories, limit = 5 } = req.query;

  const url = new URL("https://places-api.foursquare.com/places/search");
  url.searchParams.set("ll", ll);
  url.searchParams.set("limit", limit);
  if (categories) url.searchParams.set("categories", categories);
  url.searchParams.set("sort", "distance");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
        "X-Places-API-Version": API_VERSION,
        Accept: "application/json",
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error in /api/nearby:", err);
    res.status(500).json({ error: "Failed to fetch nearby places" });
  }
});

// ==========================
// Get Photos for Place
// ==========================
app.get("/api/photos/:id", async (req, res) => {
  const placeId = req.params.id;
  const { name, category } = req.query;

  let photos = [];

  // helper
  async function fetchFsqPhotos(id, sortType = "popular") {
    const url = `https://places-api.foursquare.com/places/${id}/photos?limit=6&sort=${sortType}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
        "X-Places-API-Version": API_VERSION,
        Accept: "application/json",
      },
    });
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return data.map((p) => {
        const targetWidth = p.width > 800 ? 800 : p.width;
        const aspectRatio = p.height / p.width;
        const targetHeight = Math.round(targetWidth * aspectRatio);

        return {
          url: `${p.prefix}${p.width}x${p.height}${p.suffix}`,
          width: targetWidth,
          height: targetHeight,
          created_at: p.created_at,
          source: "foursquare",
        };
      });
    }
    return [];
  }

  try {
    // Step 1: Direct place photos
    photos = await fetchFsqPhotos(placeId, "popular");
    if (photos.length === 0) {
      photos = await fetchFsqPhotos(placeId, "newest");
    }

    // Step 2: Category-wide Foursquare fallback
    if (photos.length === 0 && category) {
      const catUrl = new URL("https://places-api.foursquare.com/places/search");
      catUrl.searchParams.set("categories", category);
      catUrl.searchParams.set("ll", "40.758,-73.9855"); // fallback NYC
      catUrl.searchParams.set("limit", 5);

      const catRes = await fetch(catUrl.toString(), {
        headers: {
          Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
          "X-Places-API-Version": API_VERSION,
          Accept: "application/json",
        },
      });
      const catData = await catRes.json();

      if (catData.results?.length > 0) {
        for (let c of catData.results) {
          let catPhotos = await fetchFsqPhotos(c.fsq_id, "popular");
          if (catPhotos.length > 0) {
            photos = catPhotos;
            break;
          }
        }
      }
    }

    // Step 3: Unsplash fallback
    if (photos.length === 0 && UNSPLASH_ACCESS_KEY) {
      const query = name || category || "travel";
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=6&client_id=${UNSPLASH_ACCESS_KEY}`;
      const uRes = await fetch(unsplashUrl);
      const uData = await uRes.json();
      photos =
        uData.results?.map((p) => ({
          url: p.urls.small,
          width: p.width,
          height: p.height,
          created_at: p.created_at || new Date().toISOString(),
          source: "unsplash",
        })) || [];
    }

    res.json(photos);
  } catch (err) {
    console.error("❌ Error in /api/photos:", err);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

// ---------- Emergency Places ----------
/**
 * GET /api/emergency/places
 * Query params:
 *   ll        -> "lat,lng" (required)
 *   type      -> "hospital" | "police" (default "hospital")
 *   limit     -> number (default 10)
 *   radius    -> meters (default 5000)
 */
app.get("/api/emergency/places", async (req, res) => {
  const { ll, type = "hospital", limit = 10, radius = 5000 } = req.query;

  if (!ll) return res.status(400).json({ error: "Missing 'll' (lat,lng)" });

  // Use query keywords so we don’t rely on category IDs.
  const TYPE_TO_QUERY = {
    hospital: "hospital",
    police: "police station",
  };
  const query = TYPE_TO_QUERY[type] || type;

  const url =
    `https://places-api.foursquare.com/v3/places/search` +
    `?ll=${encodeURIComponent(ll)}` +
    `&query=${encodeURIComponent(query)}` +
    `&sort=DISTANCE&radius=${encodeURIComponent(radius)}` +
    `&limit=${encodeURIComponent(limit)}`;

  try {
    const r = await fetch(url, {
      headers: {
        Authorization: FOURSQUARE_API_KEY,          // ✅ NO "Bearer"
        "X-Places-Api-Version": API_VERSION,
        Accept: "application/json",
      },
    });

    const data = await r.json();

    const results = (data.results || []).map((p) => ({
      id: p.fsq_id,
      name: p.name,
      distance: p.distance, // meters
      address:
        p.location?.formatted_address ||
        [p.location?.address, p.location?.locality, p.location?.country]
          .filter(Boolean)
          .join(", "),
      lat: p.geocodes?.main?.latitude,
      lng: p.geocodes?.main?.longitude,
      phone: p.tel || p.contacts?.phone || null,
    }));

    res.json(results);
  } catch (err) {
    console.error("Error /api/emergency/places:", err);
    res.status(500).json({ error: "Failed to fetch emergency places" });
  }
});

// ---------- Helplines ----------
/**
 * GET /api/emergency/helplines
 * Query params:
 *   country -> ISO alpha-2 (e.g., "IN", "US"). If missing/unknown, returns "default" (112).
 */
app.get("/api/emergency/helplines", (req, res) => {
  const HELPLINES = {
    default: { general: "112" },
    IN: { general: "112", police: "100", ambulance: "108", fire: "101" },
    US: { general: "911", poison_control: "1-800-222-1222" },
    GB: { general: "999", alt: "112", police_non_emergency: "101" },
    AU: { general: "000", alt: "112", state_emergency_service: "132 500" },
    CA: { general: "911", alt: "112" },
    EU: { general: "112" },
    NZ: { general: "111" },
    SG: { general: "112", police: "999", ambulance_fire: "995" },
  };

  const code = (req.query.country || "default").toUpperCase();
  const numbers = HELPLINES[code] || HELPLINES.default;

  res.json({ country: HELPLINES[code] ? code : "default", numbers });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
