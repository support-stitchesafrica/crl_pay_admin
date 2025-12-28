import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new customer' })
  @ApiResponseDecorator({
    status: 201,
    description: 'Customer successfully registered',
  })
  @ApiResponseDecorator({ status: 400, description: 'Invalid input data' })
  @ApiResponseDecorator({ status: 409, description: 'Customer already exists' })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    this.logger.log(`POST /customers - Registering new customer: ${createCustomerDto.email}`);
    const customer = await this.customersService.create(createCustomerDto);
    this.logger.log(`Customer registered successfully: ${customer.customerId}`);
    return ApiResponse.success(
      customer,
      'Customer registered successfully',
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customers (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Customers retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  @ApiResponseDecorator({ status: 403, description: 'Forbidden - Admin only' })
  async findAll() {
    this.logger.log('GET /customers - Fetching all customers');
    const customers = await this.customersService.findAll();
    this.logger.log(`Retrieved ${customers.length} customers`);
    return ApiResponse.success(
      customers,
      'Customers retrieved successfully',
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer statistics (Admin only)' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Customer statistics retrieved successfully',
  })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  @ApiResponseDecorator({ status: 403, description: 'Forbidden - Admin only' })
  async getStats() {
    this.logger.log('GET /customers/stats - Fetching customer statistics');
    const stats = await this.customersService.getCustomerStats();
    this.logger.log(`Statistics retrieved: Total=${stats.total}, Active=${stats.active}`);
    return ApiResponse.success(
      stats,
      'Customer statistics retrieved successfully',
    );
  }

  @Get('merchant/:merchantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customers by merchant' })
  @ApiParam({ name: 'merchantId', description: 'Merchant ID' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Merchant customers retrieved successfully',
  })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async findByMerchant(@Param('merchantId') merchantId: string) {
    this.logger.log(`GET /customers/merchant/${merchantId} - Fetching customers for merchant`);
    const customers = await this.customersService.findByMerchant(merchantId);
    this.logger.log(`Found ${customers.length} customers for merchant ${merchantId}`);
    return ApiResponse.success(
      customers,
      'Merchant customers retrieved successfully',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponseDecorator({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  @ApiResponseDecorator({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /customers/${id} - Fetching customer`);
    const customer = await this.customersService.findOne(id);
    this.logger.log(`Customer found: ${customer.firstName} ${customer.lastName}`);
    return ApiResponse.success(customer, 'Customer retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer (Admin only)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponseDecorator({ status: 200, description: 'Customer updated successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  @ApiResponseDecorator({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponseDecorator({ status: 404, description: 'Customer not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    this.logger.log(`PATCH /customers/${id} - Updating customer`);
    const customer = await this.customersService.update(id, updateCustomerDto);
    this.logger.log(`Customer updated successfully: ${id}`);
    return ApiResponse.success(customer, 'Customer updated successfully');
  }

  @Patch(':id/blacklist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Blacklist customer (Admin only)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponseDecorator({ status: 200, description: 'Customer blacklisted successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  @ApiResponseDecorator({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponseDecorator({ status: 404, description: 'Customer not found' })
  async blacklist(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    this.logger.log(`PATCH /customers/${id}/blacklist - Blacklisting customer`);
    this.logger.log(`Reason: ${reason}`);
    const customer = await this.customersService.blacklist(id, reason);
    this.logger.log(`Customer blacklisted: ${id}`);
    return ApiResponse.success(
      customer,
      'Customer blacklisted successfully',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete customer (Admin only)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponseDecorator({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  @ApiResponseDecorator({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponseDecorator({ status: 404, description: 'Customer not found' })
  @ApiResponseDecorator({
    status: 400,
    description: 'Cannot delete customer with active loans',
  })
  async remove(@Param('id') id: string) {
    this.logger.log(`DELETE /customers/${id} - Deleting customer`);
    await this.customersService.remove(id);
    this.logger.log(`Customer deleted successfully: ${id}`);
    return ApiResponse.success(null, 'Customer deleted successfully');
  }
}
