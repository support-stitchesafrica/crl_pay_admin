import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { DisbursementsService } from './disbursements.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ApiResponse } from '../../common/helpers/response.helper';
import { InitiateDisbursementDto } from './dto/initiate-disbursement.dto';

@ApiTags('Disbursements')
@Controller('disbursements')
@UseGuards(ApiKeyGuard)
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate disbursement to merchant settlement account' })
  @ApiResponseDecorator({ status: 201, description: 'Disbursement initiated successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid request or reservation' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  async initiateDisbursement(@Req() request: any, @Body() dto: InitiateDisbursementDto) {
    try {
      const merchantId = request.merchant?.merchantId;
      const result = await this.disbursementsService.initiateDisbursement(merchantId, dto);
      return ApiResponse.success(result, 'Disbursement initiated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
