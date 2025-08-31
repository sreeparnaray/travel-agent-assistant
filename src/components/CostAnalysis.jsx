import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Divider,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../services/api"; // <-- make sure this exists (axios instance)
import styles from "./CostAnalysis.module.css";

export default function CostAnalysis() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 1,
    rooms: 1,
    hotelRating: "3",
    foodType: "veg",
    meals: {
      breakfast: false,
      lunch: false,
      snacks: false,
      dinner: false,
    },
    transport: "train",
    nearby: false,
  });

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleMealChange = (meal) => {
    setForm((prev) => ({
      ...prev,
      meals: { ...prev.meals, [meal]: !prev.meals[meal] },
    }));
  };

  // call /auth/cost-analyze whenever form changes (debounced)
  useEffect(() => {
    const required =
      form.origin?.trim() &&
      form.destination?.trim() &&
      form.startDate &&
      form.endDate &&
      Number(form.travelers) > 0 &&
      Number(form.rooms) > 0;

    if (!required) {
      setAnalysis(null);
      setErr("");
      return;
    }

    const payload = {
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      startDate: form.startDate, // expect YYYY-MM-DD
      endDate: form.endDate,
      travelers: Number(form.travelers),
      rooms: Number(form.rooms),
      hotelRating: Number(form.hotelRating),
      foodType: form.foodType,
      meals: form.meals,
      transport: form.transport,
      nearby: !!form.nearby,
    };

    let cancelled = false;
    setLoading(true);
    setErr("");

    const t = setTimeout(async () => {
            const token = localStorage.getItem("accessToken");

      try {
        const res = await api.post("http://localhost:4000/auth/cost-analyze", payload, {
         
          headers: token ? { Authorization: `Bearer ${token}` } : {},

          withCredentials: true,
          // Authorization header will be attached by api interceptor if you set it up.
        });
        if (!cancelled) {
          setAnalysis(res?.data || null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e?.response?.data?.error ||
            e?.response?.data?.message ||
            e?.message ||
            "Request failed";
          setErr(msg);
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500); // debounce

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  // Safely read numeric fields from API response with fallbacks
  const transportCost = Number(analysis?.transportCost ?? 3000);
  const hotelCost = Number(analysis?.hotelCost ?? 2000);
  const foodCost = Number(analysis?.foodCost ?? 1000);
  const otherCost = Number(analysis?.otherCost ?? 500);
  const total = Number(analysis?.total ?? transportCost + hotelCost + foodCost + otherCost);
  const perHead = analysis?.perHead ?? (Number(form.travelers) > 0 ? (total / Number(form.travelers)).toFixed(2) : "0.00");
  const nearbyPlaces = analysis?.nearbyPlaces ?? (form.nearby ? "Agent analyzing.." : "Not selected");

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        {loading && <LinearProgress />}
        <CardContent>
          <Typography variant="h4" className={styles.header}>
            ✈️ Trip Cost Analysis
          </Typography>
          <Divider className={styles.divider} />

          <Grid container spacing={2}>
            {/* ------------------- LEFT SIDE ------------------- */}
            <Grid item xs={12} md={6} className={styles.leftPanel}>
              <Typography variant="h6" className={styles.subHeader}>
                User Details
              </Typography>

              <TextField
                fullWidth
                label="Origin"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                className={styles.input}
              />
              <TextField
                fullWidth
                label="Destination"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                className={styles.input}
              />
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                name="startDate"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={handleChange}
                className={styles.input}
              />
              <TextField
                fullWidth
                type="date"
                label="End Date"
                name="endDate"
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={handleChange}
                className={styles.input}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Travelers"
                    name="travelers"
                    value={form.travelers}
                    onChange={handleChange}
                    className={styles.input}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Rooms"
                    name="rooms"
                    value={form.rooms}
                    onChange={handleChange}
                    className={styles.input}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
              </Grid>

              <TextField
                select
                fullWidth
                label="Hotel Rating"
                name="hotelRating"
                value={form.hotelRating}
                onChange={handleChange}
                className={styles.input}
              >
                <MenuItem value="3">3 Star</MenuItem>
                <MenuItem value="4">4 Star</MenuItem>
                <MenuItem value="5">5 Star</MenuItem>
              </TextField>

              <TextField
                select
                fullWidth
                label="Food Type"
                name="foodType"
                value={form.foodType}
                onChange={handleChange}
                className={styles.input}
              >
                <MenuItem value="veg">Veg</MenuItem>
                <MenuItem value="nonveg">Non-Veg</MenuItem>
              </TextField>

              <Typography className={styles.mealLabel}>Meals:</Typography>
              {["breakfast", "lunch", "snacks", "dinner"].map((meal) => (
                <FormControlLabel
                  key={meal}
                  control={
                    <Checkbox
                      checked={form.meals[meal]}
                      onChange={() => handleMealChange(meal)}
                    />
                  }
                  label={meal.charAt(0).toUpperCase() + meal.slice(1)}
                />
              ))}

              <TextField
                select
                fullWidth
                label="Transport"
                name="transport"
                value={form.transport}
                onChange={handleChange}
                className={styles.input}
              >
                <MenuItem value="train">Train</MenuItem>
                <MenuItem value="bus">Bus</MenuItem>
                <MenuItem value="flight">Flight</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.nearby}
                    onChange={() => setForm({ ...form, nearby: !form.nearby })}
                  />
                }
                label="Want to travel nearby famous places?"
              />

              {err && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {err}
                </Alert>
              )}
            </Grid>

            {/* ------------------- RIGHT SIDE ------------------- */}
            <Grid item xs={12} md={6} className={styles.rightPanel}>
              <Typography variant="h6" className={styles.subHeader}>
                💡 Recommendation By Agent
              </Typography>
              {analysis ? (
                <>
                  <Typography>🚆 Travel Cost: ₹{transportCost}</Typography>
                  <Typography>🏨 Hotel Cost: ₹{hotelCost}</Typography>
                  <Typography>🍽 Food Cost: ₹{foodCost}</Typography>
                  <Typography>🎟 Other Cost: ₹{otherCost}</Typography>
                  <Divider className={styles.divider} />
                  <Typography variant="h6" className={styles.total}>
                    Total Trip Cost: ₹{total}
                  </Typography>
                  <Typography>👤 Cost per Head: ₹{perHead}</Typography>
                  <Divider className={styles.divider} />
                  <Typography>📍 Nearby Travel Places: {nearbyPlaces}</Typography>

                  {/* Pie Chart */}
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Transport", value: transportCost },
                          { name: "Hotel", value: hotelCost },
                          { name: "Food", value: foodCost },
                          { name: "Other", value: otherCost },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label
                      >
                        {[transportCost, hotelCost, foodCost, otherCost].map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <Typography color="text.secondary">
                  Start filling details to see cost analysis
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
}
