# RestaurantOS

A professional restaurant management system with role-based dashboards for clients, vendors, and admins — featuring multilingual support (AR/FR/EN with RTL), dark-mode-first design with amber/orange accents, QR-code ordering, a Kanban vendor board, and admin analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/restaurant-app run dev` — run the frontend (port 19460, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing key

## Demo Credentials

- **Admin**: admin@restaurant.com / admin123
- **Vendor**: vendor@restaurant.com / admin123
- **Client**: visit `/menu/table-token-001` through `/menu/table-token-005`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, JWT auth (`jsonwebtoken`, `bcryptjs`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite, Wouter, TanStack Query, Zustand, i18next
- UI: Tailwind CSS v4, shadcn/ui components, next-themes, sonner toasts
- Charts: Recharts
- Drag & drop: @dnd-kit (category reorder, Kanban)
- QR codes: qrcode.react
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema (users, categories, dishes, tables, orders, order-items, ratings, audit-logs)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, categories, dishes, tables, orders, ratings, stats, users)
- `artifacts/restaurant-app/src/pages/` — React pages (menu, vendor, admin)
- `artifacts/restaurant-app/src/i18n/` — translations (AR/FR/EN)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → shared hooks + Zod schemas used by both client and server
- JWT stored in `localStorage` under key `token`; injected via `setAuthTokenGetter` on the api-client-react module
- `restaurant_tables` table name (avoids SQL keyword collision with `tables`)
- DB numeric columns (price, totalPrice, unitPrice) are stored as Postgres `numeric` type → parsed with `Number()` on read
- All hooks using custom `query` options require `{ query: opts as any }` pattern due to TanStack Query v5 requiring `queryKey` in `UseQueryOptions` — the generated hooks inject the key internally but the TypeScript type is strict

## Product

- **Client menu** (QR-code access): browse dishes by category, add to cart with custom notes, place orders, track order status in real-time, submit star ratings for delivered orders
- **Vendor board** (Kanban): real-time auto-refreshing order board with columns for Pending/Confirmed/Ready/Delivered; sound alerts for new orders; refuse with reason; CSV export + history by date
- **Admin panel**: menu management with drag-and-drop category reorder; dish CRUD with multilingual fields, allergens, availability toggle; table management with QR code generation; user management; analytics dashboard with revenue charts, popular dishes, peak hours, orders by status

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`, then restart both workflows
- Always run `pnpm --filter @workspace/db run push` after changing schema files before restarting API
- API routes must handle the full path including `/api` prefix (the shared proxy doesn't strip it)
- Dish prices are stored as Postgres `numeric` (string in JS) — wrap with `Number()` before arithmetic
- The `tablesTable` variable maps to the `restaurant_tables` DB table

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
