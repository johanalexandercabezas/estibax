import { useEffect, useState } from 'react';
import { Typography } from 'antd';
import { api } from '../../lib/api';

const { Text } = Typography;

interface Zona {
  id: string;
  nombre: string;
}
interface Bodega {
  id: string;
  nombre: string;
  zonas: Zona[];
}
interface Planta {
  id: string;
  nombre: string;
  bodegas: Bodega[];
}
interface SedeArbol {
  id: string;
  nombre: string;
  plantas: Planta[];
}

/** Pestaña de ubicaciones: árbol Sede → Planta → Bodega → Zona (solo lectura). */
export default function UbicacionesTab() {
  const [sedes, setSedes] = useState<SedeArbol[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api<SedeArbol[]>('/configuracion/ubicaciones')
      .then((d) => setSedes(Array.isArray(d) ? d : []))
      .catch(() => setSedes([]))
      .finally(() => setCargando(false));
  }, []);

  const totalBodegas = sedes.reduce(
    (a, s) => a + s.plantas.reduce((b, p) => b + p.bodegas.length, 0),
    0,
  );
  const totalZonas = sedes.reduce(
    (a, s) =>
      a + s.plantas.reduce((b, p) => b + p.bodegas.reduce((z, bod) => z + bod.zonas.length, 0), 0),
    0,
  );

  return (
    <div className="rounded-xl2 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-gray-500">
        Jerarquía de ubicaciones por plataforma: <Text strong>{sedes.length}</Text> sede(s) ·{' '}
        <Text strong>{totalBodegas}</Text> bodega(s) · <Text strong>{totalZonas}</Text> zona(s)
      </p>
      {cargando ? (
        <p className="text-sm text-gray-500">Cargando ubicaciones…</p>
      ) : sedes.length === 0 ? (
        <p className="text-sm text-gray-500">Sin ubicaciones configuradas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sedes.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-100 p-4">
              <p className="font-semibold text-ink">{s.nombre}</p>
              {s.plantas.length === 0 ? (
                <p className="mt-2 text-xs text-gray-400">Sin plantas</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {s.plantas.map((p) => (
                    <li key={p.id} className="rounded bg-gray-50 p-2">
                      <Text strong>🏢 {p.nombre}</Text>
                      {p.bodegas.length === 0 ? (
                        <p className="mt-1 text-xs text-gray-400">Sin bodegas</p>
                      ) : (
                        p.bodegas.map((b) => (
                          <div key={b.id} className="mt-1 ml-3">
                            <Text>🏬 {b.nombre}</Text>
                            {b.zonas.length > 0 ? (
                              <span className="ml-2 text-xs text-gray-500">
                                {b.zonas.map((z) => z.nombre).join(', ')}
                              </span>
                            ) : (
                              <span className="ml-2 text-xs text-gray-400">sin zonas</span>
                            )}
                          </div>
                        ))
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}