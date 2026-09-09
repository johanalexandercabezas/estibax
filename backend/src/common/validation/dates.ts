import { BadRequestException } from '@nestjs/common';

export function ahora(): Date {
  return new Date();
}

export function fechaNoFutura(value: Date | string | undefined | null, campo: string): Date {
  if (!value) return ahora();
  const fecha = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException(`${campo} inválida`);
  }
  if (fecha.getTime() > Date.now()) {
    throw new BadRequestException(`${campo} no puede ser superior a la fecha y hora actual`);
  }
  return fecha;
}

export function validarRangoNoFuturo(desde?: string, hasta?: string) {
  const inicio = desde ? fechaNoFutura(desde, 'Fecha desde') : undefined;
  const fin = hasta ? fechaNoFutura(hasta, 'Fecha hasta') : undefined;
  if (inicio && fin && inicio > fin) {
    throw new BadRequestException('La fecha desde no puede ser posterior a la fecha hasta');
  }
  return { inicio, fin };
}
