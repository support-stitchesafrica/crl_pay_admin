import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() dto: CreateAllocationDto, @Request() req) {
    return this.allocationsService.create(dto, req.user.userId);
  }

  @Get()
  @Roles('super_admin', 'admin', 'finance')
  async findAll(@Query('status') status?: string) {
    return this.allocationsService.findAll(status ? { status } : undefined);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'finance')
  async findOne(@Param('id') id: string) {
    return this.allocationsService.findOne(id);
  }

  @Get('merchant/:merchantId')
  @Roles('super_admin', 'admin', 'finance', 'merchant')
  async findByMerchant(@Param('merchantId') merchantId: string) {
    const allocation = await this.allocationsService.findByMerchant(merchantId);
    if (!allocation) {
      return { message: 'No active allocation found for this merchant' };
    }
    return allocation;
  }

  @Post(':id/suspend')
  @Roles('super_admin', 'admin')
  async suspend(@Param('id') id: string, @Request() req) {
    await this.allocationsService.suspend(id, req.user.userId);
    return { message: 'Allocation suspended successfully' };
  }

  @Post(':id/check-eligibility')
  @Roles('super_admin', 'admin', 'merchant')
  async checkEligibility(
    @Param('id') id: string,
    @Body() dto: { amount: number }
  ) {
    return this.allocationsService.checkEligibility(id, dto.amount);
  }
}
