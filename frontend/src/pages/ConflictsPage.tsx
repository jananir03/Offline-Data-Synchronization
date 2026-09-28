import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  CheckCircleOutlineRounded,
  CompareArrowsRounded,
  VisibilityRounded,
} from "@mui/icons-material";

import type {
  ConflictItem,
  ConflictResolution,
  ConflictStatus,
} from "../types/api";
import {
  getConflict,
  getConflicts,
} from "../services/syncService";

function statusChip(status: ConflictStatus) {
  return status === "RESOLVED" ? (
    <Chip
      size="small"
      icon={<CheckCircleOutlineRounded />}
      label="Resolved"
      color="success"
      sx={{ fontWeight: 700 }}
    />
  ) : (
    <Chip
      size="small"
      label="Open"
      color="warning"
      sx={{ fontWeight: 700 }}
    />
  );
}

function resolutionChip(resolution: ConflictResolution) {
  const labels: Record<ConflictResolution, string> = {
    SERVER_WINS: "Server wins",
    CLIENT_WINS: "Client wins",
    MANUAL: "Manual",
  };

  return (
    <Chip
      size="small"
      label={labels[resolution]}
      variant="outlined"
      sx={{ fontWeight: 700 }}
    />
  );
}

function shortenId(value: string): string {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function stringifyPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

export default function ConflictsPage() {
  const [items, setItems] = useState<ConflictItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState<ConflictStatus | "">("");
  const [resolution, setResolution] =
    useState<ConflictResolution | "">("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedConflict, setSelectedConflict] =
    useState<ConflictItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadConflicts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getConflicts({
        page,
        page_size: 8,
        status: status || undefined,
        resolution: resolution || undefined,
        sort_by: "created_at",
        sort_order: "desc",
      });

      setItems(result.items);
      setTotalPages(Math.max(result.total_pages, 1));
    } catch {
      setError("Could not load conflicts.");
    } finally {
      setLoading(false);
    }
  }, [page, status, resolution]);

  useEffect(() => {
    void loadConflicts();
  }, [loadConflicts]);

  function handleStatusChange(
    event: SelectChangeEvent<ConflictStatus | "">,
  ) {
    setStatus(event.target.value as ConflictStatus | "");
    setPage(1);
  }

  function handleResolutionChange(
    event: SelectChangeEvent<ConflictResolution | "">,
  ) {
    setResolution(event.target.value as ConflictResolution | "");
    setPage(1);
  }

  async function openDetails(conflictId: string) {
    setDetailsLoading(true);
    setError("");

    try {
      const conflict = await getConflict(conflictId);
      setSelectedConflict(conflict);
    } catch {
      setError("Could not load conflict details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Conflicts</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.6 }}>
          Review synchronization conflicts and compare client and server data.
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
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>Resolution</InputLabel>
              <Select
                label="Resolution"
                value={resolution}
                onChange={handleResolutionChange}
              >
                <MenuItem value="">All resolutions</MenuItem>
                <MenuItem value="SERVER_WINS">Server wins</MenuItem>
                <MenuItem value="CLIENT_WINS">Client wins</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Record</TableCell>
                  <TableCell>Versions</TableCell>
                  <TableCell>Resolution</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Details</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      Loading conflicts...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        No conflicts found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.7} alignItems="center">
                            <CompareArrowsRounded
                              fontSize="small"
                              sx={{ color: "primary.main" }}
                            />
                            <Typography fontWeight={650}>
                              {shortenId(item.record_id)}
                            </Typography>
                          </Stack>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            title={item.operation_id}
                          >
                            Operation: {shortenId(item.operation_id)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Chip
                            size="small"
                            label={`Client v${item.client_version}`}
                            sx={{
                              backgroundColor: "#F3EEFF",
                              color: "#5B4FD1",
                              fontWeight: 700,
                            }}
                          />
                          <Typography color="text.secondary">→</Typography>
                          <Chip
                            size="small"
                            label={`Server v${item.server_version}`}
                            sx={{
                              backgroundColor: "#FFF0F6",
                              color: "#C95F94",
                              fontWeight: 700,
                            }}
                          />
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {resolutionChip(item.resolution)}
                      </TableCell>

                      <TableCell>{statusChip(item.status)}</TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(item.created_at)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityRounded />}
                          onClick={() => void openDetails(item.id)}
                          disabled={detailsLoading}
                        >
                          View
                        </Button>
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

      <Dialog
        open={Boolean(selectedConflict)}
        onClose={() => setSelectedConflict(null)}
        fullWidth
        maxWidth="md"
      >
        {selectedConflict && (
          <>
            <DialogTitle>
              Conflict details
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Server-wins resolution recorded by the synchronization engine.
              </Typography>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                >
                  <Card
                    sx={{
                      flex: 1,
                      borderRadius: 3,
                      backgroundColor: "#FAF8FF",
                    }}
                  >
                    <CardContent>
                      <Typography fontWeight={750}>
                        Client version
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 0.5 }}>
                        v{selectedConflict.client_version}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card
                    sx={{
                      flex: 1,
                      borderRadius: 3,
                      backgroundColor: "#FFF7FA",
                    }}
                  >
                    <CardContent>
                      <Typography fontWeight={750}>
                        Server version
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 0.5 }}>
                        v{selectedConflict.server_version}
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={750} sx={{ mb: 1 }}>
                      Client payload
                    </Typography>

                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 2,
                        borderRadius: 3,
                        backgroundColor: "#F7F5FB",
                        border: "1px solid #ECEAF5",
                        overflow: "auto",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {stringifyPayload(selectedConflict.client_payload)}
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={750} sx={{ mb: 1 }}>
                      Server payload
                    </Typography>

                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 2,
                        borderRadius: 3,
                        backgroundColor: "#FFF7FA",
                        border: "1px solid #F1DCE7",
                        overflow: "auto",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {stringifyPayload(selectedConflict.server_payload)}
                    </Box>
                  </Box>
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  {resolutionChip(selectedConflict.resolution)}
                  {statusChip(selectedConflict.status)}
                  <Typography variant="body2" color="text.secondary">
                    Resolved: {formatDate(selectedConflict.resolved_at)}
                  </Typography>
                </Stack>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                variant="contained"
                onClick={() => setSelectedConflict(null)}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
}
