import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YouverifyService } from './youverify.service';

@Module({
  imports: [ConfigModule],
  providers: [YouverifyService],
  exports: [YouverifyService],
})
export class VerificationModule {}
