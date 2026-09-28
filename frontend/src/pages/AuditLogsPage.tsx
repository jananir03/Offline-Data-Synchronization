import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CloseRounded,
  RefreshRounded,
  VisibilityRounded,
} from "@mui/icons-material";

import {
  getAuditLog,
  getAuditLogs,
} from "../services/auditLogService";

import type {
  AuditLogItem,
  AuditLogQuery,
} from "../types/api";

const pageSize = 10;

const sortOptions: Array<{
  label: string;
  value: AuditLogQuery["sort_by"];
}> = [
  {
    label: "Created date",
    value: "created_at",
  },
  {
    label: "Action",
    value: "action",
  },
  {
    label: "Entity",
    value: "entity",
  },
  {
    label: "Entity ID",
    value: "entity_id",
  },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatDetails(
  details: Record<string, unknown> | null,
): string {
  if (!details) {
    return "No additional details";
  }

  return JSON.stringify(details, null, 2);
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(
    [],
  );

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] =
    useState(1);
  const [total, setTotal] = useState(0);

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  const [sortBy, setSortBy] =
    useState<AuditLogQuery["sort_by"]>(
      "created_at",
    );

  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedLog, setSelectedLog] =
    useState<AuditLogItem | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAuditLogs({
        page,
        page_size: pageSize,
        action: action.trim() || undefined,
        entity: entity.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setLogs(response.items);
      setTotal(response.total);
      setTotalPages(
        Math.max(response.total_pages, 1),
      );
    } catch {
      setError(
        "Unable to load audit logs. Make sure you are signed in as an administrator.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    action,
    entity,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function handleFilter() {
    setPage(1);
  }

  function handleClearFilters() {
    setAction("");
    setEntity("");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  }

  async function openDetails(
    log: AuditLogItem,
  ) {
    try {
      setDetailLoading(true);
      setSelectedLog(null);

      const fullLog = await getAuditLog(
        log.id,
      );

      setSelectedLog(fullLog);
    } catch {
      setError(
        "Unable to load the audit log details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant="h4"
          sx={{ color: "#302B4D" }}
        >
          Audit Logs
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          Review administrator-visible activity
          recorded by the synchronization platform.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Grid
            container
            spacing={2}
            alignItems="center"
          >
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Action"
                placeholder="e.g. SYNC_UPDATE"
                value={action}
                onChange={(event) =>
                  setAction(event.target.value)
                }
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Entity"
                placeholder="e.g. record"
                value={entity}
                onChange={(event) =>
                  setEntity(event.target.value)
                }
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>
                  Sort by
                </InputLabel>

                <Select
                  label="Sort by"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target
                        .value as AuditLogQuery["sort_by"],
                    )
                  }
                >
                  {sortOptions.map(
                    (option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>
                  Order
                </InputLabel>

                <Select
                  label="Order"
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(
                      event.target.value as
                        | "asc"
                        | "desc",
                    )
                  }
                >
                  <MenuItem value="desc">
                    Newest first
                  </MenuItem>

                  <MenuItem value="asc">
                    Oldest first
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{ xs: 12, md: 2 }}
              sx={{
                display: "flex",
                gap: 1,
              }}
            >
              <Button
                variant="contained"
                onClick={handleFilter}
                fullWidth
              >
                Apply
              </Button>

              <Tooltip title="Refresh">
                <IconButton
                  onClick={() =>
                    void loadLogs()
                  }
                  sx={{
                    border: "1px solid #E7E3F1",
                  }}
                >
                  <RefreshRounded />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 2,
            }}
          >
            <Button
              size="small"
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: 3,
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                variant="h6"
                color="#302B4D"
              >
                Activity
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {total} total log
                {total === 1 ? "" : "s"}
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    Date
                  </TableCell>

                  <TableCell>
                    Action
                  </TableCell>

                  <TableCell>
                    Entity
                  </TableCell>

                  <TableCell>
                    Entity ID
                  </TableCell>

                  <TableCell>
                    User ID
                  </TableCell>

                  <TableCell align="right">
                    Details
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 7 }}
                    >
                      <CircularProgress
                        size={28}
                      />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 7 }}
                    >
                      <Typography
                        color="text.secondary"
                      >
                        No audit logs found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.id}
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {formatDate(
                            log.created_at,
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color="#5B4FD1"
                        >
                          {log.action}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {log.entity}
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily:
                              '"Roboto Mono", monospace',
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {log.entity_id ||
                            "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily:
                              '"Roboto Mono", monospace',
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {log.user_id ||
                            "System"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={() =>
                              void openDetails(
                                log,
                              )
                            }
                          >
                            <VisibilityRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              px: 3,
              py: 2,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) =>
                setPage(value)
              }
              color="primary"
              shape="rounded"
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={
          detailLoading ||
          Boolean(selectedLog)
        }
        onClose={() =>
          !detailLoading &&
          setSelectedLog(null)
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Audit Log Details

          <IconButton
            onClick={() =>
              setSelectedLog(null)
            }
            disabled={detailLoading}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {detailLoading ? (
            <Box
              sx={{
                minHeight: 220,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : selectedLog ? (
            <Stack spacing={2}>
              <Grid
                container
                spacing={2}
              >
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Action
                  </Typography>

                  <Typography
                    fontWeight={700}
                  >
                    {selectedLog.action}
                  </Typography>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Entity
                  </Typography>

                  <Typography
                    fontWeight={700}
                  >
                    {selectedLog.entity}
                  </Typography>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Created at
                  </Typography>

                  <Typography>
                    {formatDate(
                      selectedLog.created_at,
                    )}
                  </Typography>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    User ID
                  </Typography>

                  <Typography
                    sx={{
                      wordBreak:
                        "break-all",
                    }}
                  >
                    {selectedLog.user_id ||
                      "System"}
                  </Typography>
                </Grid>

                <Grid
                  size={12}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Entity ID
                  </Typography>

                  <Typography
                    sx={{
                      wordBreak:
                        "break-all",
                    }}
                  >
                    {selectedLog.entity_id ||
                      "—"}
                  </Typography>
                </Grid>

                <Grid
                  size={12}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Details
                  </Typography>

                  <Box
                    component="pre"
                    sx={{
                      mt: 1,
                      mb: 0,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor:
                        "#F7F5FC",
                      border:
                        "1px solid #E9E5F2",
                      overflowX: "auto",
                      fontSize: 12,
                      fontFamily:
                        '"Roboto Mono", monospace',
                      whiteSpace:
                        "pre-wrap",
                      wordBreak:
                        "break-word",
                    }}
                  >
                    {formatDetails(
                      selectedLog.details,
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setSelectedLog(null)
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}