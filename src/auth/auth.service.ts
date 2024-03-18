import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDto, RegisterUserDto } from '@auth/dto';
import { UserService } from '@user/user.service';
import { Providers, Token, User } from '@prisma/client';
import { LoginTokenInterface } from '@auth/interfaces';
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@prisma/prisma.service';
import { v4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async register(dto: RegisterUserDto): Promise<User> {
    const user = await this.userService.findOne(dto.email).catch((err) => {
      this.logger.error(err);
      return null;
    });
    if (user) {
      throw new ConflictException('User already registered');
    }
    return this.userService.save(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
  }

  async login(dto: LoginUserDto, agent: string): Promise<LoginTokenInterface> {
    const user = await this.userService
      .findOne(dto.email, true)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user || !compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Wrong credentials');
    }
    return this.generateTokens(user, agent);
  }

  async refreshTokens(
    refreshToken: string,
    agent: string,
  ): Promise<LoginTokenInterface> {
    const token = await this.prismaService.token
      .delete({
        where: {
          token: refreshToken,
        },
      })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!token || new Date(token.expired) < new Date()) {
      throw new UnauthorizedException('Unauthorized user');
    }
    const user = await this.userService.findOne(token.userId);
    return this.generateTokens(user, agent);
  }

  async deleteRefreshToken(token: string): Promise<Token> {
    return this.prismaService.token.delete({
      where: {
        token,
      },
    });
  }

  async providerAuth(email: string, agent: string, provider: Providers) {
    let userExist = await this.userService.findOne(email);
    if (userExist) {
      if (userExist.provider !== provider) {
        userExist = await this.userService
          .save({ email, provider })
          .catch((err) => {
            this.logger.error(err);
            return null;
          });
      }
      return this.generateTokens(userExist, agent);
    }
    const user = await this.userService
      .save({ email, provider })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });

    if (!user) {
      throw new HttpException(
        `Unable to create a user with email ${email}with Google Auth`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.generateTokens(user, agent);
  }

  private async getRefreshToken(userId: string, agent: string): Promise<Token> {
    const currentDate = new Date();
    const nextMonthDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      currentDate.getDate(),
    );
    const token = await this.prismaService.token.findFirst({
      where: {
        userId,
        userAgent: agent,
      },
    });

    return this.prismaService.token.upsert({
      where: {
        token: token?.token || '',
      },
      update: {
        expired: nextMonthDate,
        token: v4(),
      },
      create: {
        userId,
        expired: nextMonthDate,
        token: v4(),
        userAgent: agent,
      },
    });
  }

  private async generateTokens(
    user: User,
    agent: string,
  ): Promise<LoginTokenInterface> {
    const accessToken =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      });

    const refreshToken = await this.getRefreshToken(user.id, agent);
    return {
      refreshToken,
      accessToken,
    };
  }
}
