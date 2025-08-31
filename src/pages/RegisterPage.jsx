import { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Snackbar,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ENDPOINT_URL = `http://localhost:4000/auth/register`;

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    if (password && password.length < 6) e.password = "Use at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // needed so the server can set the httpOnly refresh cookie
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || null }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // map common server errors
        if (res.status === 400) {
          setErrors((prev) => ({ ...prev, email: "Email and password are required" }));
        } else if (res.status === 409) {
          setErrors((prev) => ({ ...prev, email: "Email already in use" }));
        }
        throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
      }

      // Save auth locally (access token + user)
      if (data?.accessToken) localStorage.setItem("accessToken", data.accessToken);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      setToast({ open: true, severity: "success", msg: `Welcome, ${data?.user?.name || name}!` });
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setToast({ open: true, severity: "error", msg: err.message || "Registration failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 500,
          width: "100%",
          backgroundColor: "white",
        }}
      >
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: "bold", color: "#1e88e5" }}>
          Create an Account
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 3, color: "text.secondary" }}>
          Join Smart Travel Help Agent and start your journey today!
        </Typography>

        <TextField
          fullWidth
          label="Full Name"
          variant="outlined"
          sx={{ mb: 2 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
        />
        <TextField
          fullWidth
          label="Email Address"
          variant="outlined"
          sx={{ mb: 2 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
        />
        <TextField
          fullWidth
          label="Password"
          type={showPw ? "text" : "password"}
          variant="outlined"
          sx={{ mb: 3 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!errors.password}
          helperText={errors.password}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPw((s) => !s)} edge="end" aria-label="toggle password visibility">
                  {showPw ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={submitting}
          sx={{ backgroundColor: "#1e88e5", ":hover": { backgroundColor: "#1565c0" } }}
          onClick={handleRegister}
        >
          {submitting ? "Registering..." : "Register"}
        </Button>

        <Button variant="text" fullWidth sx={{ mt: 2 }} onClick={() => navigate("/login")} disabled={submitting}>
          Already have an account? Login
        </Button>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
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
