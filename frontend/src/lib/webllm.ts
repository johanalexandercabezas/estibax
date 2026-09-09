/**
 * Integración WebLLM (@mlc-ai/web-llm) — IA 100% local en el navegador (WebGPU).
 *
 * Buenas prácticas aplicadas:
 * - Motor singleton con inicialización perezosa (lazy): el modelo (~4 GB) solo se
 *   descarga cuando el usuario abre el asistente por primera vez.
 * - Callback de progreso para informar la descarga al usuario.
 * - El modelo se configura vía variable de entorno PÚBLICA VITE_LLM_MODEL
 *   (no hay secretos: WebLLM corre sin API keys ni servicios externos).
 * - El modelo solo redacta respuestas; las acciones de escritura se validan
 *   por API, permisos y confirmación explícita antes de ejecutarse.
 */

// Import dinámico: evita cargar el bundle de WebLLM hasta que se necesite.
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const MODELO_POR_DEFECTO = 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
const MODELO_LIGERO = 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC';

function normalizarModelo(modelo?: string): string {
  if (!modelo || modelo === 'Llama-3-8B-Instruct-q4f32_1') return MODELO_POR_DEFECTO;
  return modelo;
}

export function modeloConfigurado(): string {
  return normalizarModelo(import.meta.env.VITE_LLM_MODEL as string | undefined);
}

type EngineLike = {
  chat: {
    completions: {
      create: (opts: { messages: ChatMessage[]; stream?: boolean }) => Promise<unknown>;
    };
  };
};

let enginePromise: Promise<EngineLike> | null = null;

export interface ProgresoDescarga {
  progreso: number; // 0..1
  texto: string;
}

/**
 * Crea (o reutiliza) el motor WebLLM. La primera llamada descarga el modelo.
 * @param onProgreso callback opcional para reportar la descarga.
 */
export function obtenerEngine(
  onProgreso?: (p: ProgresoDescarga) => void,
): Promise<EngineLike> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { CreateMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
      const disponibles = new Set(prebuiltAppConfig.model_list.map((item) => item.model_id));
      const solicitado = modeloConfigurado();
      const modelo = disponibles.has(solicitado) ? solicitado : MODELO_LIGERO;
      if (!disponibles.has(modelo)) {
        throw new Error('No hay modelos WebLLM compatibles en la configuración instalada');
      }
      const opciones = {
        initProgressCallback: (report) => {
          onProgreso?.({ progreso: report.progress ?? 0, texto: report.text ?? '' });
        },
      };
      try {
        return await CreateMLCEngine(modelo, opciones) as unknown as EngineLike;
      } catch (error) {
        if (modelo === MODELO_LIGERO) throw error;
        onProgreso?.({ progreso: 0, texto: 'El modelo principal no pudo iniciar; probando modelo ligero...' });
        return CreateMLCEngine(MODELO_LIGERO, opciones) as unknown as EngineLike;
      }
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

/** Envía una conversación al modelo local y devuelve el texto de respuesta. */
export async function chatWebLLM(messages: ChatMessage[]): Promise<string> {
  const ultimo = messages[messages.length - 1]?.content ?? '';
  if (ultimo.length > 12000) throw new Error('La consulta es demasiado extensa; reduce el contexto o la pregunta');
  const engine = await obtenerEngine();
  const res = (await engine.chat.completions.create({ messages })) as {
    choices: { message: { content: string } }[];
  };
  return res.choices[0]?.message?.content ?? '';
}

/** Indica si el navegador soporta WebGPU (requisito de WebLLM). */
export async function webgpuDisponible(): Promise<boolean> {
  const nav = navigator as Navigator & { gpu?: unknown };
  if (!nav.gpu) return false;
  try {
    const adapter = await (nav.gpu as {
      requestAdapter: () => Promise<unknown>;
    }).requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}