import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddRounded,
  DeleteOutlineRounded,
  EditRounded,
  SearchRounded,
  CloudQueueRounded,
} from "@mui/icons-material";
import type {
  RecordItem,
  RecordPayload,
  RecordStatus,
} from "../types/api";
import StatusChip from "../components/common/StatusChip";
import SyncStatus from "../components/sync/SyncStatus";
import { useAuth } from "../context/AuthContext";
import { useSync } from "../context/SyncContext";
import {
  cacheRecords,
  createOfflineFirstRecord,
  deleteOfflineFirstRecord,
  getLocalRecords,
  updateOfflineFirstRecord,
} from "../services/offlineRecordService";
import { getRecords } from "../services/recordService";

const statuses: RecordStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function RecordsPage() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();

  const [records, setRecords] =
    useState<RecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] =
    useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<RecordStatus | "">("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [offlineNotice, setOfflineNotice] =
    useState("");

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editing, setEditing] =
    useState<RecordItem | null>(null);
  const [form, setForm] = useState<RecordPayload>({
    title: "",
    description: "",
    status: "PENDING",
  });
  const [saving, setSaving] =
    useState(false);

  const loadRecords = useCallback(
    async () => {
      setLoading(true);
      setError("");
      setOfflineNotice("");

      try {
        if (navigator.onLine) {
          const result = await getRecords({
            page,
            page_size: 8,
            search: search || undefined,
            status: status || undefined,
            sort_by: "updated_at",
            sort_order: "desc",
          });

          await cacheRecords(result.items);
          setRecords(result.items);
          setTotalPages(
            Math.max(result.total_pages, 1),
          );
          return;
        }

        const localResult =
          await getLocalRecords({
            page,
            page_size: 8,
            search: search || undefined,
            status: status || undefined,
            sort_by: "updated_at",
            sort_order: "desc",
          });

        setRecords(localResult.items);
        setTotalPages(
          Math.max(localResult.total_pages, 1),
        );
        setOfflineNotice(
          "You are offline. Showing locally stored records.",
        );
      } catch (loadError) {
        if (!navigator.onLine) {
          try {
            const localResult =
              await getLocalRecords({
                page,
                page_size: 8,
                search: search || undefined,
                status: status || undefined,
                sort_by: "updated_at",
                sort_order: "desc",
              });

            setRecords(localResult.items);
            setTotalPages(
              Math.max(
                localResult.total_pages,
                1,
              ),
            );
            setOfflineNotice(
              "The server is unavailable. Showing locally stored records.",
            );
            return;
          } catch {
            // Fall through to the normal error state.
          }
        }

        setError(
          getErrorMessage(loadError) ||
            "Could not load records.",
        );
      } finally {
        setLoading(false);
      }
    }, [page, search, status],
  );

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handleOnline = () => {
      void loadRecords();
    };

    const handleQueueChanged = () => {
      void loadRecords();
    };

    window.addEventListener(
      "online",
      handleOnline,
    );
    window.addEventListener(
      "offline-sync-queue-changed",
      handleQueueChanged,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );
      window.removeEventListener(
        "offline-sync-queue-changed",
        handleQueueChanged,
      );
    };
  }, [loadRecords]);

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      status: "PENDING",
    });
    setDialogOpen(true);
  }

  function openEdit(record: RecordItem) {
    setEditing(record);
    setForm({
      title: record.title,
      description: record.description ?? "",
      status: record.status,
    });
    setDialogOpen(true);
  }

  async function saveRecord() {
    if (!form.title?.trim() || !user) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await updateOfflineFirstRecord(
          editing.id,
          form,
        );
      } else {
        await createOfflineFirstRecord(
          user.id,
          form,
        );
      }

      setDialogOpen(false);
      await loadRecords();
    } catch (saveError) {
      setError(
        getErrorMessage(saveError),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(
    record: RecordItem,
  ) {
    if (
      !window.confirm(
        `Delete “${record.title}”?`,
      )
    ) {
      return;
    }

    setError("");

    try {
      await deleteOfflineFirstRecord(
        record.id,
      );
      await loadRecords();
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError),
      );
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          gap: 2,
          flexDirection: {
            xs: "column",
            sm: "row",
          },
        }}
      >
        <Box>
          <Typography variant="h4">
            Records
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.6 }}
          >
            Manage records online or continue working
            when you lose your connection.
          </Typography>
        </Box>

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
          alignItems={{
            xs: "flex-start",
            sm: "center",
          }}
        >
          <SyncStatus />

          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreate}
          >
            Add record
          </Button>
        </Stack>
      </Box>

      {!isOnline && (
        <Alert
          severity="warning"
          icon={<CloudQueueRounded />}
        >
          You are offline. New changes are saved to
          this device and will synchronize automatically
          when the connection returns.
        </Alert>
      )}

      {pendingCount > 0 && (
        <Alert severity="info">
          {pendingCount} change
          {pendingCount === 1 ? " is" : "s are"} waiting
          to synchronize.
        </Alert>
      )}

      {offlineNotice && (
        <Alert severity="info">
          {offlineNotice}
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

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              mb: 2,
            }}
          >
            <TextField
              placeholder="Search records..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <SearchRounded
                    sx={{
                      mr: 1,
                      color: "text.secondary",
                    }}
                  />
                ),
              }}
              sx={{
                minWidth: {
                  xs: "100%",
                  sm: 280,
                },
              }}
            />

            <FormControl
              size="small"
              sx={{ minWidth: 160 }}
            >
              <InputLabel>Status</InputLabel>

              <Select
                label="Status"
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value as
                      | RecordStatus
                      | "",
                  );
                  setPage(1);
                }}
              >
                <MenuItem value="">
                  All statuses
                </MenuItem>

                {statuses.map((item) => (
                  <MenuItem
                    key={item}
                    value={item}
                  >
                    {item.replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    Title
                  </TableCell>
                  <TableCell>
                    Status
                  </TableCell>
                  <TableCell>
                    Version
                  </TableCell>
                  <TableCell>
                    Updated
                  </TableCell>
                  <TableCell align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 6 }}
                    >
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 6 }}
                    >
                      <Typography color="text.secondary">
                        No records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                    >
                      <TableCell>
                        <Stack spacing={0.4}>
                          <Typography fontWeight={650}>
                            {record.title}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {record.description ||
                              "No description"}
                          </Typography>

                          {"pending_sync" in record &&
                            Boolean(
                              (
                                record as RecordItem & {
                                  pending_sync?: boolean;
                                }
                              ).pending_sync,
                            ) && (
                              <ChipLikePending />
                            )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <StatusChip
                          status={record.status}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={600}>
                          v{record.version}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {new Date(
                          record.updated_at,
                        ).toLocaleDateString()}
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() =>
                              openEdit(record)
                            }
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              void removeRecord(
                                record,
                              )
                            }
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
              pt: 2,
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
        open={dialogOpen}
        onClose={() =>
          !saving && setDialogOpen(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing
            ? "Edit record"
            : "Create record"}
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <TextField
              label="Title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description:
                    event.target.value,
                }))
              }
              multiline
              minRows={3}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>
                Status
              </InputLabel>

              <Select
                label="Status"
                value={
                  form.status ?? "PENDING"
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status:
                      event.target.value as RecordStatus,
                  }))
                }
              >
                {statuses.map((item) => (
                  <MenuItem
                    key={item}
                    value={item}
                  >
                    {item.replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
          }}
        >
          <Button
            onClick={() =>
              setDialogOpen(false)
            }
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void saveRecord()}
            disabled={
              saving ||
              !form.title?.trim()
            }
          >
            {saving
              ? "Saving..."
              : editing
                ? "Save changes"
                : "Create record"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ChipLikePending() {
  return (
    <Typography
      variant="caption"
      sx={{
        display: "inline-flex",
        width: "fit-content",
        px: 1,
        py: 0.25,
        borderRadius: 10,
        backgroundColor: "#FFF4DD",
        color: "#A86F16",
        fontWeight: 700,
      }}
    >
      Waiting to sync
    </Typography>
  );
}
