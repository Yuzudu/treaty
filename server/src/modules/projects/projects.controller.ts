import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';

@Controller('projects')
@UseGuards(SupabaseAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.projectsService.create(body);
  }

  @Patch(':id/transition')
  transition(@Param('id') id: string, @Body() body: unknown) {
    return this.projectsService.transition(id, body);
  }
}
