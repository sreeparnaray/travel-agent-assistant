// src/routes/create-plan.js
// Protects the endpoint with Passport-JWT and proxies to your Python FastAPI /plan

import express from 'express'
import passport from 'passport'
import { prisma } from '../db.js'

const router = express.Router()
const requireAuth = passport.authenticate('jwt', { session: false })

// Small helper to whitelist fields
function pick(obj, keys) {
  return keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc }, {})
}


router.post('/test-plan', requireAuth, async (req, res) => {
  try {
    const { planName, source, destination, fromDate, toDate } = req.body

    if (!planName || !source || !destination || !fromDate || !toDate) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const plan = await prisma.journeyPlan.create({
      data: {
        planName,
        source,
        destination,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        userId: req.user.id
      }
    })

    res.status(201).json({ plan })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
})


// controller/create-plan.js (excerpt)
router.post('/init-plan', requireAuth, async (req, res) => {
  try {
    const { planName, source, destination, fromDate, toDate } = req.body

    if (!planName || !source || !destination || !fromDate || !toDate) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // 1) Persist the plan (links to authenticated user)
    const plan = await prisma.journeyPlan.create({
      data: {
        planName,
        source,
        destination,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        userId: req.user.id
      }
    })

    // 2) Build payload for Python FastAPI /plan
    const departISO = new Date(fromDate).toISOString().slice(0, 10)   // YYYY-MM-DD
    const returnISO = new Date(toDate).toISOString().slice(0, 10)     // YYYY-MM-DD

    const pyPayload = {
      source,                      // from body
      destination,                 // from body
      depart_date: departISO,      // mapped from fromDate
      return_date: returnISO,      // mapped from toDate

      // --- fixed values as requested ---
      travelers: 1,
      budget_level: "mid",
      preferences: ["food", "history"],
      flexibility_hours: 6,
      ai: {
        enabled: true,
        model: "gpt-4o-mini",
        temperature: 0.3
      }
    }

    // 3) Call Python planner
    const PY_URL = process.env.PY_SERVER_URL || 'http:localhost:8000/plan'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000 * 12)

    const resp = await fetch(PY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': req.user.id,
        'X-Plan-Id': plan.id
      },
      body: JSON.stringify(pyPayload),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      const details = await resp.text().catch(() => '')
      return res.status(502).json({
        error: 'planner_upstream_error',
        status: resp.status,
        details: details.slice(0, 500),
        plan // still return the saved plan record
      })
    }
   
        const planResult = await resp.json()

      
    if (planResult) {
      const updatedPlan = await prisma.journeyPlan.update({
        where: { id: plan.id },            
        data:  { pythonPlan: planResult }, 
      });
    }


    // 4) Respond to client with both DB plan + Python plan
    return res.status(201).json({
      plan,
      pythonPlan: planResult,
      meta: { requestedBy: req.user.id, forwardedTo: PY_URL }
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'planner_timeout' })
    }
    console.error('init-plan error:', e)
    return res.status(500).json({ error: 'server error' })
  }
})



router.get('/get-plan', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // set by requireAuth
    const { id, page = '1', limit = '20' } = req.query;

    // If a specific plan id is requested
    if (id) {
      const plan = await prisma.journeyPlan.findFirst({
        where: { id: String(id), userId },
      });
      if (!plan) {
        return res.status(404).json({ error: 'plan_not_found' });
      }
      return res.status(200).json({ plan });
    }

    // Pagination
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100); // 1..100
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * take;

    // Fetch list + total count in parallel
    const [items, total] = await Promise.all([
      prisma.journeyPlan.findMany({
        where: { userId },
        orderBy: [
          { fromDate: 'desc' },   // newest trips first
          { toDate: 'desc' },
          // add { createdAt: 'desc' } here if your model has it
        ],
        skip,
        take,
      }),
      prisma.journeyPlan.count({ where: { userId } }),
    ]);

    return res.status(200).json({
      items,
      page: currentPage,
      limit: take,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (e) {
    console.error('get-plan error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.post('/cost-analyze', requireAuth, async (req, res) => {
  try {
    const {
      origin,
      destination,
      startDate,
      endDate,
      travelers,
      rooms,
      hotelRating,
      foodType,
      meals,
      transport,
      nearby,
    } = req.body || {};

    if (!origin || !destination || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // normalize inputs
    const t = Math.max(1, Number(travelers) || 1);
    const r = Math.max(1, Number(rooms) || 1);
    const rating = Number(hotelRating) || 3;
    const tx = String(transport || 'train').toLowerCase();
    const isNearby = !!nearby;

    // dummy calculations similar to your client
    const transportUnit =
      tx === 'flight' ? 5000 :
      tx === 'bus'    ? 800  :
      1000; // train/default

    const transportCost = transportUnit * t;
    const hotelUnit = rating === 5 ? 4000 : rating === 4 ? 2500 : 1500;
    const hotelCost = r * hotelUnit;

    const mealsObj = meals && typeof meals === 'object' ? meals : {};
    const mealsCount = Object.values(mealsObj).filter(Boolean).length;
    const foodCost = mealsCount * 300 * t;

    const otherCost = isNearby ? 2000 : 1000;

    const total = transportCost + hotelCost + foodCost + otherCost;
    const perHead = Number((total / t).toFixed(2));

    return res.status(200).json({
      transportCost,
      hotelCost,
      foodCost,
      otherCost,
      total,
      perHead,
      nearbyPlaces: isNearby ? 'Agent analyzing..' : 'Not selected',
      meta: {
        origin,
        destination,
        startDate,
        endDate,
        travelers: t,
        rooms: r,
        hotelRating: rating,
        foodType,
        transport: tx,
        nearby: isNearby,
      },
      nodeMeta: { requestedBy: req.user?.id || null },
    });
  } catch (e) {
    console.error('cost-analyze error:', e);
    return res.status(500).json({ error: 'server error' });
  }
});



export default router

// -------------------------------------------
// Mount it in your Express server (server.js)
// -------------------------------------------
// import createPlanRouter from './routes/create-plan.js'
// app.use(createPlanRouter)

// -------------------------------------------
// .env
// -------------------------------------------
// PY_SERVER_URL=http://127.0.0.1:8000/plan

// -------------------------------------------
// Postman test
// -------------------------------------------
// POST http://localhost:4000/auth/create-plan
// Headers: Content-Type: application/json, Authorization: Bearer <accessToken>
// Body:
// {
//   "source": "Kolkata",
//   "destination": "Delhi",
//   "depart_date": "2025-09-20",
//   "return_date": "2025-09-24",
//   "travelers": 2,
//   "budget_level": "mid",
//   "preferences": ["food", "history"],
//   "flexibility_hours": 6,
//   "ai": { "enabled": true, "model": "gpt-4o-mini", "temperature": 0.3 }
// }
