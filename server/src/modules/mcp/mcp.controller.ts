import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { McpService } from './mcp.service';

@Controller('mcp')
@UseGuards(McpApiKeyGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  async post(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    await this.mcpService.handleRequest(req, res, body);
  }

  @Get()
  async get(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.mcpService.handleRequest(req, res, undefined);
  }

  @Delete()
  async delete(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.mcpService.handleRequest(req, res, undefined);
  }
}
