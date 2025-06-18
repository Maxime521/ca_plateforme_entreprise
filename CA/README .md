# Enterprise Data Platform

A comprehensive Next.js application for searching and analyzing French company data from official sources.

## Features

- **Company Search**: Search companies by SIREN, name, or activity
- **Multi-Source Data**: Integrates SIRENE, RNE, BODACC, and financial ratio APIs
- **Document Management**: Access official documents and publications
- **Financial Analysis**: View company financial ratios and indicators
- **Secure Authentication**: Firebase authentication with role-based access
- **Modern UI**: Professional, responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Firebase Auth
- **APIs**: INSEE SIRENE, INPI RNE, BODACC, Financial Ratios

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env.local` and fill in your values

3. **Set up database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## API Integration

The platform integrates with multiple French government APIs:

- **SIRENE API**: Company basic information
- **RNE API**: Legal registration data
- **BODACC API**: Official publications
- **Financial Ratios API**: Economic indicators

## Database Schema

- **Companies**: Core company information
- **Documents**: Official documents and publications
- **Financial Ratios**: Economic indicators by year
- **Users**: Authentication and role management

## Deployment

1. Set up PostgreSQL database
2. Configure Firebase project
3. Obtain API keys from INSEE and INPI
4. Deploy to Vercel or similar platform

## Color Scheme

- **Primary**: Green (#16a34a)
- **Secondary**: Dark Gray (#374151)
- **Accent**: Red (#dc2626)
- **Background**: White/Light Gray
