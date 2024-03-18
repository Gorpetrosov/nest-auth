import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('YANDEX_CLIENT_ID'),
      clientSecret: configService.get('YANDEX_CLIENT_SECRET'),
      callbackURL: 'http://localhost:3001/api/auth/yandex/callback',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user: any, info?: any) => void,
  ): Promise<any> {
    if (!profile || !profile.name || !profile.emails || !profile.photos) {
      return done(new UnauthorizedException('Invalid profile data'), null);
    }
    const { displayName, emails, photos, id } = profile;
    const user = {
      email: emails[0].value,
      displayName,
      id,
      picture: photos[0].value,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
