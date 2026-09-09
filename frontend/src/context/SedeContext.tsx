import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

/**
 * Contexto global de sede activa (punto 2 del negocio):
 * todas las transacciones y listados se contextualizan a la sede/plataforma
 * seleccionada. Se persiste en localStorage por usuario.
 */

export interface Sede {
  id: string;
  nombre: string;
}

interface SedeContextValue {
  sedes: Sede[];
  sedeActiva: Sede | null;
  setIdSedeActiva: (id: string | null) => void;
  cargando: boolean;
  recargar: () => Promise<void>;
}

const SedeContext = createContext<SedeContextValue | null>(null);

const STORAGE_KEY = 'estibax_sede_activa';

export function SedeProvider({ children }: { children: ReactNode }) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [idGuardado, setIdGuardado] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await api<{ sedes: Sede[] }>('/configuracion/empresa');
      setSedes(data.sedes ?? []);
    } catch {
      setSedes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const setIdSedeActiva = useCallback((id: string | null) => {
    setIdGuardado(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sedeActiva = useMemo(
    () => sedes.find((s) => s.id === idGuardado) ?? null,
    [sedes, idGuardado],
  );

  return (
    <SedeContext.Provider value={{ sedes, sedeActiva, setIdSedeActiva, cargando, recargar }}>
      {children}
    </SedeContext.Provider>
  );
}

export function useSedes(): SedeContextValue {
  const ctx = useContext(SedeContext);
  if (!ctx) throw new Error('useSedes debe usarse dentro de <SedeProvider>');
  return ctx;
}
