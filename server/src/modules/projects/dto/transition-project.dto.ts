import { IsEnum } from 'class-validator'
import { ProjectStatus } from '@treaty/shared'

export class TransitionProjectDto {
  @IsEnum(ProjectStatus)
  to: ProjectStatus
}
