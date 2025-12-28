import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';

@Module({
  imports: [ConfigModule],
  providers: [NotificationsService, EmailService, SmsService, PushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
