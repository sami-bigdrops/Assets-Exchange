# Development Documentation

## Overview

This document provides development guidelines for the Assets Exchange project. The project uses Next.js 15 with MVVM architecture and role-based access control.

## Architecture

### MVVM Pattern

The project follows the Model-View-ViewModel (MVVM) architecture:

- **Model**: Data structures and business logic (`features/*/models/`)
- **View**: UI components (`features/*/components/`)
- **ViewModel**: Business logic and state management (`features/*/view-models/`)
- **Services**: API calls and external services (`features/*/services/`)

### Project Structure

```
assets-exchange/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Protected routes
│   │   ├── (admin)/              # Admin dashboard
│   │   ├── (advertiser)/         # Advertiser dashboard
│   │   ├── (administrator)/      # Administrator dashboard
│   │   ├── dashboard/            # Dashboard page
│   │   └── layout.tsx            # Shared dashboard layout
│   ├── publisher/                # Public routes (no auth)
│   ├── auth/                     # Authentication pages
│   ├── unauthorized/             # Access denied page
│   ├── layout.tsx                # Root layout
│   └── global-error.tsx          # Global error boundary
│
├── features/                     # Feature modules (MVVM)
│   ├── auth/
│   │   ├── components/           # View components
│   │   ├── view-models/           # Business logic
│   │   ├── models/                # Data structures
│   │   ├── services/              # API calls
│   │   ├── hooks/                 # Custom hooks
│   │   └── types/                 # TypeScript types
│   ├── admin/                    # Admin feature
│   ├── advertiser/               # Advertiser feature
│   ├── administrator/             # Administrator feature
│   └── publisher/                # Publisher feature
│
├── components/
│   ├── _variables/               # Application variables (branding, colors, typography)
│   │   ├── variables.ts          # Variable definitions and defaults
│   │   └── index.ts              # Variable exports
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── auth.ts                   # BetterAuth server configuration
│   ├── better-auth-client.ts     # Client-side auth utilities
│   ├── db.ts                     # Database connection (Drizzle)
│   ├── schema.ts                 # Database schema definitions
│   ├── get-user.ts               # Server-side user retrieval
│   ├── auth-helpers.ts           # Route protection helpers
│   ├── logger.ts                 # Server-side logging utility
│   ├── utils.ts                  # Utility functions
│   └── rpc/                      # oRPC router and client
│       ├── router.ts             # RPC router definitions
│       └── client.ts             # RPC client for frontend
│
├── app/api/
│   ├── auth/                     # BetterAuth API routes
│   │   ├── [...all]/route.ts     # Main auth handler
│   │   └── get-session/route.ts  # Session retrieval
│   └── rpc/                      # oRPC API routes
│       └── [...path]/route.ts    # RPC handler
│
├── seed-scripts/                 # Database seeding scripts
│   ├── SeedAdmin.ts              # Admin user creation
│   └── SeedAdvertiser.ts         # Advertiser user creation
│
├── hooks/                        # Global hooks
├── public/                       # Static assets
├── components.json               # shadcn/ui configuration
├── drizzle.config.ts             # Drizzle Kit configuration
├── env.js                        # Environment variable validation
├── next.config.ts                # Next.js configuration
└── package.json                  # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm/yarn

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Create `.env.local` file:

   ```env
   DATABASE_URL=your_neon_postgresql_connection_string
   BETTER_AUTH_SECRET=your_secret_key
   BETTER_AUTH_URL=http://localhost:3000
   ```

   Environment variables are validated using `env.js` with Zod schemas. See the [Environment Variables](#environment-variables) section for all available variables.

3. Set up database:

   ```bash
   # Push schema to database
   pnpm db:push
   ```

4. Seed admin user (optional):

   ```bash
   pnpm seed:admin
   ```

5. Start development server:

   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Technology Stack

- **Next.js 15.5.7**: React framework
- **React 19.1.0**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS v4**: Styling
- **shadcn/ui**: UI components
- **Better Auth**: Authentication system
- **Neon PostgreSQL**: Serverless database
- **Drizzle ORM**: Type-safe database queries
- **oRPC**: Type-safe RPC with OpenAPI support
- **t3-env**: Type-safe environment variable validation
- **React Hook Form + Zod**: Form validation
- **Jest**: Testing framework
- **React Testing Library**: Component testing utilities
- **Prettier**: Code formatter
- **ESLint**: Code linter with Next.js and TypeScript rules
- **Husky**: Git hooks manager
- **lint-staged**: Run linters on staged files

## Routing Structure

### Public Routes

- `/` - Landing page
- `/publisher/*` - Publisher section (no authentication)

### Authentication Routes

- `/auth` - Login page with sign-in form
- `/unauthorized` - Access denied page

### Protected Dashboard Routes

All dashboard routes require authentication and redirect based on user role:

- `/dashboard` - Role-based dashboard (Admin/Advertiser/Administrator)
- `/dashboard/*` - Role-specific routes

**Route Groups:**

- `(admin)` - Admin-only routes
- `(advertiser)` - Advertiser-only routes
- `(administrator)` - Administrator-only routes

## Feature Development

### Creating a New Feature

1. Create feature folder in `features/`:

   ```
   features/my-feature/
   ├── components/
   ├── view-models/
   ├── models/
   ├── services/
   ├── hooks/
   ├── types/
   └── index.ts
   ```

2. Create components in `components/` (View layer)

3. Create view models in `view-models/` (Business logic)

4. Create models in `models/` (Data structures)

5. Create services in `services/` (API calls)

### Example Feature Structure

```typescript
// features/auth/components/LoginForm.tsx (View)
"use client";
import { useLoginViewModel } from "../view-models/useLoginViewModel";

export function LoginForm() {
  const { handleLogin, isLoading } = useLoginViewModel();
  // UI implementation
}

// features/auth/view-models/useLoginViewModel.ts (ViewModel)
export function useLoginViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const authService = useAuthService();

  const handleLogin = async (credentials) => {
    // Business logic
  };

  return { handleLogin, isLoading };
}

// features/auth/services/auth.service.ts (Service)
export async function login(credentials) {
  // API call
}
```

## Code Style

### Naming Conventions

- **Components**: PascalCase (`LoginForm.tsx`)
- **Hooks**: camelCase starting with "use" (`useAuth.ts`)
- **Functions**: camelCase (`handleLogin`)
- **Types**: PascalCase (`UserRole`)
- **Files**: Match the export name

### Component Structure

```typescript
import { Component } from "@/components/ui/component";

export default function MyComponent() {
  return <div>Content</div>;
}
```

### Path Aliases

- `@/components` - UI components and variables
- `@/lib` - Utilities
- `@/hooks` - Hooks
- `@/features` - Feature modules

## Styling

### Tailwind CSS

Use Tailwind utility classes for styling:

```typescript
<div className="flex items-center justify-center p-4">
  Content
</div>
```

### Conditional Classes

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-class", condition && "conditional-class")} />
```

### Theme Variables

Use CSS variables for colors:

```typescript
<div className="bg-background text-foreground">
  Content
</div>
```

### Application Variables

The project uses a centralized variable system for branding, colors, typography, and assets located in `components/_variables/`:

**Structure:**

- `variables.ts` - Defines `AppVariables` interface and `defaultVariables`
- `index.ts` - Exports variables

**Usage:**

```typescript
import { getVariables } from "@/components/_variables/variables";

const variables = getVariables();

// Access branding
const appName = variables.branding.appName;
const companyName = variables.branding.companyName;

// Access colors
const primaryColor = variables.colors.titleColor;
const backgroundColor = variables.colors.background;

// Access assets
const logoPath = variables.logo.path;
const faviconPath = variables.favicon.path;

// Access typography
const fontFamily = variables.typography.fontFamily;
```

**Variable Categories:**

1. **Logo & Favicon**: Paths and alt text for branding assets
2. **Colors**: Complete color palette including:
   - Background colors
   - Input colors (background, text, border, focus, error, disabled)
   - Button colors (default, outline, disabled, hover)
   - Text colors (title, label, description)
3. **Branding**: App name and company name
4. **Typography**: Font families for body and headings

**Customization:**

To customize variables for different deployments or tenants, modify the `defaultVariables` object in `variables.ts` or implement a loader function that returns different variables based on environment or tenant configuration.

## Authentication

### Better Auth Setup

The project uses Better Auth with Neon PostgreSQL for authentication:

- **Server Configuration**: `lib/auth.ts` - BetterAuth server setup with Drizzle adapter
- **Client Configuration**: `lib/better-auth-client.ts` - React hooks for client-side auth
- **API Routes**: `app/api/auth/[...all]/route.ts` - Handles all auth endpoints
- **Session Endpoint**: `app/api/auth/get-session/route.ts` - Get current session

### Database Schema

Authentication uses four main tables:

- `user` - User accounts with role field
- `session` - Active user sessions
- `account` - Authentication accounts (email/password, OAuth)
- `verification` - Email verification tokens

### User Roles

User roles determine dashboard access:

- **admin** - Admin dashboard access
- **advertiser** - Advertiser dashboard access
- **administrator** - Administrator dashboard access

### Authentication Helpers

**Server-side:**

```typescript
import { getCurrentUser } from "@/lib/get-user";
import { requireAuth, requireRole } from "@/lib/auth-helpers";

// Get current user
const user = await getCurrentUser();

// Require authentication
const user = await requireAuth();

// Require specific role
const user = await requireRole("admin");
```

**Client-side:**

```typescript
import { useSession, signIn, signOut } from "@/lib/better-auth-client";

// Get session
const { data: session } = useSession();

// Sign in
await signIn.email({ email, password });

// Sign out
await signOut();
```

### Role-Based Access

Each dashboard route group has its own layout that checks user role:

```typescript
// app/(dashboard)/(admin)/layout.tsx
import { requireRole } from "@/lib/auth-helpers";

export default async function AdminLayout({ children }) {
  await requireRole("admin");
  return <div>{children}</div>;
}
```

### Login Form

The login form is built with MVVM architecture:

- **View**: `features/auth/components/LoginForm.tsx`
- **ViewModel**: `features/auth/view-models/useLoginViewModel.ts`
- **Types**: `features/auth/types/auth.types.ts`

After successful login, users are redirected to `/dashboard` which displays role-based content.

## Forms

### React Hook Form + Zod

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

## Best Practices

### Performance

1. Use Server Components by default
2. Mark Client Components with `"use client"` only when needed
3. Use dynamic imports for code splitting
4. Optimize images with `next/image`

### Code Organization

1. Keep features self-contained
2. Share code through `lib/` or `components/`
3. Use TypeScript for type safety
4. Write clear, descriptive names

### Error Handling

1. Use try-catch for async operations
2. Provide meaningful error messages
3. Handle loading and error states in UI
4. Global error boundary (`app/global-error.tsx`) catches unhandled errors

## Development Workflow

### Git Branching Strategy

The project uses a feature-based branching strategy with frontend/backend separation:

```
main
└── dev
    ├── auth
    │   ├── auth-frontend
    │   └── auth-backend
    ├── publisher
    │   ├── publisher-frontend
    │   └── publisher-backend
    ├── admin
    │   ├── admin-frontend
    │   └── admin-backend
    ├── advertiser
    │   ├── advertiser-frontend
    │   └── advertiser-backend
    └── administrator
        ├── administrator-frontend
        └── administrator-backend
```

**Branch Structure:**

- **main**: Production-ready code
- **dev**: Development integration branch
- **Feature branches**: One branch per feature (auth, publisher, admin, advertiser, administrator)
- **Sub-branches**: Frontend and backend work separated within each feature

### Working with Branches

**Switch to a branch:**

```bash
git checkout dev
git checkout auth
git checkout auth-frontend
```

**Create a new branch:**

```bash
git checkout dev
git checkout -b new-feature
```

**See all branches:**

```bash
git branch
```

**Merge workflow example:**

```bash
# Work on frontend
git checkout auth-frontend
# ... make changes and commit ...

# Work on backend
git checkout auth-backend
# ... make changes and commit ...

# Merge into feature branch
git checkout auth
git merge auth-frontend
git merge auth-backend

# Merge feature into dev
git checkout dev
git merge auth
```

### Running Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Code Quality
pnpm lint           # Check for linting errors
pnpm lint:fix       # Fix linting issues automatically
pnpm format         # Format all files with Prettier
pnpm format:check   # Check formatting without changing files

# Testing
pnpm test           # Run all tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage report

# Database
pnpm db:generate    # Generate migration files
pnpm db:push        # Push schema to database
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Drizzle Studio

# Seeding
pnpm seed:admin     # Create admin user
pnpm seed:advertiser # Create advertiser user
```

### Before Committing

1. Run `pnpm lint` to check for errors
2. Run `pnpm format` to ensure consistent formatting
3. Run `pnpm test` to verify tests pass
4. Ensure TypeScript compiles (`pnpm build`)
5. Check responsive design
6. Make sure you're on the correct branch

**Note**: Pre-commit hooks will automatically format and lint your code before commits. If there are unfixable errors, the commit will be blocked.

## Database

### Schema Management

The project uses Drizzle ORM with Neon PostgreSQL:

- **Schema Definition**: `lib/schema.ts` - All table definitions
- **Connection**: `lib/db.ts` - Database connection setup
- **Migrations**: `drizzle/` - Generated migration files

### Database Operations

```bash
# Generate migration from schema changes
pnpm db:generate

# Push schema directly to database (development)
pnpm db:push

# Run migrations (production)
pnpm db:migrate

# Open database GUI
pnpm db:studio
```

### Seeding Users

Create initial users for testing:

```bash
# Create admin user
pnpm seed:admin

# Create advertiser user
pnpm seed:advertiser
```

Customize credentials via environment variables:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourPassword123
ADMIN_NAME=Your Name
```

## Environment Variables

Environment variables are validated using [t3-env](https://env.t3.gg) with Zod schemas. The validation configuration is in `env.js` at the project root.

### Required Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# Authentication
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000
```

### Optional Variables

```env
# For seeding users
ADMIN_EMAIL=admin@assets-exchange.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Admin User
ADVERTISER_EMAIL=advertiser@assets-exchange.com
ADVERTISER_PASSWORD=Advertiser@123
ADVERTISER_NAME=Advertiser User

# Client-side (NEXT_PUBLIC_*)
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CORS Configuration (comma-separated list of allowed origins)
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Environment Validation

The project uses `env.js` to validate all environment variables at runtime:

- **Server variables**: Validated on server-side (DATABASE_URL, BETTER_AUTH_SECRET, etc.)
- **Client variables**: Validated for client-side use (NEXT*PUBLIC*\*)
- **Type safety**: Full TypeScript support with Zod schemas
- **Runtime validation**: Invalid or missing required variables cause startup failures with clear error messages

To skip validation (e.g., in CI):

```bash
SKIP_ENV_VALIDATION=true pnpm build
```

## oRPC (Type-Safe RPC)

The project uses [oRPC](https://orpc.dev) for type-safe RPC calls with end-to-end type safety.

### Router Setup

RPC procedures are defined in `lib/rpc/router.ts`:

```typescript
import { os } from "@orpc/server";
import { z } from "zod";

export const health = os
  .output(z.object({ status: z.string(), timestamp: z.string() }))
  .handler(async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

export const router = { health };
```

### Client Usage

Use the RPC client in client components:

```typescript
import { rpc } from "@/lib/rpc/client";

const result = await rpc.health();
```

### API Route

RPC requests are handled at `/api/rpc/*` via `app/api/rpc/[...path]/route.ts`.

## Logging

### Logger Utility

The project includes a simple server-side logging utility located in `lib/logger.ts`. The logger is marked as `server-only` to prevent client-side bundling.

**Available Loggers:**

- `logger.app` - Application-level logging
- `logger.api` - API route logging
- `logger.db` - Database operation logging
- `logger.auth` - Authentication logging
- `logger.rpc` - RPC handler logging

**Usage:**

```typescript
import { logger } from "@/lib/logger";

// Info logging
logger.app.info("Application started");
logger.api.info("Request received", { path: "/api/users" });

// Success logging
logger.app.success("Operation completed");
logger.db.success("Query executed", { rows: 10 });

// Warning logging
logger.app.warn("Rate limit approaching");
logger.auth.warn("Failed login attempt", { email });

// Error logging
logger.app.error("Error occurred", error);
logger.db.error("Connection failed", error);

// Debug logging (only in development)
logger.app.debug("Debug information", { data: {...} });
```

**Features:**

- Simple console-based implementation (no external dependencies)
- Tagged logging for easy filtering (`[APP]`, `[API]`, `[DB]`, etc.)
- Server-only (marked with `server-only` package)
- Uses native `console.log`, `console.warn`, and `console.error`
- Debug logging only enabled in development mode

**Note**: The logger uses native console methods and is safe for server-side use only. It will not be bundled for the client.

## Testing

### Jest Configuration

The project uses [Jest](https://jestjs.io) for testing with the following setup:

- **Configuration**: `jest.config.js` - Jest configuration with Next.js integration
- **Setup File**: `jest.setup.js` - Test environment setup
- **Test Environment**: jsdom for React component testing
- **Path Aliases**: Supports `@/` and `@/features/*` path aliases

### Writing Tests

Test files should be placed in:

- `__tests__/` directory, or
- Use `.test.ts` / `.test.tsx` / `.spec.ts` / `.spec.tsx` extensions

Example test:

```typescript
import { render, screen } from "@testing-library/react";
import { MyComponent } from "@/components/MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Code Quality

### Prettier

[Prettier](https://prettier.io) is configured for consistent code formatting:

- **Configuration**: `.prettierrc` - Prettier rules
- **Ignore File**: `.prettierignore` - Files to skip formatting

Key formatting rules:

- Semicolons enabled
- Double quotes
- 80 character line width
- 2 space indentation
- Trailing commas (ES5 compatible)

### ESLint

[ESLint](https://eslint.org) is configured with comprehensive rules:

- **Configuration**: `eslint.config.mjs` - ESLint rules
- **Integration**: Works with Prettier via `eslint-config-prettier`

Key rules:

- Import ordering and organization
- TypeScript best practices
- React and Next.js rules
- Consistent code style
- Unused variable detection (allows `_` prefix)

### Pre-commit Hooks

[Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) are configured to:

1. Format staged files with Prettier
2. Fix ESLint issues automatically
3. Block commits if there are unfixable errors

**Configuration**:

- `.husky/pre-commit` - Pre-commit hook script
- `package.json` - lint-staged configuration

### Code Style Guidelines

1. **Import Organization**: Imports are automatically sorted:
   - Built-in modules first
   - External packages
   - Internal modules (`@/`)
   - Relative imports
   - Empty lines between groups

2. **Type Imports**: Use `import type` for type-only imports:

   ```typescript
   import type { User } from "@/types";
   ```

3. **Unused Variables**: Prefix with `_` if intentionally unused:

   ```typescript
   const [_unused, used] = someFunction();
   ```

4. **Console Statements**: Use logger instead of `console.log`:

   ```typescript
   import { logger } from "@/lib/logger";
   logger.app.info("Message");
   logger.app.success("Operation completed");
   logger.app.warn("Warning message");
   logger.app.error("Error occurred", error);
   ```

   **Note**: The logger is a simple console-based implementation (server-only) that provides structured logging with tags. It uses native `console` methods and is safe for server-side use only.

## Security

### CORS Configuration

CORS (Cross-Origin Resource Sharing) is configured in `middleware.ts`:

- **Allowed Origins**: Configured via `CORS_ALLOWED_ORIGINS` environment variable
- **Credentials**: Enabled for authenticated requests
- **Methods**: GET, POST, PUT, DELETE, OPTIONS, PATCH
- **Headers**: Content-Type, Authorization, X-Requested-With

### Security Headers

Comprehensive security headers are configured in `next.config.ts`:

- **Strict-Transport-Security (HSTS)**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Content-Security-Policy (CSP)**: Restricts resource loading
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

CSP is environment-aware:

- Development: Allows `unsafe-eval` and `unsafe-inline` for Next.js
- Production: Uses `strict-dynamic` for better security

### robots.txt

Search engine crawling is controlled via `public/robots.txt`:

- Allows all user agents
- Disallows `/api/`, `/dashboard/`, `/auth/`, `/unauthorized/`
- Includes sitemap reference

## Troubleshooting

### Common Issues

1. **Port in use**: Change port with `pnpm dev -- -p 3001`
2. **Module not found**: Clear `.next` and reinstall dependencies
3. **Type errors**: Run `pnpm build` to see all errors
4. **Styling issues**: Check Tailwind classes and CSS variables
5. **Database connection error**: Verify `DATABASE_URL` in `.env.local`
6. **Auth not working**: Check `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
7. **Environment variables not loading**: Ensure `.env.local` exists and variables are set
8. **Environment validation errors**: Check `env.js` for required variables and their schemas
9. **RPC errors**: Verify the RPC router is properly configured and the client is using the correct URL
10. **Pre-commit hook not running**: Run `pnpm install` to ensure Husky is set up
11. **Linting errors on commit**: Run `pnpm lint:fix` to auto-fix issues
12. **Test failures**: Check that test files are in the correct location and Jest is configured properly
13. **CORS errors**: Verify `CORS_ALLOWED_ORIGINS` includes your domain
14. **Formatting conflicts**: Run `pnpm format` to ensure consistent formatting

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Better Auth Docs](https://www.better-auth.com)
- [Neon Docs](https://neon.tech/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [oRPC Docs](https://orpc.dev)
- [t3-env Docs](https://env.t3.gg)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [React Testing Library Docs](https://testing-library.com/react)
- [Prettier Docs](https://prettier.io/docs/en/)
- [ESLint Docs](https://eslint.org/docs/latest/)
- [Husky Docs](https://typicode.github.io/husky/)
- [lint-staged Docs](https://github.com/okonet/lint-staged)
