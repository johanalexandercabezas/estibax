import { SetMetadata } from '@nestjs/common';

export const PERMISOS_KEY = 'permisos';
export const Permisos = (modulo: string, accion: string) =>
  SetMetadata(PERMISOS_KEY, { modulo, accion });