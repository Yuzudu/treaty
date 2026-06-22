import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ProjectStatus } from '@treaty/shared';

export class TransitionProjectDto {
  @IsEnum(ProjectStatus)
  to!: ProjectStatus;

  @ValidateIf(
    (dto: TransitionProjectDto) => dto.to === ProjectStatus.AWAITING_PAYMENT,
  )
  @IsInt()
  @IsPositive()
  priceCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
