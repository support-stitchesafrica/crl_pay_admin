import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
  WebhookDeliveryQueryDto,
} from './dto/create-webhook.dto';
import { ApiResponse } from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new webhook subscription' })
  @ApiResponseDecorator({ status: 201, description: 'Webhook created successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request' })
  async create(@Request() req: any, @Body() createWebhookDto: CreateWebhookDto) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const result = await this.webhooksService.create(merchantId, createWebhookDto);
      return ApiResponse.success(
        {
          webhook: result.webhook,
          secret: result.secret,
        },
        'Webhook created successfully. Save the secret - it will not be shown again.',
      );
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all webhooks for the merchant' })
  @ApiResponseDecorator({ status: 200, description: 'Webhooks retrieved successfully' })
  async findAll(@Request() req: any) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const webhooks = await this.webhooksService.findAllByMerchant(merchantId);
      return ApiResponse.success(webhooks, 'Webhooks retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponseDecorator({ status: 200, description: 'Webhook retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Webhook not found' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const webhook = await this.webhooksService.findOne(id, merchantId);
      return ApiResponse.success(webhook, 'Webhook retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponseDecorator({ status: 200, description: 'Webhook updated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Webhook not found' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const webhook = await this.webhooksService.update(id, merchantId, updateWebhookDto);
      return ApiResponse.success(webhook, 'Webhook updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponseDecorator({ status: 200, description: 'Webhook deleted successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Webhook not found' })
  async remove(@Request() req: any, @Param('id') id: string) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      await this.webhooksService.remove(id, merchantId);
      return ApiResponse.success(null, 'Webhook deleted successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/regenerate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  @ApiResponseDecorator({ status: 200, description: 'Secret regenerated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Webhook not found' })
  async regenerateSecret(@Request() req: any, @Param('id') id: string) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const result = await this.webhooksService.regenerateSecret(id, merchantId);
      return ApiResponse.success(
        {
          webhook: result.webhook,
          secret: result.secret,
        },
        'Secret regenerated successfully. Save the new secret - it will not be shown again.',
      );
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test webhook' })
  @ApiResponseDecorator({ status: 200, description: 'Test webhook sent' })
  @ApiResponseDecorator({ status: 404, description: 'Webhook not found' })
  async testWebhook(
    @Request() req: any,
    @Param('id') id: string,
    @Body() testWebhookDto: TestWebhookDto,
  ) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const webhook = await this.webhooksService.findOne(id, merchantId);
      const result = await this.webhookDeliveryService.sendTestWebhook(webhook, testWebhookDto.event);

      if (result.success) {
        return ApiResponse.success(
          { statusCode: result.statusCode },
          'Test webhook delivered successfully',
        );
      } else {
        return ApiResponse.error(
          `Test webhook failed: ${result.error}`,
          { statusCode: result.statusCode },
        );
      }
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id/deliveries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiResponseDecorator({ status: 200, description: 'Deliveries retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Webhook not found' })
  async getDeliveries(
    @Request() req: any,
    @Param('id') id: string,
    @Query() query: WebhookDeliveryQueryDto,
  ) {
    try {
      const merchantId = req.user.merchantId || req.user.sub;
      const deliveries = await this.webhooksService.getDeliveries(id, merchantId, {
        status: query.status,
        limit: query.limit,
      });
      return ApiResponse.success(deliveries, 'Deliveries retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
