import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ProjectsModule } from '../projects/projects.module';
import { SupabaseStorageService } from '../../providers/storage.service';

@Module({
  imports: [ProjectsModule],
  controllers: [AssetsController],
  providers: [AssetsService, SupabaseStorageService],
  exports: [AssetsService, SupabaseStorageService],
})
export class AssetsModule {}
