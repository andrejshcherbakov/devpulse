import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { env } from '@devpulse/env/api';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { DisposableEmailService } from './services/disposable-email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
@Module({
  imports: [
    UsersModule,
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: env.JWT_SECRET,
        signOptions: {
          expiresIn: env.JWT_EXPIRES_IN as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DisposableEmailService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
