import {
  cacheServerRecords,
  createLocalRecord,
  deleteLocalRecordVersion,
  enqueueSyncOperation,
  getAllLocalRecords,
  getLocalRecord,
  putLocalRecord,
  updateLocalRecord,
} from "../db/indexedDb";
import { notifySyncQueueChanged } from "../context/SyncContext";
import { synchronizePendingOperations } from "./offlineSyncService";
import type {
  RecordItem,
  RecordListResponse,
  RecordPayload,
  RecordStatus,
  SyncOperationType,
} from "../types/api";

export interface LocalRecordQuery {
  page: number;
  page_size: number;
  search?: string;
  status?: RecordStatus | "";
  sort_by?:
    | "title"
    | "status"
    | "created_at"
    | "updated_at"
    | "version";
  sort_order?: "asc" | "desc";
}

function createOperationId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  throw new Error(
    "This browser does not support secure UUID generation.",
  );
}

function createRecordId(): string {
  return createOperationId();
}

function normalizePayload(
  payload: RecordPayload,
): {
  title: string;
  description: string | null;
  status: RecordStatus;
} {
  return {
    title: payload.title.trim(),
    description:
      payload.description?.trim() || null,
    status: payload.status ?? "PENDING",
  };
}

async function enqueueAndMaybeSync(
  operation: {
    operation_id: string;
    record_id: string;
    operation_type: SyncOperationType;
    base_version: number;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await enqueueSyncOperation(operation);
  notifySyncQueueChanged();

  if (navigator.onLine) {
    await synchronizePendingOperations();
    notifySyncQueueChanged();
  }
}

export async function createOfflineFirstRecord(
  userId: string,
  payload: RecordPayload,
): Promise<RecordItem> {
  const normalized = normalizePayload(payload);
  const recordId = createRecordId();
  const operationId = createOperationId();

  const record = createLocalRecord(
    recordId,
    userId,
    normalized,
  );

  await putLocalRecord(record);

  await enqueueAndMaybeSync({
    operation_id: operationId,
    record_id: recordId,
    operation_type: "CREATE",
    base_version: 0,
    payload: {
      title: normalized.title,
      description: normalized.description,
      status: normalized.status,
    },
  });

  return record;
}

export async function updateOfflineFirstRecord(
  recordId: string,
  payload: RecordPayload,
): Promise<RecordItem> {
  const existing = await getLocalRecord(recordId);

  if (!existing) {
    throw new Error(
      "The record is not available locally. Refresh while online and try again.",
    );
  }

  if (existing.deleted_at) {
    throw new Error(
      "A deleted record cannot be updated.",
    );
  }

  const normalized = normalizePayload(payload);
  const operationId = createOperationId();
  const baseVersion = existing.version;

  const updated = updateLocalRecord(
    existing,
    normalized,
  );

  await putLocalRecord(updated);

  await enqueueAndMaybeSync({
    operation_id: operationId,
    record_id: recordId,
    operation_type: "UPDATE",
    base_version: baseVersion,
    payload: {
      title: normalized.title,
      description: normalized.description,
      status: normalized.status,
    },
  });

  return updated;
}

export async function deleteOfflineFirstRecord(
  recordId: string,
): Promise<void> {
  const existing = await getLocalRecord(recordId);

  if (!existing) {
    throw new Error(
      "The record is not available locally. Refresh while online and try again.",
    );
  }

  if (existing.deleted_at) {
    return;
  }

  const operationId = createOperationId();
  const baseVersion = existing.version;
  const deleted = deleteLocalRecordVersion(existing);

  await putLocalRecord(deleted);

  await enqueueAndMaybeSync({
    operation_id: operationId,
    record_id: recordId,
    operation_type: "DELETE",
    base_version: baseVersion,
    payload: {},
  });
}

function sortRecords(
  records: RecordItem[],
  sortBy: LocalRecordQuery["sort_by"],
  sortOrder: LocalRecordQuery["sort_order"],
): RecordItem[] {
  const multiplier = sortOrder === "asc" ? 1 : -1;
  const key = sortBy ?? "updated_at";

  return [...records].sort((a, b) => {
    if (key === "version") {
      return (a.version - b.version) * multiplier;
    }

    const aValue = String(a[key]);
    const bValue = String(b[key]);

    return aValue.localeCompare(bValue) * multiplier;
  });
}

export async function getLocalRecords(
  query: LocalRecordQuery,
): Promise<RecordListResponse> {
  const allRecords = await getAllLocalRecords();

  let filtered = allRecords.filter(
    (record) => !record.deleted_at,
  );

  const search = query.search?.trim().toLowerCase();

  if (search) {
    filtered = filtered.filter((record) => {
      return (
        record.title.toLowerCase().includes(search) ||
        (record.description ?? "")
          .toLowerCase()
          .includes(search)
      );
    });
  }

  if (query.status) {
    filtered = filtered.filter(
      (record) => record.status === query.status,
    );
  }

  const sorted = sortRecords(
    filtered,
    query.sort_by,
    query.sort_order,
  );

  const pageSize = Math.max(query.page_size, 1);
  const page = Math.max(query.page, 1);
  const total = sorted.length;
  const totalPages = Math.max(
    Math.ceil(total / pageSize),
    1,
  );
  const offset = (page - 1) * pageSize;

  return {
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    items: sorted.slice(
      offset,
      offset + pageSize,
    ),
  };
}

export async function cacheRecords(
  records: RecordItem[],
): Promise<void> {
  await cacheServerRecords(records);
}
