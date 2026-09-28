import api from "../api/axios";

import {
  completeSyncOperation,
  getPendingSyncOperations,
  markOperationResult,
} from "../db/indexedDb";

import type { LocalSyncOperation } from "../db/indexedDb";

import type {
  SyncBatchResponse,
  SyncOperationRequest,
} from "../types/api";

const MAX_BATCH_SIZE = 100;

let activeSyncPromise: Promise<SyncRunResult> | null = null;

export interface SyncRunResult {
  total: number;
  successful: number;
  failed: number;
  conflicts: number;
}

function emptySyncResult(): SyncRunResult {
  return {
    total: 0,
    successful: 0,
    failed: 0,
    conflicts: 0,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function toRequest(
  operation: LocalSyncOperation,
): SyncOperationRequest {
  return {
    operation_id: operation.operation_id,
    record_id: operation.record_id,
    operation_type: operation.operation_type,
    base_version: operation.base_version,
    payload: operation.payload,
  };
}

function extractErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            detail?: string;
          };
        };
      }
    ).response;

    if (response?.status === 401) {
      return "Authentication expired. Please login again.";
    }

    if (response?.data?.detail) {
      return response.data.detail;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const axiosError = error as {
      code?: string;
    };

    if (axiosError.code === "ECONNABORTED") {
      return "Synchronization request timed out. Please try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Synchronization failed.";
}

async function sendBatch(
  operations: LocalSyncOperation[],
): Promise<SyncBatchResponse> {
  const response = await api.post<SyncBatchResponse>(
    "/api/sync/batch",
    {
      operations: operations.map(toRequest),
    },
  );

  return response.data;
}

async function runSync(): Promise<SyncRunResult> {
  if (!navigator.onLine) {
    return emptySyncResult();
  }

  const pendingOperations =
    await getPendingSyncOperations();

  if (pendingOperations.length === 0) {
    return emptySyncResult();
  }

  let successful = 0;
  let failed = 0;
  let conflicts = 0;

  const batches = chunk(
    pendingOperations,
    MAX_BATCH_SIZE,
  );

  for (const batch of batches) {
    try {
      const response = await sendBatch(batch);

      for (const result of response.results) {
        if (result.status === "SUCCESS") {
          successful += 1;

          await completeSyncOperation(
            result.operation_id,
            result.server_version,
          );
        } else if (result.status === "CONFLICT") {
          conflicts += 1;

          await markOperationResult(
            result.operation_id,
            "CONFLICT",
            result.message,
          );
        } else {
          failed += 1;

          await markOperationResult(
            result.operation_id,
            "FAILED",
            result.message,
          );
        }
      }
    } catch (error) {
      const message = extractErrorMessage(error);

      for (const operation of batch) {
        failed += 1;

        await markOperationResult(
          operation.operation_id,
          "FAILED",
          message,
        );
      }

      break;
    }
  }

  return {
    total: pendingOperations.length,
    successful,
    failed,
    conflicts,
  };
}

export async function synchronizePendingOperations(): Promise<SyncRunResult> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = runSync().finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}