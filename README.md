# Household Admin Dashboard

A comprehensive household management application built with Next.js, Supabase, and Google OAuth.

## Features

- 📝 **Notes**: Create and manage household notes
- ✅ **Tasks**: Track tasks with kanban-style board (To Do, In Progress, Done)
- 📅 **Calendar**: Manage household events and appointments
- ⚡ **Utilities**: Monitor utility usage (electricity, water, gas, internet)
- 💰 **Bills**: Track and manage household bills
- 📊 **Tables**: Inventory management for household items
- 🏠 **Guest Stays**: Manage guest bookings and stays

## Authentication

- **Google OAuth** only (no password-based auth)
- **Invite-based access**: Only users with valid invite codes can sign up
- **Role-based permissions**: Superadmin and Admin roles
- **Secure**: Row Level Security (RLS) enabled on all tables

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Google Cloud account (for OAuth)

### Setup

Follow the comprehensive setup guide in [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions on:

1. Configuring Google OAuth
2. Setting up Supabase database
3. Creating your superadmin account
4. Inviting additional admins

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
   ```

3. **Run database migrations**:
   - Execute SQL scripts in `scripts/` folder in order (001-005)

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Sign in and create superadmin**:
   - Visit `http://localhost:3000/auth/login`
   - Sign in with Google
   - Run `scripts/005_create_superadmin.sql` with your email

## Project Structure

```
├── app/
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin management
│   ├── notes/             # Notes module
│   ├── tasks/             # Tasks module
│   ├── calendar/          # Calendar module
│   ├── utilities/         # Utilities tracking
│   ├── bills/             # Bills management
│   ├── tables/            # Inventory management
│   └── guest-stays/       # Guest stays tracking
├── components/            # Reusable components
├── lib/
│   ├── actions/          # Server actions
│   └── supabase/         # Supabase clients
├── scripts/              # Database migration scripts
└── middleware.ts         # Auth middleware
```

## Usage

### For Superadmins

1. Sign in with Google
2. Navigate to "Manage Admins"
3. Create invite codes for family members
4. Share invite codes via email or messaging
5. Manage invites and admin users

### For Admins

1. Receive invite code from superadmin
2. Go to `/auth/signup`
3. Enter invite code
4. Sign in with Google
5. Access all dashboard features

## Electron Auto-Updates

The desktop build supports in-app auto-updates using `electron-updater`.

- Provider: GitHub Releases (`nikoBrajdic/betinapp`)
- Update checks: on app startup + periodic background checks
- UX:
  - "Update available" info popup when a new version is found
  - background download
  - "Restart and Install" popup when download completes

### Publish a Windows update

1. Bump version in `package.json` (must be higher than installed version)
2. Create and publish release artifacts:
   ```bash
   npm run electron:publish:win
   ```
3. Ensure `GH_TOKEN` is set in the environment so `electron-builder` can upload to GitHub Releases

Installed users will receive the update prompt in-app after the release is published.

## Vercel Deployment (GitHub Actions)

This repo includes a production deployment workflow at `.github/workflows/vercel-deploy.yml`.

- Triggers:
  - push to `main`
  - manual run (`workflow_dispatch`)
- Deploy method:
  - `vercel pull --environment=production`
  - `vercel deploy --prod`

### Required GitHub repository secrets

Add these in GitHub -> Settings -> Secrets and variables -> Actions:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Once these three secrets are set, deployments are ready to run automatically on pushes to `main`.

## Security

- All routes protected by authentication middleware
- Row Level Security (RLS) enabled on all database tables
- Invite codes expire after 7 days
- Single-use invite codes
- Google OAuth for secure authentication

## License

MIT

## Support

For setup help, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)
