import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as bcrypt from 'bcryptjs';

@ApiTags('Configuracion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Lectura (módulo completo)
  // ------------------------------------------------------------------

  @Get('empresa')
  @Permisos('configuracion', 'read')
  @ApiOperation({ summary: 'Datos de referencia de la empresa (sedes, tipos de activo, roles)' })
  async empresa(@CurrentUser('empresaId') empresaId: string) {
    const [empresa, sedes, tiposActivo, roles, clientesFacturables] = await Promise.all([
      this.prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { id: true, nombre: true, nit: true },
      }),
      this.prisma.sede.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } }),
      this.prisma.tipoActivo.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.rol.findMany({
        where: { empresaId },
        orderBy: { nombre: 'asc' },
        include: { _count: { select: { usuarios: true } } },
      }),
      this.prisma.clienteFacturable.findMany({
        where: { empresaId },
        orderBy: { nombre: 'asc' },
      }),
    ]);
    return { empresa, sedes, tiposActivo, roles, clientesFacturables };
  }

  @Get('ubicaciones')
  @Permisos('configuracion', 'read')
  @ApiOperation({ summary: 'Árbol completo Sede → Planta → Bodega → Zona' })
  async ubicaciones(@CurrentUser('empresaId') empresaId: string) {
    return this.prisma.sede.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
      include: {
        plantas: {
          orderBy: { nombre: 'asc' },
          include: {
            bodegas: {
              orderBy: { nombre: 'asc' },
              include: { zonas: { orderBy: { nombre: 'asc' } } },
            },
          },
        },
      },
    });
  }

  @Get('usuarios')
  @Permisos('configuracion', 'read')
  @ApiOperation({ summary: 'Listar usuarios con su rol' })
  async usuarios(@CurrentUser('empresaId') empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
      include: {
        rol: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    });
  }

  private async auditar(
    empresaId: string,
    usuarioId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    detalles: unknown,
  ) {
    await this.prisma.auditoria.create({
      data: {
        empresaId,
        usuarioId,
        accion,
        entidad,
        entidadId,
        detalles: JSON.stringify(detalles ?? {}),
      },
    });
  }

  // ------------------------------------------------------------------
  // Escritura — solo superusuario (configuracion:write)
  // ------------------------------------------------------------------

  // --- Sedes / ciudades ---
  @Post('sedes')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Crear sede/ciudad (superusuario)' })
  async crearSede(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: { nombre?: string; ciudad?: string },
  ) {
    const nombre = (data.nombre ?? data.ciudad ?? '').trim();
    if (!nombre) throw new BadRequestException('El nombre de la sede es obligatorio');
    const sede = await this.prisma.sede.create({ data: { empresaId, nombre } });
    await this.auditar(empresaId, usuarioId, 'CREAR_SEDE', 'Sede', sede.id, { nombre });
    return sede;
  }

  @Put('sedes/:id')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Renombrar sede (superusuario)' })
  async editarSede(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { nombre?: string },
  ) {
    if (!data.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    const result = await this.prisma.sede.updateMany({
      where: { id, empresaId },
      data: { nombre: data.nombre.trim() },
    });
    if (result.count !== 1) throw new BadRequestException('Sede no encontrada');
    await this.auditar(empresaId, usuarioId, 'EDITAR_SEDE', 'Sede', id, { nombre: data.nombre });
    return this.prisma.sede.findFirst({ where: { id, empresaId } });
  }

  // --- Catálogo de tipos de activo (material) ---
  @Post('tipos-activo')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Crear tipo de activo / material (superusuario)' })
  async crearTipo(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: { nombre?: string; descripcion?: string },
  ) {
    if (!data.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    const tipo = await this.prisma.tipoActivo.create({
      data: { nombre: data.nombre.trim(), descripcion: data.descripcion ?? null },
    });
    await this.auditar(empresaId, usuarioId, 'CREAR_TIPO_ACTIVO', 'TipoActivo', tipo.id, data);
    return tipo;
  }

  @Put('tipos-activo/:id')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Editar tipo de activo / material (superusuario)' })
  async editarTipo(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { nombre?: string; descripcion?: string },
  ) {
    const tipo = await this.prisma.tipoActivo.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      },
    });
    await this.auditar(empresaId, usuarioId, 'EDITAR_TIPO_ACTIVO', 'TipoActivo', id, data);
    return tipo;
  }

  // --- Roles y permisos ---
  @Post('roles')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Crear rol con permisos (superusuario)' })
  async crearRol(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: { nombre?: string; permisos?: Record<string, string[]> },
  ) {
    if (!data.nombre?.trim()) throw new BadRequestException('El nombre del rol es obligatorio');
    const rol = await this.prisma.rol.create({
      data: { empresaId, nombre: data.nombre.trim(), permisos: JSON.stringify(data.permisos ?? {}) },
    });
    await this.auditar(empresaId, usuarioId, 'CREAR_ROL', 'Rol', rol.id, { nombre: rol.nombre });
    return rol;
  }

  @Put('roles/:id')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Editar nombre y permisos de un rol (superusuario)' })
  async editarRol(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { nombre?: string; permisos?: Record<string, string[]> },
  ) {
    const existente = await this.prisma.rol.findFirst({ where: { id, empresaId } });
    if (!existente) throw new BadRequestException('Rol no encontrado');
    const rol = await this.prisma.rol.updateMany({
      where: { id, empresaId },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.permisos !== undefined && { permisos: JSON.stringify(data.permisos) }),
      },
    });
    if (rol.count !== 1) throw new BadRequestException('Rol no encontrado');
    const actualizado = await this.prisma.rol.findFirst({ where: { id, empresaId } });
    await this.auditar(empresaId, usuarioId, 'EDITAR_ROL', 'Rol', id, { nombre: actualizado?.nombre });
    return actualizado;
  }

  // --- Usuarios ---
  @Post('usuarios')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Crear usuario con rol (superusuario)' })
  async crearUsuario(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: { nombre?: string; email?: string; password?: string; rolId?: string; clienteId?: string | null },
  ) {
    if (!data.nombre?.trim() || !data.email?.trim() || !data.password || !data.rolId) {
      throw new BadRequestException('nombre, email, password y rolId son obligatorios');
    }
    if (data.password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    const rol = await this.prisma.rol.findFirst({ where: { id: data.rolId, empresaId } });
    if (!rol) throw new BadRequestException('El rol no pertenece a la empresa');
    if (data.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
      if (!cliente) throw new BadRequestException('El cliente no pertenece a la empresa');
    }
    const existe = await this.prisma.usuario.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });
    if (existe) throw new BadRequestException('Ya existe un usuario con ese email');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: {
        empresaId,
        nombre: data.nombre.trim(),
        email: data.email.trim().toLowerCase(),
        passwordHash,
        rolId: data.rolId,
        ...(data.clienteId ? { clienteId: data.clienteId } : {}),
      },
    });
    await this.auditar(empresaId, usuarioId, 'CREAR_USUARIO', 'Usuario', usuario.id, {
      email: usuario.email,
      rolId: usuario.rolId,
    });
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rolId: usuario.rolId,
      activo: usuario.activo,
    };
  }

  @Put('usuarios/:id')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Editar usuario: rol, estado o contraseña (superusuario)' })
  async editarUsuario(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { nombre?: string; rolId?: string; activo?: boolean; clienteId?: string | null; password?: string },
  ) {
    const existente = await this.prisma.usuario.findFirst({ where: { id, empresaId } });
    if (!existente) throw new BadRequestException('Usuario no encontrado');
    if (data.rolId) {
      const rol = await this.prisma.rol.findFirst({ where: { id: data.rolId, empresaId } });
      if (!rol) throw new BadRequestException('El rol no pertenece a la empresa');
    }
    if (data.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
      if (!cliente) throw new BadRequestException('El cliente no pertenece a la empresa');
    }
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    const result = await this.prisma.usuario.updateMany({
      where: { id, empresaId },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.rolId && { rolId: data.rolId }),
        ...(data.activo !== undefined && { activo: data.activo }),
        ...(data.clienteId !== undefined && { clienteId: data.clienteId }),
        ...(passwordHash && { passwordHash }),
      },
    });
    if (result.count !== 1) throw new BadRequestException('Usuario no encontrado');
    const usuario = await this.prisma.usuario.findFirst({ where: { id, empresaId } });
    if (!usuario) throw new BadRequestException('Usuario no encontrado');
    await this.auditar(empresaId, usuarioId, 'EDITAR_USUARIO', 'Usuario', id, {
      nombre: usuario.nombre,
      rolId: usuario.rolId,
      activo: usuario.activo,
      resetPassword: Boolean(data.password),
    });
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rolId: usuario.rolId,
      activo: usuario.activo,
    };
  }

  // --- Clientes facturables (tarifas del algoritmo de cobros Excel) ---
  @Post('clientes-facturables')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Crear cliente facturable con tarifa diaria (superusuario)' })
  async crearClienteFacturable(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: { nombre?: string; tarifaDiaria?: number },
  ) {
    if (!data.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    const tarifa = Number(data.tarifaDiaria);
    if (!Number.isFinite(tarifa) || tarifa < 0) {
      throw new BadRequestException('La tarifa diaria debe ser un número mayor o igual a 0');
    }
    const existe = await this.prisma.clienteFacturable.findUnique({
      where: { nombre: data.nombre.trim() },
    });
    if (existe) throw new BadRequestException(`Ya existe un cliente facturable con nombre "${data.nombre.trim()}"`);
    const cf = await this.prisma.clienteFacturable.create({
      data: { empresaId, nombre: data.nombre.trim(), tarifaDiaria: tarifa },
    });
    await this.auditar(empresaId, usuarioId, 'CREAR_CLIENTE_FACTURABLE', 'ClienteFacturable', cf.id, {
      nombre: cf.nombre,
      tarifaDiaria: tarifa,
    });
    return cf;
  }

  @Put('clientes-facturables/:id')
  @Permisos('configuracion', 'write')
  @ApiOperation({ summary: 'Editar tarifa, nombre o estado activo de un cliente facturable' })
  async editarClienteFacturable(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { nombre?: string; tarifaDiaria?: number; activo?: boolean },
  ) {
    const actual = await this.prisma.clienteFacturable.findFirst({
      where: { id, empresaId },
    });
    if (!actual) throw new BadRequestException('Cliente facturable no encontrado');

    const tarifa = data.tarifaDiaria !== undefined ? Number(data.tarifaDiaria) : Number(actual.tarifaDiaria);
    if (!Number.isFinite(tarifa) || tarifa < 0) {
      throw new BadRequestException('La tarifa diaria debe ser un número mayor o igual a 0');
    }
    if (data.nombre?.trim() && data.nombre.trim() !== actual.nombre) {
      const conflicto = await this.prisma.clienteFacturable.findUnique({
        where: { nombre: data.nombre.trim() },
      });
      if (conflicto && conflicto.id !== id) {
        throw new BadRequestException(`Ya existe un cliente facturable con nombre "${data.nombre.trim()}"`);
      }
    }
    const result = await this.prisma.clienteFacturable.updateMany({
      where: { id, empresaId },
      data: {
        ...(data.nombre?.trim() && { nombre: data.nombre.trim() }),
        tarifaDiaria: tarifa,
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });
    if (result.count !== 1) throw new BadRequestException('Cliente facturable no encontrado');
    const cf = await this.prisma.clienteFacturable.findFirst({ where: { id, empresaId } });
    if (!cf) throw new BadRequestException('Cliente facturable no encontrado');
    await this.auditar(empresaId, usuarioId, 'EDITAR_CLIENTE_FACTURABLE', 'ClienteFacturable', id, {
      nombre: cf.nombre,
      tarifaDiaria: Number(cf.tarifaDiaria),
      activo: cf.activo,
    });
    return cf;
  }
}
