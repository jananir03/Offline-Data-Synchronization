import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Stack, TextField, Typography } from "@mui/material";
import { CloudOffRounded, LockRounded, SyncRounded } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(from, { replace: true });
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(message ?? "Login failed. Please check your username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, background: "radial-gradient(circle at 15% 15%, #EEE9FF 0, transparent 32%), radial-gradient(circle at 85% 85%, #FCE7F1 0, transparent 34%), #F8F7FC" }}>
      <Card sx={{ width: "100%", maxWidth: 430, borderRadius: 5, overflow: "hidden" }}>
        <Box sx={{ height: 8, background: "linear-gradient(90deg, #7C6FF2, #E889B8)" }} />
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ width: 58, height: 58, borderRadius: 4, display: "grid", placeItems: "center", mx: "auto", mb: 2, color: "white", background: "linear-gradient(135deg, #7C6FF2, #E889B8)" }}><SyncRounded /></Box>
              <Typography variant="h5">Welcome back</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.7 }}>Sign in to continue to Offline Sync</Typography>
            </Box>
            {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" fullWidth />
                <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" fullWidth />
                <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockRounded />} fullWidth>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </Stack>
            </Box>
            <Divider><Typography variant="caption" color="text.secondary">New here?</Typography></Divider>
            <Button component={Link} to="/register" variant="outlined" size="large">Create an account</Button>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.8, color: "text.secondary" }}>
              <CloudOffRounded sx={{ fontSize: 18 }} />
              <Typography variant="caption">Offline-first synchronization</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
