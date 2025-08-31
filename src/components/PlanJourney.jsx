import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Divider,
  Paper,
  Snackbar,
  Alert,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import api from "../services/api";

const fmtINR = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    : n;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

export default function PlanJourney() {
  const [tripName, setTripName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [travelers, setTravelers] = useState(1); // UI-only (backend uses fixed 1)

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  // server returns these
  const [plan, setPlan] = useState(null); // DB plan
  const [pythonPlan, setPythonPlan] = useState(null); // AI planner
  const [meta, setMeta] = useState(null);

  const validate = () => {
    const e = {};
    if (!tripName.trim()) e.tripName = "Trip name is required";
    if (!origin.trim()) e.origin = "Origin is required";
    if (!destination.trim()) e.destination = "Destination is required";
    if (!from) e.from = "Start date is required";
    if (!to) e.to = "End date is required";
    if (from && to && new Date(from) > new Date(to)) e.to = "End date must be after start date";
    if (!travelers || Number(travelers) < 1) e.travelers = "At least 1 traveler";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) {
      setToast({ open: true, severity: "error", msg: "Please fix the highlighted fields." });
      return;
    }
    setLoading(true);
    setPlan(null);
    setPythonPlan(null);
    setMeta(null);

    try {
      const token = localStorage.getItem("accessToken");
      const payload = {
        planName: tripName.trim(),
        source: origin.trim(),
        destination: destination.trim(),
        fromDate: from, // YYYY-MM-DD
        toDate: to,     // YYYY-MM-DD
      };

      const res = await api.post("http://localhost:4000/auth/init-plan", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });

      const data = res?.data || {};
      setPlan(data.plan || null);
      setPythonPlan(data.pythonPlan || null);
      setMeta(data.meta || null);

      let msg = "Plan created successfully";
      if (!data.pythonPlan) msg = "Plan saved, but the AI planner returned no data.";
      setToast({ open: true, severity: "success", msg });
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      if (status === 502) {
        setPlan(body?.plan || null);
        setToast({ open: true, severity: "warning", msg: "Upstream planner error (502). Plan saved." });
      } else if (status === 504) {
        setToast({ open: true, severity: "warning", msg: "Planner timeout (504). Plan may be saved." });
      } else if (status === 400) {
        setToast({ open: true, severity: "error", msg: body?.error || "Missing required fields" });
      } else if (status === 401) {
        setToast({ open: true, severity: "error", msg: "Unauthorized. Please log in." });
      } else {
        setToast({ open: true, severity: "error", msg: body?.error || "Failed to create plan" });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    const blob = {
      plan,
      pythonPlan,
      meta,
    };
    navigator.clipboard.writeText(JSON.stringify(blob, null, 2));
    setToast({ open: true, severity: "success", msg: "JSON copied to clipboard" });
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ plan, pythonPlan, meta }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan?.planName || "plan"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3, mt: 8 }}>
      <Card sx={{ borderRadius: 4, boxShadow: 5 }}>
        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <FlightTakeoffIcon fontSize="large" />
          <Typography variant="h5" fontWeight="bold">
            Plan Your Journey
          </Typography>
        </Box>

        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Enter your journey details.
          </Typography>

          <TextField
            fullWidth
            label="Trip Name"
            variant="outlined"
            sx={{ mb: 2 }}
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            error={!!errors.tripName}
            helperText={errors.tripName}
          />

          <TextField
            fullWidth
            label="Origin"
            variant="outlined"
            sx={{ mb: 2 }}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            error={!!errors.origin}
            helperText={errors.origin}
          />

          <TextField
            fullWidth
            label="Destination"
            variant="outlined"
            sx={{ mb: 2 }}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            error={!!errors.destination}
            helperText={errors.destination}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                type="date"
                fullWidth
                label="From"
                InputLabelProps={{ shrink: true }}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                error={!!errors.from}
                helperText={errors.from}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="date"
                fullWidth
                label="To"
                InputLabelProps={{ shrink: true }}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                error={!!errors.to}
                helperText={errors.to}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            type="number"
            label="Number of Travelers"
            variant="outlined"
            sx={{ mb: 2 }}
            value={travelers}
            onChange={(e) => setTravelers(Number(e.target.value))}
            inputProps={{ min: 1 }}
            error={!!errors.travelers}
            helperText={errors.travelers}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{
              mt: 1,
              py: 1.5,
              fontSize: "1rem",
              backgroundColor: "#1e88e5",
              ":hover": { backgroundColor: "#1565c0" },
            }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Creating Plan..." : "Confirm Journey"}
          </Button>

          {/* RESULTS */}
          {(plan || pythonPlan) && (
            <Stack spacing={3} sx={{ mt: 4 }}>
              {/* DB PLAN */}
              {plan && (
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3, backgroundColor: "#f9f9f9" }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ color: "#1e88e5" }}>
                      Saved Plan (Database)
                    </Typography>
                    <Chip size="small" label={`Plan ID: ${plan.id}`} />
                  </Stack>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Trip:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {plan.planName} — {plan.source} → {plan.destination}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {fmtDate(plan.fromDate)} – {fmtDate(plan.toDate)}
                  </Typography>
                </Paper>
              )}

              {/* AI PLANNER */}
              {pythonPlan && (
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ color: "#1e88e5" }}>
                      AI Planner Result
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {meta?.forwardedTo && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Upstream: ${meta.forwardedTo.replace("http:", "http://")}`}
                        />
                      )}
                      <Tooltip title="Copy JSON">
                        <IconButton onClick={copyJson}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download JSON">
                        <IconButton onClick={downloadJson}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />

                  {/* Summary */}
                  {pythonPlan.summary && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Summary
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {pythonPlan.summary}
                      </Typography>
                    </>
                  )}

                  {/* Transport Options */}
                  {Array.isArray(pythonPlan.transport_options) && pythonPlan.transport_options.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Transport Options
                      </Typography>
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Mode</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Distance</TableCell>
                            <TableCell>Est. Cost / person</TableCell>
                            <TableCell>Links</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pythonPlan.transport_options.map((t, idx) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ whiteSpace: "nowrap" }}>
                                <Stack spacing={0.5}>
                                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{t.mode}</span>
                                  {t.provider_hint && (
                                    <Typography variant="caption" color="text.secondary">
                                      {t.provider_hint}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>{t.duration_hours ? `${t.duration_hours} h` : "-"}</TableCell>
                              <TableCell>{t.distance_km ? `${t.distance_km} km` : "-"}</TableCell>
                              <TableCell>{fmtINR(t.est_cost_per_person_inr)}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  {(t.booking_urls || []).map((u, i) => (
                                    <Button
                                      key={i}
                                      size="small"
                                      variant="text"
                                      endIcon={<OpenInNewIcon fontSize="inherit" />}
                                      onClick={() => window.open(u, "_blank")}
                                    >
                                      Link {i + 1}
                                    </Button>
                                  ))}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {/* Lodging Options */}
                  {Array.isArray(pythonPlan.lodging_options) && pythonPlan.lodging_options.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Lodging Options
                      </Typography>
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Area</TableCell>
                            <TableCell>Nights</TableCell>
                            <TableCell>Est. / night</TableCell>
                            <TableCell>Est. Total</TableCell>
                            <TableCell>Links</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pythonPlan.lodging_options.map((h, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{h.name}</TableCell>
                              <TableCell>{h.location_hint || "-"}</TableCell>
                              <TableCell>{h.nights ?? "-"}</TableCell>
                              <TableCell>{fmtINR(h.est_cost_per_night_inr)}</TableCell>
                              <TableCell>{fmtINR(h.est_total_inr)}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  {(h.booking_urls || []).map((u, i) => (
                                    <Button
                                      key={i}
                                      size="small"
                                      variant="text"
                                      endIcon={<OpenInNewIcon fontSize="inherit" />}
                                      onClick={() => window.open(u, "_blank")}
                                    >
                                      Link {i + 1}
                                    </Button>
                                  ))}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {/* Activities */}
                  {Array.isArray(pythonPlan.activities) && pythonPlan.activities.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Activities
                      </Typography>
                      <List dense sx={{ mb: 2 }}>
                        {pythonPlan.activities.map((a, idx) => (
                          <ListItem key={idx} disableGutters>
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                                  {Array.isArray(a.theme) &&
                                    a.theme.map((t, i) => <Chip key={i} size="small" label={t} />)}
                                </Stack>
                              }
                              secondary={a.est_cost_inr ? `~ ${fmtINR(a.est_cost_inr)}` : null}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  {/* Day-by-day */}
                  {Array.isArray(pythonPlan.day_by_day) && pythonPlan.day_by_day.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Day-by-Day Plan
                      </Typography>
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Day</TableCell>
                            <TableCell>Morning</TableCell>
                            <TableCell>Afternoon</TableCell>
                            <TableCell>Evening</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pythonPlan.day_by_day.map((d) => (
                            <TableRow key={d.day}>
                              <TableCell>{d.day}</TableCell>
                              <TableCell>{d.morning || "-"}</TableCell>
                              <TableCell>{d.afternoon || "-"}</TableCell>
                              <TableCell>{d.evening || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {/* Cost breakdown */}
                  {pythonPlan.cost_breakdown && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Estimated Cost Breakdown
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {Object.entries(pythonPlan.cost_breakdown).map(([k, v]) => (
                          <Grid item xs={6} md={3} key={k}>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {k.replace(/_/g, " ").toUpperCase()}
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {fmtINR(v)}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}

                  {/* Notes */}
                  {Array.isArray(pythonPlan.notes) && pythonPlan.notes.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Notes
                      </Typography>
                      <List dense>
                        {pythonPlan.notes.map((n, i) => (
                          <ListItem key={i} disableGutters>
                            <ListItemText primary={n} />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </Paper>
              )}

              {/* If upstream missing but plan saved */}
              {!pythonPlan && plan && (
                <Alert severity="info" variant="outlined">
                  The plan was saved, but the AI planner didn’t return details yet.
                </Alert>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
