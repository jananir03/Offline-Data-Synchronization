import api from "../api/axios";
import type {
  AuditLogListResponse,
  AuditLogQuery,
  AuditLogItem,
} from "../types/api";

export async function getAuditLogs(
  query: AuditLogQuery,
): Promise<AuditLogListResponse> {
  const response = await api.get<AuditLogListResponse>(
    "/api/audit-logs",
    {
      params: {
        page: query.page,
        page_size: query.page_size,
        action: query.action || undefined,
        entity: query.entity || undefined,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      },
    },
  );

  return response.data;
}

export async function getAuditLog(
  auditLogId: string,
): Promise<AuditLogItem> {
  const response = await api.get<AuditLogItem>(
    `/api/audit-logs/${auditLogId}`,
  );

  return response.data;
}