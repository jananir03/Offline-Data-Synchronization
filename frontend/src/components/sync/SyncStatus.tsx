import {
  CloudDoneRounded,
  CloudOffRounded,
  SyncRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import { useSync } from "../../context/SyncContext";

export default function SyncStatus() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    lastResult,
    syncNow,
  } = useSync();

  const lastSyncText = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString()
    : "Not synced yet";

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ xs: "flex-start", sm: "center" }}
    >
      <Chip
        size="small"
        icon={
          isOnline ? (
            <CloudDoneRounded />
          ) : (
            <CloudOffRounded />
          )
        }
        label={isOnline ? "Online" : "Offline"}
        color={isOnline ? "success" : "warning"}
        sx={{ fontWeight: 700 }}
      />

      {pendingCount > 0 && (
        <Tooltip
          title="Changes waiting to synchronize"
        >
          <Chip
            size="small"
            icon={<WarningAmberRounded />}
            label={`${pendingCount} pending`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Tooltip>
      )}

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Typography
          variant="caption"
          color="text.secondary"
        >
          Last sync: {lastSyncText}
        </Typography>
      </Box>

      {lastResult && lastResult.conflicts > 0 && (
        <Chip
          size="small"
          label={`${lastResult.conflicts} conflict${lastResult.conflicts === 1 ? "" : "s"}`}
          color="warning"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      )}

      <Button
        size="small"
        variant="outlined"
        startIcon={
          isSyncing ? (
            <CircularProgress size={15} />
          ) : (
            <SyncRounded />
          )
        }
        disabled={!isOnline || isSyncing || pendingCount === 0}
        onClick={() => void syncNow()}
      >
        {isSyncing ? "Syncing..." : "Sync now"}
      </Button>
    </Stack>
  );
}
