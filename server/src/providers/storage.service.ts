import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SECRET_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL or SUPABASE_SECRET_KEY environment variables are missing',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

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
      this.logger.error(
        `Failed to upload file to bucket ${bucketName}: ${error.message}`,
      );
      throw new Error(`Upload failed: ${error.message}`);
    }

    this.logger.log(`Successfully uploaded file to ${bucketName}/${path}`);
    return data.path;
  }

  getPublicUrl(bucketName: string, path: string): string {
    const { data } = this.supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  }

  async createSignedUrl(bucketName: string, path: string, expiresIn: number, download = false): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn, { download });
    if (error || !data?.signedUrl) {
      throw new Error(`Signed URL creation failed: ${error?.message ?? 'unknown'}`);
    }
    return data.signedUrl;
  }

  async deleteFile(bucketName: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucketName).remove([path]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  async downloadFile(bucketName: string, path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .download(path);

    if (error) {
      this.logger.error(
        `Failed to download file from bucket ${bucketName}/${path}: ${error.message}`,
      );
      throw new Error(`Download failed: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
