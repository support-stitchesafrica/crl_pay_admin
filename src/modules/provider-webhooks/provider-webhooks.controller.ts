import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { ProviderWebhooksService } from './provider-webhooks.service';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Provider Webhooks')
@Controller('provider-webhooks')
export class ProviderWebhooksController {
  constructor(private readonly providerWebhooksService: ProviderWebhooksService) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Paystack webhooks (transfer events)' })
  @ApiResponseDecorator({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid webhook signature or payload' })
  async handlePaystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    try {
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload);
      
      await this.providerWebhooksService.handlePaystackWebhook(rawBody, signature, payload);
      
      return ApiResponse.success(null, 'Webhook processed successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
