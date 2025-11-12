# Personalization Page Implementation

## Overview
Created a scalable, maintainable, production-level personalization page for the admin portal using a modular approach. The page allows administrators to customize branding elements including logos, colors, and button styles. All personalization settings are tenant-specific and automatically applied across the admin portal, publisher portal, and client portal for each tenant.

## Architecture

### Modular Component Structure
The implementation follows a modular approach with separate files for each purpose:

```
apps/admin/
├── components/
│   └── personalization/
│       ├── two-column-layout.tsx      # Layout component for two-column structure
│       ├── color-input.tsx            # Reusable color picker component
│       ├── logo-upload.tsx            # Logo upload component with preview
│       ├── logo-section.tsx           # Logo customization section
│       ├── color-section.tsx          # Color scheme customization section
│       ├── button-section.tsx         # Button color customization section
│       └── personalization-form.tsx   # Main form component integrating all sections
└── app/
    └── [tenant]/
        └── personalization/
            └── page.tsx               # Main page component
```

## Components

### 1. TwoColumnLayout (`two-column-layout.tsx`)
- Provides a responsive two-column grid layout
- Left column displays the personalization form
- Right column is reserved for future features (currently shows placeholder)
- Responsive design that stacks on smaller screens

### 2. ColorInput (`color-input.tsx`)
- Reusable color input component with both text input and color picker
- Displays color preview next to the input
- Supports hex color codes
- Includes label and optional description

### 3. LogoUpload (`logo-upload.tsx`)
- Handles logo file uploads
- Provides image preview
- Supports image removal
- Accepts common image formats (PNG, JPG, SVG, ICO)
- Converts uploaded images to base64 for storage
- Uses unique IDs for each instance (via React useId hook) to support multiple upload fields

### 4. LogoSection (`logo-section.tsx`)
- Card-based section for logo and icon customization
- Uses Shadcn Card components
- Integrates multiple LogoUpload components for:
  - Company Logo (main brand logo)
  - Favicon (browser tab icon)
  - Secondary Logo (icon-only, for mobile apps and compact spaces)
- Organized with separators for visual hierarchy
- Includes helpful descriptions and recommendations for each upload type

### 5. ColorSection (`color-section.tsx`)
- Manages base colors (background, foreground)
- Manages primary colors (primary, secondary)
- Manages UI colors (muted, accent)
- Organized with separators for better visual hierarchy
- Uses ColorInput components for each color field

### 6. ButtonSection (`button-section.tsx`)
- Customizes button colors:
  - Primary button (background and text)
  - Secondary button (background and text)
  - Destructive button (background and text)
- Organized with separators
- Uses ColorInput components

### 7. PersonalizationForm (`personalization-form.tsx`)
- Main form component that integrates all sections
- Manages form state using React useState
- Handles three logo uploads:
  - `logo`: Company logo
  - `favicon`: Favicon icon
  - `secondaryLogo`: Secondary icon-only logo
- Provides default color values
- Handles form submission
- Includes Save and Reset buttons

### 8. PersonalizationPage (`page.tsx`)
- Main page component
- Displays page title and description
- Integrates TwoColumnLayout and PersonalizationForm
- Fetches existing personalization settings from API
- Handles form submission and saves to database
- Shows success/error messages after save

### 9. AppSidebar (`app-sidebar.tsx`)
- Updated to use personalized settings
- Shows full company logo when sidebar is expanded
- Shows secondary logo (icon) when sidebar is collapsed
- Applies personalized colors via CSS custom properties
- Dynamically updates based on tenant personalization settings

### 10. Favicon Component (`favicon.tsx` & `favicon-provider.tsx`)
- Dynamically updates browser favicon based on tenant settings
- Automatically injects favicon into document head
- Updates when personalization settings change

## Features

### Color Customization
- Background color
- Foreground color
- Primary color
- Secondary color
- Muted color
- Accent color

### Button Customization
- Primary button background and text color
- Secondary button background and text color
- Destructive button background and text color

### Logo & Icon Management
- **Company Logo**: Main brand logo upload with preview
  - Recommended size: 200x50px or larger
  - Max file size: 2MB
  - Formats: PNG, JPG, SVG
- **Favicon**: Browser tab icon upload
  - Recommended size: 32x32px or 16x16px
  - Max file size: 100KB
  - Formats: ICO, PNG
- **Secondary Logo**: Icon-only logo for mobile apps and compact spaces
  - Recommended size: 512x512px
  - Max file size: 2MB
  - Formats: PNG, JPG, SVG
- All uploads support preview and removal
- Images are converted to base64 for storage

## Technology Stack

### Shadcn UI Components Used
- `Card` - For section containers
- `Button` - For actions
- `Input` - For text and color inputs
- `Label` - For form labels
- `Separator` - For visual section separation

### Dependencies
- React 19.1.1
- Next.js 15.4.5
- Shadcn UI components from `@workspace/ui`
- Lucide React icons

## Code Quality

### Best Practices Implemented
1. **Modular Architecture**: Each component has a single responsibility
2. **Reusability**: Components like ColorInput and LogoUpload are reusable
3. **Type Safety**: Full TypeScript implementation with proper interfaces
4. **Accessibility**: Proper labels and form structure
5. **Responsive Design**: Mobile-friendly layout
6. **Clean Code**: No unnecessary comments, clear naming conventions

### File Organization
- Components are organized in a dedicated `personalization` folder
- Each component is in its own file
- Clear separation of concerns
- Easy to extend and maintain

## Future Enhancements

### Right Column (Reserved)
The right column is currently showing a placeholder. Future features could include:
- Live preview of changes
- Theme preview
- Export/import configuration
- Preset templates

### Additional Customization Options
- Font customization
- Border radius settings
- Spacing configurations
- Component-specific styling
- Animation preferences

## Database Schema

### Tenants Table
Stores tenant information:
- `id` (UUID, primary key)
- `slug` (text, unique) - Tenant identifier from URL (e.g., "bigdropsmg")
- `name` (text) - Display name
- `created_at`, `updated_at` (timestamps)

### Personalizations Table
Stores personalization settings per tenant:
- `id` (UUID, primary key)
- `tenant_id` (UUID, foreign key to tenants) - Links to tenant
- `logo` (text) - Base64 encoded company logo
- `favicon` (text) - Base64 encoded favicon
- `secondary_logo` (text) - Base64 encoded icon-only logo
- `colors` (JSONB) - Color scheme object
- `button_colors` (JSONB) - Button color scheme object
- `is_active` (boolean) - Whether settings are active
- `created_at`, `updated_at` (timestamps)

## API Routes

### GET `/api/personalization/[tenant]`
Fetches personalization settings for a tenant.

**Response:**
```json
{
  "logo": "data:image/png;base64,...",
  "favicon": "data:image/png;base64,...",
  "secondaryLogo": "data:image/png;base64,...",
  "colors": {
    "background": "#ffffff",
    "foreground": "#000000",
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "muted": "#f3f4f6",
    "accent": "#10b981"
  },
  "buttonColors": {
    "primaryButton": "#3b82f6",
    "primaryButtonText": "#ffffff",
    "secondaryButton": "#e5e7eb",
    "secondaryButtonText": "#000000",
    "destructiveButton": "#ef4444",
    "destructiveButtonText": "#ffffff"
  }
}
```

### POST `/api/personalization/[tenant]`
Saves or updates personalization settings for a tenant.

**Request Body:** Same structure as GET response

**Response:**
```json
{
  "success": true
}
```

## Hooks & Utilities

### `usePersonalization(tenant: string)`
Custom React hook that fetches personalization settings for a tenant.

**Returns:**
- `settings`: PersonalizationSettings | null
- `loading`: boolean

### `getPersonalizationByTenantSlug(tenantSlug: string)`
Server-side utility function to fetch personalization settings from database.

## Sidebar Integration

The sidebar automatically applies personalization settings:

### Logo Display Logic
- **When Expanded**: Shows full company logo (`logo`)
- **When Collapsed**: Shows secondary logo/icon (`secondaryLogo`)
- **Fallback**: Shows default Home icon if no logo is set

### Color Application
Personalized colors are applied via CSS custom properties:
- `--sidebar-primary`: Primary color
- `--sidebar-primary-foreground`: Text color on primary
- `--sidebar-accent`: Accent color
- `--sidebar-accent-foreground`: Text color on accent
- `--sidebar-border`: Border color (uses muted color)
- `--sidebar-background`: Background color
- `--sidebar-foreground`: Text color

## Tenant-Specific Personalization

Personalization settings are scoped per tenant. Each tenant can have their own:
- Logos (company, favicon, secondary)
- Color schemes
- Button colors

Settings are automatically applied to:
- Admin portal: `admin.assetsexchange.net/[tenant]`
- Publisher portal: `[tenant].assetsexchange.net`
- Client portal: `[tenant].assetsexchange.net/client`

## Usage

The personalization page is accessible at:
```
/[tenant]/personalization
```

### Saving Settings
1. Configure logos, colors, and button colors
2. Click "Save Changes"
3. Settings are saved to database
4. Page refreshes to apply changes
5. Sidebar and favicon update automatically

### Resetting Settings
Click "Reset" to revert form to last saved values (does not clear database).

## Migration

To create the database tables, run:
```bash
cd packages/db
pnpm db:generate
pnpm db:push
```

This will create the `tenants` and `personalizations` tables in your database.

