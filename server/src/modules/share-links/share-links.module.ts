import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { SupabaseStorageService } from '../../providers/storage.service';

@Module({
  imports: [DbModule],
  controllers: [ShareLinksController],
  providers: [ShareLinksService, SupabaseStorageService],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
