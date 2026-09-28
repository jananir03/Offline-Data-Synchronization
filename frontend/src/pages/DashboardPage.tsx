import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import { CheckCircleRounded, CloudDoneRounded, ErrorOutlineRounded, Inventory2Rounded, PendingActionsRounded, SyncRounded, WarningAmberRounded } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../services/dashboardService";
import type { DashboardSummary } from "../types/api";

function StatCard({ title, value, icon, tint }: { title: string; value: number; icon: ReactNode; tint: string }) {
  return <Card sx={{ height: "100%", borderRadius: 4 }}><CardContent sx={{ p: 2.4 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><Box><Typography variant="body2" color="text.secondary">{title}</Typography><Typography variant="h4" sx={{ mt: 1 }}>{value}</Typography></Box><Box sx={{ width: 44, height: 44, borderRadius: 3, display: "grid", placeItems: "center", backgroundColor: tint }}>{icon}</Box></Box></CardContent></Card>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => setError("Could not load dashboard data.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (error || !summary) return <Alert severity="error">{error || "Dashboard data is unavailable."}</Alert>;

  const statuses = [
    { label: "Pending", value: summary.record_status.pending, icon: <PendingActionsRounded sx={{ color: "#C58A2E" }} />, bg: "#FFF4DD" },
    { label: "In progress", value: summary.record_status.in_progress, icon: <SyncRounded sx={{ color: "#4E91C5" }} />, bg: "#E8F4FC" },
    { label: "Completed", value: summary.record_status.completed, icon: <CheckCircleRounded sx={{ color: "#4BA879" }} />, bg: "#E8F8F0" },
    { label: "Cancelled", value: summary.record_status.cancelled, icon: <ErrorOutlineRounded sx={{ color: "#C85E70" }} />, bg: "#FCEBED" },
  ];
  const successRate = summary.sync.total_operations ? Math.round((summary.sync.successful_operations / summary.sync.total_operations) * 100) : 0;

  return <Stack spacing={3}>
    <Box><Typography variant="h4">Good evening, {user?.username} 👋</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Here’s a quick look at your synchronization workspace.</Typography></Box>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard title="Total records" value={summary.total_records} icon={<Inventory2Rounded sx={{ color: "#675ADB" }} />} tint="#EEEAFE" /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard title="Successful syncs" value={summary.sync.successful_operations} icon={<CloudDoneRounded sx={{ color: "#4BA879" }} />} tint="#E8F8F0" /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard title="Pending syncs" value={summary.sync.failed_operations} icon={<PendingActionsRounded sx={{ color: "#C58A2E" }} />} tint="#FFF4DD" /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard title="Conflicts" value={summary.total_conflicts} icon={<WarningAmberRounded sx={{ color: "#C85E70" }} />} tint="#FCEBED" /></Grid>
    </Grid>
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, md: 7 }}><Card sx={{ borderRadius: 4, height: "100%" }}><CardContent sx={{ p: 2.8 }}><Typography variant="h6">Record status</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Current records grouped by status.</Typography><Stack spacing={1.7}>{statuses.map((item) => <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: "grid", placeItems: "center", backgroundColor: item.bg }}>{item.icon}</Box><Box sx={{ flex: 1 }}><Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.6 }}><Typography fontSize={14}>{item.label}</Typography><Typography fontWeight={700}>{item.value}</Typography></Box><LinearProgress variant="determinate" value={summary.total_records ? (item.value / summary.total_records) * 100 : 0} sx={{ height: 7, borderRadius: 99, backgroundColor: "#F0EEF6", "& .MuiLinearProgress-bar": { borderRadius: 99 } }} /></Box></Box>)}</Stack></CardContent></Card></Grid>
      <Grid size={{ xs: 12, md: 5 }}><Card sx={{ borderRadius: 4, height: "100%" }}><CardContent sx={{ p: 2.8 }}><Typography variant="h6">Synchronization</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>A simple view of your sync activity.</Typography><Stack spacing={1.5}><Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography color="text.secondary">Total operations</Typography><Typography fontWeight={700}>{summary.sync.total_operations}</Typography></Box><Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography color="text.secondary">Successful</Typography><Chip label={summary.sync.successful_operations} size="small" color="success" /></Box><Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography color="text.secondary">Failed</Typography><Chip label={summary.sync.failed_operations} size="small" color="warning" /></Box><Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography color="text.secondary">Conflicts</Typography><Chip label={summary.sync.conflict_operations} size="small" color="error" /></Box><Box sx={{ pt: 1 }}><Typography variant="caption" color="text.secondary">Success rate</Typography><Typography variant="h5" sx={{ mt: 0.4 }}>{successRate}%</Typography></Box></Stack></CardContent></Card></Grid>
    </Grid>
  </Stack>;
}
