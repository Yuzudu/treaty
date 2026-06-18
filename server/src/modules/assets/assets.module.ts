import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ProjectsModule } from '../projects/projects.module';
import { SupabaseStorageService } from '../../providers/storage.service';
import { WatermarkService } from '../../providers/watermark.service';

@Module({
  imports: [ProjectsModule],
  controllers: [AssetsController],
  providers: [AssetsService, SupabaseStorageService, WatermarkService],
  exports: [AssetsService, SupabaseStorageService, WatermarkService],
})
export class AssetsModule {}
