import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import { getSyncQueueCount } from "../db/indexedDb";

import { useAuth } from "./AuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

import {
  synchronizePendingOperations,
  type SyncRunResult,
} from "../services/offlineSyncService";

interface SyncContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastResult: SyncRunResult | null;
  syncNow: () => Promise<SyncRunResult>;
  refreshPendingCount: () => Promise<void>;
}

const SyncContext =
  createContext<SyncContextValue | undefined>(undefined);

function emptySyncResult(): SyncRunResult {
  return {
    total: 0,
    successful: 0,
    failed: 0,
    conflicts: 0,
  };
}

export function SyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  const [pendingCount, setPendingCount] =
    useState(0);

  const [isSyncing, setIsSyncing] =
    useState(false);

  const [lastSyncAt, setLastSyncAt] =
    useState<string | null>(null);

  const [lastResult, setLastResult] =
    useState<SyncRunResult | null>(null);

  const syncRunningRef = useRef(false);

  const refreshPendingCount =
    useCallback(async () => {
      try {
        const count =
          await getSyncQueueCount();

        setPendingCount(count);
      } catch {
        setPendingCount(0);
      }
    }, []);

  const syncNow = useCallback(async (): Promise<SyncRunResult> => {
    if (!user || !navigator.onLine) {
      return emptySyncResult();
    }

    if (syncRunningRef.current) {
      return emptySyncResult();
    }

    syncRunningRef.current = true;
    setIsSyncing(true);

    try {
      const result =
        await synchronizePendingOperations();

      setLastResult(result);

      setLastSyncAt(
        new Date().toISOString(),
      );

      await refreshPendingCount();

      return result;
    } catch (error) {
      const failedResult: SyncRunResult = {
        total: 0,
        successful: 0,
        failed: 1,
        conflicts: 0,
      };

      setLastResult(failedResult);
      setLastSyncAt(
        new Date().toISOString(),
      );

      console.error(
        "Synchronization failed:",
        error,
      );

      return failedResult;
    } finally {
      syncRunningRef.current = false;
      setIsSyncing(false);
    }
  }, [user, refreshPendingCount]);

  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      setLastResult(null);
      setLastSyncAt(null);
      return;
    }

    void refreshPendingCount();
  }, [user, refreshPendingCount]);

  useEffect(() => {
    if (!user || !isOnline) {
      return;
    }

    const startAutomaticSync = async () => {
      try {
        const count =
          await getSyncQueueCount();

        setPendingCount(count);

        if (count > 0) {
          await syncNow();
        }
      } catch (error) {
        console.error(
          "Automatic synchronization failed:",
          error,
        );
      }
    };

    void startAutomaticSync();
  }, [user, isOnline, syncNow]);

  useEffect(() => {
    const handleQueueChanged = () => {
      void refreshPendingCount();
    };

    window.addEventListener(
      "offline-sync-queue-changed",
      handleQueueChanged,
    );

    return () => {
      window.removeEventListener(
        "offline-sync-queue-changed",
        handleQueueChanged,
      );
    };
  }, [refreshPendingCount]);

  const value = useMemo<SyncContextValue>(
    () => ({
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncAt,
      lastResult,
      syncNow,
      refreshPendingCount,
    }),
    [
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncAt,
      lastResult,
      syncNow,
      refreshPendingCount,
    ],
  );

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error(
      "useSync must be used inside SyncProvider",
    );
  }

  return context;
}

export function notifySyncQueueChanged(): void {
  window.dispatchEvent(
    new Event("offline-sync-queue-changed"),
  );
}