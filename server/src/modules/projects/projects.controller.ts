import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { TransitionProjectDto } from './dto/transition-project.dto';

interface AuthRequest extends Request {
  userId: string;
}

@Controller('projects')
@UseGuards(SupabaseAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.projectsService.findAll(req.userId);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.projectsService.findOne(req.userId, id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.userId, dto);
  }

  @Patch(':id/transition')
  transition(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: TransitionProjectDto,
  ) {
    return this.projectsService.transition(req.userId, id, dto);
  }
}
