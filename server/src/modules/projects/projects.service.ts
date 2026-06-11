import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  findAll() {
    // Query projects from DB
    return [];
  }

  findOne(id: string) {
    // Query single project from DB
    return { id };
  }

  create(_body: unknown) {
    // Create project, set status DRAFT
    return { id: 'stub' };
  }

  transition(_id: string, _to: unknown) {
    // Validate canTransition, persist new status
    return { id: _id, status: _to };
  }
}
