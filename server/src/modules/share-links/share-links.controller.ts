import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ShareLinksService } from './share-links.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';

@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Post('projects/:projectId')
  @UseGuards(SupabaseAuthGuard)
  create(@Param('projectId') projectId: string) {
    return this.shareLinksService.create(projectId);
  }

  @Get(':token')
  findByToken(@Param('token') token: string) {
    // Public route — no auth guard
    return this.shareLinksService.findByToken(token);
  }

  @Get(':token/files')
  getFiles(@Param('token') token: string) {
    // Public — gated by project status PAID inside service
    return this.shareLinksService.getFilesForPaidProject(token);
  }
}
