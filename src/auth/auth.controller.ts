import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoginUserDto, RegisterUserDto } from './dto';
import { AuthService } from '@auth/auth.service';
import { LoginTokenInterface } from '@auth/interfaces';
import { Providers, User } from '@prisma/client';
import {
  COOKIE_REFRESH_TOKEN_NAME,
  USER_AGENT_REQUEST_HEADER_NAME,
} from '../utilites/constants';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Cookie, Public, RequestHeader } from '@common/decorators';
import { UserResponse } from '@user/responses';
import { GoogleGuard } from '@auth/guards/google.guard';
import { HttpService } from '@nestjs/axios';
import { map, mergeMap } from 'rxjs';
import { handleObservableTimeoutAndError } from '@common/helpers';
import { YandexGuard } from '@auth/guards/yandex.guard';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
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

  @UseGuards(GoogleGuard)
  @Get('google')
  async googleLogin() {}

  @UseGuards(GoogleGuard)
  @Get('google/callback')
  async googleLoginCallback(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const token = request.user['accessToken'];
    const redirectUrl = `${this.configService.get('FRONTEND_URL')}/api/auth/success-google?token=${token}`; //should redirect to front-end, then front-end will request to backend with google token in order to get our server-user info
    return response.redirect(redirectUrl);
  }

  @Get('success-google')
  async getOAuthGoogleUserInfo(
    @Query('token') token: string,
    @RequestHeader(USER_AGENT_REQUEST_HEADER_NAME) agent: string,
    @Res() response: Response,
  ) {
    return this.httpService
      .get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
      )
      .pipe(
        mergeMap(({ data: { email } }) =>
          this.authService.providerAuth(email, agent, Providers.GOOGLE),
        ),
        map((data) => this.setRefreshTokenToCookie(data, response)),
        handleObservableTimeoutAndError(),
      );
  }

  @UseGuards(YandexGuard)
  @Get('yandex')
  async yandexLogin() {}

  @UseGuards(YandexGuard)
  @Get('yandex/callback')
  async yandexLoginCallback(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const token = request.user['accessToken'];
    const redirectUrl = `${this.configService.get('FRONTEND_URL')}/api/auth/success-yandex?token=${token}`; //should redirect to front-end, then front-end will request to backend with google token in order to get our server-user info
    return response.redirect(redirectUrl);
  }

  @Get('success-yandex')
  async getOAuthYandexUserInfo(
    @Query('token') token: string,
    @RequestHeader(USER_AGENT_REQUEST_HEADER_NAME) agent: string,
    @Res() response: Response,
  ) {
    return this.httpService
      .get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`)
      .pipe(
        mergeMap(({ data: { default_email } }) =>
          this.authService.providerAuth(default_email, agent, Providers.YANDEX),
        ),
        map((data) => this.setRefreshTokenToCookie(data, response)),
        handleObservableTimeoutAndError(),
      );
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
