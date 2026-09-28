import Chip from "@mui/material/Chip";
import type { RecordStatus } from "../../types/api";

const statusMap: Record<RecordStatus, { label: string; color: "default" | "warning" | "info" | "success" | "error" }> = {
  PENDING: { label: "Pending", color: "warning" },
  IN_PROGRESS: { label: "In Progress", color: "info" },
  COMPLETED: { label: "Completed", color: "success" },
  CANCELLED: { label: "Cancelled", color: "error" },
};

export default function StatusChip({ status }: { status: RecordStatus }) {
  const config = statusMap[status];
  return <Chip size="small" label={config.label} color={config.color} sx={{ fontWeight: 600 }} />;
}
