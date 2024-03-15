import { Token } from '@prisma/client';

export interface LoginTokenInterface {
  accessToken: string;
  refreshToken: Token;
}
