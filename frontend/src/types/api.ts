export type UserRole = "USER" | "ADMIN";

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole | string;
  active: boolean;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface UserProfileUpdate {
  email?: string;
  password?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type RecordStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface RecordItem {
  id: string;
  title: string;
  description: string | null;
  status: RecordStatus;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RecordListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: RecordItem[];
}

export interface RecordPayload {
  title: string;
  description?: string | null;
  status?: RecordStatus;
}

export interface RecordStatusSummary {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

export interface SyncSummary {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  conflict_operations: number;
}

export interface DashboardSummary {
  total_records: number;
  record_status: RecordStatusSummary;
  sync: SyncSummary;
  total_conflicts: number;
}

export interface ApiErrorResponse {
  detail?: string;
}

export type SyncOperationType =
  | "CREATE"
  | "UPDATE"
  | "DELETE";

export type SyncHistoryStatus =
  | "SUCCESS"
  | "FAILED"
  | "CONFLICT";

export type SyncConflictStatus =
  | "NONE"
  | "DETECTED"
  | "RESOLVED";

export interface SyncOperationRequest {
  operation_id: string;
  record_id: string;
  operation_type: SyncOperationType;
  base_version: number;
  payload: Record<string, unknown>;
}

export interface SyncBatchRequest {
  operations: SyncOperationRequest[];
}

export interface SyncOperationResult {
  operation_id: string;
  record_id: string;
  operation_type: SyncOperationType;
  status: string;
  conflict: boolean;
  message: string;
  server_version: number | null;
  processed_at: string | null;
}

export interface SyncBatchResponse {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  conflict_operations: number;
  results: SyncOperationResult[];
}

export interface SyncHistoryItem {
  sync_id: string;
  operation_id: string;
  record_id: string;
  operation_type: SyncOperationType;
  status: SyncHistoryStatus;
  conflict_status: SyncConflictStatus;
  error_details: string | null;
  timestamp: string;
}

export interface SyncHistoryListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: SyncHistoryItem[];
}

export type ConflictStatus =
  | "OPEN"
  | "RESOLVED";

export type ConflictResolution =
  | "SERVER_WINS"
  | "CLIENT_WINS"
  | "MANUAL";

export interface ConflictItem {
  id: string;
  record_id: string;
  operation_id: string;
  client_version: number;
  server_version: number;
  client_payload: Record<string, unknown>;
  server_payload: Record<string, unknown>;
  resolution: ConflictResolution;
  status: ConflictStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface ConflictListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ConflictItem[];
}

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AuditLogItem[];
}

export interface AuditLogQuery {
  page: number;
  page_size: number;
  action?: string;
  entity?: string;
  sort_by?:
    | "created_at"
    | "action"
    | "entity"
    | "entity_id";
  sort_order?: "asc" | "desc";
}