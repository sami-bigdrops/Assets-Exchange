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
│   └── utils.ts                  # Utility functions
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

2. Start development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Technology Stack

- **Next.js 15.5.7**: React framework
- **React 19.1.0**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS v4**: Styling
- **shadcn/ui**: UI components
- **Better Auth**: Authentication
- **React Hook Form + Zod**: Form validation

## Routing Structure

### Public Routes

- `/` - Landing page
- `/publisher/*` - Publisher section (no authentication)

### Authentication Routes

- `/auth/login` - Login page
- `/auth/signup` - Signup page

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

### Better Auth

The project uses Better Auth for authentication. User roles determine dashboard access:

- **Admin** → `/dashboard` (admin layout)
- **Advertiser** → `/dashboard` (advertiser layout)
- **Administrator** → `/dashboard` (administrator layout)

### Role-Based Access

Each dashboard route group has its own layout that checks user role:

```typescript
// app/(dashboard)/(admin)/layout.tsx
export default async function AdminLayout({ children }) {
  // Check if user has admin role
  // Redirect if not authorized
  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
```

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
```

### Before Committing

1. Run `pnpm lint`
2. Test your changes
3. Ensure TypeScript compiles
4. Check responsive design

## Troubleshooting

### Common Issues

1. **Port in use**: Change port with `pnpm dev -- -p 3001`
2. **Module not found**: Clear `.next` and reinstall dependencies
3. **Type errors**: Run `pnpm build` to see all errors
4. **Styling issues**: Check Tailwind classes and CSS variables

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Better Auth Docs](https://www.better-auth.com)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
