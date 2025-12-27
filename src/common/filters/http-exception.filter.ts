import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../helpers/response.helper';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()['message'] || exception.message
        : 'Internal server error';

    console.error('Exception caught:', {
      path: request.url,
      method: request.method,
      status,
      message: typeof message === 'string' ? message : message[0],
      stack: exception.stack,
    });

    response.status(status).json(
      ApiResponse.systemError(typeof message === 'string' ? message : message[0]),
    );
  }
}
