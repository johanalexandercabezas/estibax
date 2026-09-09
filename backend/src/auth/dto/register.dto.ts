import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'empresa-uuid' })
  @IsString()
  empresaId: string;

  @ApiProperty({ example: 'rol-uuid' })
  @IsString()
  rolId: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ example: 'admin@estibax.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6)
  password: string;
}