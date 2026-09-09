import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, Card, ErrorAlert, PageHeader, Spinner } from '../components/ui';

interface DatosEmpresa {
  empresa: { id: string; nombre: string; nit: string | null } | null;
  sedes: { id: string; nombre: string }[];
  tiposActivo: { id: string; nombre: string }[];
  roles: { id: string; nombre: string; permisos: string; _count?: { usuarios: number } }[];
  clientesFacturables?: { id: string; nombre: string; tarifaDiaria: number; activo: boolean }[];
}

export default function Empresas() {
  const [datos, setDatos] = useState<DatosEmpresa | null>(null);
  const [error, setError] = useState('');
  const [sedes, setSedes] = useState<DatosEmpresa['sedes']>([]);
  const [tipos, setTipos] = useState<DatosEmpresa['tiposActivo']>([]);
  const [roles, setRoles] = useState<DatosEmpresa['roles']>([]);
  const [clientesFact, setClientesFact] = useState<DatosEmpresa['clientesFacturables']>([]);

  useEffect(() => {
    api<DatosEmpresa>('/configuracion/empresa')
      .then((d) => {
        setSedes(d.sedes ?? []);
        setTipos(d.tiposActivo ?? []);
        setRoles(d.roles ?? []);
        setClientesFact(d.clientesFacturables ?? []);
        return d;
      })
      .then(setDatos)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error de conexión'));
  }, []);

  const permisosDe = (r: DatosEmpresa['roles'][number]) => {
    try {
      return JSON.parse(r.permisos ?? '{}') as Record<string, string[]>;
    } catch {
      return {};
    }
  };

  return (
    <>
      <PageHeader
        title="Vista para empresas"
        subtitle="Configuración corporativa: sede principal, catálogo y roles"
      />
      {error && <ErrorAlert message={error} />}
      {!datos && !error && <Spinner />}
      {datos && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Empresa">
            <p className="text-lg font-semibold text-ink">{datos.empresa?.nombre}</p>
            <p className="mt-1 text-sm text-gray-500">
              NIT: {datos.empresa?.nit ?? '—'} · {sedes.length} sede(s) configurada(s)
            </p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {sedes.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {s.nombre}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Catálogo de tipos de activo">
            {tipos.length === 0 ? (
              <p className="text-sm text-gray-500">Sin tipos configurados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tipos.map((t) => (
                  <Badge key={t.id} color="green">
                    {t.nombre}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          <Card title="Roles y permisos (RBAC)">
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">Sin roles configurados.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {roles.map((r) => {
                  const modulos = Object.keys(permisosDe(r)).length;
                  return (
                    <li key={r.id} className="flex items-center justify-between">
                      <span className="font-medium text-ink">{r.nombre}</span>
                      <span className="text-xs text-gray-500">
                        {modulos} módulo(s) · {r._count?.usuarios ?? 0} usuario(s)
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {clientesFact && clientesFact.length > 0 && (
            <Card title="Clientes facturables y tarifas">
              <ul className="space-y-1 text-sm">
                {clientesFact.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="text-gray-700">{c.nombre}</span>
                    <span className="font-semibold text-ink">
                      ${Number(c.tarifaDiaria).toLocaleString('es-CO')}/día
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}