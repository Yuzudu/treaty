import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { AssetsService } from '../assets/assets.service';
import { OrdersService } from '../orders/orders.service';
import { ProjectsService } from '../projects/projects.service';
import { ShareLinksService } from '../share-links/share-links.service';

@Injectable()
export class McpService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly orders: OrdersService,
    private readonly assets: AssetsService,
    private readonly shareLinks: ShareLinksService,
  ) {}

  private async callTool(
    fn: () => unknown,
  ): Promise<{ content: [{ type: 'text'; text: string }]; isError?: boolean }> {
    try {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(await fn()) }],
      };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }

  async handleRequest(
    req: Request,
    res: Response,
    body?: unknown,
  ): Promise<void> {
    const server = new McpServer({ name: 'treaty', version: '1.0.0' });

    server.tool('list_projects', 'List all projects', {}, () =>
      this.callTool(() => this.projects.findAll()),
    );

    server.tool(
      'get_project',
      'Get a project by ID',
      { id: z.string() },
      ({ id }) => this.callTool(() => this.projects.findOne(id)),
    );

    server.tool(
      'create_project',
      'Create a new project',
      { body: z.record(z.string(), z.unknown()) },
      ({ body }) => this.callTool(() => this.projects.create(body)),
    );

    server.tool(
      'transition_project',
      'Transition a project to a new status',
      { id: z.string(), to: z.string() },
      ({ id, to }) => this.callTool(() => this.projects.transition(id, to)),
    );

    server.tool(
      'create_checkout',
      'Create a Stripe checkout session for a project',
      { projectId: z.string() },
      ({ projectId }) =>
        this.callTool(() => this.orders.createCheckout(projectId)),
    );

    server.tool(
      'get_order',
      'Get an order by ID',
      { id: z.string() },
      ({ id }) => this.callTool(() => this.orders.findOne(id)),
    );

    server.tool(
      'list_assets',
      'List all assets for a project',
      { projectId: z.string() },
      ({ projectId }) => this.callTool(() => this.assets.findAll(projectId)),
    );

    server.tool(
      'create_share_link',
      'Create a share link for a project',
      { projectId: z.string() },
      ({ projectId }) => this.callTool(() => this.shareLinks.create(projectId)),
    );

    server.tool(
      'get_share_link',
      'Look up a project by share link token',
      { token: z.string() },
      ({ token }) => this.callTool(() => this.shareLinks.findByToken(token)),
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }
}
