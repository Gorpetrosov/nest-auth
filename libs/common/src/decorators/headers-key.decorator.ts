import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestHeader = createParamDecorator(
  (key: string, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return key && key in request.headers
      ? request.headers[key]
      : request.headers;
  },
);
