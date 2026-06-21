import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ShareLinksModule } from '../share-links/share-links.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ShareLinksModule, OrdersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
