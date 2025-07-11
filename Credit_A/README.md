# 🏢 Enterprise Data Platform
### French Government API Integration & Company Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2.30-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.7.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-2.50.2-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

> **A comprehensive Next.js enterprise platform for searching, analyzing, and managing French company data from official government sources. Built for financial analysts, business intelligence teams, and enterprise decision-makers.**

---

## 🎯 **Overview**

The Enterprise Data Platform is a sophisticated web application that provides real-time access to French company data through official government APIs. It enables users to search companies, generate comprehensive reports, analyze financial data, and manage documents with enterprise-grade security and performance.

### 🌟 **Key Value Propositions**

- **🏛️ Official Data Sources**: Direct integration with INSEE SIRENE, INPI RNE, and BODACC APIs
- **⚡ Real-Time Intelligence**: Instant company searches with live data from government databases
- **📊 Comprehensive Analytics**: Financial ratios, BODACC publications, and legal status tracking
- **🔒 Enterprise Security**: Role-based authentication with audit trails and data protection
- **📱 Modern Interface**: Responsive design with advanced search and filtering capabilities
- **🚀 High Performance**: Optimized for speed with caching, lazy loading, and SSR

---

## 📖 **Table of Contents**

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)
- [Performance](#-performance)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)

---

## ✨ **Features**

### 🔍 **Company Intelligence**
- **Advanced Search**: Search by SIREN, SIRET, company name, or business activity
- **Multi-Source Data**: Aggregate data from INSEE, INPI, BODACC, and financial databases
- **Real-Time Updates**: Live data synchronization with government APIs
- **Smart Filtering**: Advanced filters by legal form, activity sector, location, and size

### 📊 **Analytics & Reporting**
- **Financial Ratios**: Comprehensive financial analysis with historical trends
- **BODACC Monitoring**: Official publication tracking and alerts
- **PDF Generation**: Automated report generation with custom templates
- **Export Capabilities**: Data export in multiple formats (PDF, Excel, CSV)

### 📄 **Document Management**
- **Official Documents**: Access to legal documents and official publications
- **Batch Processing**: Bulk document generation and processing
- **Version Control**: Document versioning and audit trails
- **Secure Storage**: Encrypted document storage with access controls

### 🔐 **Authentication & Security**
- **Role-Based Access**: Admin, User, and Guest role management
- **Supabase Integration**: Modern authentication with social login options
- **Audit Logging**: Comprehensive activity tracking and compliance reporting
- **Data Protection**: GDPR-compliant data handling and privacy controls

### 🎨 **User Experience**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: Adaptive theming with user preferences
- **Accessibility**: WCAG 2.1 AA compliance with screen reader support
- **Internationalization**: Multi-language support (French, English)

---

## 🛠️ **Technology Stack**

### **Frontend**
- **Framework**: Next.js 14.2.30 with App Router
- **UI Library**: React 18 with TypeScript 5
- **Styling**: Tailwind CSS 3.3.0 with custom design system
- **State Management**: TanStack Query 5.8.0 for server state
- **Icons**: Lucide React & Heroicons
- **Forms**: React Hook Form with Zod validation

### **Backend**
- **API Routes**: Next.js API with middleware
- **Database**: Prisma ORM 5.7.0 with PostgreSQL/SQLite
- **Authentication**: Supabase Auth with custom hooks
- **File Storage**: Local filesystem with API serving
- **Caching**: Redis integration for high-performance caching

### **External APIs**
- **INSEE SIRENE**: French company registry data
- **INPI RNE**: Legal entity registration data
- **BODACC**: Official commercial announcements
- **Financial Ratios**: Economic indicators and metrics

### **Development Tools**
- **Testing**: Jest + React Testing Library + Playwright
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript with strict mode
- **Package Manager**: npm with workspace support

---

## 🏗️ **Architecture**

### **Project Structure**
```
├── components/           # Reusable UI components
│   ├── company/         # Company-specific components
│   ├── documents/       # Document management UI
│   ├── download/        # Download management
│   └── ui/              # Base UI components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries and services
├── pages/               # Next.js pages and API routes
│   ├── api/             # Backend API endpoints
│   │   ├── auth/        # Authentication routes
│   │   ├── companies/   # Company data API
│   │   ├── documents/   # Document management API
│   │   └── test/        # Testing endpoints
│   ├── company/         # Company detail pages
│   └── [other pages]    # Application pages
├── prisma/              # Database schema and migrations
├── styles/              # Global styles and Tailwind config
└── uploads/             # Generated documents and files
```

### **Database Schema**
```sql
-- Core entities with optimized relationships
Companies {
  id: uuid (PK)
  siren: string (unique, indexed)
  denomination: string
  created_at: timestamp
}

Documents {
  id: uuid (PK)
  company_id: uuid (FK)
  type_document: string
  lien_document: string
  created_at: timestamp
}

Users {
  id: uuid (PK)
  email: string (unique)
  role: enum ['admin', 'user', 'guest']
  created_at: timestamp
}
```

### **API Integration Flow**
```mermaid
graph TB
    A[Frontend] --> B[Next.js API Routes]
    B --> C[Prisma ORM]
    B --> D[INSEE API]
    B --> E[INPI API]
    B --> F[BODACC API]
    C --> G[PostgreSQL/SQLite]
    B --> H[Supabase Auth]
    B --> I[File System]
```

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL database (or SQLite for development)
- Supabase account
- INSEE/INPI API credentials

### **1-Minute Setup**
```bash
# Clone and install
git clone [your-repo-url]
cd enterprise-data-platform
npm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your credentials

# Database setup
npm run db:generate
npm run db:push

# Start development
npm run dev
```

🎉 **Your platform is now running at [http://localhost:3000](http://localhost:3000)**

---

## 📦 **Installation**

### **Detailed Installation Steps**

1. **Clone the Repository**
   ```bash
   git clone [your-repo-url]
   cd enterprise-data-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/enterprise_db"
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # API Keys
   INSEE_CONSUMER_KEY="your-insee-key"
   INSEE_CONSUMER_SECRET="your-insee-secret"
   INPI_API_TOKEN="your-inpi-token"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # (Optional) Seed with sample data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## ⚙️ **Configuration**

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `INSEE_CONSUMER_KEY` | INSEE API consumer key | ✅ |
| `INSEE_CONSUMER_SECRET` | INSEE API consumer secret | ✅ |
| `INPI_API_TOKEN` | INPI API access token | ✅ |
| `REDIS_URL` | Redis connection string | ❌ |
| `NODE_ENV` | Environment mode | ✅ |

### **API Rate Limits**
- **INSEE SIRENE**: 1000 requests/hour
- **INPI RNE**: 500 requests/hour  
- **BODACC**: 2000 requests/day

### **Database Configuration**
```javascript
// prisma/schema.prisma
datasource db {
  provider = "postgresql" // or "sqlite" for development
  url      = env("DATABASE_URL")
}
```

---

## 📡 **API Documentation**

### **Company Search API**
```typescript
// GET /api/companies/search-enriched
{
  query: string;        // Search term
  limit?: number;       // Results limit (default: 10)
  sources?: string[];   // Data sources ['insee', 'bodacc', 'local']
}

// Response
{
  success: boolean;
  results: Company[];
  sources: {
    local: number;
    insee: number;
    bodacc: number;
  };
  errors: ApiError[];
}
```

### **Document Generation API**
```typescript
// POST /api/documents/generate-pdfs
{
  siren: string;        // Company SIREN
  siret?: string;       // Company SIRET
  types?: string[];     // Document types to generate
}

// Response
{
  success: boolean;
  documents: {
    available: number;
    working: number;
    sources: DocumentSource[];
  };
}
```

### **BODACC Reports API**
```typescript
// GET /api/test/generate-bodacc-html
{
  siren: string;        // Company SIREN
  limit?: number;       // Records limit (default: 50)
}

// Response
{
  success: boolean;
  file: {
    filename: string;
    path: string;
    recordCount: number;
    format: 'HTML';
  };
}
```

---

## 🧪 **Testing**

### **Testing Stack**
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Playwright
- **API Tests**: Custom test utilities
- **Coverage**: Istanbul coverage reports

### **Running Tests**
```bash
# Unit tests
npm run test

# Unit tests with watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# End-to-end tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

### **Test Structure**
```
├── __tests__/
│   ├── components/      # Component tests
│   ├── pages/           # Page tests
│   ├── api/             # API route tests
│   └── utils/           # Utility function tests
├── e2e/                 # Playwright tests
└── jest.config.js       # Jest configuration
```

### **API Testing**
```bash
# Test API integrations
npm run test-apis

# Verify API configurations
npm run verify-apis
```

---

## 🚀 **Deployment**

### **Production Build**
```bash
# Build for production
npm run build

# Start production server
npm run start

# Production build with analysis
npm run build:prod
```

### **Deployment Options**

#### **Vercel (Recommended)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### **Environment Setup for Production**
```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL="your-production-db-url"
export SUPABASE_SERVICE_ROLE_KEY="your-production-key"
```

### **Database Migration**
```bash
# Production database setup
npm run db:migrate
npm run db:generate
```

---

## 🔒 **Security**

### **Security Features**
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Validation**: Zod schema validation on all inputs
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Rate Limiting**: API rate limiting with express-rate-limit
- **SQL Injection**: Prisma ORM with parameterized queries
- **XSS Protection**: Content Security Policy headers

### **Security Headers**
```typescript
// next.config.js security headers
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin'
}
```

### **File Upload Security**
- Path traversal prevention
- File type validation
- Size limitations
- Virus scanning integration ready

---

## ⚡ **Performance**

### **Optimization Features**
- **Server-Side Rendering**: Next.js SSR for improved SEO
- **Static Generation**: ISR for frequently accessed pages
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Code Splitting**: Automatic bundle splitting by Next.js
- **Caching Strategy**: Redis caching for API responses
- **Database Optimization**: Indexed queries and connection pooling

### **Performance Monitoring**
```bash
# Bundle analysis
npm run analyze

# Lighthouse CI
npm run lighthouse

# Performance profiling
npm run profile
```

### **Cache Configuration**
```typescript
// Query cache settings
{
  staleTime: 5 * 60 * 1000,    // 5 minutes
  cacheTime: 10 * 60 * 1000,   // 10 minutes
  refetchOnWindowFocus: false,
  retry: 1
}
```

---

## 📜 **Scripts Reference**

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:reset` | Reset database |
| `npm run test-apis` | Test API integrations |
| `npm run verify-apis` | Verify API configurations |

---

## 🤝 **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Run the test suite: `npm run test:all`
5. Submit a pull request

### **Code Standards**
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js configuration with custom rules
- **Prettier**: Code formatting with 2-space indentation
- **Commits**: Conventional commit format
- **Testing**: Minimum 80% coverage required

### **Pull Request Process**
1. Update documentation for new features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update changelog
5. Request review from maintainers

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database connection
npm run db:status

# Reset database
npm run db:reset

# Regenerate Prisma client
npm run db:generate
```

#### **API Integration Issues**
```bash
# Test API connectivity
npm run test-apis

# Verify API credentials
npm run verify-apis

# Check API rate limits
curl -H "Authorization: Bearer $INSEE_TOKEN" \
  https://api.insee.fr/entreprises/sirene/v3/status
```

#### **Build Issues**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Check TypeScript issues
npm run type-check
```

### **Environment Issues**
- Ensure all required environment variables are set
- Check Supabase project settings and API keys
- Verify database connection string format
- Confirm API endpoint URLs and credentials

### **Performance Issues**
- Enable Redis caching for production
- Optimize database queries with indexes
- Use CDN for static assets
- Monitor API rate limits

---

## 📞 **Support & Maintenance**

### **Getting Help**
- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **API Documentation**: Refer to official API documentation for INSEE, INPI, BODACC

### **Maintenance Schedule**
- **Dependencies**: Monthly security updates
- **Database**: Weekly backup verification
- **API Monitoring**: Daily health checks
- **Performance**: Quarterly optimization reviews

---

## 📄 **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **French Government**: For providing open data APIs
- **Next.js Team**: For the excellent framework
- **Supabase**: For modern authentication and database solutions
- **Prisma**: For type-safe database access
- **Tailwind CSS**: For utility-first styling

---

**Built with ❤️ for enterprise data intelligence**

*Last updated: December 2024*