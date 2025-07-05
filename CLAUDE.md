# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Run linting:**
```bash
npm run lint
```

**Database operations:**
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:migrate     # Run migrations
npm run db:reset       # Reset database with force
```

**API testing:**
```bash
npm run test-apis      # Test API integrations
npm run verify-apis    # Verify API configurations
```

## Architecture Overview

This is a Next.js enterprise data platform that integrates with French government APIs to provide company search and analysis capabilities.

### Core Technology Stack
- **Frontend:** Next.js 14 with React 18 and Tailwind CSS
- **Backend:** Next.js API routes with Prisma ORM
- **Database:** SQLite (configured) / PostgreSQL (production)
- **Authentication:** Firebase Auth with role-based access control
- **State Management:** TanStack Query for server state

### API Integrations
The platform integrates with multiple French government APIs:
- **INSEE SIRENE API:** Company basic information (requires token)
- **INPI RNE API:** Legal registration data (requires token)
- **BODACC API:** Official publications (public)
- **Financial Ratios API:** Economic indicators (public)

All API services are centralized in `lib/api-services.js` with error handling and response formatting.

### Key Architecture Patterns

**Database Schema:**
- Companies, Documents, FinancialRatios, and Users models
- Optimized indexes for search performance
- Cascade deletion for related records

**Authentication Flow:**
- Firebase Auth integration with custom hooks (`hooks/useAuth.js`)
- Role-based access control via `components/RoleGuard.js`
- User sync API endpoint at `pages/api/auth/sync-user.js`

**API Structure:**
- Company operations: `/api/companies/[siren]/`
- Document management: `/api/documents/`
- File serving: `/api/serve-file/[...path].js`
- Test endpoints: `/api/test/`

**Component Organization:**
- Reusable UI components in `/components/`
- Custom hooks for state management in `/hooks/`
- Service layer in `/lib/` and `/services/`

### Environment Setup

Required environment variables (see `.env.example`):
- Database: `DATABASE_URL`
- Firebase: Client and Admin SDK configuration
- API Keys: `INSEE_API_TOKEN`, `INPI_API_TOKEN`

### File Upload System
- Upload directory: `/uploads/`
- File serving through `/api/serve-file/` with caching headers
- Document storage linked to company records

### Development Notes
- Uses TypeScript with Next.js
- Tailwind CSS with custom theme (primary: green, secondary: dark gray)
- React Query for API state management with 5-minute stale time
- Hydration mismatch prevention in `_app.js`