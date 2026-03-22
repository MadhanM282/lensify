import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ContactLensDetails } from '@/types';
import { apiFetchJson, ApiRequestError } from '@/constants/http';

interface LensStorageContextType {
  records: ContactLensDetails[];
  addRecord: (record: Omit<ContactLensDetails, 'id' | 'createdAt'>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  error: string | null;
}

const LensStorageContext = createContext<LensStorageContextType | null>(null);

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function LensStorageProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<ContactLensDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !token) {
      setRecords([]);
      setError(null);
      return;
    }
    setError(null);
    try {
      const data = await apiFetchJson<{ records: ContactLensDetails[] }>('/lens', {
        headers: authHeaders(token),
      });
      setRecords(data.records || []);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setRecords([]);
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load records');
      setRecords([]);
    }
  }, [user?.id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const addRecord = useCallback(
    async (record: Omit<ContactLensDetails, 'id' | 'createdAt'>) => {
      if (!user || !token) return;
      setError(null);
      try {
        const created = await apiFetchJson<ContactLensDetails>('/lens', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({
            patientId: record.patientId,
            patientName: record.patientName,
            hvid: record.hvid,
            diameter: record.diameter,
            baseCurve: record.baseCurve,
            power: record.power,
            powerType: record.powerType,
            sphere: record.sphere,
            cylinder: record.cylinder,
            axis: record.axis,
            lensType: record.lensType ?? undefined,
            lensColor: record.lensColor ?? undefined,
            spectaclePower: record.spectaclePower,
            notes: record.notes,
            savedAt: record.savedAt,
          }),
        });
        setRecords((prev) => [created, ...prev]);
      } catch (err) {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Failed to save. Check that the server is running and you are signed in.';
        setError(message);
        throw new Error(message);
      }
    },
    [user?.id, token]
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      if (!user || !token) return;
      setError(null);
      try {
        await apiFetchJson<{ ok: boolean }>(`/lens/${id}`, {
          method: 'DELETE',
          headers: authHeaders(token),
        });
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        const message = err instanceof ApiRequestError ? err.message : 'Failed to delete';
        setError(message);
        throw err;
      }
    },
    [user?.id, token]
  );

  return (
    <LensStorageContext.Provider value={{ records, addRecord, deleteRecord, refresh: load, error }}>
      {children}
    </LensStorageContext.Provider>
  );
}

export function useLensStorage() {
  const ctx = useContext(LensStorageContext);
  if (!ctx) throw new Error('useLensStorage must be used within LensStorageProvider');
  return ctx;
}
