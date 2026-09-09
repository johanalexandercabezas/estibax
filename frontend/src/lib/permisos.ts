import type { Usuario } from '../context/AuthContext';

/**
 * ¿Puede el usuario ver/operar un módulo?
 * - Sin módulo (p. ej. la Torre de Control): visible para todos los autenticados.
 * - CLIENTE: no ve ningún módulo administrativo (solo su portal).
 * - Sesión antigua sin permisos guardados: no se filtra (degradación graceful).
 * - En el resto de casos se exige el permiso 'read' sobre el módulo.
 */
export function puedeModulo(
  usuario: Usuario | null,
  modulo: string | undefined,
  accion = 'read',
): boolean {
  if (!usuario) return false;
  if (!modulo) return true;
  if (usuario.rol === 'CLIENTE') return false;
  if (!usuario.permisos || Object.keys(usuario.permisos).length === 0) return true;
  const acciones = usuario.permisos[modulo];
  return Array.isArray(acciones) && acciones.includes(accion);
}
