import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SECRET_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY environment variables are missing',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Uploads a file buffer to a specific bucket
   * @param bucketName Name of the bucket (e.g. 'public-previews' or 'private-assets')
   * @param path The path where the file will be stored in the bucket
   * @param buffer The file buffer
   * @param mimeType The file mime type
   * @returns The storage path or the public URL
   */
  async uploadFile(
    bucketName: string,
    path: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Failed to upload file to bucket ${bucketName}: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    }

    this.logger.log(`Successfully uploaded file to ${bucketName}/${path}`);
    return data.path;
  }

  /**
   * Gets a public URL for a file in a public bucket
   */
  getPublicUrl(bucketName: string, path: string): string {
    const { data } = this.supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  }
}
