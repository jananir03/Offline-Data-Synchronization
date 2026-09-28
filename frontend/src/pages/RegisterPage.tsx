import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from "@mui/material";
import { PersonAddRounded, SyncRounded } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await register(username.trim(), email.trim(), password);
      setSuccess("Account created successfully. You can sign in now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(message ?? "Registration failed. Please check your details.");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, background: "radial-gradient(circle at 85% 12%, #FCE7F1 0, transparent 34%), radial-gradient(circle at 15% 85%, #EEE9FF 0, transparent 34%), #F8F7FC" }}>
      <Card sx={{ width: "100%", maxWidth: 470, borderRadius: 5, overflow: "hidden" }}>
        <Box sx={{ height: 8, background: "linear-gradient(90deg, #E889B8, #7C6FF2)" }} />
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 4, display: "grid", placeItems: "center", mx: "auto", mb: 2, color: "white", background: "linear-gradient(135deg, #E889B8, #7C6FF2)" }}><SyncRounded /></Box>
              <Typography variant="h5">Create your account</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.7 }}>Start managing your synced records</Typography>
            </Box>
            {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ borderRadius: 3 }}>{success}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required inputProps={{ minLength: 3, maxLength: 50 }} fullWidth />
                <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
                <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required inputProps={{ minLength: 8, maxLength: 128 }} fullWidth />
                <TextField label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required fullWidth />
                <Button type="submit" variant="contained" size="large" startIcon={<PersonAddRounded />} fullWidth>Create account</Button>
              </Stack>
            </Box>
            <Divider />
            <Button component={Link} to="/login" variant="outlined" size="large">Back to sign in</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
