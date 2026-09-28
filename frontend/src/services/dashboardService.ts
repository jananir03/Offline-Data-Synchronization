import api from "../api/axios";
import type { DashboardSummary } from "../types/api";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>("/api/dashboard/summary");
  return response.data;
}
