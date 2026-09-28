import api from "../api/axios";
import type {
  ConflictItem,
  ConflictListResponse,
  ConflictResolution,
  ConflictStatus,
  SyncHistoryListResponse,
  SyncHistoryStatus,
  SyncConflictStatus,
  SyncOperationType,
} from "../types/api";

export interface SyncHistoryQuery {
  page: number;
  page_size: number;
  status?: SyncHistoryStatus | "";
  operation_type?: SyncOperationType | "";
  conflict_status?: SyncConflictStatus | "";
  sort_by?: "timestamp" | "operation_type" | "status" | "conflict_status";
  sort_order?: "asc" | "desc";
}

export interface ConflictQuery {
  page: number;
  page_size: number;
  status?: ConflictStatus | "";
  resolution?: ConflictResolution | "";
  sort_by?:
    | "created_at"
    | "client_version"
    | "server_version"
    | "status"
    | "resolution";
  sort_order?: "asc" | "desc";
}

export async function getSyncHistory(
  query: SyncHistoryQuery,
): Promise<SyncHistoryListResponse> {
  const response = await api.get<SyncHistoryListResponse>(
    "/api/sync/history",
    {
      params: query,
    },
  );

  return response.data;
}

export async function getConflicts(
  query: ConflictQuery,
): Promise<ConflictListResponse> {
  const response = await api.get<ConflictListResponse>(
    "/api/sync/conflicts",
    {
      params: query,
    },
  );

  return response.data;
}

export async function getConflict(
  conflictId: string,
): Promise<ConflictItem> {
  const response = await api.get<ConflictItem>(
    `/api/sync/conflicts/${conflictId}`,
  );

  return response.data;
}
