import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { LoginUserDto, RegisterUserDto } from './dto';
import { AuthService } from '@auth/auth.service';
import { LoginTokenInterface } from '@auth/interfaces';
import { User } from '@prisma/client';
import {
  COOKIE_REFRESH_TOKEN_NAME,
  USER_AGENT_REQUEST_HEADER_NAME,
} from '../utilites/constants';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Cookie, Public, RequestHeader } from '@common/decorators';
import { UserResponse } from '@user/responses';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('register')
  async register(@Body() dto: RegisterUserDto): Promise<User> {
    const user = await this.authService.register(dto);
    if (!user) {
      throw new BadRequestException('Please try again');
    }
    return new UserResponse(user);
  }

  @Post('login')
  async login(
    @Body() dto: LoginUserDto,
    @Res() response: Response,
    @RequestHeader(USER_AGENT_REQUEST_HEADER_NAME) agent: string,
  ) {
    const tokens = await this.authService.login(dto, agent);
    if (!tokens) {
      throw new BadRequestException("Can't logg in");
    }
    this.setRefreshTokenToCookie(tokens, response);
  }

  @Get('refresh-tokens')
  async refreshTokens(
    @Cookie(COOKIE_REFRESH_TOKEN_NAME) refreshToken: string,
    @Res() response: Response,
    @RequestHeader(USER_AGENT_REQUEST_HEADER_NAME) agent: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('User did not logged in');
    }
    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    if (!tokens) {
      throw new BadRequestException("Can't logg in");
    }
    this.setRefreshTokenToCookie(tokens, response);
  }

  @Get('logout')
  async logout(
    @Cookie(COOKIE_REFRESH_TOKEN_NAME) refreshToken: string,
    @Res() response: Response,
  ) {
    if (!refreshToken) {
      response
        .status(HttpStatus.OK)
        .json({ message: 'Successfully logged out' });
      return;
    }
    await this.authService.deleteRefreshToken(refreshToken);
    response.cookie(COOKIE_REFRESH_TOKEN_NAME, '', {
      httpOnly: true,
      secure: true,
      expires: new Date(),
    });
    response.status(HttpStatus.OK).json({ message: 'Successfully logged out' });
  }

  private setRefreshTokenToCookie(
    tokens: LoginTokenInterface,
    response: Response,
  ) {
    if (!tokens) {
      throw new UnauthorizedException('User did not logged in');
    }
    response.cookie(COOKIE_REFRESH_TOKEN_NAME, tokens.refreshToken.token, {
      httpOnly: true,
      sameSite: 'lax',
      expires: new Date(tokens.refreshToken.expired),
      secure:
        this.configService.get('NODE_ENV', 'development') === 'production',
      path: '/',
    });
    response.status(HttpStatus.OK).json({ accessToken: tokens.accessToken });
  }
}
