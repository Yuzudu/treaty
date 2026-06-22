import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegPath);

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);

  async watermarkImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const width = metadata.width ?? 800;
      const height = metadata.height ?? 600;

      const targetWidth = Math.min(width, 1000);
      const scaleFactor = targetWidth / width;
      const targetHeight = Math.floor(height * scaleFactor);

      const cols = 3;
      const rows = 3;
      let textElements = '';
      const fontSize = Math.max(10, Math.floor(targetWidth / 32));

      for (let r = 0; r < rows; r++) {
        const offsetFactor = r % 2 === 0 ? 0 : 0.5;
        for (let c = 0; c < cols; c++) {
          const x = Math.floor((c + 0.5 + offsetFactor) * (targetWidth / cols));
          const y = Math.floor((r + 0.5) * (targetHeight / rows));

          if (x < targetWidth - fontSize * 3) {
            textElements += `
              <text x="${x}" y="${y}" dominant-baseline="middle" text-anchor="middle" class="watermark">
                PREVIEW - DO NOT USE
              </text>
            `;
          }
        }
      }

      const svgText = `
        <svg width="${targetWidth}" height="${targetHeight}">
          <style>
            .watermark {
              fill: rgba(255, 255, 255, 0.28);
              font-family: sans-serif;
              font-size: ${fontSize}px;
              font-weight: bold;
            }
          </style>
          ${textElements}
        </svg>
      `;

      let pipeline = image.resize({ width: targetWidth });

      pipeline = pipeline.composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ]);

      const format = metadata.format;
      if (format === 'png') {
        pipeline = pipeline.png({ quality: 40, compressionLevel: 9 });
      } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality: 45 });
      } else {
        pipeline = pipeline.jpeg({ quality: 45, mozjpeg: true });
      }

      return await pipeline.toBuffer();
    } catch (error) {
      this.logger.error(
        `Failed to watermark image: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async watermarkVideo(buffer: Buffer, fileExtension = 'mp4'): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(
      tempDir,
      `input_${randomUUID()}.${fileExtension}`,
    );
    const outputPath = path.join(
      tempDir,
      `output_${randomUUID()}.${fileExtension}`,
    );

    try {
      await fs.promises.writeFile(inputPath, buffer);
    } catch (error) {
      this.logger.error(
        `Failed to write temp video input: ${(error as Error).message}`,
      );
      throw error;
    }

    return new Promise<Buffer>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(
          "drawtext=text='PREVIEW - DO NOT USE':fontcolor=white@0.3:fontsize=h/20:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black@0.2:shadowx=2:shadowy=2",
        )
        .output(outputPath)
        .on('end', () => {
          void (async () => {
            try {
              const resultBuffer = await fs.promises.readFile(outputPath);
              await Promise.all([
                fs.promises.unlink(inputPath).catch(() => {}),
                fs.promises.unlink(outputPath).catch(() => {}),
              ]);
              resolve(resultBuffer);
            } catch (err) {
              this.logger.error(
                `Failed to read temp watermarked video: ${(err as Error).message}`,
              );
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          })();
        })
        .on('error', (err: Error) => {
          this.logger.error(`FFmpeg video watermarking error: ${err.message}`);
          void Promise.all([
            fs.promises.unlink(inputPath).catch(() => {}),
            fs.promises.unlink(outputPath).catch(() => {}),
          ]).finally(() => {
            reject(err);
          });
        })
        .run();
    });
  }
}
