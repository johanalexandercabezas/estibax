import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermisos = this.reflector.getAllAndOverride<{ modulo: string; accion: string }>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermisos) return true;

    const { user } = context.switchToHttp().getRequest();

    if (requiredRoles) {
      if (!requiredRoles.includes(user.rol)) {
        throw new ForbiddenException(
          `El rol '${user.rol}' no tiene permiso para esta acción`,
        );
      }
    }

    if (requiredPermisos) {
      const { modulo, accion } = requiredPermisos;
      if (!user.permisos?.[modulo]?.includes(accion)) {
        throw new ForbiddenException(
          `No tiene el permiso '${accion}' sobre '${modulo}'`,
        );
      }
    }

    return true;
  }
}