import api from "../api/axios";
import type { RecordItem, RecordListResponse, RecordPayload, RecordStatus } from "../types/api";

export interface RecordQuery {
  page: number;
  page_size: number;
  search?: string;
  status?: RecordStatus | "";
  sort_by?: "title" | "status" | "created_at" | "updated_at" | "version";
  sort_order?: "asc" | "desc";
}

export async function getRecords(query: RecordQuery): Promise<RecordListResponse> {
  const response = await api.get<RecordListResponse>("/api/records", { params: query });
  return response.data;
}

export async function createRecord(payload: RecordPayload): Promise<RecordItem> {
  const response = await api.post<RecordItem>("/api/records", payload);
  return response.data;
}

export async function updateRecord(id: string, payload: Partial<RecordPayload>): Promise<RecordItem> {
  const response = await api.put<RecordItem>(`/api/records/${id}`, payload);
  return response.data;
}

export async function deleteRecord(id: string): Promise<void> {
  await api.delete(`/api/records/${id}`);
}
