import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { CreateSettlementRequestDto, ApproveSettlementDto, RejectSettlementDto } from './dto/create-settlement-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('request')
  @Roles('super_admin', 'admin')
  async createRequest(@Body() dto: CreateSettlementRequestDto, @Request() req) {
    return this.settlementsService.createRequest(dto, req.user.userId);
  }

  @Get('pending')
  @Roles('super_admin', 'finance')
  async getPendingRequests() {
    return this.settlementsService.getPendingRequests();
  }

  @Get()
  @Roles('super_admin', 'admin', 'finance')
  async findAll(@Query('status') status?: string) {
    return this.settlementsService.findAll(status ? { status } : undefined);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'finance')
  async findOne(@Param('id') id: string) {
    return this.settlementsService.findOne(id);
  }

  @Get('merchant/:merchantId')
  @Roles('super_admin', 'admin', 'finance', 'merchant')
  async getByMerchant(@Param('merchantId') merchantId: string) {
    return this.settlementsService.getRequestsByMerchant(merchantId);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'finance')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveSettlementDto,
    @Request() req
  ) {
    return this.settlementsService.approveRequest(id, req.user.userId, dto.approvalNotes);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'finance')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectSettlementDto,
    @Request() req
  ) {
    return this.settlementsService.rejectRequest(id, req.user.userId, dto.rejectionReason);
  }

  @Post(':id/payout')
  @Roles('super_admin', 'finance')
  async processPayout(@Param('id') id: string, @Request() req) {
    return this.settlementsService.processPayout(id, req.user.userId);
  }

  @Post('calculate/:merchantId')
  @Roles('super_admin', 'admin', 'finance')
  async calculateSettlement(@Param('merchantId') merchantId: string) {
    const allocation = await this.settlementsService['allocationsService'].findByMerchant(merchantId);
    if (!allocation) {
      return { message: 'No active allocation found for this merchant' };
    }
    return this.settlementsService.calculateSettlementAmount(merchantId, allocation.allocationId);
  }
}
