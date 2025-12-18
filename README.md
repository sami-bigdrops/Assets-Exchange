# Assets Exchange

A Next.js application for asset exchange management with role-based access control.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 15.5.7
- **React**: 19.1.0
- **TypeScript**: ^5
- **Styling**: Tailwind CSS v4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives)
- **Icons**: [Lucide React](https://lucide.dev)
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: [Better Auth](https://www.better-auth.com)
- **Database**: [Neon PostgreSQL](https://neon.tech) (serverless)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **RPC**: [oRPC](https://orpc.dev) - Type-safe RPC with OpenAPI support
- **Environment Validation**: [t3-env](https://env.t3.gg) - Type-safe environment variables
- **Theme**: Dark mode support with next-themes
- **Font**: Inter (via Google Fonts)
- **Build Tool**: Turbopack
- **Architecture**: MVVM (Model-View-ViewModel)
- **Testing**: Jest with React Testing Library
- **Code Quality**: ESLint + Prettier with Husky pre-commit hooks
- **Security**: CORS, CSP headers, and robots.txt configured

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn/bun

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Create a `.env.local` file in the root directory:

   ```env
   DATABASE_URL=your_neon_postgresql_connection_string
   BETTER_AUTH_SECRET=your_secret_key
   BETTER_AUTH_URL=http://localhost:3000
   ```

   Environment variables are validated using `env.js` with Zod schemas. See the [Environment Variables](#environment-variables) section for all available variables.

3. Set up the database:

   ```bash
   # Push schema to database
   pnpm db:push

   # Or generate and run migrations
   pnpm db:generate
   pnpm db:migrate
   ```

4. Seed admin user (optional):
   ```bash
   pnpm seed:admin
   ```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The page auto-updates as you edit files in the `app` directory.

### Build

Create a production build:

```bash
pnpm build
```

### Start Production Server

Start the production server:

```bash
pnpm start
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Format code with Prettier
pnpm format

# Check formatting without changing files
pnpm format:check
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Database Commands

```bash
# Generate migration files
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Seeding

```bash
# Create admin user
pnpm seed:admin

# Create advertiser user
pnpm seed:advertiser
```

## Project Structure

```
assets-exchange/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── (admin)/              # Admin role routes
│   │   ├── (advertiser)/         # Advertiser role routes
│   │   ├── (administrator)/      # Administrator role routes
│   │   ├── dashboard/            # Dashboard page
│   │   └── layout.tsx            # Shared dashboard layout
│   ├── publisher/                # Public publisher routes (no auth)
│   ├── auth/                     # Authentication routes
│   ├── unauthorized/             # Access denied page
│   ├── globals.css               # Global styles and theme
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── global-error.tsx          # Global error boundary
├── features/                     # Feature modules (MVVM architecture)
│   ├── auth/                     # Authentication feature
│   │   ├── components/           # LoginForm, SignOutButton
│   │   ├── view-models/          # useLoginViewModel
│   │   ├── models/               # Data structures
│   │   ├── services/             # API calls
│   │   ├── hooks/                # Custom hooks
│   │   └── types/                # TypeScript types
│   ├── admin/                    # Admin feature
│   ├── advertiser/               # Advertiser feature
│   ├── administrator/            # Administrator feature
│   └── publisher/                # Publisher feature
├── components/
│   ├── _variables/               # Application variables (branding, colors, typography)
│   │   ├── variables.ts          # Variable definitions and defaults
│   │   └── index.ts              # Variable exports
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── auth.ts                   # BetterAuth server configuration
│   ├── better-auth-client.ts     # Client-side auth utilities
│   ├── db.ts                     # Database connection (Drizzle ORM)
│   ├── schema.ts                 # Database schema definitions
│   ├── get-user.ts               # Server-side user retrieval
│   ├── auth-helpers.ts           # Route protection helpers
│   ├── logger.ts                 # Server-side logging utility
│   ├── utils.ts                  # Utility functions
│   └── rpc/                      # oRPC router and client
│       ├── router.ts             # RPC router definitions
│       └── client.ts             # RPC client for frontend
├── app/api/
│   ├── auth/                     # BetterAuth API routes
│   │   ├── [...all]/route.ts     # Main auth handler
│   │   └── get-session/route.ts  # Session retrieval
│   └── rpc/                      # oRPC API routes
│       └── [...path]/route.ts    # RPC handler
├── hooks/                        # Custom React hooks
├── seed-scripts/                 # Database seeding scripts
│   ├── SeedAdmin.ts              # Admin user creation
│   └── SeedAdvertiser.ts         # Advertiser user creation
├── drizzle/                      # Database migrations
├── public/                       # Static assets
├── docs/                         # Documentation
├── components.json                # shadcn/ui configuration
├── drizzle.config.ts             # Drizzle Kit configuration
├── env.js                        # Environment variable validation (t3-env)
├── next.config.ts                # Next.js configuration
└── package.json                  # Dependencies and scripts
```

## Key Features

### Core Architecture & Framework

- **MVVM Architecture**: Clean separation of concerns with Model-View-ViewModel pattern
- **Authentication System**: Complete auth flow with BetterAuth and role-based access control
- **Database Integration**: Neon PostgreSQL with Drizzle ORM for type-safe database operations
- **Type-Safe RPC**: oRPC for end-to-end type-safe API calls with OpenAPI support
- **Environment Validation**: Type-safe environment variables with t3-env and Zod
- **Type Safety**: Full TypeScript support throughout

### User Management & Access Control

- **Role-Based Access**: Three dashboard types (Admin, Advertiser, Administrator) with protected routes
- **Public Publisher Section**: No authentication required for publisher routes
- **Login UI**: Enhanced sign-in form with custom validation, password visibility toggle, responsive design
- **Database Seeding**: Scripts to create initial admin and advertiser users

### Admin Dashboard Features

- **Dashboard Statistics**: 5 real-time statistics cards (Total Assets, New Requests, Approved Assets, Rejected Assets, Pending Approval)
- **Performance Charts**: Interactive time-series charts with 4 comparison types (Today vs Yesterday, Today vs Last Week, Current Week vs Last Week, Current Month vs Last Month)
- **Request Management**: Complete publisher request workflow with advanced filtering, sorting, search, and status management
- **Unified Workflow Model**: Single-entity approach where one creative submission flows through entire approval process (Publisher → Admin → Advertiser)
- **Approval System**: Two-stage approval workflow (Admin → Advertiser) with status transitions tracked in one record
- **Status Indicators**: Visual badges for all workflow states (New, Pending, Approved, Rejected, Sent Back)
- **Conditional Actions**: Smart button display based on status and approval stage
- **Intelligent Routing**: Sent-back items automatically appear in correct tabs for workflow management
- **Data Integrity**: Offer and creative details remain immutable throughout workflow - no duplication or inconsistency

### UI & Design

- **Component Library**: Pre-built, accessible UI components from shadcn/ui
- **Dark Mode**: Full dark mode support with theme switching
- **Form Validation**: Type-safe forms with React Hook Form and Zod, custom error messages, and real-time validation
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Application Variables**: Centralized configuration for branding, colors, typography, and assets

### Development & Quality

- **Testing Setup**: Jest configured with React Testing Library for component and unit testing
- **Code Formatting**: Prettier configured for consistent code style
- **Linting**: ESLint with import ordering, TypeScript rules, and Next.js best practices
- **Git Hooks**: Husky pre-commit hooks with lint-staged for automatic code quality checks
- **Global Error Handling**: Error boundary for unhandled errors

### Security & SEO

- **Security**: CORS configuration, Content Security Policy (CSP), and security headers
- **SEO**: robots.txt configured for search engine optimization

### Backend Integration Ready

- **Comprehensive TODOs**: Production-ready backend implementation guides with SQL queries, API specifications, and data models
- **Documentation**: Complete backend documentation including database schema, endpoints, caching strategies, and performance optimization
- **Mock Data**: Development-ready mock data for all features (to be replaced with real APIs)

## Application Roles

- **Admin**: Full dashboard access with request/response management, statistics, and analytics
  - Manage publisher requests (approve, reject, send back)
  - Monitor advertiser responses
  - View real-time statistics and performance charts
  - Two-stage approval workflow management
- **Advertiser**: Creates and manages advertising campaigns (coming soon)
- **Administrator**: System-level access and global settings (coming soon)
- **Publisher**: Public-facing section (no authentication required, coming soon)

## Git Branching Strategy

The project uses a feature-based branching strategy:

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

- **main**: Production-ready code
- **dev**: Development branch for integration
- **Feature branches**: Separate branches for each feature (auth, publisher, admin, etc.)
- **Sub-branches**: Frontend and backend work separated within each feature

## Environment Variables

Environment variables are validated using [t3-env](https://env.t3.gg) with Zod schemas. The validation configuration is in `env.js`.

### Required Variables

Add these to your `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# Authentication
BETTER_AUTH_SECRET=your_secret_key_here
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

The project uses `env.js` to validate all environment variables at runtime. Invalid or missing required variables will cause the application to fail on startup with clear error messages.

To skip validation:

```bash
SKIP_ENV_VALIDATION=true pnpm build
```

## Code Quality & Testing

### Pre-commit Hooks

The project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automatically:

- Format code with Prettier
- Fix ESLint issues
- Block commits if there are unfixable errors

This ensures consistent code quality across the project.

### Testing

Tests are written using [Jest](https://jestjs.io) and [React Testing Library](https://testing-library.com/react). Test files should be placed in:

- `__tests__/` directory
- Or use `.test.ts` / `.test.tsx` / `.spec.ts` / `.spec.tsx` file extensions

### Code Formatting

The project uses [Prettier](https://prettier.io) for consistent code formatting. Configuration is in `.prettierrc`.

### Linting

[ESLint](https://eslint.org) is configured with:

- Next.js and TypeScript rules
- Import ordering and organization
- Consistent code style rules
- Prettier integration to avoid conflicts

## Security

### CORS Configuration

CORS is configured in `middleware.ts` to allow requests from specified origins. Configure allowed origins via `CORS_ALLOWED_ORIGINS` environment variable.

### Security Headers

The application includes comprehensive security headers configured in `next.config.ts`:

- Strict Transport Security (HSTS)
- X-Frame-Options
- Content Security Policy (CSP)
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

### robots.txt

A `robots.txt` file is configured in `public/robots.txt` to control search engine crawling.

## Backend Implementation

This project includes comprehensive backend implementation guides for integrating real APIs:

### Architecture Documentation

- **[UNIFIED_MODEL_EXPLANATION.md](docs/UNIFIED_MODEL_EXPLANATION.md)** - Unified workflow model (18KB, 595 lines)
  - Why requests and responses are ONE entity, not two
  - Complete workflow visualization
  - Database schema for unified model
  - Benefits and comparison with old approach
  - **READ THIS FIRST** to understand the architecture

- **[WORKFLOW_VISUALIZATION.md](docs/WORKFLOW_VISUALIZATION.md)** - Visual workflow guide (36KB, 665 lines)
  - Complete lifecycle diagrams
  - UI display logic
  - Real-world scenario walkthrough
  - State matrix and transitions

- **[MIGRATION_SUMMARY.md](docs/MIGRATION_SUMMARY.md)** - Refactoring changes (12KB, 409 lines)
  - What changed and why
  - Files updated
  - API endpoint changes
  - Before/after comparison

### Implementation Guides

- **[Backend_Implementation_TODOs.md](docs/Backend_Implementation_TODOs.md)** - Complete backend implementation guide (41KB, 1644 lines)
  - Unified database schema design with SQL
  - 11 API endpoints with specifications (unified endpoints)
  - Authentication & authorization
  - Business logic & workflows
  - Error handling & validation
  - Performance optimization & caching
  - Security requirements
  - Testing guidelines
  - Monitoring & logging
  - Deployment checklist

- **[BACKEND_TODOS_SUMMARY.md](docs/BACKEND_TODOS_SUMMARY.md)** - Quick reference guide (7.7KB, 296 lines)
  - File-by-file TODO locations
  - Priority implementation order (4 phases, 8 weeks)
  - Critical business logic
  - Testing checklist
  - Environment setup
  - Quick start guide for backend engineers

- **[STATS_AND_CHARTS_BACKEND_TODOS.md](docs/STATS_AND_CHARTS_BACKEND_TODOS.md)** - Dashboard statistics guide (17KB, 799 lines)
  - Dashboard statistics calculations
  - Performance chart aggregations
  - SQL queries for all metrics
  - Data processing examples
  - Caching strategies
  - Database optimization

### Finding TODOs in Code

All backend TODOs are marked with `TODO: BACKEND` prefix:

```bash
# Find all backend TODOs
grep -r "TODO: BACKEND" features/ app/

# Count TODOs
grep -r "TODO: BACKEND" features/ app/ | wc -l
# Result: 29+ comprehensive TODOs
```

### Key Implementation Areas

1. **Database Schema** - 3 main tables + cache table
2. **Dashboard Statistics** - 5 metrics with trends
3. **Performance Charts** - 4 comparison types
4. **Request/Response APIs** - 11 endpoints
5. **Authentication** - JWT + role-based access
6. **Caching** - Redis with TTL strategies

## Learn More

### Framework & Core

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Backend & Database

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Better Auth Documentation](https://www.better-auth.com)

### Type Safety & APIs

- [oRPC Documentation](https://orpc.dev)
- [t3-env Documentation](https://env.t3.gg)
- [Zod Documentation](https://zod.dev)

### UI & Styling

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com)

### Development Tools

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Husky Documentation](https://typicode.github.io/husky/)
