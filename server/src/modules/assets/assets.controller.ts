import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';

@Controller('projects/:projectId/assets')
@UseGuards(SupabaseAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Param('projectId') projectId: string) {
    return this.assetsService.findAll(projectId);
  }

  @Post()
  upload(@Param('projectId') projectId: string, @Body() body: unknown) {
    return this.assetsService.upload(projectId, body);
  }
}
