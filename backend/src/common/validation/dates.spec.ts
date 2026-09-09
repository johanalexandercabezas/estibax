import { BadRequestException } from '@nestjs/common';
import { fechaNoFutura, validarRangoNoFuturo } from './dates';

describe('validacion de fechas', () => {
  it('acepta hoy y fechas pasadas', () => {
    expect(fechaNoFutura(new Date(Date.now() - 60_000), 'Fecha')).toBeInstanceOf(Date);
    expect(fechaNoFutura(new Date(), 'Fecha')).toBeInstanceOf(Date);
  });

  it('rechaza fechas futuras', () => {
    expect(() => fechaNoFutura(new Date(Date.now() + 60_000), 'Fecha')).toThrow(BadRequestException);
  });

  it('rechaza rangos invertidos y fechas futuras', () => {
    expect(() => validarRangoNoFuturo('2026-09-03', '2026-09-02')).toThrow(BadRequestException);
    expect(() => validarRangoNoFuturo('2099-01-01', undefined)).toThrow(BadRequestException);
  });
});
