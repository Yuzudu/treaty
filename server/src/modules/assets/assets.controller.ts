import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import {
  AssetsService,
  UploadedFile as UploadedFileDto,
} from './assets.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';

interface AuthRequest extends Request {
  userId: string;
}

@Controller('projects/:projectId/assets')
@UseGuards(SupabaseAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.assetsService.findAll(req.userId, projectId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: AuthRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: UploadedFileDto,
  ) {
    return this.assetsService.upload(req.userId, projectId, file);
  }

  @Delete(':assetId')
  @HttpCode(204)
  remove(
    @Req() req: AuthRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.assetsService.delete(req.userId, projectId, assetId);
  }

  @Get('annotations')
  getAllAnnotations(
    @Req() req: AuthRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.assetsService.getAllAnnotations(req.userId, projectId);
  }

  @Get(':assetId/annotations')
  getAnnotations(
    @Req() req: AuthRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.assetsService.getAnnotations(req.userId, projectId, assetId);
  }
}
