import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ClientesModule } from './clientes/clientes.module';
import { ActivosModule } from './activos/activos.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { NovedadesModule } from './novedades/novedades.module';
import { PortalModule } from './portal/portal.module';
import { EconomicoModule } from './economico/economico.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { TransportesModule } from './transportes/transportes.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AsistenteModule } from './asistente/asistente.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    AuditoriaModule,
    ClientesModule,
    ActivosModule,
    MovimientosModule,
    NovedadesModule,
    PortalModule,
        EconomicoModule,
    TransportesModule,
    ConfiguracionModule,
    OperacionesModule,
    AsistenteModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

