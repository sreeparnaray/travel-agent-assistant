import { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Paper,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const storage = remember ? localStorage : sessionStorage;

  const handleLogin = async () => {
    if (!validate()) {
      setToast({ open: true, severity: "error", msg: "Please fix the highlighted fields." });
      return;
    }
    setSubmitting(true);
    
    try {
      const res = await api.post(
        "http://localhost:4000/auth/login",
        { email: email.trim(), password },
        {
          withCredentials: true, // allow refresh-token cookie if your backend sets one
        }
      );

      const data = res?.data || {};
      if (!data.accessToken || !data.user) {
        throw new Error("Invalid server response");
      }

      storage.setItem("accessToken", data.accessToken);
      storage.setItem("user", JSON.stringify(data.user));
      // Optional: also store where we saved it
      storage.setItem("auth_storage", remember ? "local" : "session");

      setToast({ open: true, severity: "success", msg: `Welcome back, ${data.user.name || "traveler"}!` });
      // Short delay so toast is visible
      setTimeout(() => navigate("/dashboard/dashboard1"), 500);
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      let msg = "Login failed";
      if (status === 400) msg = body?.error || "Email and password are required";
      else if (status === 401) msg = body?.error || "Invalid credentials";
      else if (status === 429) msg = "Too many attempts. Please try again later.";
      setToast({ open: true, severity: "error", msg });
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
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#1e88e5" }}
        >
          Welcome Back
        </Typography>
        <Typography
          variant="body2"
          align="center"
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Sign in to continue your Smart Travel Help Agent experience
        </Typography>

        <TextField
          fullWidth
          label="Email Address"
          type="email"
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
          sx={{ mb: 1 }}
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

        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label="Remember me"
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{
            backgroundColor: "#1e88e5",
            ":hover": { backgroundColor: "#1565c0" },
            mb: 2,
          }}
          onClick={handleLogin}
          disabled={submitting}
        >
          {submitting ? "Logging in..." : "Login"}
        </Button>

        <Button variant="text" fullWidth onClick={() => navigate("/register")} disabled={submitting}>
          Don’t have an account? Register
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
