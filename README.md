# Treaty

Secure file-handover platform for freelance creatives.

## Stack

- **Client** (`client/`): Next.js 15, Tailwind CSS v4, shadcn/ui, TanStack Query
- **Server** (`server/`): NestJS 11, Drizzle ORM, PostgreSQL
- **Shared** (`packages/shared/`): `@treaty/shared` — ProjectStatus enum + transition logic

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in values
pnpm dev               # boots client on :3000, server on :4000
```

## Other commands

```bash
pnpm build      # production build all workspaces
pnpm typecheck  # type-check all workspaces
pnpm lint       # lint all workspaces
```