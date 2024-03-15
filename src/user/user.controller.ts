import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '@user/user.service';
import { UserResponse } from '@user/responses';
import { CurrentUser } from '@common/decorators';
import { User } from '@prisma/client';
import { JwtPayload } from '@auth/interfaces';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findUser(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    if (!user) {
      throw new NotFoundException("User doesn't exist");
    }
    return new UserResponse(user);
  }

  @Delete(':id')
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string }> {
    const userId = await this.userService.delete(id, user);
    if (!userId) {
      throw new NotFoundException(`User with ${id} doesn't exist`);
    }
    return userId;
  }
}
