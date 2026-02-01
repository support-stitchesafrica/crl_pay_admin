import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CapitalService } from './capital.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('capital-pool')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CapitalController {
  constructor(private readonly capitalService: CapitalService) {}

  @Get()
  @Roles('super_admin', 'admin', 'finance')
  async getPoolStatus() {
    return this.capitalService.getPoolStatus();
  }

  @Post('set-capital')
  @Roles('super_admin', 'admin')
  async setTotalCapital(@Body() dto: { amount: number }) {
    await this.capitalService.setTotalCapital(dto.amount);
    return { 
      message: 'Capital updated successfully',
      amount: dto.amount 
    };
  }

  @Post('update-metrics')
  @Roles('super_admin', 'admin', 'finance')
  async updateMetrics() {
    await this.capitalService.updateMetrics();
    return { message: 'Metrics updated successfully' };
  }
}
