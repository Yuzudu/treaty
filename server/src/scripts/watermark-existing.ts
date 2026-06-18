import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WatermarkService } from '../providers/watermark.service';
import { SupabaseStorageService } from '../providers/storage.service';
import { DRIZZLE_DB, type DrizzleDB } from '../modules/db/db.module';
import { assets } from '../db/schema';
import { eq } from 'drizzle-orm';

async function bootstrap() {
  console.log('Starting retroactive watermarking script...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const db = app.get<DrizzleDB | null>(DRIZZLE_DB);
  if (!db) {
    console.error('Database connection not available.');
    await app.close();
    process.exit(1);
  }

  const watermarkService = app.get(WatermarkService);
  const storageService = app.get(SupabaseStorageService);

  try {
    const existingAssets = await db.select().from(assets);
    console.log(`Found ${existingAssets.length} assets to inspect.`);

    for (const asset of existingAssets) {
      console.log(`--------------------------------------------------`);
      console.log(`Processing Asset ID: ${asset.id}`);
      console.log(`Project ID: ${asset.projectId}`);
      console.log(`Type: ${asset.assetType}`);
      console.log(`File Path: ${asset.fileUrl}`);

      if (!asset.fileUrl) {
        console.warn(`Asset ${asset.id} has no fileUrl (clean path). Skipping.`);
        continue;
      }

      try {
        // 1. Download clean version from private-assets bucket
        console.log(`Downloading clean version from private-assets...`);
        const fileBuffer = await storageService.downloadFile('private-assets', asset.fileUrl);
        console.log(`Downloaded ${fileBuffer.length} bytes.`);

        // 2. Generate watermark
        console.log(`Generating watermark...`);
        const fileExtension = asset.fileUrl.split('.').pop() || 'jpg';
        let watermarkedBuffer: Buffer;

        if (asset.assetType === 'image') {
          watermarkedBuffer = await watermarkService.watermarkImage(fileBuffer);
        } else {
          watermarkedBuffer = await watermarkService.watermarkVideo(fileBuffer, fileExtension);
        }
        console.log(`Watermark generated. Size: ${watermarkedBuffer.length} bytes.`);

        // 3. Determine mimetype
        const ext = fileExtension.toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'mp4') mimeType = 'video/mp4';
        else if (ext === 'webm') mimeType = 'video/webm';
        else if (ext === 'mov') mimeType = 'video/quicktime';

        // 4. Upload to public-previews bucket
        console.log(`Uploading watermarked file to public-previews...`);
        const publicPath = await storageService.uploadFile(
          'public-previews',
          asset.fileUrl,
          watermarkedBuffer,
          mimeType,
        );

        // 5. Get public URL and update database
        const publicUrl = storageService.getPublicUrl('public-previews', publicPath);
        console.log(`Preview URL: ${publicUrl}`);

        await db
          .update(assets)
          .set({ watermarkedUrl: publicUrl })
          .where(eq(assets.id, asset.id));

        console.log(`Asset ${asset.id} successfully watermarked and database updated.`);
      } catch (err) {
        console.error(`Error processing asset ${asset.id}:`, (err as Error).message);
      }
    }

    console.log(`==================================================`);
    console.log('Retroactive watermarking process completed successfully.');
  } catch (error) {
    console.error('Fatal error during watermarking execution:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
