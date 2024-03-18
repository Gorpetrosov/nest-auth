import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@user/user.module';
import { options } from './config';
import { STRATEGIES } from '@auth/strategies';
import { GUARDS } from '@auth/guards';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [AuthController],
  providers: [AuthService, ...STRATEGIES, ...GUARDS],
  imports: [
    JwtModule.registerAsync(options()),
    PassportModule,
    UserModule,
    HttpModule,
  ],
})
export class AuthModule {}
