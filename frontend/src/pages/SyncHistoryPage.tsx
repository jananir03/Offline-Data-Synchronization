import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type {
  SelectChangeEvent,
} from "@mui/material/Select";
import {
  CheckCircleOutlineRounded,
  ErrorOutlineRounded,
  SyncProblemRounded,
} from "@mui/icons-material";

import type {
  SyncConflictStatus,
  SyncHistoryItem,
  SyncHistoryStatus,
  SyncOperationType,
} from "../types/api";
import { getSyncHistory } from "../services/syncService";

function statusChip(status: SyncHistoryStatus) {
  if (status === "SUCCESS") {
    return (
      <Chip
        size="small"
        icon={<CheckCircleOutlineRounded />}
        label="Success"
        color="success"
        sx={{ fontWeight: 700 }}
      />
    );
  }

  if (status === "CONFLICT") {
    return (
      <Chip
        size="small"
        icon={<SyncProblemRounded />}
        label="Conflict"
        color="warning"
        sx={{ fontWeight: 700 }}
      />
    );
  }

  return (
    <Chip
      size="small"
      icon={<ErrorOutlineRounded />}
      label="Failed"
      color="error"
      sx={{ fontWeight: 700 }}
    />
  );
}

function operationChip(operationType: SyncOperationType) {
  const color =
    operationType === "CREATE"
      ? "success"
      : operationType === "UPDATE"
        ? "info"
        : "default";

  return (
    <Chip
      size="small"
      label={operationType}
      color={color}
      variant="outlined"
      sx={{ fontWeight: 700 }}
    />
  );
}

function conflictChip(conflictStatus: SyncConflictStatus) {
  if (conflictStatus === "DETECTED") {
    return (
      <Chip
        size="small"
        label="Detected"
        color="warning"
        sx={{ fontWeight: 700 }}
      />
    );
  }

  if (conflictStatus === "RESOLVED") {
    return (
      <Chip
        size="small"
        label="Resolved"
        color="success"
        sx={{ fontWeight: 700 }}
      />
    );
  }

  return (
    <Chip
      size="small"
      label="None"
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function shortenId(value: string): string {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function SyncHistoryPage() {
  const [items, setItems] = useState<SyncHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState<SyncHistoryStatus | "">("");
  const [operationType, setOperationType] =
    useState<SyncOperationType | "">("");
  const [conflictStatus, setConflictStatus] =
    useState<SyncConflictStatus | "">("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getSyncHistory({
        page,
        page_size: 8,
        status: status || undefined,
        operation_type: operationType || undefined,
        conflict_status: conflictStatus || undefined,
        sort_by: "timestamp",
        sort_order: "desc",
      });

      setItems(result.items);
      setTotalPages(Math.max(result.total_pages, 1));
    } catch {
      setError("Could not load synchronization history.");
    } finally {
      setLoading(false);
    }
  }, [page, status, operationType, conflictStatus]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function handleStatusChange(
    event: SelectChangeEvent<SyncHistoryStatus | "">,
  ) {
    setStatus(event.target.value as SyncHistoryStatus | "");
    setPage(1);
  }

  function handleOperationChange(
    event: SelectChangeEvent<SyncOperationType | "">,
  ) {
    setOperationType(event.target.value as SyncOperationType | "");
    setPage(1);
  }

  function handleConflictChange(
    event: SelectChangeEvent<SyncConflictStatus | "">,
  ) {
    setConflictStatus(event.target.value as SyncConflictStatus | "");
    setPage(1);
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Sync History</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.6 }}>
          Track synchronization attempts, results, and conflict activity.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ mb: 2.5 }}
          >
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={status}
                onChange={handleStatusChange}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="SUCCESS">Success</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="CONFLICT">Conflict</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Operation</InputLabel>
              <Select
                label="Operation"
                value={operationType}
                onChange={handleOperationChange}
              >
                <MenuItem value="">All operations</MenuItem>
                <MenuItem value="CREATE">Create</MenuItem>
                <MenuItem value="UPDATE">Update</MenuItem>
                <MenuItem value="DELETE">Delete</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Conflict</InputLabel>
              <Select
                label="Conflict"
                value={conflictStatus}
                onChange={handleConflictChange}
              >
                <MenuItem value="">All conflict states</MenuItem>
                <MenuItem value="NONE">None</MenuItem>
                <MenuItem value="DETECTED">Detected</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Operation</TableCell>
                  <TableCell>Record ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Conflict</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      Loading synchronization history...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        No synchronization history found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.sync_id} hover>
                      <TableCell>
                        <Stack spacing={0.7}>
                          {operationChip(item.operation_type)}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            title={item.operation_id}
                          >
                            {shortenId(item.operation_id)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          title={item.record_id}
                        >
                          {shortenId(item.record_id)}
                        </Typography>
                      </TableCell>

                      <TableCell>{statusChip(item.status)}</TableCell>

                      <TableCell>
                        {conflictChip(item.conflict_status)}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(item.timestamp)}
                        </Typography>

                        {item.error_details && (
                          <Typography
                            variant="caption"
                            color="error.main"
                            sx={{
                              display: "block",
                              mt: 0.4,
                              maxWidth: 260,
                            }}
                          >
                            {item.error_details}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              pt: 2.5,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
