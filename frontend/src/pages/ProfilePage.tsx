import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  EmailRounded,
  LockRounded,
  PersonRounded,
  SaveRounded,
  ShieldRounded,
} from "@mui/icons-material";

import { useAuth } from "../context/AuthContext";
import {
  getMyProfile,
  updateMyProfile,
} from "../services/userService";
import type {
  UserProfileResponse,
} from "../types/api";

export default function ProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] =
    useState<UserProfileResponse | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();

        if (!mounted) {
          return;
        }

        setProfile(data);
        setEmail(data.email);
      } catch {
        if (mounted) {
          setError(
            "Unable to load your profile.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password && password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);

      const payload: {
        email?: string;
        password?: string;
      } = {
        email: email.trim(),
      };

      if (password.trim()) {
        payload.password = password;
      }

      const updated = await updateMyProfile(
        payload,
      );

      setProfile(updated);
      setEmail(updated.email);

      setPassword("");
      setConfirmPassword("");

      setSuccess(
        "Your profile has been updated successfully.",
      );
    } catch (requestError: unknown) {
      const message =
        requestError &&
        typeof requestError === "object" &&
        "response" in requestError &&
        requestError.response &&
        typeof requestError.response === "object" &&
        "data" in requestError.response &&
        requestError.response.data &&
        typeof requestError.response.data ===
          "object" &&
        "detail" in requestError.response.data
          ? String(
              requestError.response.data.detail,
            )
          : "Unable to update your profile.";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Stack spacing={2}>
        <Typography variant="h4">
          Profile
        </Typography>

        <Alert severity="error">
          {error ||
            "Profile information could not be loaded."}
        </Alert>
      </Stack>
    );
  }

  const initials =
    profile.username
      ?.slice(0, 1)
      .toUpperCase() || "U";

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant="h4"
          sx={{
            color: "#302B4D",
          }}
        >
          My Profile
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          Manage your account information and password.
        </Typography>
      </Box>

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent
              sx={{
                p: 3,
                height: "100%",
              }}
            >
              <Stack
                alignItems="center"
                spacing={2}
              >
                <Avatar
                  sx={{
                    width: 92,
                    height: 92,
                    background:
                      "linear-gradient(135deg, #7C6FF2, #E889B8)",
                    fontSize: 34,
                    fontWeight: 800,
                  }}
                >
                  {initials}
                </Avatar>

                <Box
                  sx={{
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="h6"
                    color="#302B4D"
                  >
                    {profile.username}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {profile.email}
                  </Typography>
                </Box>

                <Chip
                  icon={<ShieldRounded />}
                  label={profile.role}
                  color={
                    profile.role === "ADMIN"
                      ? "secondary"
                      : "default"
                  }
                  sx={{
                    fontWeight: 700,
                  }}
                />

                <Divider
                  flexItem
                  sx={{ my: 1 }}
                />

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      backgroundColor:
                        profile.is_active
                          ? "#55B889"
                          : "#D86D7D",
                    }}
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {profile.is_active
                      ? "Active account"
                      : "Inactive account"}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="h6"
                    color="#302B4D"
                  >
                    Account Information
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Update the information associated
                    with your account.
                  </Typography>
                </Box>

                <TextField
                  label="Username"
                  value={profile.username}
                  fullWidth
                  disabled
                  InputProps={{
                    startAdornment: (
                      <PersonRounded
                        sx={{
                          mr: 1,
                          color: "text.secondary",
                        }}
                      />
                    ),
                  }}
                />

                <TextField
                  label="Email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  type="email"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <EmailRounded
                        sx={{
                          mr: 1,
                          color: "text.secondary",
                        }}
                      />
                    ),
                  }}
                  disabled={saving}
                />

                <Divider />

                <Box>
                  <Typography
                    variant="h6"
                    color="#302B4D"
                  >
                    Change Password
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Leave these fields empty if you do
                    not want to change your password.
                  </Typography>
                </Box>

                <TextField
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  fullWidth
                  disabled={saving}
                  InputProps={{
                    startAdornment: (
                      <LockRounded
                        sx={{
                          mr: 1,
                          color: "text.secondary",
                        }}
                      />
                    ),
                  }}
                />

                <TextField
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  fullWidth
                  disabled={saving}
                  InputProps={{
                    startAdornment: (
                      <LockRounded
                        sx={{
                          mr: 1,
                          color: "text.secondary",
                        }}
                      />
                    ),
                  }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={
                      saving ? (
                        <CircularProgress
                          size={18}
                          color="inherit"
                        />
                      ) : (
                        <SaveRounded />
                      )
                    }
                    onClick={() =>
                      void handleSave()
                    }
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save changes"}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Account ID
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontFamily:
                '"Roboto Mono", monospace',
              fontSize: 13,
              wordBreak: "break-all",
            }}
          >
            {profile.id}
          </Typography>

          {user?.role && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Current access role: {user.role}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}