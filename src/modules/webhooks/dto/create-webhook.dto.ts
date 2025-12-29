import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ALL_WEBHOOK_EVENTS } from '../../../entities/webhook.entity';
import type { WebhookEvent } from '../../../entities/webhook.entity';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://yoursite.com/webhooks/crlpay',
  })
  @IsUrl({}, { message: 'URL must be a valid HTTPS URL' })
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    example: ['loan.created', 'payment.success'],
    enum: ALL_WEBHOOK_EVENTS,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one event must be subscribed' })
  @IsEnum(ALL_WEBHOOK_EVENTS, { each: true, message: 'Invalid webhook event' })
  events: WebhookEvent[];

  @ApiPropertyOptional({
    description: 'Whether the webhook is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'Webhook endpoint URL',
    example: 'https://yoursite.com/webhooks/crlpay',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL must be a valid HTTPS URL' })
  url?: string;

  @ApiPropertyOptional({
    description: 'Events to subscribe to',
    example: ['loan.created', 'payment.success'],
    enum: ALL_WEBHOOK_EVENTS,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one event must be subscribed' })
  @IsEnum(ALL_WEBHOOK_EVENTS, { each: true, message: 'Invalid webhook event' })
  events?: WebhookEvent[];

  @ApiPropertyOptional({
    description: 'Whether the webhook is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestWebhookDto {
  @ApiProperty({
    description: 'Event type to test',
    example: 'loan.created',
    enum: ALL_WEBHOOK_EVENTS,
  })
  @IsEnum(ALL_WEBHOOK_EVENTS, { message: 'Invalid webhook event' })
  event: WebhookEvent;
}

export class WebhookDeliveryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by delivery status',
    enum: ['pending', 'success', 'failed'],
  })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'success' | 'failed';

  @ApiPropertyOptional({
    description: 'Number of records to return',
    default: 50,
  })
  @IsOptional()
  limit?: number;
}
