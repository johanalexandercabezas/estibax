import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, metadata?: { ip?: string; userAgent?: string | null }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { rol: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const valid = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        ultimaConexionAt: new Date(),
        ultimaConexionIp: metadata?.ip ?? null,
        ultimaConexionUserAgent: metadata?.userAgent ?? null,
      },
    });

    return this.generateToken(usuario);
  }

  async validateUser(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });
    if (!usuario || !usuario.activo) return null;
    return usuario;
  }

  private generateToken(usuario: any) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      permisos: JSON.parse(usuario.rol.permisos),
      empresaId: usuario.empresaId,
      clienteId: usuario.clienteId ?? null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol.nombre,
        empresaId: usuario.empresaId,
        clienteId: usuario.clienteId ?? null,
        permisos: JSON.parse(usuario.rol.permisos),
      },
    };
  }
}