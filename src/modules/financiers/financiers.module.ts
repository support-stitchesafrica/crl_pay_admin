import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FinanciersService } from './financiers.service';
import { FinanciersController } from './financiers.controller';
import { PlansService } from './plans.service';
import { PlanMappingsService } from './plan-mappings.service';
import { PlanMappingsController } from './plan-mappings.controller';
import { FinancingPlansController } from './financing-plans.controller';
import { AdminPlansController } from './admin-plans.controller';
import { FirebaseModule } from '../../config/firebase.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    FirebaseModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [FinanciersService, PlansService, PlanMappingsService],
  controllers: [FinanciersController, PlanMappingsController, FinancingPlansController, AdminPlansController],
  exports: [FinanciersService, PlansService, PlanMappingsService],
})
export class FinanciersModule {}
