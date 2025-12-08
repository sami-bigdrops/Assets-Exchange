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
- **Theme**: Dark mode support with next-themes
- **Font**: Inter (via Google Fonts)
- **Build Tool**: Turbopack
- **Architecture**: MVVM (Model-View-ViewModel)

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

### Lint

Run ESLint:

```bash
pnpm lint
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
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── (admin)/          # Admin role routes
│   │   ├── (advertiser)/     # Advertiser role routes
│   │   ├── (administrator)/  # Administrator role routes
│   │   └── layout.tsx        # Shared dashboard layout
│   ├── publisher/            # Public publisher routes (no auth)
│   ├── auth/                 # Authentication routes
│   ├── globals.css           # Global styles and theme
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── features/                 # Feature modules (MVVM architecture)
│   ├── auth/                 # Authentication feature
│   ├── admin/                # Admin feature
│   ├── advertiser/          # Advertiser feature
│   ├── administrator/        # Administrator feature
│   └── publisher/            # Publisher feature
├── components/
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── auth.ts               # BetterAuth server configuration
│   ├── better-auth-client.ts  # Client-side auth utilities
│   ├── db.ts                 # Database connection (Drizzle ORM)
│   ├── schema.ts             # Database schema definitions
│   ├── get-user.ts           # Server-side user retrieval
│   ├── auth-helpers.ts       # Route protection helpers
│   └── utils.ts              # Utility functions
├── app/api/auth/             # BetterAuth API routes
├── hooks/                    # Custom React hooks
├── seed-scripts/             # Database seeding scripts
├── drizzle/                  # Database migrations
├── public/                   # Static assets
├── docs/                     # Documentation
├── components.json           # shadcn/ui configuration
├── drizzle.config.ts         # Drizzle Kit configuration
└── package.json              # Dependencies and scripts
```

## Key Features

- **MVVM Architecture**: Clean separation of concerns with Model-View-ViewModel pattern
- **Authentication System**: Complete auth flow with BetterAuth and role-based access control
- **Database Integration**: Neon PostgreSQL with Drizzle ORM for type-safe database operations
- **Role-Based Access**: Three dashboard types (Admin, Advertiser, Administrator) with protected routes
- **Public Publisher Section**: No authentication required for publisher routes
- **Login UI**: Beautiful sign-in form with error handling and loading states
- **Component Library**: Pre-built, accessible UI components from shadcn/ui
- **Dark Mode**: Full dark mode support with theme switching
- **Form Validation**: Type-safe forms with React Hook Form and Zod
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript support throughout
- **Database Seeding**: Scripts to create initial admin and advertiser users

## Application Roles

- **Admin**: Manages users, campaigns, and analytics
- **Advertiser**: Creates and manages advertising campaigns
- **Administrator**: System-level access and global settings
- **Publisher**: Public-facing section (no authentication required)

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

Required environment variables (add to `.env.local`):

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# Authentication
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# Optional: For seeding users
ADMIN_EMAIL=admin@assets-exchange.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Admin User
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [Radix UI Documentation](https://www.radix-ui.com)
