import { IsNotEmpty, IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinatesDto {
  @IsOptional()
  coordX?: string | number;

  @IsOptional()
  coordY?: string | number;

  @IsOptional()
  boundingBox?: any;
}

export class VideoAnnotationDto {
  @IsOptional()
  timestampSeconds?: string | number;

  @IsOptional()
  duration?: string | number;
}

export class CreateAnnotationDto {
  @IsString()
  @IsNotEmpty()
  collaboratorName: string;

  @IsString()
  @IsOptional()
  commentText?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => VideoAnnotationDto)
  video?: VideoAnnotationDto;
}
