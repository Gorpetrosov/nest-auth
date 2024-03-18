import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '@user/user.service';
import { UserResponse } from '@user/responses';
import { CurrentUser, Roles } from '@common/decorators';
import { Role, User } from '@prisma/client';
import { JwtPayload } from '@auth/interfaces';
import { RolesGuard } from '@auth/guards/role-guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload): Promise<JwtPayload> {
    return user;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findUser(@Param('idOrEmail') idOrEmail: string): Promise<UserResponse> {
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

  @UseInterceptors(ClassSerializerInterceptor)
  @Put()
  async updateUser(@Body() body: Partial<User>) {
    const user = await this.userService.save(body);
    return new UserResponse(user);
  }
}
