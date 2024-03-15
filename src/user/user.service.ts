import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { JwtPayload } from '@auth/interfaces';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async save(user: Partial<User>): Promise<User> {
    const hashedPassword = await this.hashPassword(user.password);
    return this.prismaService.user.create({
      data: {
        email: user.email,
        password: hashedPassword,
        roles: ['USER'],
      },
    });
  }

  async findOne(idOrEmail: string): Promise<User> {
    return this.prismaService.user.findFirst({
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
  }

  async delete(id: string, authUser: JwtPayload): Promise<{ id: string }> {
    if (authUser.id !== id && !authUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('You have no permission to this action');
    }
    return this.prismaService.user.delete({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return hashSync(password, genSaltSync(10));
  }
}
