import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { OrdersModule } from '../orders/orders.module';
import { ProjectsModule } from '../projects/projects.module';
import { ShareLinksModule } from '../share-links/share-links.module';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [ProjectsModule, OrdersModule, AssetsModule, ShareLinksModule],
  controllers: [McpController],
  providers: [McpService, McpApiKeyGuard],
})
export class McpModule {}
