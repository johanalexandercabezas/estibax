import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { api } from '../lib/api';
import { ErrorAlert, PageHeader, Spinner } from '../components/ui';
import '../styles/operaciones-grid.css';

const TIPOS_DOC = ['ORDEN_COMPRA', 'CARTA_DEVOLUCION'];

/* Reglas de negocio del número de documento (10 caracteres obligatorios):
  - ORDEN_COMPRA:     documento "45" + 8 dígitos; manifiesto "61" + 8 dígitos
  - CARTA_DEVOLUCION: usa el número de carta, no el número de documento */
const PATRONES_DOC: Record<string, { regex: RegExp; placeholder: string; ayuda: string }> = {
  ORDEN_COMPRA: { regex: /^45\d{8}$/, placeholder: '4503846909', ayuda: '45 + 8 dígitos (10 total)' },
};
const PATRON_MANIFIESTO = /^61\d{8}$/;

/* Columnas aplicables según tipo de documento (las demás se deshabilitan
   con "—" para no confundir al operario):
   - Orden de compra (entrega): manifiesto + entregadas
   - Carta de devolución: n.º carta + devueltas */
const COLUMNAS_POR_TIPO: Record<string, Set<string>> = {
  ORDEN_COMPRA: new Set(['fecha', 'plataforma', 'cliente', 'origen', 'tipoDocumento', 'numeroDocumento', 'ciudad', 'puntoEntrega', 'manifiesto', 'entregadas']),
  CARTA_DEVOLUCION: new Set(['fecha', 'plataforma', 'cliente', 'origen', 'tipoDocumento', 'ciudad', 'puntoEntrega', 'cartaDevolucion', 'devueltas']),
};

function columnaAplica(tipo: string, clave: string): boolean {
  const lista = COLUMNAS_POR_TIPO[tipo];
  return !lista || lista.has(clave);
}

/* Origen de la estiba: armonizado con Activo.propiedad.
   PROPIA → Propia · ERCOL → Ercol (TERCERO solo legado, no se ofrece). */
const ORIGENES_ESTIBA = [
  { valor: 'PROPIA', rotulo: 'Propia' },
  { valor: 'ERCOL', rotulo: 'Ercol' },
];

function docValido(tipo: string, numero: string): boolean {
  const p = PATRONES_DOC[tipo];
  return !p || p.regex.test(numero);
}

function docPlaceholder(tipo: string): string {
  return PATRONES_DOC[tipo]?.placeholder ?? '';
}

function docAyuda(tipo: string): string {
  return PATRONES_DOC[tipo]?.ayuda ?? '';
}

interface ColumnaGrid {
  clave: string; rotulo: string; tipo: 'fecha' | 'numero' | 'select' | 'autocomplete' | 'texto';
  ancho: number; requerida?: boolean; fija?: boolean; fijaN?: number;
}

const COLUMNAS: ColumnaGrid[] = [
  { clave: 'fecha', rotulo: 'Fecha', tipo: 'fecha', ancho: 120, requerida: true, fija: true, fijaN: 1 },
  { clave: 'plataforma', rotulo: 'Plataforma', tipo: 'autocomplete', ancho: 150, fija: true, fijaN: 2 },
  { clave: 'cliente', rotulo: 'Cliente', tipo: 'autocomplete', ancho: 220, fija: true, fijaN: 3 },
  { clave: 'origen', rotulo: 'Origen estiba', tipo: 'select', ancho: 110 },
  { clave: 'tipoDocumento', rotulo: 'Tipo doc.', tipo: 'select', ancho: 130 },
  { clave: 'numeroDocumento', rotulo: 'N.º documento', tipo: 'texto', ancho: 140, requerida: true },
  { clave: 'ciudad', rotulo: 'Ciudad destino', tipo: 'autocomplete', ancho: 130 },
  { clave: 'puntoEntrega', rotulo: 'Punto de entrega', tipo: 'autocomplete', ancho: 180 },
  { clave: 'manifiesto', rotulo: 'Manifiesto', tipo: 'texto', ancho: 120 },
  { clave: 'entregadas', rotulo: 'Entregadas', tipo: 'numero', ancho: 90 },
  { clave: 'cartaDevolucion', rotulo: 'N.º carta dev.', tipo: 'texto', ancho: 130 },
  { clave: 'devueltas', rotulo: 'Devueltas', tipo: 'numero', ancho: 80 },
];

interface ClienteRef { id: string; nombre: string; }
interface PlataformaRef { id: string; nombre: string; }

interface FilaDraft {
  id: string; fecha: string; plataforma: string; plataformaId: string | null;
  cliente: string; clienteId: string | null; origen: string; tipoDocumento: string; numeroDocumento: string;
  ciudad: string; puntoEntrega: string; manifiesto: string; entregadas: string;
  cartaDevolucion: string; devueltas: string; pendiente: boolean; nueva?: boolean;
}

interface Catalogo {
  clientes: ClienteRef[]; plataformas: PlataformaRef[]; ciudades: string[];
  puntos: string[]; manifiestos: string[]; tiposDocumento: string[];
}

function hoyISO() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60000;
  return new Date(hoy.getTime() - offset).toISOString().slice(0, 10);
}

function nuevaFila(previa?: FilaDraft | null): FilaDraft {
  return {
    id: '__nueva__', fecha: previa?.fecha || hoyISO(), plataforma: previa?.plataforma || '',
    plataformaId: previa?.plataformaId || null, cliente: previa?.cliente || '',
    clienteId: previa?.clienteId || null, origen: previa?.origen || 'PROPIA', tipoDocumento: previa?.tipoDocumento || 'ORDEN_COMPRA',
    numeroDocumento: '', ciudad: previa?.ciudad || '', puntoEntrega: previa?.puntoEntrega || '',
    manifiesto: '', entregadas: '', cartaDevolucion: '', devueltas: '0', pendiente: true, nueva: true,
  };
}

function calcularEstado(fila: FilaDraft, dups: any): string {
  const identificadorValido = fila.tipoDocumento === 'ORDEN_COMPRA'
    ? Boolean(fila.numeroDocumento) && docValido(fila.tipoDocumento, fila.numeroDocumento)
    : Boolean(fila.cartaDevolucion);
  if (!fila.fecha || !identificadorValido) return 'pendiente';
  if (fila.tipoDocumento === 'ORDEN_COMPRA' && (!docValido(fila.tipoDocumento, fila.numeroDocumento) || !PATRON_MANIFIESTO.test(fila.manifiesto))) return 'error';
  if (dups.doc.has(fila.numeroDocumento) || dups.man.has(fila.manifiesto)) return 'error';
  if (!fila.plataforma || !fila.cliente) return 'pendiente';
  return 'completa';
}


export default function Operaciones() {
  const [filas, setFilas] = useState<FilaDraft[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo>({ clientes: [], plataformas: [], ciudades: [], puntos: [], manifiestos: [], tiposDocumento: TIPOS_DOC });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filaActiva, setFilaActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [filtroPlataforma, setFiltroPlataforma] = useState('');
  const [guardando, setGuardando] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const tablaRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api<Catalogo>('/operaciones/catalogo').then(res => setCatalogo({ ...catalogo, ...res })).catch(() => {}); }, []);

  const cargarOperaciones = useCallback(() => {
    setCargando(true);
    const params: any = {};
    if (busqueda) params.q = busqueda;
    if (filtroTipo) params.tipoDocumento = filtroTipo;
    if (filtroOrigen) params.origen = filtroOrigen;
    if (filtroPlataforma) params.plataformaId = filtroPlataforma;
    api<FilaDraft[]>('/operaciones', { params })
      .then(data => {
        const ops: FilaDraft[] = data.map((o: any) => ({
          id: o.id, fecha: o.fecha?.slice(0, 10) || '', plataforma: o.plataforma?.nombre || '',
          plataformaId: o.plataformaId, cliente: o.cliente?.nombre || '', clienteId: o.clienteId,
          origen: o.origen ?? 'PROPIA',
          tipoDocumento: o.tipoDocumento || 'ORDEN_COMPRA', numeroDocumento: o.numeroDocumento || '',
          ciudad: o.ciudad || '', puntoEntrega: o.puntoEntrega || '', manifiesto: o.manifiesto || '',
          entregadas: String(o.entregadas ?? ''), cartaDevolucion: o.cartaDevolucion || '',
          devueltas: String(o.devueltas ?? ''), pendiente: false,
        }));
        ops.push(nuevaFila(ops.length > 0 ? ops[ops.length - 1] : null));
        setFilas(ops); setCargando(false);
      })
      .catch(err => { setError(err.message || 'Error'); setCargando(false); });
  }, [busqueda, filtroTipo, filtroOrigen, filtroPlataforma]);

  useEffect(() => { cargarOperaciones(); }, [cargarOperaciones]);

  const dups = useMemo(() => {
    const dc = new Map(), mc = new Map();
    filas.forEach(f => {
      if (f.numeroDocumento) dc.set(f.numeroDocumento, (dc.get(f.numeroDocumento) || 0) + 1);
      if (f.manifiesto) mc.set(f.manifiesto, (mc.get(f.manifiesto) || 0) + 1);
    });
    return { doc: new Set([...dc.entries()].filter(([,c]) => c > 1).map(([k]) => k)), man: new Set([...mc.entries()].filter(([,c]) => c > 1).map(([k]) => k)) };
  }, [filas]);


  const actualizarCelda = useCallback((filaId: string, clave: string, valor: string) => {
    setFilas(prev => prev.map(f => {
      if (f.id !== filaId) return f;
      const u: any = { ...f, [clave]: valor, pendiente: true };
      if (clave === 'plataforma') { const p = catalogo.plataformas.find(x => x.nombre === valor); u.plataformaId = p?.id || null; }
      if (clave === 'cliente') { const c = catalogo.clientes.find(x => x.nombre === valor); u.clienteId = c?.id || null; }
      // Al cambiar el tipo de documento: limpiar número si no cumple el nuevo
      // formato (45… / 500…) y resetear las columnas que dejan de aplicar
      if (clave === 'tipoDocumento') {
        if (valor === 'ORDEN_COMPRA' && !docValido(valor, u.numeroDocumento)) u.numeroDocumento = '';
        if (valor === 'ORDEN_COMPRA') {
          u.cartaDevolucion = '';
          u.devueltas = '0';
        } else {
          u.numeroDocumento = '';
          u.manifiesto = '';
          u.entregadas = '';
        }
      }
      return u;
    }));
  }, [catalogo]);

  const guardarFila = useCallback(async (fila: FilaDraft) => {
    if (!fila.fecha || (fila.tipoDocumento === 'ORDEN_COMPRA' && !fila.numeroDocumento) || (fila.tipoDocumento === 'CARTA_DEVOLUCION' && !fila.cartaDevolucion)) {
      setError(fila.tipoDocumento === 'CARTA_DEVOLUCION' ? 'Fecha y número de carta son obligatorios' : 'Fecha y número de orden son obligatorios');
      return;
    }
    if (fila.tipoDocumento === 'ORDEN_COMPRA' && !docValido(fila.tipoDocumento, fila.numeroDocumento)) {
      setError(docAyuda(fila.tipoDocumento) + ' — corrija el número de documento');
      return;
    }
    if (fila.tipoDocumento === 'ORDEN_COMPRA' && !PATRON_MANIFIESTO.test(fila.manifiesto)) {
      setError('El manifiesto debe comenzar con 61 y tener 10 dígitos');
      return;
    }
    setGuardando(true);
    try {
      await api(fila.id !== '__nueva__' ? `/operaciones/${fila.id}` : '/operaciones', { method: fila.id !== '__nueva__' ? 'PUT' : 'POST', body: {
        fecha: fila.fecha, plataformaId: fila.plataformaId, clienteId: fila.clienteId, origen: fila.origen || 'PROPIA',
        tipoDocumento: fila.tipoDocumento, numeroDocumento: fila.numeroDocumento,
        ciudad: fila.ciudad || null, puntoEntrega: fila.puntoEntrega || null,
        manifiesto: fila.tipoDocumento === 'ORDEN_COMPRA' ? (fila.manifiesto || null) : null,
        entregadas: fila.tipoDocumento === 'ORDEN_COMPRA' ? (parseInt(fila.entregadas, 10) || 0) : 0,
        cartaDevolucion: fila.tipoDocumento === 'CARTA_DEVOLUCION' ? (fila.cartaDevolucion || null) : null,
        devueltas: fila.tipoDocumento === 'CARTA_DEVOLUCION' ? (parseInt(fila.devueltas, 10) || 0) : 0,
      } });
      cargarOperaciones();
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setGuardando(false); }
  }, [cargarOperaciones]);

  const eliminarFila = useCallback(async (id: string) => {
    if (!confirm('Eliminar?')) return;
    try { await api('/operaciones/' + id, { method: 'DELETE' }); cargarOperaciones(); }
    catch (err: any) { setError(err.message || 'Error'); }
  }, [cargarOperaciones]);

  const duplicarFila = useCallback((fila: FilaDraft) => {
    const d: FilaDraft = { ...fila, id: '__nueva__', numeroDocumento: '', manifiesto: '', entregadas: '', cartaDevolucion: '', devueltas: '0', pendiente: true, nueva: true };
    setFilas(prev => [...prev, d]); setFilaActiva(d.id);
  }, []);

  const agregarFila = useCallback(() => {
    const u = filas.length > 0 ? filas[filas.length - 1] : null;
    const f = nuevaFila(u);
    setFilas(prev => [...prev, f]); setFilaActiva(f.id);
  }, [filas]);

  const manejarTeclado = useCallback((e: ReactKeyboardEvent, fi: number, ci: number) => {
    const fila = filas[fi]; if (!fila) return;
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault(); const s = ci + 1;
      if (s < COLUMNAS.length) { const k = fila.id + '-' + COLUMNAS[s].clave; const el = inputRefs.current.get(k); el?.focus(); el?.select(); }
      else { if (fila.pendiente && fila.fecha && fila.numeroDocumento) guardarFila(fila); agregarFila(); }
    } else if (e.key === 'ArrowUp' && fi > 0) { e.preventDefault(); const k = filas[fi-1].id + '-' + COLUMNAS[ci].clave; inputRefs.current.get(k)?.focus(); }
    else if (e.key === 'ArrowDown' && fi < filas.length - 1) { e.preventDefault(); const k = filas[fi+1].id + '-' + COLUMNAS[ci].clave; inputRefs.current.get(k)?.focus(); }
  }, [filas, guardarFila, agregarFila]);

  const enfocar = useCallback((filaId: string, col: string) => {
    setFilaActiva(filaId);
    setTimeout(() => { const el = inputRefs.current.get(filaId + '-' + col); el?.focus(); el?.select(); }, 50);
  }, []);


  const filasFiltradas = useMemo(() => {
    return filas.filter(f => {
      if (busqueda && !f.numeroDocumento?.includes(busqueda) && !f.manifiesto?.includes(busqueda)) return false;
      if (filtroTipo && f.tipoDocumento !== filtroTipo) return false;
      if (filtroOrigen && f.origen !== filtroOrigen) return false;
      if (filtroPlataforma && f.plataforma !== filtroPlataforma) return false;
      return true;
    });
  }, [filas, busqueda, filtroTipo, filtroOrigen, filtroPlataforma]);

  const stats = useMemo(() => ({
    total: filasFiltradas.length,
    completas: filasFiltradas.filter(f => calcularEstado(f, dups) === 'completa').length,
    pendientes: filasFiltradas.filter(f => calcularEstado(f, dups) === 'pendiente').length,
    errores: filasFiltradas.filter(f => calcularEstado(f, dups) === 'error').length,
  }), [filasFiltradas, dups]);

  useEffect(() => {
    if (tablaRef.current) tablaRef.current.scrollTop = tablaRef.current.scrollHeight;
  }, [filas.length]);

  return (
    <div className="grid-op">
      <PageHeader
        title="Operaciones"
        subtitle="Digitacion masiva de entregas y devoluciones"
        actions={<button className="btn-nueva-op" onClick={agregarFila} disabled={guardando}>+ Nueva operacion</button>}
      />
      {error && <ErrorAlert message={error} />}
      <div className="grid-op-toolbar">
        <div className="toolbar-busqueda">
          <input type="search" placeholder="Buscar documento, manifiesto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="toolbar-filtros">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS_DOC.map(t => <option key={t} value={t}>{t === 'ORDEN_COMPRA' ? 'Orden compra' : 'Carta devolucion'}</option>)}
          </select>
          <select value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}>
            <option value="">Todos los origenes</option>
            {ORIGENES_ESTIBA.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
          <select value={filtroPlataforma} onChange={e => setFiltroPlataforma(e.target.value)}>
            <option value="">Todas las plataformas</option>
            {catalogo.plataformas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-op-wrapper">
        {cargando ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
        ) : (
          <div className="grid-op-scroll" ref={tablaRef}>
            <table className="grid-op-table">
              <thead>
                <tr>
                  <th className="col-idx">#</th>
                  {COLUMNAS.map(col => (
                    <th key={col.clave} className={col.fija ? 'col-fija' + (col.fijaN && col.fijaN > 1 ? '-' + col.fijaN : '') : ''} style={{ width: col.ancho }}>
                      {col.rotulo}
                    </th>
                  ))}
                  <th className="col-acciones">Acc.</th>
                </tr>
              </thead>

              <tbody>
                {filasFiltradas.map((fila, fIdx) => {
                  const estado = calcularEstado(fila, dups);
                  return (
                    <tr key={fila.id} className={'estado-' + estado + (filaActiva === fila.id ? ' fila-activa' : '') + (fila.nueva ? ' fila-nueva' : '')}>
                      <td className="col-idx">{fIdx + 1}</td>
                      {COLUMNAS.map((col, cIdx) => {
                        // Columnas que no aplican al tipo de documento se
                        // deshabilitan y muestran "—" / "0" para no confundir
                        const aplica = columnaAplica(fila.tipoDocumento, col.clave);
                        const valor = aplica ? String((fila as any)[col.clave] ?? '') : (col.tipo === 'numero' ? '0' : '—');
                        const key = fila.id + '-' + col.clave;
                        const esDup = (col.clave === 'numeroDocumento' && dups.doc.has(valor)) || (col.clave === 'manifiesto' && valor && dups.man.has(valor));
                        const docErr = (col.clave === 'numeroDocumento' && valor !== '' && !docValido(fila.tipoDocumento, valor)) || (col.clave === 'manifiesto' && valor !== '' && !PATRON_MANIFIESTO.test(valor));
                        const cls = 'celda-input' + (!aplica ? ' celda-na' : '') + (docErr ? ' error' : '') + (esDup ? ' warning' : '') + (col.tipo === 'select' ? ' celda-select' : '');
                        const colCls = col.fija ? 'col-fija' + (col.fijaN && col.fijaN > 1 ? '-' + col.fijaN : '') : '';
                        const placeholder = col.clave === 'numeroDocumento' ? docPlaceholder(fila.tipoDocumento) : (col.clave === 'manifiesto' ? '6103846909' : (col.tipo === 'numero' ? '0' : ''));
                        const title = col.clave === 'numeroDocumento'
                          ? docAyuda(fila.tipoDocumento)
                          : col.clave === 'manifiesto' ? '61 + 8 dígitos (10 total)' 
                          : (!aplica ? 'No aplica para ' + (fila.tipoDocumento === 'ORDEN_COMPRA' ? 'orden de compra' : 'carta de devolución') : undefined);
                        return (
                          <td key={col.clave} className={colCls} style={{ width: col.ancho }} data-label={col.rotulo}>
                            {col.tipo === 'select' ? (
                          col.clave === 'origen' ? (
                            <select ref={el => { if (el) inputRefs.current.set(key, el as unknown as HTMLInputElement); }} className={cls} value={valor || 'PROPIA'}
                              disabled={!aplica} title={aplica ? 'Origen: Propia o Ercol' : 'No aplica a este tipo'}
                              onChange={e => actualizarCelda(fila.id, col.clave, e.target.value)} onClick={() => enfocar(fila.id, col.clave)}>
                              {ORIGENES_ESTIBA.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                            </select>
                          ) : (
                              <select ref={el => { if (el) inputRefs.current.set(key, el as unknown as HTMLInputElement); }} className={cls} value={valor}
                                disabled={!aplica} title={title}
                                onChange={e => actualizarCelda(fila.id, col.clave, e.target.value)} onClick={() => enfocar(fila.id, col.clave)}>
                                <option value="">--</option>
                                {TIPOS_DOC.map(t => <option key={t} value={t}>{t === 'ORDEN_COMPRA' ? 'Orden compra' : 'Carta devolucion'}</option>)}
                              </select>
                            ) ) : (
                              <input ref={el => { if (el) inputRefs.current.set(key, el); }} className={cls}
                                type={col.tipo === 'fecha' ? 'date' : col.tipo === 'numero' ? 'number' : 'text'}
                                value={valor} placeholder={placeholder} min={col.tipo === 'numero' ? '0' : undefined}
                                max={col.tipo === 'fecha' ? hoyISO() : undefined}
                                disabled={!aplica || (fila.tipoDocumento === 'CARTA_DEVOLUCION' && col.clave === 'numeroDocumento')} title={title} maxLength={col.clave === 'numeroDocumento' ? 10 : undefined}
                                inputMode={col.clave === 'numeroDocumento' ? 'numeric' : undefined}
                                onKeyDown={e => manejarTeclado(e, fIdx, cIdx)}
                                onChange={e => actualizarCelda(fila.id, col.clave, e.target.value)}
                                onClick={() => enfocar(fila.id, col.clave)} onFocus={() => setFilaActiva(fila.id)}
                                list={col.tipo === 'autocomplete' ? 'dl-' + col.clave : undefined}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="col-acciones">
                        {fila.pendiente && fila.fecha && (fila.tipoDocumento === 'ORDEN_COMPRA' ? fila.numeroDocumento : fila.cartaDevolucion) && (
                          <button className="btn-celda btn-guardar-fila" onClick={() => void guardarFila(fila)} title="Guardar (Enter)">💾</button>
                        )}
                        {!fila.nueva && fila.id !== '__nueva__' && (
                          <>
                            <button className="btn-celda" onClick={() => duplicarFila(fila)} title="Duplicar fila">📋</button>
                            <button className="btn-celda btn-eliminar-fila" onClick={() => void eliminarFila(fila.id)} title="Eliminar">🗑</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="grid-op-resumen">
          <span>Total: <strong className="resumen-num">{stats.total}</strong></span>
          <span style={{ color: '#16a34a' }}>✓ Completas: <strong>{stats.completas}</strong></span>
          <span style={{ color: '#f59e0b' }}>⏳ Pendientes: <strong>{stats.pendientes}</strong></span>
          <span style={{ color: '#dc2626' }}>⚠ Errores: <strong>{stats.errores}</strong></span>
        </div>
      </div>
      <datalist id="dl-plataforma">{catalogo.plataformas.map(p => <option key={p.id} value={p.nombre} />)}</datalist>
      <datalist id="dl-cliente">{catalogo.clientes.map(c => <option key={c.id} value={c.nombre} />)}</datalist>
      <datalist id="dl-ciudad">{catalogo.ciudades.map(c => <option key={c} value={c} />)}</datalist>
      <datalist id="dl-puntoEntrega">{catalogo.puntos.map(p => <option key={p} value={p} />)}</datalist>
    </div>
  );
}
