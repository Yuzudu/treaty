import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './modules/config/config.module';
import { DbModule } from './modules/db/db.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AssetsModule } from './modules/assets/assets.module';
import { ShareLinksModule } from './modules/share-links/share-links.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    HealthModule,
    ProjectsModule,
    AssetsModule,
    ShareLinksModule,
    OrdersModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
