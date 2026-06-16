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

    server.tool(
      'list_projects',
      'List all projects for a user',
      { userId: z.string() },
      ({ userId }) => this.callTool(() => this.projects.findAll(userId)),
    );

    server.tool(
      'get_project',
      'Get a project by ID',
      { userId: z.string(), id: z.string() },
      ({ userId, id }) =>
        this.callTool(() => this.projects.findOne(userId, id)),
    );

    server.tool(
      'create_project',
      'Create a new project',
      { userId: z.string(), title: z.string() },
      ({ userId, title }) =>
        this.callTool(() => this.projects.create(userId, { title })),
    );

    server.tool(
      'transition_project',
      'Transition a project to a new status',
      { userId: z.string(), id: z.string(), to: z.string() },
      ({ userId, id, to }) =>
        this.callTool(() =>
          this.projects.transition(userId, id, { to } as any),
        ),
    );

    server.tool(
      'create_checkout',
      'Create a Xendit checkout session for a project via its share-link token',
      { token: z.string() },
      ({ token }) =>
        this.callTool(() => this.orders.createCheckoutFromShareToken(token)),
    );

    server.tool(
      'get_order',
      'Get an order by ID, scoped to a user',
      { userId: z.string(), id: z.string() },
      ({ userId, id }) => this.callTool(() => this.orders.findOne(userId, id)),
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
