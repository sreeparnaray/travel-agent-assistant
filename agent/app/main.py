"""
Smart Travel Planner – FastAPI + AI (LLM‑powered recommendations)
=================================================================

What’s new vs. the previous version
-----------------------------------
✓ Optional **LLM integration** for:
  • Narrative trip guidance (explains why/what/how)
  • Smart activity re‑ranking to match user intent
  • Day‑wise tips, safety notes, packing hints
✓ Same clean JSON contract; new AI fields are additive.

Quick start
-----------
1) Python 3.10+
2) pip install fastapi uvicorn pydantic openai python-dotenv
3) Set your key: export OPENAI_API_KEY="sk-..." (or use a .env file)
4) uvicorn app:app --reload

OpenAPI docs: http://127.0.0.1:8000/docs

Example request (POST /plan):
{
  "source": "Kolkata",
  "destination": "Delhi",
  "depart_date": "2025-09-20",
  "return_date": "2025-09-24",
  "travelers": 2,
  "budget_level": "mid",
  "preferences": ["food", "history"],
  "flexibility_hours": 6,
  "ai": {"enabled": true, "model": "gpt-4o-mini"}
}
"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal, Dict, Any
from datetime import date, datetime
import math
import os

# --- Optional: load .env if present ---
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

# --- OpenAI client (lazy) ---
_openai_client = None

def get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI  # lazy import
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client

app = FastAPI(title="Smart Travel Planner – AI", version="0.2.0")

# ------------------------------
# Minimal city & POI knowledge
# ------------------------------
CityLatLng: Dict[str, tuple[float, float]] = {
    # India – add more as needed
    "Kolkata": (22.5726, 88.3639),
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bengaluru": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Kochi": (9.9312, 76.2673),
    "Goa": (15.2993, 74.1240),
    "Varanasi": (25.3176, 82.9739),
    "Udaipur": (24.5854, 73.7125),
}

CityActivities: Dict[str, List[Dict[str, Any]]] = {
    "Delhi": [
        {"name": "Red Fort & Chandni Chowk food walk", "theme": ["history", "food"], "est_cost_inr": 800},
        {"name": "Humayun's Tomb + Lodhi Garden stroll", "theme": ["history", "nature"], "est_cost_inr": 400},
        {"name": "India Gate & Kartavya Path evening", "theme": ["culture", "family"], "est_cost_inr": 0},
        {"name": "Qutub Minar & Mehrauli Archaeological Park", "theme": ["history"], "est_cost_inr": 600},
        {"name": "Dilli Haat crafts & regional bites", "theme": ["shopping", "food"], "est_cost_inr": 500},
    ],
    "Kolkata": [
        {"name": "Victoria Memorial & Maidan tram loop", "theme": ["history", "leisure"], "est_cost_inr": 300},
        {"name": "Kumartuli artisan lanes + river sunset", "theme": ["culture", "photo"], "est_cost_inr": 200},
        {"name": "College Street book-hunt & coffee house", "theme": ["books", "food"], "est_cost_inr": 250},
        {"name": "Howrah Bridge + old city walk", "theme": ["history", "photo"], "est_cost_inr": 0},
        {"name": "South Kolkata pice hotels food tour", "theme": ["food"], "est_cost_inr": 600},
    ],
    "Mumbai": [
        {"name": "Gateway of India & Colaba heritage", "theme": ["history", "photo"], "est_cost_inr": 300},
        {"name": "Marine Drive sunset & Girgaum Chowpatty", "theme": ["leisure", "food"], "est_cost_inr": 100},
        {"name": "Elephanta Caves (ferry)", "theme": ["history", "nature"], "est_cost_inr": 800},
        {"name": "Bandra street art & cafes", "theme": ["art", "food"], "est_cost_inr": 300},
        {"name": "Sanjay Gandhi NP Kanheri Caves", "theme": ["nature", "history"], "est_cost_inr": 400},
    ],
}

# ------------------------------
# Utility functions
# ------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    import math as _m
    phi1, phi2 = _m.radians(lat1), _m.radians(lat2)
    dphi = _m.radians(lat2 - lat1)
    dlambda = _m.radians(lon2 - lon1)
    a = _m.sin(dphi / 2) ** 2 + _m.cos(phi1) * _m.cos(phi2) * _m.sin(dlambda / 2) ** 2
    c = 2 * _m.atan2(_m.sqrt(a), _m.sqrt(1 - a))
    return R * c


def city_distance_km(src: str, dst: str) -> Optional[float]:
    s, d = CityLatLng.get(src), CityLatLng.get(dst)
    if s and d:
        return round(haversine_km(s[0], s[1], d[0], d[1]), 1)
    return None

# ------------------------------
# Data models
# ------------------------------
class AIConfig(BaseModel):
    enabled: bool = False
    model: str = Field("gpt-4o-mini", description="OpenAI model name")
    temperature: float = 0.3

class TripRequest(BaseModel):
    source: str
    destination: str
    depart_date: date
    return_date: Optional[date] = None
    days: Optional[int] = Field(None, description="Trip length in days if return_date not provided")
    travelers: int = 1
    budget_level: Literal["budget", "mid", "premium"] = "mid"
    preferences: List[str] = []
    flexibility_hours: Optional[int] = 0
    ai: Optional[AIConfig] = AIConfig()

    @validator("days", always=True)
    def infer_days(cls, v, values):
        if v:
            return v
        rd = values.get("return_date")
        dd = values.get("depart_date")
        if rd and dd:
            return max(1, (rd - dd).days + 1)
        return 2  # default weekend

class TransportOption(BaseModel):
    mode: Literal["flight", "train", "bus", "car"]
    provider_hint: str
    distance_km: Optional[float]
    duration_hours: float
    est_cost_total_inr: int
    est_cost_per_person_inr: int
    booking_urls: List[str]

class LodgingOption(BaseModel):
    name: str
    location_hint: str
    est_cost_per_night_inr: int
    nights: int
    est_total_inr: int
    booking_urls: List[str]

class Activity(BaseModel):
    name: str
    theme: List[str]
    est_cost_inr: int

class DayPlan(BaseModel):
    day: int
    morning: Optional[str]
    afternoon: Optional[str]
    evening: Optional[str]

class CostBreakdown(BaseModel):
    transport_inr: int
    lodging_inr: int
    activities_inr: int
    buffer_inr: int
    total_inr: int

class AIAdvice(BaseModel):
    rationale: str
    must_do: List[str]
    local_foods: List[str]
    safety_tips: List[str]
    packing_tips: List[str]

class AINarrative(BaseModel):
    overview: str
    day_tips: List[str]

class TripPlan(BaseModel):
    summary: str
    transport_options: List[TransportOption]
    lodging_options: List[LodgingOption]
    activities: List[Activity]
    day_by_day: List[DayPlan]
    cost_breakdown: CostBreakdown
    notes: List[str] = []
    # --- AI additions ---
    ai_advice: Optional[AIAdvice] = None
    ai_narrative: Optional[AINarrative] = None
    

# ------------------------------
# Heuristic engines (non‑AI)
# ------------------------------

def provider_hint_for(mode: str) -> str:
    if mode == "flight":
        return "Use a meta-search (e.g., Google Flights, Skyscanner)."
    if mode == "train":
        return "Use IRCTC or authorized partners."
    if mode == "bus":
        return "Use Redbus or state RTC portals."
    if mode == "car":
        return "Use Ola/Uber or local rentals."
    return ""


def booking_links(mode: str) -> List[str]:
    if mode == "flight":
        return ["https://www.google.com/travel/flights", "https://www.skyscanner.net/"]
    if mode == "train":
        return ["https://www.irctc.co.in/", "https://www.confirmtkt.com/"]
    if mode == "bus":
        return ["https://www.redbus.in/", "https://www.abhibus.com/"]
    if mode == "car":
        return ["https://www.olacabs.com/", "https://www.uber.com/"]
    return []


def pick_transport(distance_km: Optional[float], travelers: int, budget: str) -> List[TransportOption]:
    if distance_km is None:
        base = [("flight", 1000, 2.5), ("train", 600, 10.0), ("bus", 400, 14.0), ("car", 1000, 12.0)]
    else:
        d = distance_km
        base = []
        base.append(("flight", max(2500, int(d * 6.5)), max(1.0, round(d / 750.0, 1))))
        base.append(("train", max(150, int(d * 1.0)), max(2.0, round(d / 80.0, 1))))
        base.append(("bus", max(200, int(d * 2.2)), max(3.0, round(d / 50.0, 1))))
        base.append(("car", max(500, int(d * 20.0)), max(2.0, round(d / 60.0, 1))))
    budget_factor = {"budget": 0.9, "mid": 1.0, "premium": 1.35}[budget]
    options: List[TransportOption] = []
    for mode, base_cost, hours in base:
        total_cost = int(round(base_cost * budget_factor))
        per_person = int(math.ceil(total_cost / max(1, travelers)))
        options.append(TransportOption(
            mode=mode,
            provider_hint=provider_hint_for(mode),
            distance_km=distance_km,
            duration_hours=float(hours),
            est_cost_total_inr=total_cost,
            est_cost_per_person_inr=per_person,
            booking_urls=booking_links(mode),
        ))
    options.sort(key=lambda x: (x.duration_hours, x.est_cost_total_inr))
    return options


def pick_lodging(city: str, nights: int, budget: str) -> List[LodgingOption]:
    base = {"budget": 1500, "mid": 3000, "premium": 7000}[budget]
    suggestions = [("Near city center", 0.9), ("Walkable to attractions", 1.0), ("Boutique district", 1.3)]
    results: List[LodgingOption] = []
    for label, mul in suggestions:
        rate = int(base * mul)
        total = rate * nights
        results.append(LodgingOption(
            name=f"{budget.title()} stay – {city}",
            location_hint=label,
            est_cost_per_night_inr=rate,
            nights=nights,
            est_total_inr=total,
            booking_urls=["https://www.booking.com/", "https://www.makemytrip.com/hotels/", "https://www.airbnb.com/"],
        ))
    return results


def pick_activities(city: str, preferences: List[str], days: int, budget: str) -> List[Activity]:
    pool = CityActivities.get(city, [])
    if not pool:
        return []
    def score(act: Dict[str, Any]) -> int:
        return sum(1 for p in preferences if p in act["theme"]) if preferences else 0
    ranked = sorted(pool, key=lambda a: (-score(a), a["est_cost_inr"]))
    target = min(len(ranked), max(2, days * 3))
    cap = {"budget": 600, "mid": 1200, "premium": 5000}[budget]
    chosen = []
    for a in ranked:
        cost = min(a["est_cost_inr"], cap)
        chosen.append(Activity(name=a["name"], theme=a["theme"], est_cost_inr=cost))
        if len(chosen) >= target:
            break
    return chosen


def build_day_by_day(activities: List[Activity], days: int) -> List[DayPlan]:
    plans: List[DayPlan] = []
    i = 0
    for day in range(1, days + 1):
        morning = activities[i].name if i < len(activities) else None
        afternoon = activities[i + 1].name if i + 1 < len(activities) else None
        evening = activities[i + 2].name if i + 2 < len(activities) else None
        plans.append(DayPlan(day=day, morning=morning, afternoon=afternoon, evening=evening))
        i += 3
    return plans


def summarize(req: TripRequest, distance_km: Optional[float]) -> str:
    dist_txt = f" (~{distance_km} km)" if distance_km else ""
    return (
        f"Trip from {req.source} to {req.destination}{dist_txt}, "
        f"departing {req.depart_date.isoformat()} for {req.days} day(s), "
        f"{req.travelers} traveler(s), budget: {req.budget_level}."
    )


def compute_costs(transport: List[TransportOption], lodging: List[LodgingOption], activities: List[Activity]) -> CostBreakdown:
    transport_min = min([t.est_cost_total_inr for t in transport]) if transport else 0
    lodging_min = min([l.est_total_inr for l in lodging]) if lodging else 0
    activities_sum = sum(a.est_cost_inr for a in activities)
    buffer = int(round(0.12 * (transport_min + lodging_min + activities_sum)))
    total = transport_min + lodging_min + activities_sum + buffer
    return CostBreakdown(
        transport_inr=transport_min,
        lodging_inr=lodging_min,
        activities_inr=activities_sum,
        buffer_inr=buffer,
        total_inr=total,
    )

# ------------------------------
# AI helpers
# ------------------------------

LLM_SYSTEM = (
    "You are a meticulous, budget-aware Indian travel concierge. "
    "Always be concrete, local, safe, and bias toward verified logistics. "
    "Keep sentences tight and useful."
)


def ai_rerank_activities(req: TripRequest, acts: List[Activity]) -> List[Activity]:
    if not req.ai or not req.ai.enabled or not acts:
        return acts
    client = get_openai_client()
    preferences = ", ".join(req.preferences) if req.preferences else "(none)"
    prompt = f"""
    You receive a destination's candidate activities. Re-rank them for a {req.budget_level} traveler profile
    with preferences: {preferences}. Shortlist up to {min(6, len(acts))} that best match the profile and ensure variety.
    Return a JSON list of activity names in order of priority.
    Activities:
{[a.dict() for a in acts]}
    """
    try:
        resp = client.chat.completions.create(
            model=req.ai.model,
            temperature=req.ai.temperature,
            messages=[{"role": "system", "content": LLM_SYSTEM}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        import json
        content = resp.choices[0].message.content
        names = json.loads(content).get("activities", []) if content else []
        name_set = [n.strip() for n in names if isinstance(n, str)]
        # Rebuild list in that order, preserving metadata
        by_name = {a.name: a for a in acts}
        reordered = [by_name[n] for n in name_set if n in by_name]
        # fallback: if empty, keep original
        return reordered or acts
    except Exception:
        return acts


def ai_generate_advice(req: TripRequest, plan: Dict[str, Any]) -> AIAdvice:
    if not req.ai or not req.ai.enabled:
        return None  # type: ignore
    client = get_openai_client()
    user_ctx = {
        "source": req.source,
        "destination": req.destination,
        "dates": [req.depart_date.isoformat(), (req.return_date.isoformat() if req.return_date else None)],
        "days": req.days,
        "travelers": req.travelers,
        "budget_level": req.budget_level,
        "preferences": req.preferences,
        "summary": plan.get("summary"),
    }
    prompt = (
        "Given this India trip context, produce concise, practical guidance. "
        "Return strict JSON with keys: rationale (1 paragraph), must_do (5 bullets), local_foods (5), "
        "safety_tips (5), packing_tips (5)."
    )
    try:
        resp = client.chat.completions.create(
            model=req.ai.model,
            temperature=req.ai.temperature,
            messages=[{"role": "system", "content": LLM_SYSTEM},
                     {"role": "user", "content": f"CTX={user_ctx} , REQ={prompt}"}],
            response_format={"type": "json_object"},
        )
        import json
        data = json.loads(resp.choices[0].message.content)
        return AIAdvice(**data)
    except Exception:
        return None  # graceful degrade


def ai_narrate_itinerary(req: TripRequest, day_by_day: List[DayPlan]) -> AINarrative:
    if not req.ai or not req.ai.enabled:
        return None  # type: ignore
    client = get_openai_client()
    days_view = [d.dict() for d in day_by_day]
    prompt = (
        "Write a short motivating overview (4-6 sentences) and a list of 1 tip per day (<=25 words each). "
        "Return JSON with keys: overview, day_tips (array)."
    )
    try:
        resp = client.chat.completions.create(
            model=req.ai.model,
            temperature=req.ai.temperature,
            messages=[{"role": "system", "content": LLM_SYSTEM},
                     {"role": "user", "content": f"DAYS={days_view} , REQ={prompt}"}],
            response_format={"type": "json_object"},
        )
        import json
        data = json.loads(resp.choices[0].message.content)
        return AINarrative(**data)
    except Exception:
        return None

# ------------------------------
# API endpoints
# ------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "ts": datetime.utcnow().isoformat()}

@app.get("/cities")
def cities():
    return {"known_cities": sorted(CityLatLng.keys())}




@app.post("/plan", response_model=TripPlan)
def plan_trip(req: TripRequest):
    # distance
    dist = city_distance_km(req.source, req.destination)

    # transport options
    transport = pick_transport(dist, req.travelers, req.budget_level)

    # lodging
    nights = max(1, req.days - 1)
    lodging = pick_lodging(req.destination, nights, req.budget_level)

    # activities (heuristic → optional LLM re‑rank)
    acts = pick_activities(req.destination, req.preferences, req.days, req.budget_level)
    acts = ai_rerank_activities(req, acts)

    # day-by-day plan
    day_plan = build_day_by_day(acts, req.days)

    # summary & costs
    summary_text = summarize(req, dist)
    costs = compute_costs(transport, lodging, acts)

    # notes
    notes: List[str] = []
    if req.flexibility_hours and req.flexibility_hours > 0:
        notes.append(f"With ±{req.flexibility_hours}h flexibility, consider red-eye flights or off-peak trains for better prices.")
    if dist and dist < 400:
        notes.append("For sub-400 km routes, bus or train can be cost-effective versus flights.")
    if dist and dist > 1200:
        notes.append("Over 1200 km: prefer flights to minimize travel time.")
    if not CityActivities.get(req.destination):
        notes.append("Add a real activities provider/API for richer suggestions.")

    # AI sections
    plan_dict: Dict[str, Any] = {
        "summary": summary_text,
        "transport_options": [t.dict() for t in transport],
        "lodging_options": [l.dict() for l in lodging],
        "activities": [a.dict() for a in acts],
        "day_by_day": [d.dict() for d in day_plan],
        "cost_breakdown": costs.dict(),
        "notes": notes,
    }

    ai_advice = ai_generate_advice(req, plan_dict)
    ai_narr  = ai_narrate_itinerary(req, day_plan)

    return TripPlan(
        summary=summary_text,
        transport_options=transport,
        lodging_options=lodging,
        activities=acts,
        day_by_day=day_plan,
        cost_breakdown=costs,
        notes=notes,
        ai_advice=ai_advice,
        ai_narrative=ai_narr,
    )

@app.get("/")
def root():
    return {
        "message": "Smart Travel Planner API (AI) is running. See /docs for interactive API.",
        "ai_config": {"env_has_key": bool(os.getenv("OPENAI_API_KEY")), "default_model": "gpt-4o-mini"},
        "sample": {
            "POST /plan": {
                "source": "Kolkata",
                "destination": "Delhi",
                "depart_date": "2025-09-20",
                "return_date": "2025-09-24",
                "travelers": 2,
                "budget_level": "mid",
                "preferences": ["food", "history"],
                "flexibility_hours": 6,
                "ai": {"enabled": True, "model": "gpt-4o-mini", "temperature": 0.3}
            }
        },
    }
