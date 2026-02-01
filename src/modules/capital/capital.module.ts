import { Module } from '@nestjs/common';
import { CapitalService } from './capital.service';
import { CapitalController } from './capital.controller';

@Module({
  providers: [CapitalService],
  controllers: [CapitalController],
  exports: [CapitalService],
})
export class CapitalModule {}
