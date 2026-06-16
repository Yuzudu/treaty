import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';

interface AuthRequest extends Request {
  userId: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('connect/onboard')
  @UseGuards(SupabaseAuthGuard)
  onboard(@Req() req: AuthRequest) {
    return this.ordersService.onboardCreator(req.userId);
  }

  @Get('connect/status')
  @UseGuards(SupabaseAuthGuard)
  onboardingStatus(@Req() req: AuthRequest) {
    return this.ordersService.getOnboardingStatus(req.userId);
  }

  @Post('share/:token/checkout')
  createCheckout(@Param('token') token: string) {
    return this.ordersService.createCheckoutFromShareToken(token);
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  findOne(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(req.userId, id);
  }
}
