import { Module } from '@nestjs/common';
import { DefaultsService } from './defaults.service';
import { DefaultsController } from './defaults.controller';

@Module({
  controllers: [DefaultsController],
  providers: [DefaultsService],
  exports: [DefaultsService],
})
export class DefaultsModule {}
