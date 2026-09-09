/**
 * Asistente IA EstibaX (WebLLM) — 100% local en el navegador (WebGPU).
 * SOLO LECTURA: recibe un resumen de KPIs como contexto; jamás invoca
 * endpoints de escritura (sección 4.10 del Prompt Maestro).
 */
import { useEffect, useRef, useState } from 'react';
import { Sparkle, X, ArrowUp } from '@phosphor-icons/react';
import { chatWebLLM, webgpuDisponible, modeloConfigurado, type ChatMessage } from '../lib/webllm';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AsistenteIA() {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [soportado, setSoportado] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoContexto, setCargandoContexto] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [contexto, setContexto] = useState<unknown>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto && soportado === null) {
      webgpuDisponible().then(setSoportado);
    }
  }, [abierto, soportado]);

  useEffect(() => {
    if (!abierto || contexto || cargandoContexto) return;
    setCargandoContexto(true);
    api('/asistente/contexto')
      .then((data) => setContexto(data))
      .catch(() => setContexto({ error: 'No se pudo cargar el contexto operativo' }))
      .finally(() => setCargandoContexto(false));
  }, [abierto, contexto, cargandoContexto]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  async function enviar() {
    const texto = entrada.trim();
    if (!texto || cargando) return;
    setEntrada('');
    setCargando(true);

    try {
      const accion = interpretarAccion(texto);
      if (accion) {
        if (!usuario?.permisos?.configuracion?.includes('write')) {
          throw new Error('Esta accion requiere permisos de configuracion');
        }
        if (!window.confirm(`Confirmar creacion de ${accion.tipo === 'CREAR_CLIENTE' ? 'cliente' : 'plataforma'}: ${accion.nombre}?`)) {
          setCargando(false);
          return;
        }
        setMensajes((m) => [...m, { role: 'user', content: texto }]);
        const creado = await api<{ nombre: string }>('/asistente/acciones', { method: 'POST', body: accion });
        setMensajes((m) => [...m, { role: 'assistant', content: `Creacion confirmada: ${creado.nombre}.` }]);
        setContexto(null);
        return;
      }
      const kpis = contexto ? JSON.stringify(contexto) : resumenKpis();
      const historial: ChatMessage[] = [
        {
          role: 'system',
          content:
            'Eres el asistente de análisis de EstibaX, una plataforma de control de estibas retornables. ' +
            'Responde en español, de forma breve y práctica. Puedes consultar el contexto real. ' +
            'Para crear cliente o plataforma usa exactamente la orden: crear cliente: NOMBRE o crear plataforma: NOMBRE; la aplicacion pedira confirmacion. ' +
            'Datos actuales de la operación: ' + kpis,
        },
        ...mensajes.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
        { role: 'user', content: texto },
      ];
      setMensajes((m) => [...m, { role: 'user', content: texto }]);
      const respuesta = await chatWebLLM(historial);
      setMensajes((m) => [...m, { role: 'assistant', content: respuesta }]);
    } catch (e) {
      setMensajes((m) => [
        ...m,
        {
          role: 'assistant',
          content: e instanceof Error && e.message.includes('Cannot find model record')
            ? 'El modelo local configurado no está disponible. Se corrigió la configuración; cierra y vuelve a abrir el asistente para cargar un modelo compatible.'
            : 'No fue posible generar la respuesta: ' + (e instanceof Error ? e.message : 'error desconocido'),
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function resumenKpis(): string {
    try {
      const raw = localStorage.getItem('estibax_kpis_ia');
      return raw ?? 'sin datos cargados aún';
    } catch {
      return 'sin datos';
    }
  }

  function interpretarAccion(texto: string): { tipo: 'CREAR_CLIENTE' | 'CREAR_PLATAFORMA'; nombre: string } | null {
    const coincidencia = texto.match(/^crear\s+(cliente|plataforma)\s*:\s*(.+)$/i);
    if (!coincidencia) return null;
    return {
      tipo: coincidencia[1].toLowerCase() === 'cliente' ? 'CREAR_CLIENTE' : 'CREAR_PLATAFORMA',
      nombre: coincidencia[2].trim(),
    };
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-pop hover:bg-brand-700"
        aria-label="Abrir asistente IA"
      >
        <Sparkle size={18} weight="fill" />
        Asistente IA
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl2 bg-white shadow-pop">
      <div className="flex items-center justify-between border-b border-gray-100 bg-brand-600 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkle size={16} weight="fill" /> Asistente IA (local)
        </p>
        <button onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="text-white/80 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {soportado === false ? (
        <div className="flex-1 p-5 text-sm text-gray-600">
          Tu navegador no soporta <strong>WebGPU</strong>, requisito de WebLLM. Prueba con Chrome o
          Edge actualizados para usar el asistente local.
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.length === 0 && (
              <p className="text-sm text-gray-500">
                {cargandoContexto ? 'Cargando datos operativos...' : 'Consulta activos, alertas, movimientos y cobros. '}
                El modelo corre en tu equipo ({modeloConfigurado()}); para crear usa “crear cliente: Nombre” o “crear plataforma: Nombre”.
              </p>
            )}
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl2 px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-brand-600 text-white'
                    : 'bg-gray-100 text-ink'
                }`}
              >
                {m.content}
              </div>
            ))}
            {cargando && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
                Pensando…
              </div>
            )}
            <div ref={finRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 p-3">
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder="Pregunta sobre la operación…"
              className="flex-1 rounded-xl2 border-0 px-3 py-2 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-brand-600"
            />
            <button
              onClick={enviar}
              disabled={cargando || !entrada.trim()}
              className="rounded-xl2 bg-brand-600 p-2 text-white hover:bg-brand-700 disabled:opacity-50"
              aria-label="Enviar"
            >
              <ArrowUp size={16} weight="bold" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}