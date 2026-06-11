import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';

@Controller('orders')
@UseGuards(SupabaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('projects/:projectId/checkout')
  createCheckout(@Param('projectId') projectId: string) {
    return this.ordersService.createCheckout(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
