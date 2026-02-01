import { Module } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';
import { CapitalModule } from '../capital/capital.module';

@Module({
  imports: [CapitalModule],
  providers: [AllocationsService],
  controllers: [AllocationsController],
  exports: [AllocationsService],
})
export class AllocationsModule {}
