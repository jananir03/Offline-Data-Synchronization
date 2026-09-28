import type { RecordItem, RecordStatus, SyncOperationRequest, SyncOperationType } from "../types/api";

const DB_NAME = "offline-first-sync-db";
const DB_VERSION = 1;
const RECORDS_STORE = "records";
const SYNC_QUEUE_STORE = "sync_queue";

export type LocalSyncStatus = "PENDING" | "FAILED" | "CONFLICT";

export interface LocalRecord extends RecordItem {
  pending_sync: boolean;
}

export interface LocalSyncOperation extends SyncOperationRequest {
  status: LocalSyncStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        const recordsStore = database.createObjectStore(
          RECORDS_STORE,
          { keyPath: "id" },
        );

        recordsStore.createIndex("updated_at", "updated_at", {
          unique: false,
        });

        recordsStore.createIndex("status", "status", {
          unique: false,
        });

        recordsStore.createIndex("pending_sync", "pending_sync", {
          unique: false,
        });
      }

      if (!database.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const queueStore = database.createObjectStore(
          SYNC_QUEUE_STORE,
          { keyPath: "operation_id" },
        );

        queueStore.createIndex("status", "status", {
          unique: false,
        });

        queueStore.createIndex("created_at", "created_at", {
          unique: false,
        });

        queueStore.createIndex("record_id", "record_id", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };

      resolve(database);
    };

    request.onerror = () => {
      databasePromise = null;
      reject(
        request.error ??
          new Error("Could not open IndexedDB."),
      );
    };
  });

  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error("IndexedDB request failed."),
      );
  });
}

function transactionComplete(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("IndexedDB transaction failed."),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("IndexedDB transaction was aborted."),
      );
  });
}

export async function putLocalRecord(
  record: LocalRecord,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    RECORDS_STORE,
    "readwrite",
  );

  transaction.objectStore(RECORDS_STORE).put(record);
  await transactionComplete(transaction);
}

export async function putLocalRecords(
  records: LocalRecord[],
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    RECORDS_STORE,
    "readwrite",
  );

  const store = transaction.objectStore(RECORDS_STORE);

  for (const record of records) {
    store.put(record);
  }

  await transactionComplete(transaction);
}

export async function getLocalRecord(
  recordId: string,
): Promise<LocalRecord | null> {
  const database = await openDatabase();
  const transaction = database.transaction(
    RECORDS_STORE,
    "readonly",
  );

  const request = transaction
    .objectStore(RECORDS_STORE)
    .get(recordId);

  return (await requestResult(request)) ?? null;
}

export async function deleteLocalRecord(
  recordId: string,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    RECORDS_STORE,
    "readwrite",
  );

  transaction.objectStore(RECORDS_STORE).delete(recordId);
  await transactionComplete(transaction);
}

export async function getAllLocalRecords(): Promise<LocalRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction(
    RECORDS_STORE,
    "readonly",
  );

  const request = transaction
    .objectStore(RECORDS_STORE)
    .getAll();

  return requestResult(request);
}

export async function cacheServerRecords(
  records: RecordItem[],
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    RECORDS_STORE,
    "readwrite",
  );

  const store = transaction.objectStore(RECORDS_STORE);

  for (const record of records) {
    const existingRequest = store.get(record.id);

    existingRequest.onsuccess = () => {
      const existing = existingRequest.result as
        | LocalRecord
        | undefined;

      if (existing?.pending_sync) {
        return;
      }

      store.put({
        ...record,
        pending_sync: false,
      } satisfies LocalRecord);
    };
  }

  await transactionComplete(transaction);
}

export async function enqueueSyncOperation(
  operation: Omit<
    LocalSyncOperation,
    "status" | "retry_count" | "last_error" | "created_at" | "updated_at"
  >,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [SYNC_QUEUE_STORE, RECORDS_STORE],
    "readwrite",
  );

  const now = new Date().toISOString();

  transaction.objectStore(SYNC_QUEUE_STORE).put({
    ...operation,
    status: "PENDING",
    retry_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  } satisfies LocalSyncOperation);

  const recordStore = transaction.objectStore(RECORDS_STORE);
  const recordRequest = recordStore.get(operation.record_id);

  recordRequest.onsuccess = () => {
    const record = recordRequest.result as
      | LocalRecord
      | undefined;

    if (record) {
      record.pending_sync = status !== "CONFLICT";
      recordStore.put(record);
    }
  };

  await transactionComplete(transaction);
}

export async function getPendingSyncOperations(): Promise<LocalSyncOperation[]> {
  const database = await openDatabase();
  const transaction = database.transaction(
    SYNC_QUEUE_STORE,
    "readonly",
  );

  const request = transaction
    .objectStore(SYNC_QUEUE_STORE)
    .getAll();

  const operations = await requestResult(request);

  return operations
    .filter(
      (operation) =>
        operation.status === "PENDING" ||
        operation.status === "FAILED",
    )
    .sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await openDatabase();
  const transaction = database.transaction(
    SYNC_QUEUE_STORE,
    "readonly",
  );

  const request = transaction
    .objectStore(SYNC_QUEUE_STORE)
    .getAll();

  const operations = await requestResult(request);

  return operations.filter(
    (operation: LocalSyncOperation) =>
      operation.status === "PENDING" ||
      operation.status === "FAILED",
  ).length;
}

export async function getSyncQueueOperationCount(): Promise<number> {
  const database = await openDatabase();
  const transaction = database.transaction(
    SYNC_QUEUE_STORE,
    "readonly",
  );

  const request = transaction
    .objectStore(SYNC_QUEUE_STORE)
    .getAll();

  const operations = await requestResult(request);

  return operations.length;
}

export async function markOperationResult(
  operationId: string,
  status: LocalSyncStatus,
  errorMessage: string | null,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [SYNC_QUEUE_STORE, RECORDS_STORE],
    "readwrite",
  );

  const queueStore = transaction.objectStore(SYNC_QUEUE_STORE);
  const recordStore = transaction.objectStore(RECORDS_STORE);

  const operationRequest = queueStore.get(operationId);

  operationRequest.onsuccess = () => {
    const operation = operationRequest.result as
      | LocalSyncOperation
      | undefined;

    if (!operation) {
      return;
    }

    if (status === "PENDING") {
      operation.status = "PENDING";
    } else {
      operation.status = status;
    }

    operation.retry_count += 1;
    operation.last_error = errorMessage;
    operation.updated_at = new Date().toISOString();

    queueStore.put(operation);

    const recordRequest = recordStore.get(operation.record_id);

    recordRequest.onsuccess = () => {
      const record = recordRequest.result as
        | LocalRecord
        | undefined;

      if (!record) {
        return;
      }

      record.pending_sync = status !== "CONFLICT";
      recordStore.put(record);
    };
  };

  await transactionComplete(transaction);
}

export async function completeSyncOperation(
  operationId: string,
  serverVersion: number | null,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [SYNC_QUEUE_STORE, RECORDS_STORE],
    "readwrite",
  );

  const queueStore = transaction.objectStore(SYNC_QUEUE_STORE);
  const recordStore = transaction.objectStore(RECORDS_STORE);

  const operationRequest = queueStore.get(operationId);

  operationRequest.onsuccess = () => {
    const operation = operationRequest.result as
      | LocalSyncOperation
      | undefined;

    if (!operation) {
      return;
    }

    queueStore.delete(operationId);

    const recordRequest = recordStore.get(operation.record_id);

    recordRequest.onsuccess = () => {
      const record = recordRequest.result as
        | LocalRecord
        | undefined;

      if (!record) {
        return;
      }

      record.pending_sync = false;

      if (serverVersion !== null) {
        record.version = serverVersion;
      }

      record.updated_at = new Date().toISOString();
      recordStore.put(record);
    };
  };

  await transactionComplete(transaction);
}

export async function removeQueuedOperation(
  operationId: string,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [SYNC_QUEUE_STORE, RECORDS_STORE],
    "readwrite",
  );

  const queueStore = transaction.objectStore(SYNC_QUEUE_STORE);
  const recordStore = transaction.objectStore(RECORDS_STORE);

  const operationRequest = queueStore.get(operationId);

  operationRequest.onsuccess = () => {
    const operation = operationRequest.result as
      | LocalSyncOperation
      | undefined;

    if (!operation) {
      return;
    }

    queueStore.delete(operationId);

    const recordRequest = recordStore.get(operation.record_id);

    recordRequest.onsuccess = () => {
      const record = recordRequest.result as
        | LocalRecord
        | undefined;

      if (record) {
        record.pending_sync = false;
        recordStore.put(record);
      }
    };
  };

  await transactionComplete(transaction);
}

export function createLocalRecord(
  recordId: string,
  userId: string,
  payload: {
    title: string;
    description: string | null;
    status: RecordStatus;
  },
): LocalRecord {
  const now = new Date().toISOString();

  return {
    id: recordId,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    version: 1,
    created_by: userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    pending_sync: true,
  };
}

export function updateLocalRecord(
  record: LocalRecord,
  payload: {
    title: string;
    description: string | null;
    status: RecordStatus;
  },
): LocalRecord {
  return {
    ...record,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    version: record.version + 1,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
}

export function deleteLocalRecordVersion(
  record: LocalRecord,
): LocalRecord {
  const now = new Date().toISOString();

  return {
    ...record,
    version: record.version + 1,
    deleted_at: now,
    updated_at: now,
    pending_sync: true,
  };
}
