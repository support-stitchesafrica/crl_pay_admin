import { Module } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';
import { AllocationsModule } from '../allocations/allocations.module';
import { CapitalModule } from '../capital/capital.module';

@Module({
  imports: [AllocationsModule, CapitalModule],
  providers: [SettlementsService],
  controllers: [SettlementsController],
  exports: [SettlementsService],
})
export class SettlementsModule {}
