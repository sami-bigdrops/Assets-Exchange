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
│   │   └── layout.tsx            # Shared dashboard layout
│   ├── publisher/                # Public routes (no auth)
│   ├── auth/                     # Authentication pages
│   └── layout.tsx                # Root layout
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
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── auth.ts                   # BetterAuth server configuration
│   ├── better-auth-client.ts     # Client-side auth utilities
│   ├── db.ts                     # Database connection (Drizzle)
│   ├── schema.ts                 # Database schema definitions
│   ├── get-user.ts               # Server-side user retrieval
│   ├── auth-helpers.ts           # Route protection helpers
│   └── utils.ts                  # Utility functions
│
├── app/api/auth/                 # BetterAuth API routes
│   ├── [...all]/route.ts         # Main auth handler
│   └── get-session/route.ts      # Session retrieval
│
├── seed-scripts/                 # Database seeding scripts
│   ├── SeedAdmin.ts              # Admin user creation
│   └── SeedAdvertiser.ts         # Advertiser user creation
│
└── hooks/                        # Global hooks
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
- **React Hook Form + Zod**: Form validation

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

- `@/components` - UI components
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

# Lint
pnpm lint

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

1. Run `pnpm lint`
2. Test your changes
3. Ensure TypeScript compiles
4. Check responsive design
5. Make sure you're on the correct branch

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

Required variables in `.env.local`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# Authentication
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000
```

Optional variables:
```env
# For seeding
ADMIN_EMAIL=admin@assets-exchange.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Admin User
```

## Troubleshooting

### Common Issues

1. **Port in use**: Change port with `pnpm dev -- -p 3001`
2. **Module not found**: Clear `.next` and reinstall dependencies
3. **Type errors**: Run `pnpm build` to see all errors
4. **Styling issues**: Check Tailwind classes and CSS variables
5. **Database connection error**: Verify `DATABASE_URL` in `.env.local`
6. **Auth not working**: Check `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
7. **Environment variables not loading**: Ensure `.env.local` exists and variables are set

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Better Auth Docs](https://www.better-auth.com)
- [Neon Docs](https://neon.tech/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
