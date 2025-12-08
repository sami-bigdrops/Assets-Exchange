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
- **Authentication**: Better Auth
- **Theme**: Dark mode support with next-themes
- **Font**: Inter (via Google Fonts)
- **Build Tool**: Turbopack
- **Architecture**: MVVM (Model-View-ViewModel)

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm/yarn/bun

### Installation

Install dependencies:

```bash
pnpm install
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
│   └── utils.ts              # Utility functions
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
├── docs/                     # Documentation
├── components.json           # shadcn/ui configuration
└── package.json              # Dependencies and scripts
```

## Key Features

- **MVVM Architecture**: Clean separation of concerns with Model-View-ViewModel pattern
- **Role-Based Access**: Three dashboard types (Admin, Advertiser, Administrator)
- **Public Publisher Section**: No authentication required for publisher routes
- **Component Library**: Pre-built, accessible UI components from shadcn/ui
- **Dark Mode**: Full dark mode support with theme switching
- **Form Validation**: Type-safe forms with React Hook Form and Zod
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript support throughout

## Application Roles

- **Admin**: Manages users, campaigns, and analytics
- **Advertiser**: Creates and manages advertising campaigns
- **Administrator**: System-level access and global settings
- **Publisher**: Public-facing section (no authentication required)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [Radix UI Documentation](https://www.radix-ui.com)
