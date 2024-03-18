import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Providers, Role, User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { JwtPayload } from '@auth/interfaces';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { convertToSecondsUtil } from '@common/utils';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async save(user: Partial<User>): Promise<User> {
    const hashedPassword = user.password
      ? await this.hashPassword(user.password)
      : null;
    const newUser = await this.prismaService.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        password: hashedPassword,
        provider: user.provider ?? Providers.LOCAL,
        roles: user.roles,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        roles: ['USER'],
        provider: user.provider ?? Providers.LOCAL,
      },
    });
    await Promise.all([
      this.cacheManager.set(newUser.id, newUser),
      this.cacheManager.set(newUser.email, newUser),
    ]);
    return newUser;
  }

  async findOne(idOrEmail: string, isReset = false): Promise<User> {
    if (isReset) {
      await this.cacheManager.del(idOrEmail);
    }
    const user = await this.cacheManager.get<User>(idOrEmail);
    if (!user) {
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [
            {
              id: idOrEmail,
            },
            {
              email: idOrEmail,
            },
          ],
        },
      });
      if (!user) {
        return null;
      }
      await this.cacheManager.set(
        idOrEmail,
        user,
        convertToSecondsUtil(this.configService.get('JWT_EXPIRE')),
      );
      return user;
    }
    return user;
  }

  async delete(id: string, authUser: JwtPayload): Promise<{ id: string }> {
    if (authUser.id !== id && !authUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('You have no permission to this action');
    }
    const user = await this.prismaService.user.delete({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });
    await Promise.all([
      this.cacheManager.del(user.id),
      this.cacheManager.del(authUser.email),
    ]);
    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    return hashSync(password, genSaltSync(10));
  }
}
