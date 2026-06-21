import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ShareLinksService } from './share-links.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateAnnotationDto } from './dto/create-annotation.dto';

@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Post('projects/:projectId')
  @UseGuards(SupabaseAuthGuard)
  create(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.shareLinksService.create(projectId);
  }

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.shareLinksService.findByToken(token);
  }

  @Get(':token/preview')
  getPreview(@Param('token') token: string) {
    return this.shareLinksService.getPreview(token);
  }

  @Get(':token/assets/:assetId/download')
  mintDownload(
    @Param('token') token: string,
    @Param('assetId') assetId: string,
  ) {
    return this.shareLinksService.mintDownloadUrl(token, assetId);
  }

  @Get(':token/assets/:assetId/annotations')
  getAnnotations(
    @Param('token') token: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.shareLinksService.getAnnotations(token, assetId);
  }

  @Post(':token/assets/:assetId/annotations')
  createAnnotation(
    @Param('token') token: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CreateAnnotationDto,
  ) {
    return this.shareLinksService.createAnnotation(token, assetId, dto);
  }
}
